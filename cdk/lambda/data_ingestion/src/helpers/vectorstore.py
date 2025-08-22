from typing import Dict
from langchain_aws import BedrockEmbeddings
from helpers.helper import store_agenda_data
from psycopg2._psycopg import connection as PgConnection

def update_vectorstore(
    bucket: str,
    agenda_id: str,
    document_type: str,  # "context_documents" or "observation_documents"
    file_name: str,
    doc_name: str,
    doc_description: str,
    doc_id: str,
    db_connection: PgConnection,
    vectorstore_config_dict: Dict[str, str],
    embeddings: BedrockEmbeddings
) -> None:
    """
    Update the vectorstore with embeddings for agenda documents in the S3 bucket.

    Args:
        bucket (str): The name of the S3 bucket containing the agenda folders.
        agenda_id (str): The ID of the research agenda.
        document_type (str): The type of documents ("context_documents" or "observation_documents").
        file_name (str): The name of the file to be processed.
        doc_name (str): The display name of the document.
        doc_description (str): The description of the document.
        doc_id (str): The unique identifier for the document.
        db_connection (PgConnection): The PostgreSQL database connection object.
        vectorstore_config_dict (Dict[str, str]): The configuration dictionary for the vectorstore.
        embeddings (BedrockEmbeddings): The embeddings instance used to process the documents.

    Returns:
        None
    """
    store_agenda_data(
        bucket=bucket,
        agenda_id=agenda_id,
        document_type=document_type,
        file_name=file_name,
        doc_name=doc_name,
        doc_description=doc_description,
        doc_id=doc_id,
        db_connection=db_connection,
        vectorstore_config_dict=vectorstore_config_dict,
        embeddings=embeddings
    )
