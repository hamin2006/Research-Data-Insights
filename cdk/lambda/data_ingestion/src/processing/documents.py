import os
import tempfile
import logging
import uuid
from io import BytesIO
from typing import List, Dict, Any
import boto3
from PyPDF2 import PdfReader
from docx import Document
import pandas as pd
from langchain_postgres import PGVector
from langchain_core.documents import Document
from langchain_aws import BedrockEmbeddings
from langchain_experimental.text_splitter import SemanticChunker
from langchain.indexes import SQLRecordManager, index

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

s3 = boto3.client('s3')

EMBEDDING_BUCKET_NAME = os.environ["EMBEDDING_BUCKET_NAME"]

# ---------- CONVERSION HELPERS ----------

def convert_pdf_to_text(pdf_path):
    text = ''
    with open(pdf_path, 'rb') as file:
        reader = PdfReader(file)
        for page in reader.pages:
            text += page.extract_text() + '\n'
    return text

def convert_docx_to_text(docx_path):
    text = ''
    doc = Document(docx_path)
    for para in doc.paragraphs:
        text += para.text + '\n'
    return text

def convert_csv_to_text(csv_path):
    df = pd.read_csv(csv_path, skiprows=[1])

    # Detect and remove common prefix
    common_prefix = os.path.commonprefix(df.columns.tolist())
    clean_columns = [col.replace(common_prefix, '').strip(": ") for col in df.columns]
    df.columns = clean_columns

    text_entries = []
    for i, row in df.iterrows():
        entry = []
        for col in df.columns:
            val = str(row[col]).strip()
            if val and val.lower() != 'nan':
                entry.append(f"{col}:\n{val}")
        text_entries.append("\n\n".join(entry))
    
    return "\n\n" + "\n\n---\n\n".join(text_entries)

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
            with open(tmp_file.name, 'rb') as file:
                reader = PdfReader(file)
                with BytesIO() as output_buffer:
                    for page_num, page in enumerate(reader.pages, start=1):
                        text = page.extract_text().encode("utf8")
                        output_buffer.write(text)
                        output_buffer.write(bytes((12,)))
                        page_output_key = f'{filename}_page_{page_num}.txt'
                        output_keys.append(page_output_key)
                        with BytesIO(text) as page_output_buffer:
                            s3.upload_fileobj(page_output_buffer, output_bucket, page_output_key)
        elif file_type.lower() == 'docx':
            doc = Document(tmp_file.name)
            with BytesIO() as output_buffer:
                for page_num, para in enumerate(doc.paragraphs, start=1):
                    text = para.text.encode("utf8")
                    output_buffer.write(text)
                    output_buffer.write(bytes((12,)))
                    page_output_key = f'{filename}_page_{page_num}.txt'
                    output_keys.append(page_output_key)
                    with BytesIO(text) as page_output_buffer:
                        s3.upload_fileobj(page_output_buffer, output_bucket, page_output_key)

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
    page_iterator = paginator.paginate(Bucket=bucket, Prefix=f"agendas/{agenda}/{document_type}")
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
            cleanup="full",
            source_id_key="source"
        )
        print(f"Indexing updates: \n {idx}")
        logger.info(f"Indexing updates: \n {idx}")
    else:
        idx = index(
            [],
            record_manager, 
            vectorstore, 
            cleanup="full",
            source_id_key="source"
        )
        logger.info("No documents found for indexing.")
        print("No documents found for indexing.")