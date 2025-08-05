import os
import tempfile
import logging
import uuid
from io import BytesIO
from typing import List
import boto3
import fitz
import re
import traceback

from langchain_postgres import PGVector
from langchain_core.documents import Document
from langchain_aws import BedrockEmbeddings
from langchain_experimental.text_splitter import SemanticChunker
from langchain.indexes import SQLRecordManager, index

def extract_txt(bucket: str, file_key: str) -> str:
    pass

def clean_text(text: str) -> str:
    pass

def store_doc_texts(bucket: str, course: str, module: str, filename: str, output_bucket: str) -> List[str]:
    pass

def store_doc_chunks(bucket: str, filenames: List[str], vectorstore: PGVector, embeddings: BedrockEmbeddings) -> List[Document]:
    pass

def add_document(bucket: str, course: str, module: str, filename: str, vectorstore: PGVector, embeddings: BedrockEmbeddings, output_bucket: str = None) -> List[Document]:
    # store_doc_texts, store_doc_chunks
    pass

def process_documents(bucket: str, course: str, module: str, vectorstore: PGVector, embeddings: BedrockEmbeddings, record_manager: SQLRecordManager) -> None:
    # add_document, index
    pass