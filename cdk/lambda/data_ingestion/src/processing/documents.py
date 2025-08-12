import os
import time
import tempfile
import logging
import uuid
import json
from io import BytesIO
from typing import List, Dict, Any
import boto3
from PyPDF2 import PdfReader
import docx
from urllib.request import urlopen
import pandas as pd
from langchain_postgres import PGVector
from langchain_core.documents import Document
from langchain_aws import BedrockEmbeddings
from langchain_experimental.text_splitter import SemanticChunker
from langchain.indexes import SQLRecordManager, index

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RDI_DATA_INGESTION_BUCKET = os.environ["BUCKET"]
EMBEDDING_BUCKET_NAME = os.environ["EMBEDDING_BUCKET_NAME"]
REGION = os.environ["REGION"]

s3 = boto3.client("s3", region_name=REGION)
transcribe = boto3.client("transcribe", region_name=REGION)

# ---------- CONVERSION HELPERS ----------|
def process_pdf(tmp_file_path: str, filename: str, output_bucket: str) -> List[str]:
    """Process PDF file and store text of each page in S3."""
    output_keys = []
    with open(tmp_file_path, 'rb') as file:
        reader = PdfReader(file)
        for page_num, page in enumerate(reader.pages, start=1):
            text = page.extract_text().encode("utf8")
            page_output_key = f'{filename}_page_{page_num}.txt'
            output_keys.append(page_output_key)
            with BytesIO(text) as page_output_buffer:
                s3.upload_fileobj(page_output_buffer, output_bucket, page_output_key)
    return output_keys

def process_docx(tmp_file_path: str, filename: str, output_bucket: str) -> List[str]:
    """Process DOCX file and store text of each paragraph in S3."""
    output_keys = []
    doc = docx.Document(tmp_file_path)
    for page_num, para in enumerate(doc.paragraphs, start=1):
        if not para.text.strip():  # Skip empty paragraphs
            continue
        text = para.text.encode("utf8")
        page_output_key = f'{filename}_page_{page_num}.txt'
        output_keys.append(page_output_key)
        with BytesIO(text) as page_output_buffer:
            s3.upload_fileobj(page_output_buffer, output_bucket, page_output_key)
    return output_keys

def process_csv(tmp_file_path: str, filename: str, output_bucket: str) -> List[str]:
    """Process CSV file in chunks and store formatted text in S3."""
    output_keys = []
    df = pd.read_csv(tmp_file_path, skiprows=[1])

    # Detect and remove common prefix
    common_prefix = os.path.commonprefix(df.columns.tolist())
    clean_columns = [col.replace(common_prefix, '').strip(": ") for col in df.columns]
    df.columns = clean_columns

    # Process in chunks of 100 rows
    chunk_size = 100
    for chunk_num, chunk_start in enumerate(range(0, len(df), chunk_size), start=1):
        chunk_df = df.iloc[chunk_start:chunk_start + chunk_size]
        
        text_entries = []
        for _, row in chunk_df.iterrows():
            entry = []
            for col in chunk_df.columns:
                val = str(row[col]).strip()
                if val and val.lower() != 'nan':
                    entry.append(f"{col}:\n{val}")
            text_entries.append("\n\n".join(entry))
        
        page_text = "\n\n---\n\n".join(text_entries).encode("utf8")
        page_output_key = f'{filename}_page_{chunk_num}.txt'
        output_keys.append(page_output_key)
        
        with BytesIO(page_text) as page_output_buffer:
            s3.upload_fileobj(page_output_buffer, output_bucket, page_output_key)
    
    return output_keys

def process_mp3(tmp_file_path: str, filename: str, output_bucket: str) -> List[str]:
    """Process MP3 file and transcribe audio to text using Transcribe."""
    output_keys = []
    transcribe_language = "en-US"
    media_file_uri = f"s3://{RDI_DATA_INGESTION_BUCKET}/{filename}"
    logger.info(f"Starting transcription job for {media_file_uri}")

    base_filename = filename.split('/')[-1]
    clean_name = ''.join(c for c in base_filename if c.isalnum() or c in '._-')

    job_name = f"transcription-{clean_name}-{int(time.time())}"
    transcribe.start_transcription_job(
        TranscriptionJobName=job_name,
        Media={'MediaFileUri': media_file_uri},
        MediaFormat='mp3',
        LanguageCode=transcribe_language,
        Settings={
                'ShowSpeakerLabels': True,
                'ShowAlternatives': False,
            }
    )

    transcript_uri = None
    while True:
        resp = transcribe.get_transcription_job(TranscriptionJobName=job_name)
        status = resp["TranscriptionJob"]["TranscriptionJobStatus"]
        if status == "COMPLETED":
            transcript_uri = resp["TranscriptionJob"]["Transcript"]["TranscriptFileUri"]
            break
        if status == "FAILED":
            raise Exception("Transcription job failed")
        time.sleep(5)
    
    response = urlopen(transcript_uri)
    data = json.loads(response.read())
    transcript_text = data['results']['transcripts'][0]['transcript'].encode("utf8")
    output_key = f'{filename}_transcript.txt'
    output_keys.append(output_key)

    with BytesIO(transcript_text) as page_output_buffer:
        s3.upload_fileobj(page_output_buffer, output_bucket, output_key)

    return output_keys

def store_doc_texts(bucket: str, agenda: str, document_type: str, filename: str, output_bucket: str) -> List[str]:
    """
    Store the text of each page of a document in an S3 bucket.
    
    Args:
    bucket (str): The name of the S3 bucket containing the document.
    agenda (str): The agenda ID folder within the bucket.
    document_type (str): The document type folder within the agenda (e.g., "context" or "observation").
    filename (str): The name of the document file.
    output_bucket (str): The name of the S3 bucket for storing the extracted text.
    
    Returns:
    List[str]: A list of keys for the stored text files in the output bucket.
    """
    output_keys = []
    with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
        s3.download_file(bucket, f"{filename}", tmp_file.name)
        file_name, file_type = filename.rsplit('.', 1)

        if file_type.lower() == 'pdf':
            output_keys = process_pdf(tmp_file.name, filename, output_bucket)
        elif file_type.lower() == 'docx':
            output_keys = process_docx(tmp_file.name, filename, output_bucket)
        elif file_type.lower() == 'csv':
            output_keys = process_csv(tmp_file.name, filename, output_bucket)
        elif file_type.lower() == 'mp3':
            output_keys = process_mp3(tmp_file.name, filename, output_bucket)

        os.remove(tmp_file.name)

    return output_keys

def store_doc_chunks(bucket: str, filenames: List[str], document_type: str, vectorstore: PGVector, embeddings: BedrockEmbeddings) -> List[Document]:
    """
    Store chunks of documents in the vectorstore.
    
    Args:
    bucket (str): The name of the S3 bucket containing the text files.
    filenames (List[str]): A list of keys for the text files in the bucket.
    vectorstore (PGVector): The vectorstore instance.
    embeddings (BedrockEmbeddings): The embeddings instance.
    
    Returns:
    List[Document]: A list of all document chunks for this document that were added to the vectorstore.
    """
    text_splitter = SemanticChunker(embeddings)
    this_doc_chunks = []

    for filename in filenames:
        this_uuid = str(uuid.uuid4()) # Generating one UUID for all chunks of from a specific page in the document
        output_buffer = BytesIO()
        s3.download_fileobj(bucket, filename, output_buffer)
        output_buffer.seek(0)
        doc_texts = output_buffer.read().decode('utf-8')
        doc_chunks = text_splitter.create_documents([doc_texts])
        
        head, _, _ = filename.partition("_page")
        true_filename = head # Converts 'CourseCode_XXX_-_Course-Name.pdf_page_1.txt' to 'CourseCode_XXX_-_Course-Name.pdf'
        
        doc_chunks = [x for x in doc_chunks if x.page_content]
        
        for doc_chunk in doc_chunks:
            if doc_chunk:
                doc_chunk.metadata["source"] = f"s3://{bucket}/{true_filename}"
                doc_chunk.metadata["doc_id"] = this_uuid
                doc_chunk.metadata["document_type"] = document_type

            else:
                logger.warning(f"Empty chunk for {filename}")
        
        s3.delete_object(Bucket=bucket, Key=filename)
        print(f"Deleting {filename} from {bucket}")
        
        this_doc_chunks.extend(doc_chunks)
       
    return this_doc_chunks

def add_document(bucket: str, agenda: str, document_type: str, filename: str, vectorstore: PGVector, embeddings: BedrockEmbeddings, output_bucket: str = EMBEDDING_BUCKET_NAME) -> List[Document]:
    # store_doc_texts, store_doc_chunks
    """
    Add a document to the vectorstore.
    
    Args:
    bucket (str): The name of the S3 bucket containing the document.
    agenda (str): The agenda ID folder within the bucket.
    document_type (str): The document type folder within the agenda (e.g., "context" or "observation").
    filename (str): The name of the document file.
    vectorstore (PGVector): The vectorstore instance.
    embeddings (BedrockEmbeddings): The embeddings instance.
    output_bucket (str, optional): The name of the S3 bucket for storing extracted data. Defaults to 'temp-extracted-data'.
    
    Returns:
    List[Document]: A list of all document chunks for this document that were added to the vectorstore.
    """
    
    print("output_bucket", output_bucket)
    output_filenames = store_doc_texts(
        bucket=bucket,
        agenda=agenda,
        document_type=document_type,
        filename=filename,
        output_bucket=output_bucket
    )

    this_doc_chunks = store_doc_chunks(
        bucket=output_bucket,
        filenames=output_filenames,
        document_type=document_type,
        vectorstore=vectorstore,
        embeddings=embeddings
    )
    
    return this_doc_chunks

def process_agenda_documents(bucket: str, agenda: str, document_type: str, file_name: str, vectorstore: PGVector, embeddings: BedrockEmbeddings, record_manager: SQLRecordManager) -> None:
    # add_document, index
    """
    Process and add text documents from an S3 bucket to the vectorstore.
    
    Args:
    bucket (str): The name of the S3 bucket containing the text documents.
    agenda (str): The agenda ID folder in the S3 bucket.
    document_type (str): The document type folder in the S3 bucket.
    file_name (str): The name of the file to be processed.
    vectorstore (PGVector): The vectorstore instance.
    embeddings (BedrockEmbeddings): The embeddings instance.
    record_manager (SQLRecordManager): Manages list of documents in the vectorstore for indexing.
    """
    paginator = s3.get_paginator('list_objects_v2')
    page_iterator = paginator.paginate(Bucket=bucket, Prefix=f"agendas/{agenda}/{document_type}/{file_name}")
    all_doc_chunks = []
    
    for page in page_iterator:
        if "Contents" not in page:
            continue  # Skip pages without any content (e.g., if the bucket is empty)
        for file in page['Contents']:
            filename = file['Key']
            if filename.endswith((".pdf", ".docx", ".txt", ".mp3", ".csv")):
                this_doc_chunks = add_document(
                    bucket=bucket,
                    agenda=agenda,
                    document_type=document_type,
                    filename=filename,
                    vectorstore=vectorstore,
                    embeddings=embeddings
                )

                all_doc_chunks.extend(this_doc_chunks)
    
    if all_doc_chunks:
        idx = index(
            all_doc_chunks, 
            record_manager, 
            vectorstore, 
            cleanup="incremental",
            source_id_key="source"
        )
        print(f"Indexing updates: \n {idx}")
        logger.info(f"Indexing updates: \n {idx}")
    else:
        idx = index(
            [],
            record_manager, 
            vectorstore, 
            cleanup="incremental",
            source_id_key="source"
        )
        logger.info("No documents found for indexing.")
        print("No documents found for indexing.")