# vectorstore.py

## Table of Contents <a name="table-of-contents"></a>

- [Script Overview](#script-overview)
  - [Import Libraries](#import-libraries)
- [Detailed Function Descriptions](#detailed-function-descriptions)
  - [Function: `update_vectorstore`](#update_vectorstore)

## Script Overview <a name="script-overview"></a>

This script provides utility functions to update a vector store with new embeddings from research agenda documents stored in an S3 bucket.

**Source Code**: [vectorstore.py](../../../cdk/lambda/data_ingestion/src/helpers/vectorstore.py)

### Import Libraries <a name="import-libraries"></a>

- **typing.Dict**: Used for typing hints to define dictionaries.
- **langchain_aws.BedrockEmbeddings**: For handling document embeddings.
- **psycopg2.\_psycopg.connection.PgConnection**: For PostgreSQL database connection type safety.
- **store_agenda_data**: Helper functions for storing research agenda data in a vector store.

## Detailed Function Descriptions <a name="detailed-function-descriptions"></a>

### Function: `update_vectorstore` <a name="update_vectorstore"></a>

**Source**: [vectorstore.py lines 5-30](../../../cdk/lambda/data_ingestion/src/helpers/vectorstore.py)

#### Purpose

Updates the vector store with embeddings for research agenda documents in the specified S3 bucket.

#### Process Flow

1. **Agenda Data Storage**: Calls the `store_agenda_data` function to process documents in the S3 bucket. This function extracts the documents, creates embeddings using the `BedrockEmbeddings` instance, and stores the embeddings in the vector store with appropriate metadata.
2. **Vector Store Configuration**: The function relies on the configuration dictionary `vectorstore_config_dict` to set up the vector store connection, which includes details like the collection name, database name, and connection credentials.

#### Inputs and Outputs

- **Inputs**:
  - `bucket`: Name of the S3 bucket containing the agenda data.
  - `agenda_id`: The ID of the research agenda.
  - `document_type`: The type of documents ("context_documents" or "observation_documents").
  - `file_name`: The name of the specific file to process.
  - `doc_name`: The display name for the document.
  - `doc_description`: A description of the document's content.
  - `doc_id`: The unique identifier for the document.
  - `db_connection`: The PostgreSQL database connection object.
  - `vectorstore_config_dict`: Configuration dictionary for the vector store containing parameters like database credentials and collection name.
  - `embeddings`: Embeddings instance used to process the documents (e.g., `BedrockEmbeddings`).
- **Outputs**:
  - No return value. The function updates the vector store with new data from the S3 bucket.

[🔼 Back to top](#table-of-contents)
