import logging
import boto3
from typing import Dict, Optional
import psycopg2

from langchain_aws import BedrockEmbeddings
from langchain_postgres import PGVector
from langchain.indexes import SQLRecordManager

from processing.documents import process_documents

def get_vectorstore(collection_name: str, embeddings: BedrockEmbeddings, dbname: str, user: str, password: str, host: str, port: int) -> Optional[PGVector]:
    pass

def store_module_data(bucket: str, course: str, module: str, vectorstore_config_dict: Dict[str, str], embeddings: BedrockEmbeddings) -> None:
    # get_vectorstore, process_documents
    pass