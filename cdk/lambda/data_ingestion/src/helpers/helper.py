import logging
import boto3
from typing import Dict, Optional, Tuple
import psycopg2
from langchain_aws import BedrockEmbeddings
from langchain_postgres import PGVector
from langchain.indexes import SQLRecordManager

from processing.documents import process_agenda_documents
REGION = os.environ["REGION"]

s3 = boto3.client("s3", region_name=REGION)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_vectorstore(
    collection_name: str, 
    embeddings: BedrockEmbeddings, 
    dbname: str, 
    user: str, 
    password: str, 
    host: str, 
    port: int
) -> Optional[Tuple[PGVector, str]]:
    """
    Initialize and return a PGVector instance.
    """
    try:
        connection_string = (
            f"postgresql+psycopg://{user}:{password}@{host}:{port}/{dbname}"
        )

        logger.info("Initializing the VectorStore")
        vectorstore = PGVector(
            embeddings=embeddings,
            collection_name=collection_name,
            connection=connection_string,
            use_jsonb=True
        )

        logger.info("VectorStore initialized")
        return vectorstore, connection_string

    except Exception as e:
        logger.error(f"Error initializing vector store: {e}")
        return None
    
def store_agenda_data(
    bucket: str, 
    agenda_id: str, 
    document_type: str,  # "context" or "observation"
    file_name: str,
    vectorstore_config_dict: Dict[str, str], 
    embeddings: BedrockEmbeddings
) -> None:
    """
    Store agenda documents from an S3 bucket into the vectorstore.
    
    Args:
    bucket (str): The name of the S3 bucket.
    agenda_id (str): The research agenda ID.
    document_type (str): The document type ("context" or "observation").
    vectorstore_config_dict (Dict[str, str]): The configuration dictionary for the vectorstore.
    embeddings (BedrockEmbeddings): The embeddings instance.
    """
    vectorstore, connection_string = get_vectorstore(
        collection_name=vectorstore_config_dict['collection_name'],
        embeddings=embeddings,
        dbname=vectorstore_config_dict['dbname'],
        user=vectorstore_config_dict['user'],
        password=vectorstore_config_dict['password'],
        host=vectorstore_config_dict['host'],
        port=int(vectorstore_config_dict['port'])
    )
    
    if vectorstore:
        # define record manager
        namespace = f"pgvector/agenda_{agenda_id}_{document_type}"
        record_manager = SQLRecordManager(
            namespace, db_url=connection_string
        )
        record_manager.create_schema()

    if not vectorstore:
        logger.error("VectorStore could not be initialized")
        return

    # Process documents in the agenda folder
    process_agenda_documents(
        bucket=bucket,
        agenda=agenda_id,
        document_type=document_type,
        file_name=file_name,
        vectorstore=vectorstore,
        embeddings=embeddings,
        record_manager=record_manager
    )
