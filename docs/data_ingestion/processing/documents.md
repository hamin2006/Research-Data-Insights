# documents.py

## Table of Contents <a name="table-of-contents"></a>

- [Script Overview](#script-overview)
  - [Import Libraries](#import-libraries)
  - [AWS Configuration and Setup](#aws-configuration-and-setup)
  - [Helper Functions](#helper-functions)
  - [Main Functions](#main-functions)
  - [Execution Flow](#execution-flow)
- [Detailed Function Descriptions](#detailed-function-descriptions)
  - [Function: `format_diarized_transcript`](#format_diarized_transcript)
  - [Function: `process_pdf`](#process_pdf)
  - [Function: `process_docx`](#process_docx)
  - [Function: `process_csv`](#process_csv)
  - [Function: `process_mp3`](#process_mp3)
  - [Function: `store_doc_texts`](#store_doc_texts)
  - [Function: `store_doc_chunks`](#store_doc_chunks)
  - [Function: `add_document`](#add_document)
  - [Function: `process_agenda_documents`](#process_agenda_documents)

## Script Overview <a name="script-overview"></a>

This script automates the process of extracting text from research agenda documents stored in an AWS S3 bucket, chunking the text semantically, and storing the processed chunks in a vector store with rich metadata. It supports multiple file formats including PDF, DOCX, CSV, and MP3 (with transcription), and integrates with AWS S3, PGVector for vectorized document storage, and semantic chunking using LangChain's text splitting methods.

### Import Libraries <a name="import-libraries"></a>

- **os, tempfile**: For creating and handling temporary files.
- **logging**: For logging script activities and errors.
- **uuid**: For generating unique identifiers for documents and chunks.
- **time, json**: For handling timestamps and JSON data processing.
- **BytesIO**: To handle in-memory byte buffers.
- **boto3**: AWS SDK for Python, for interacting with S3 and Transcribe services.
- **PyPDF2**: For reading PDF files.
- **docx**: For processing DOCX files.
- **pandas**: For handling CSV data processing.
- **urllib.request**: For downloading transcription results.
- **langchain_postgres.PGVector**: Vector store for document storage.
- **langchain_core.documents.Document**: Data structure for document objects.
- **langchain_aws.BedrockEmbeddings**: Handles the embedding process for text data. This project uses the Amazon Titan Text Embeddings V2 model to generate embeddings.
- **langchain_experimental.text_splitter.SemanticChunker**: Splits text semantically.
- **langchain.indexes**: For managing document indexing and record management.

### AWS Configuration and Setup <a name="aws-configuration-and-setup"></a>

- **boto3.client('s3')**: Initializes the AWS S3 client for interacting with the S3 buckets, such as downloading documents and uploading processed files.
- **boto3.client('transcribe')**: Initializes the AWS Transcribe client for converting MP3 audio files to text with speaker diarization.

### Helper Functions <a name="helper-functions"></a>

- **format_diarized_transcript**: Formats transcribed audio with speaker labels for readability.
- **process_pdf**: Extracts text from PDF files page by page.
- **process_docx**: Extracts text from DOCX files paragraph by paragraph.
- **process_csv**: Processes CSV files in chunks with column formatting.
- **process_mp3**: Transcribes MP3 audio files using AWS Transcribe with speaker diarization.
- **store_doc_texts**: Orchestrates text extraction based on file type and stores results in S3.

### Main Functions <a name="main-functions"></a>

- **store_doc_chunks**: Handles the creation and storage of document chunks in the vector store with metadata.
- **add_document**: Handles the complete workflow for processing and adding a document to the vector store.
- **process_agenda_documents**: Processes documents for a specific research agenda and document type.

### Execution Flow <a name="execution-flow"></a>

The script first sets up AWS credentials using `boto3` and initializes various helper functions to download, extract, and process text from research agenda documents in the S3 bucket. It supports multiple file formats and automatically handles text extraction, transcription for audio files, and semantic chunking. The processed chunks are stored in a vector store with rich metadata including document names, descriptions, types, and source information for efficient retrieval and embedding-based search capabilities.

## Detailed Function Descriptions <a name="detailed-function-descriptions"></a>

### Function: `format_diarized_transcript` <a name="format_diarized_transcript"></a>

```python
def format_diarized_transcript(data):
    speaker_segments = data["results"]["speaker_labels"]["segments"]
    items = data["results"]["items"]

    # Map each speaker_label (e.g., spk_0) to Speaker 1, Speaker 2, etc.
    speaker_map = {}
    speaker_counter = 1
    for segment in speaker_segments:
        label = segment["speaker_label"]
        if label not in speaker_map:
            speaker_map[label] = f"Speaker {speaker_counter}"
            speaker_counter += 1

    output = []
    segment_index = 0
    segment = speaker_segments[segment_index]
    speaker = segment["speaker_label"]
    current_line = f"{speaker_map[speaker]}: "

    for item in items:
        if item["type"] == "punctuation":
            current_line = current_line.rstrip() + item["alternatives"][0]["content"] + " "
        else:
            while (segment_index + 1 < len(speaker_segments) and
                   float(item["start_time"]) >= float(speaker_segments[segment_index + 1]["start_time"])):
                output.append(current_line.strip())
                segment_index += 1
                segment = speaker_segments[segment_index]
                speaker = segment["speaker_label"]
                current_line = f"{speaker_map[speaker]}: "

            current_line += item["alternatives"][0]["content"] + " "

    output.append(current_line.strip())
    return "\n\n".join(output)
```

#### Purpose

Formats AWS Transcribe output with speaker diarization into a readable transcript format with labeled speakers.

#### Process Flow

1. **Speaker Mapping**: Creates a mapping from AWS speaker labels (spk_0, spk_1) to human-readable labels (Speaker 1, Speaker 2).
2. **Timeline Processing**: Iterates through transcribed items and matches them with speaker segments based on timestamps.
3. **Text Formatting**: Combines words and punctuation while maintaining speaker attribution and proper formatting.

#### Inputs and Outputs

- **Inputs**:
  - `data`: JSON data from AWS Transcribe containing speaker labels and transcribed items.
- **Outputs**:
  - Returns a formatted string with speaker-labeled transcript text.

### Function: `process_pdf` <a name="process_pdf"></a>

```python
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
```

#### Purpose

Extracts text from PDF files page by page and stores each page as a separate text file in S3.

#### Process Flow

1. **PDF Reading**: Opens the PDF file using PyPDF2's PdfReader.
2. **Page Processing**: Iterates through each page and extracts text content.
3. **S3 Storage**: Uploads each page's text as a separate file to the specified S3 bucket.

#### Inputs and Outputs

- **Inputs**:
  - `tmp_file_path`: Path to the temporary PDF file.
  - `filename`: Original filename for naming output files.
  - `output_bucket`: S3 bucket for storing extracted text files.
- **Outputs**:
  - Returns a list of S3 keys for the stored text files.

### Function: `process_docx` <a name="process_docx"></a>

```python
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
```

#### Purpose

Extracts text from DOCX files paragraph by paragraph and stores each non-empty paragraph as a separate text file in S3.

#### Process Flow

1. **DOCX Reading**: Opens the DOCX file using the python-docx library.
2. **Paragraph Processing**: Iterates through paragraphs, skipping empty ones.
3. **S3 Storage**: Uploads each paragraph's text as a separate file to the specified S3 bucket.

#### Inputs and Outputs

- **Inputs**:
  - `tmp_file_path`: Path to the temporary DOCX file.
  - `filename`: Original filename for naming output files.
  - `output_bucket`: S3 bucket for storing extracted text files.
- **Outputs**:
  - Returns a list of S3 keys for the stored text files.

### Function: `process_csv` <a name="process_csv"></a>

```python
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
```

#### Purpose

Processes CSV files by cleaning column names, chunking data into manageable sizes, and formatting as readable text.

#### Process Flow

1. **CSV Reading**: Loads the CSV file using pandas, skipping the second row.
2. **Column Cleaning**: Removes common prefixes from column names for better readability.
3. **Data Chunking**: Processes data in chunks of 100 rows to manage large files.
4. **Text Formatting**: Formats each row as key-value pairs with proper separators.
5. **S3 Storage**: Uploads each chunk as a formatted text file to S3.

#### Inputs and Outputs

- **Inputs**:
  - `tmp_file_path`: Path to the temporary CSV file.
  - `filename`: Original filename for naming output files.
  - `output_bucket`: S3 bucket for storing processed text files.
- **Outputs**:
  - Returns a list of S3 keys for the stored text files.

### Function: `process_mp3` <a name="process_mp3"></a>

```python
def process_mp3(tmp_file_path: str, filename: str, output_bucket: str) -> List[str]:
    """Process MP3 file and transcribe audio to text using Transcribe."""
    # Implementation details include AWS Transcribe job creation,
    # speaker diarization, PII redaction, and transcript formatting
    return output_keys
```

#### Purpose

Transcribes MP3 audio files to text using AWS Transcribe with speaker diarization and PII redaction.

#### Process Flow

1. **Transcription Job**: Creates an AWS Transcribe job with speaker labeling and PII redaction enabled.
2. **Job Monitoring**: Polls the transcription job status until completion.
3. **Result Processing**: Downloads and processes the transcription results.
4. **Speaker Formatting**: Uses `format_diarized_transcript` to create readable speaker-labeled text.
5. **S3 Storage**: Uploads the formatted transcript to S3.

#### Inputs and Outputs

- **Inputs**:
  - `tmp_file_path`: Path to the temporary MP3 file.
  - `filename`: Original filename for naming output files.
  - `output_bucket`: S3 bucket for storing transcribed text.
- **Outputs**:
  - Returns a list containing the S3 key for the transcript file.

### Function: `store_doc_texts` <a name="store_doc_texts"></a>

```python
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
```

#### Purpose

Orchestrates text extraction from various file formats and stores the results in S3.

#### Process Flow

1. **File Download**: Downloads the document from S3 to a temporary file.
2. **Format Detection**: Determines the file type based on the file extension.
3. **Processing Dispatch**: Calls the appropriate processing function (PDF, DOCX, CSV, or MP3).
4. **Cleanup**: Removes the temporary file after processing.

#### Inputs and Outputs

- **Inputs**:
  - `bucket`: S3 bucket containing the source document.
  - `agenda`: Research agenda ID (currently not used in file path).
  - `document_type`: Type of document (context or observation).
  - `filename`: Name of the document file to process.
  - `output_bucket`: S3 bucket for storing extracted text files.
- **Outputs**:
  - Returns a list of S3 keys for the stored text files.

### Function: `store_doc_chunks` <a name="store_doc_chunks"></a>

```python
def store_doc_chunks(bucket: str, filenames: List[str], document_type: str, doc_name: str, doc_description: str, vectorstore: PGVector, embeddings: BedrockEmbeddings) -> List[Document]:
    """
    Store chunks of documents in the vectorstore.
    """
```

#### Purpose

Creates semantic chunks from extracted text and stores them in the vector store with comprehensive metadata.

#### Process Flow

1. **Text Retrieval**: Downloads text files from S3 and decodes them.
2. **Semantic Chunking**: Uses SemanticChunker to create meaningful text chunks.
3. **Metadata Assignment**: Adds rich metadata including document type, name, description, and source information.
4. **Vector Storage**: Stores chunks in the PGVector database.
5. **Cleanup**: Deletes temporary text files from S3 after processing.

#### Inputs and Outputs

- **Inputs**:
  - `bucket`: S3 bucket containing text files.
  - `filenames`: List of text file keys to process.
  - `document_type`: Type of document (context or observation).
  - `doc_name`: Display name for the document.
  - `doc_description`: Description of the document content.
  - `vectorstore`: PGVector instance for storing chunks.
  - `embeddings`: BedrockEmbeddings instance for creating embeddings.
- **Outputs**:
  - Returns a list of Document objects that were stored in the vector store.

### Function: `add_document` <a name="add_document"></a>

```python
def add_document(bucket: str, agenda: str, document_type: str, filename: str, doc_name: str, doc_description: str, vectorstore: PGVector, embeddings: BedrockEmbeddings, output_bucket: str = EMBEDDING_BUCKET_NAME) -> List[Document]:
    """
    Add a document to the vectorstore.
    """
```

#### Purpose

Handles the complete workflow for processing and adding a document to the vector store.

#### Process Flow

1. **Text Extraction**: Calls `store_doc_texts` to extract and store text from the document.
2. **Chunk Creation**: Calls `store_doc_chunks` to create semantic chunks and store them in the vector store.
3. **Return Results**: Returns the list of document chunks that were added.

#### Inputs and Outputs

- **Inputs**:
  - `bucket`: S3 bucket containing the source document.
  - `agenda`: Research agenda ID.
  - `document_type`: Type of document (context or observation).
  - `filename`: Name of the document file.
  - `doc_name`: Display name for the document.
  - `doc_description`: Description of the document content.
  - `vectorstore`: PGVector instance for storing chunks.
  - `embeddings`: BedrockEmbeddings instance.
  - `output_bucket`: S3 bucket for temporary text storage.
- **Outputs**:
  - Returns a list of Document objects that were added to the vector store.

### Function: `process_agenda_documents` <a name="process_agenda_documents"></a>

```python
def process_agenda_documents(bucket: str, agenda: str, document_type: str, file_name: str, doc_name: str, doc_description: str, vectorstore: PGVector, embeddings: BedrockEmbeddings, record_manager: SQLRecordManager) -> None:
    """
    Process and add text documents from an S3 bucket to the vectorstore.
    """
```

#### Purpose

Processes documents for a specific research agenda and document type, managing the complete indexing workflow.

#### Process Flow

1. **File Discovery**: Uses S3 paginator to find files matching the agenda and document type pattern.
2. **Format Filtering**: Processes only supported file formats (PDF, DOCX, TXT, MP3, CSV).
3. **Document Processing**: Calls `add_document` for each qualifying file.
4. **Index Management**: Uses SQLRecordManager to maintain an incremental index of processed documents.
5. **Logging**: Provides detailed logging of the indexing process and results.

#### Inputs and Outputs

- **Inputs**:
  - `bucket`: S3 bucket containing agenda documents.
  - `agenda`: Research agenda ID.
  - `document_type`: Type of documents to process (context or observation).
  - `file_name`: Specific file name to process.
  - `doc_name`: Display name for the document.
  - `doc_description`: Description of the document content.
  - `vectorstore`: PGVector instance for storing chunks.
  - `embeddings`: BedrockEmbeddings instance.
  - `record_manager`: SQLRecordManager for tracking processed documents.
- **Outputs**:
  - No return value, but processes and indexes documents in the vector store.

[🔼 Back to top](#table-of-contents)
