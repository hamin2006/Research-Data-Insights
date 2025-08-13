from typing import Dict
from helpers.helper import store_agenda_data

def update_vectorstore(
    bucket: str,
    agenda_id: str,
    document_type: str,  # "context" or "observation"
    file_name: str,
    doc_name: str,
    doc_description: str,
    vectorstore_config_dict: Dict[str, str],
    embeddings  # BedrockEmbeddings
) -> None:
    """
    Update the vectorstore with embeddings for agenda documents in the S3 bucket.

    Args:
    bucket (str): The name of the S3 bucket containing the agenda folders.
    agenda_id (str): The ID of the research agenda.
    document_type (str): The type of documents ("context" or "observation").
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
        vectorstore_config_dict=vectorstore_config_dict,
        embeddings=embeddings
    )
