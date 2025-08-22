# helper.py

## Table of Contents <a name="table-of-contents"></a>

- [Script Overview](#script-overview)
  - [Import Libraries](#import-libraries)
  - [AWS and Database Setup](#aws-and-database-setup)
  - [Helper Functions](#helper-functions)
  - [Main Functions](#main-functions)
  - [Execution Flow](#execution-flow)
- [Detailed Function Descriptions](#detailed-function-descriptions)
  - [Function: `get_vectorstore`](#get_vectorstore)
  - [Function: `store_agenda_data`](#store_agenda_data)

## Script Overview <a name="script-overview"></a>

This script is designed to interact with an AWS S3 bucket, process research agenda documents, and store the extracted data into a PostgreSQL-based vector store using LangChain. The script supports embedding documents, chunking them, and managing metadata in the vector store for research data insights.

**Source Code**: [helper.py](../../../cdk/lambda/data_ingestion/src/helpers/helper.py)

### Import Libraries <a name="import-libraries"></a>

- **logging**: Used for logging script actions and errors.
- **boto3**: AWS SDK for interacting with S3.
- **psycopg2**: For interacting with PostgreSQL databases with enhanced type safety using `PgConnection`.
- **BedrockEmbeddings**: LangChain AWS embeddings instance for handling document embeddings. This project uses the Amazon Titan Text Embeddings V2 model to generate embeddings.
- **PGVector**: PostgreSQL-based vector store for storing and retrieving vectorized documents.
- **SQLRecordManager**: For managing the document records in the database.
- **process_agenda_documents**: A helper function from `processing.documents` to process agenda documents and add them to the vector store.

### AWS and Database Setup <a name="aws-and-database-setup"></a>

- **boto3.client('s3')**: Initializes the S3 client to interact with AWS S3, used for fetching research agenda documents from S3 buckets.

### Helper Functions <a name="helper-functions"></a>

- **get_vectorstore**: Initializes and returns a PGVector instance connected to the PostgreSQL database. It handles connection setup and error handling.

### Main Functions <a name="main-functions"></a>

- **store_agenda_data**: Processes research agenda documents from an S3 bucket, extracts text, chunks the text, embeds the chunks, and stores the data in a vector store with appropriate metadata.

### Execution Flow <a name="execution-flow"></a>

1. **AWS S3**: The script fetches documents from an S3 bucket organized by research agenda.
2. **PostgreSQL Connection**: A PGVector instance is created and connected to the PostgreSQL database.
3. **Document Processing**: Research agenda documents (context_documents or observation_documents types) are processed, chunked, and embedded.
4. **Vector Store**: The processed chunks are stored in the vector store with metadata for retrieval and search.

## Detailed Function Descriptions <a name="detailed-function-descriptions"></a>

### Function: `get_vectorstore` <a name="get_vectorstore"></a>

**Source**: [helper.py lines 25-48](../../../cdk/lambda/data_ingestion/src/helpers/helper.py)

#### Purpose

Initializes and returns a `PGVector` instance that connects to a PostgreSQL database and prepares a vector store for storing embedded document data.

#### Process Flow

1. **Database Connection Setup**:
   - Creates a PostgreSQL connection string using the provided database credentials.
   - Uses the postgresql+psycopg format for SQLAlchemy compatibility.
2. **Vector Store Initialization**:
   - Constructs a PGVector instance using the connection string and collection name.
   - Enables JSONB support for metadata storage.
   - If successful, returns the initialized PGVector instance and connection string for further use.
3. **Error Handling**:
   - Captures and logs any errors that occur during vector store initialization.

#### Inputs and Outputs

- **Inputs**:
  - `collection_name`: The name of the collection in the vector store.
  - `embeddings`: The BedrockEmbeddings instance for creating embeddings.
  - `dbname`: Database name.
  - `user`: Database user.
  - `password`: Database password.
  - `host`: Host for the PostgreSQL database.
  - `port`: Port for the PostgreSQL database.
- **Outputs**:
  - Returns the initialized `PGVector` instance and the connection string if successful.
  - Returns `None` if an error occurred during setup.

### Function: `store_agenda_data` <a name="store_agenda_data"></a>

**Source**: [helper.py lines 50-95](../../../cdk/lambda/data_ingestion/src/helpers/helper.py)

#### Purpose

Processes research agenda documents from an S3 bucket and stores them into the vector store with appropriate metadata, allowing for efficient document retrieval via embeddings.

#### Process Flow

1. **Initialize Vector Store**:
   - Calls `get_vectorstore` to initialize the PGVector instance based on the configuration dictionary and embeddings.
   - If the vector store initialization fails, logs the error and terminates the process.
2. **Set Up Document Store**:
   - Defines a `SQLRecordManager` with a namespace specific to the agenda and document type to manage document records in the vector store.
   - Creates the schema for the record manager.
3. **Document Processing**:
   - Calls the `process_agenda_documents` function, which processes the documents stored in the S3 bucket under the specified agenda folder.
   - Extracts text, chunks the documents, embeds the chunks, and stores them in the vector store with metadata including document name, description, and type.
4. **Logging and Error Handling**:
   - Logs messages for each significant step of the process, including any errors encountered.

#### Inputs and Outputs

- **Inputs**:
  - `bucket`: The name of the S3 bucket containing the agenda data.
  - `agenda_id`: The research agenda ID.
  - `document_type`: The type of documents ("context_documents" or "observation_documents").
  - `file_name`: The name of the specific file to process.
  - `doc_name`: The display name for the document.
  - `doc_description`: A description of the document's content.
  - `doc_id`: The unique identifier for the document.
  - `db_connection`: The PostgreSQL database connection object.
  - `vectorstore_config_dict`: A dictionary containing the vector store configuration, including database credentials and collection name.
  - `embeddings`: The BedrockEmbeddings instance used for generating document embeddings.
- **Outputs**:
  - No return value, but the function stores processed document data in the vector store for later retrieval.

[🔼 Back to top](#table-of-contents)
