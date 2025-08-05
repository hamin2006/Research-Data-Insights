import os
import json
import boto3
import psycopg2
import logging
from datetime import datetime, timezone

from helpers.vectorstore import update_vectorstore
from langchain_aws import BedrockEmbeddings

def get_secret():
    pass

def get_parameter():
    pass

def connect_to_db():
    pass

def parse_s3_file_path(file_key):
    pass

def insert_file_into_db(module_id, file_name, file_type, file_path, bucket_name):
    pass

def update_vectorstore_from_s3(bucket, course_id, module_id):
    # BedrockEmbeddings, get_secret, get_parameter, update_vectorstore
    pass

def handler(event, context):
    # get_secret, get_parameter, connect_to_db, parse_s3_file_path, insert_file_into_db, update_vectorstore_from_s3
    pass