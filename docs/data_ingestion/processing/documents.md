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
  - [Function: `parse_responses`](#parse_responses)
  - [Function: `store_doc_texts`](#store_doc_texts)
  - [Function: `store_doc_chunks`](#store_doc_chunks)
  - [Function: `add_document`](#add_document)
  - [Function: `process_agenda_documents`](#process_agenda_documents)

## Script Overview <a name="script-overview"></a>

This script automates the process of extracting text from research agenda documents stored in an AWS S3 bucket, chunking the text semantically, and storing the processed chunks in a vector store with rich metadata. It supports multiple file formats including PDF, DOCX, CSV, and MP3 (with transcription), and integrates with AWS S3, PGVector for vectorized document storage, and semantic chunking using LangChain's text splitting methods.

**Source Code**: [documents.py](../../../cdk/lambda/data_ingestion/src/processing/documents.py)

### Import Libraries <a name="import-libraries"></a>

- **os, tempfile**: For creating and handling temporary files.
- **logging**: For logging script activities and errors.
- **uuid**: For generating unique identifiers for documents and chunks.
- **time, json**: For handling timestamps and JSON data processing.
- **BytesIO**: To handle in-memory byte buffers.
- **boto3**: AWS SDK for Python, for interacting with S3, Transcribe, and Bedrock services.
- **PyPDF2**: For reading PDF files.
- **docx**: For processing DOCX files.
- **pandas**: For handling CSV data processing.
- **urllib.request**: For downloading transcription results.
- **psycopg2.\_psycopg.connection.PgConnection**: For PostgreSQL database connection type safety.
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
- **process_pdf**: Extracts text from PDF files page by page with improved formatting.
- **process_docx**: Extracts text from DOCX files paragraph by paragraph.
- **process_csv**: Processes CSV files in chunks with column formatting.
- **process_mp3**: Transcribes MP3 audio files using AWS Transcribe with speaker diarization and PII redaction.
- **parse_responses**: NEW - Uses AI to parse individual responses from observation documents.
- **store_doc_texts**: Orchestrates text extraction based on file type and stores results in S3.

### Main Functions <a name="main-functions"></a>

- **store_doc_chunks**: Handles the creation and storage of document chunks in the vector store with metadata.
- **add_document**: Handles the complete workflow for processing and adding a document to the vector store.
- **process_agenda_documents**: Processes documents for a specific research agenda and document type.

### Execution Flow <a name="execution-flow"></a>

The script first sets up AWS credentials using `boto3` and initializes various helper functions to download, extract, and process text from research agenda documents in the S3 bucket. It supports multiple file formats and automatically handles text extraction, transcription for audio files, AI-powered response parsing for observation documents, and semantic chunking. The processed chunks are stored in a vector store with rich metadata including document names, descriptions, types, and source information for efficient retrieval and embedding-based search capabilities.

## Detailed Function Descriptions <a name="detailed-function-descriptions"></a>

### Function: `format_diarized_transcript` <a name="format_diarized_transcript"></a>

**Source**: [documents.py lines 26-58](../../../cdk/lambda/data_ingestion/src/processing/documents.py)

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

**Source**: [documents.py lines 60-75](../../../cdk/lambda/data_ingestion/src/processing/documents.py)

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

**Source**: [documents.py lines 77-89](../../../cdk/lambda/data_ingestion/src/processing/documents.py)

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

**Source**: [documents.py lines 91-122](../../../cdk/lambda/data_ingestion/src/processing/documents.py)

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

**Source**: [documents.py lines 124-170](../../../cdk/lambda/data_ingestion/src/processing/documents.py)

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

### Function: `parse_responses` <a name="parse_responses"></a>

**Source**: [documents.py lines 172-230](../../../cdk/lambda/data_ingestion/src/processing/documents.py)

#### Purpose

Parses individual responses from observation documents using AI-powered text analysis and stores them in the database.

#### Process Flow

1. **AI Analysis**: Uses AWS Bedrock with Meta Llama 3 70B Instruct model to analyze document text.
2. **Response Extraction**: Extracts individual student responses from survey or observation text.
3. **JSON Parsing**: Safely parses the AI-generated JSON response list.
4. **Database Storage**: Stores each individual response in the individual_responses table.
5. **Error Handling**: Comprehensive error handling for JSON parsing and database operations.

#### Inputs and Outputs

- **Inputs**:
  - `doc_text`: The text content of the document to parse.
  - `doc_id`: The unique identifier for the research observation document.
  - `agenda_id`: The unique identifier for the research agenda.
  - `db_connection`: The PostgreSQL database connection object.
- **Outputs**:
  - Returns a list of parsed individual responses.

### Function: `store_doc_texts` <a name="store_doc_texts"></a>

**Source**: [documents.py lines 233-263](../../../cdk/lambda/data_ingestion/src/processing/documents.py)

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
  - `document_type`: Type of document (context_documents or observation_documents).
  - `filename`: Name of the document file to process.
  - `output_bucket`: S3 bucket for storing extracted text files.
- **Outputs**:
  - Returns a list of S3 keys for the stored text files.

### Function: `store_doc_chunks` <a name="store_doc_chunks"></a>

**Source**: [documents.py lines 265-321](../../../cdk/lambda/data_ingestion/src/processing/documents.py)

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
  - `document_type`: Type of document (context_documents or observation_documents).
  - `doc_name`: Display name for the document.
  - `doc_description`: Description of the document content.
  - `agenda`: The agenda ID.
  - `doc_id`: The unique identifier for the document.
  - `db_connection`: The PostgreSQL database connection object.
  - `vectorstore`: PGVector instance for storing chunks.
  - `embeddings`: BedrockEmbeddings instance for creating embeddings.
- **Outputs**:
  - Returns a list of Document objects that were stored in the vector store.

### Function: `add_document` <a name="add_document"></a>

**Source**: [documents.py lines 323-362](../../../cdk/lambda/data_ingestion/src/processing/documents.py)

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
  - `document_type`: Type of document (context_documents or observation_documents).
  - `filename`: Name of the document file.
  - `doc_name`: Display name for the document.
  - `doc_description`: Description of the document content.
  - `doc_id`: The unique identifier for the document.
  - `db_connection`: The PostgreSQL database connection object.
  - `vectorstore`: PGVector instance for storing chunks.
  - `embeddings`: BedrockEmbeddings instance.
  - `output_bucket`: S3 bucket for temporary text storage.
- **Outputs**:
  - Returns a list of Document objects that were added to the vector store.

### Function: `process_agenda_documents` <a name="process_agenda_documents"></a>

**Source**: [documents.py lines 364-410](../../../cdk/lambda/data_ingestion/src/processing/documents.py)

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
  - `document_type`: Type of documents to process (context_documents or observation_documents).
  - `file_name`: Specific file name to process.
  - `doc_name`: Display name for the document.
  - `doc_description`: Description of the document content.
  - `doc_id`: The unique identifier for the document.
  - `db_connection`: The PostgreSQL database connection object.
  - `vectorstore`: PGVector instance for storing chunks.
  - `embeddings`: BedrockEmbeddings instance.
  - `record_manager`: SQLRecordManager for tracking processed documents.
- **Outputs**:
  - No return value, but processes and indexes documents in the vector store.

[🔼 Back to top](#table-of-contents)
