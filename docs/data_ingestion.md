# Data Ingestion System Documentation

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Key Components](#key-components)
- [Recent Updates](#recent-updates)
- [Core Modules](#core-modules)
  - [Main Handler](#main-handler)
  - [Vector Store Management](#vector-store-management)
  - [Document Processing](#document-processing)
  - [Helper Functions](#helper-functions)
- [Database Integration](#database-integration)
- [Supported File Formats](#supported-file-formats)
- [Processing Workflow](#processing-workflow)
- [Configuration](#configuration)
- [Error Handling](#error-handling)

## Overview

The Research Data Insights data ingestion system is a comprehensive AWS Lambda-based solution that processes research agenda documents from S3 buckets, extracts text content, creates semantic embeddings, and stores the processed data in a PostgreSQL vector database. The system supports multiple file formats and provides intelligent document chunking with rich metadata for efficient retrieval and analysis.

## System Architecture

The data ingestion system follows a modular architecture with the following key layers:

- **Event Handler Layer**: AWS Lambda function that processes S3 events
- **Document Processing Layer**: Handles text extraction from various file formats
- **Vector Store Layer**: Manages embeddings and database storage
- **Database Layer**: PostgreSQL with pgvector extension for vector operations

## Key Components

### AWS Services Integration

- **S3**: Document storage and temporary file management
- **Lambda**: Serverless compute for processing workflows
- **Bedrock**: AI embeddings using Amazon Titan Text Embeddings V2
- **Transcribe**: Audio-to-text conversion with speaker diarization
- **RDS Proxy**: Database connection management
- **Secrets Manager**: Secure credential storage
- **Systems Manager**: Parameter management

### Core Technologies

- **LangChain**: Document processing and semantic chunking
- **PGVector**: PostgreSQL vector database extension
- **psycopg2**: PostgreSQL database connectivity
- **Pandas**: CSV data processing
- **PyPDF2**: PDF text extraction
- **python-docx**: DOCX document processing

## Recent Updates

The system has undergone significant enhancements to improve functionality and reliability:

### Enhanced Database Integration

- **Improved Connection Handling**: Updated to use `PgConnection` type for better type safety and connection management
- **Individual Response Parsing**: New functionality to parse and store individual responses from observation documents using AI-powered text analysis
- **Enhanced Metadata Storage**: Expanded document metadata with `doc_id` parameter for better tracking

### Document Type Evolution

- **Updated Document Types**: Support for new document type formats ("context_documents"/"observation_documents") replacing legacy formats
- **Better Type Safety**: Enhanced parameter validation and type checking throughout the system
- **Improved File Path Parsing**: Enhanced S3 file path parsing to extract document metadata from database

### Function Signature Updates

- **Consistent Parameter Handling**: Standardized function signatures across all modules
- **Database Connection Parameter**: Added explicit `db_connection` parameter to core functions
- **Document ID Tracking**: Integrated `doc_id` parameter for comprehensive document lifecycle management

## Core Modules

### Main Handler

The main entry point for the data ingestion system is located in [main.py](../cdk/lambda/data_ingestion/src/main.py). Key functions include:

- **`handler(event, context)`**: Primary Lambda function handler that processes S3 events
- **`get_secret()`**: Retrieves database credentials from AWS Secrets Manager
- **`get_parameter()`**: Fetches embedding model configuration from Systems Manager
- **`connect_to_db()`**: Establishes PostgreSQL database connections with proper error handling
- **`parse_s3_file_path()`**: Parses S3 file paths and retrieves document metadata from database
- **`update_vectorstore_from_s3()`**: Orchestrates the complete document processing workflow

### Vector Store Management

The vector store functionality is managed through [vectorstore.py](../cdk/lambda/data_ingestion/src/helpers/vectorstore.py):

- **`update_vectorstore()`**: Main function that coordinates document processing and vector storage
- Supports updated document type formats ("context_documents"/"observation_documents")
- Handles database connection management and error recovery
- Integrates with the helper module for comprehensive document processing

### Document Processing

The document processing engine is implemented in [documents.py](../cdk/lambda/data_ingestion/src/processing/documents.py):

#### Text Extraction Functions

- **`process_pdf()`**: Extracts text from PDF files page by page with improved formatting
- **`process_docx()`**: Processes DOCX files paragraph by paragraph
- **`process_csv()`**: Handles CSV files with intelligent column cleaning and chunking
- **`process_mp3()`**: Transcribes audio files using AWS Transcribe with speaker diarization and PII redaction

#### Document Management Functions

- **`store_doc_texts()`**: Orchestrates text extraction based on file type
- **`store_doc_chunks()`**: Creates semantic chunks and stores them with metadata
- **`add_document()`**: Complete workflow for adding documents to the vector store
- **`process_agenda_documents()`**: Processes all documents for a research agenda

#### Enhanced Response Processing

- **`parse_responses()`**: New functionality to extract and store individual responses from observation documents
- Uses AWS Bedrock with Meta Llama 3 70B Instruct model for intelligent text parsing
- Supports structured data extraction from research documents
- Integrates with the database to store parsed responses with proper relationships

### Helper Functions

The helper module [helper.py](../cdk/lambda/data_ingestion/src/helpers/helper.py) provides core infrastructure:

- **`get_vectorstore()`**: Initializes PGVector instances with proper configuration
- **`store_agenda_data()`**: Main orchestration function for document processing workflows
- Enhanced error handling and logging throughout all operations

## Database Integration

### Schema Updates

The system includes several database migrations to support enhanced functionality:

#### Individual Responses Table

New table structure defined in [004_individual_responses.js](../cdk/lambda/db_setup/migrations/004_individual_responses.js):

- Stores parsed individual responses from observation documents
- Links responses to research observations and agendas
- Includes metadata and ordering information

#### AI Settings Enhancement

Updates to research agenda table in [002_agenda_ai_settings.js](../cdk/lambda/db_setup/migrations/002_agenda_ai_settings.js):

- Hyperparameter settings for AI model configuration
- JSONB storage for flexible configuration management

#### Scoring Models Integration

Enhanced scoring capabilities in [003_agenda_scoring.js](../cdk/lambda/db_setup/migrations/003_agenda_scoring.js):

- Support for multiple scoring models
- Configurable scoring methods and parameters

### Connection Management

The system uses PostgreSQL connection pooling through RDS Proxy for:

- Improved connection reliability
- Better resource utilization
- Enhanced security through IAM authentication
- Automatic failover capabilities

## Supported File Formats

### PDF Documents

- Page-by-page text extraction with improved formatting
- Handles complex layouts and formatting
- Preserves document structure in metadata
- Enhanced paragraph detection and formatting

### DOCX Documents

- Paragraph-level processing
- Skips empty content automatically
- Maintains formatting context

### CSV Files

- Intelligent column name cleaning
- Chunked processing for large datasets (100 rows per chunk)
- Structured data formatting for better searchability

### MP3 Audio Files

- AWS Transcribe integration with speaker diarization
- PII redaction for sensitive content
- Speaker-labeled transcript generation
- Support for multiple audio formats

### Plain Text Files

- Direct processing without conversion
- Maintains original formatting and structure

## Processing Workflow

### Document Ingestion Flow

1. **Event Trigger**: S3 object creation triggers Lambda function
2. **File Path Parsing**: System parses S3 path and retrieves document metadata from database
3. **File Analysis**: System determines file type and processing requirements
4. **Text Extraction**: Appropriate processor extracts text content
5. **Response Parsing**: For observation documents, AI-powered parsing extracts individual responses
6. **Semantic Chunking**: LangChain SemanticChunker creates meaningful text segments
7. **Embedding Generation**: Amazon Bedrock creates vector embeddings
8. **Metadata Enhancement**: Rich metadata added including document type, description, and source information
9. **Vector Storage**: Chunks stored in PostgreSQL with pgvector extension
10. **Index Management**: SQLRecordManager maintains processing history
11. **Status Update**: Document upload status updated in database
12. **Cleanup**: Temporary files removed from S3

### Error Recovery

The system includes comprehensive error handling:

- Database connection retry logic
- S3 operation error recovery
- Transcription job monitoring and timeout handling
- Partial processing recovery for large documents

## Configuration

### Environment Variables

The system relies on several environment variables:

- `SM_DB_CREDENTIALS`: AWS Secrets Manager secret for database credentials
- `EMBEDDING_MODEL_PARAM`: Systems Manager parameter for embedding model ID
- `RDS_PROXY_ENDPOINT`: Database proxy endpoint
- `EMBEDDING_BUCKET_NAME`: S3 bucket for temporary text storage
- `BUCKET`: Main S3 bucket for document storage
- `REGION`: AWS region for service operations

### Vector Store Configuration

Vector store settings are managed through configuration dictionaries:

- Collection naming based on document ID
- Database connection parameters from Secrets Manager
- JSONB metadata storage enabled
- Semantic chunking parameters optimized for research documents

## Error Handling

### Database Errors

- Connection pooling through RDS Proxy
- Automatic retry logic for transient failures
- Transaction rollback on processing errors
- Comprehensive error logging

### S3 Operations

- Retry logic for upload/download operations
- Temporary file cleanup on failures
- Bucket access validation

### Processing Errors

- File format validation before processing
- Graceful handling of corrupted documents
- Partial processing recovery
- Detailed error reporting with context

### Transcription Errors

- Job status monitoring with timeouts
- Retry logic for failed transcription jobs
- Fallback processing for audio files
- PII redaction error handling

## Performance Considerations

### Optimization Strategies

- Chunked processing for large CSV files
- Parallel processing where possible
- Efficient memory management for large documents
- Connection pooling for database operations

### Scalability Features

- Lambda concurrency management
- S3 event batching capabilities
- Database connection optimization
- Vector index optimization for search performance

The data ingestion system provides a robust, scalable foundation for processing research documents with comprehensive error handling, multiple file format support, and intelligent semantic processing capabilities.
