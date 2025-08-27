import os
import json
import boto3
import psycopg2
from psycopg2._psycopg import connection as PgConnection
import logging

from helpers.vectorstore import update_vectorstore
from langchain_aws import BedrockEmbeddings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

# Environment variables
DB_SECRET_NAME = os.environ["SM_DB_CREDENTIALS"]
REGION = os.environ["REGION"]
RDI_DATA_INGESTION_BUCKET = os.environ["BUCKET"]
EMBEDDING_BUCKET_NAME = os.environ["EMBEDDING_BUCKET_NAME"]
RDS_PROXY_ENDPOINT = os.environ["RDS_PROXY_ENDPOINT"]
EMBEDDING_MODEL_PARAM = os.environ["EMBEDDING_MODEL_PARAM"]

# AWS Clients
secrets_manager_client = boto3.client("secretsmanager", region_name=REGION)
ssm_client = boto3.client("ssm", region_name=REGION)
bedrock_runtime = boto3.client("bedrock-runtime", region_name=REGION)

# Cached resources
connection = None
db_secret = None
EMBEDDING_MODEL_ID = None

def get_secret():
    global db_secret
    if db_secret is None:
        try:
            response = secrets_manager_client.get_secret_value(SecretId=DB_SECRET_NAME)["SecretString"]
            db_secret = json.loads(response)
        except Exception as e:
            logger.error(f"Error fetching secret: {e}")
            raise
    return db_secret

def get_parameter():
    global EMBEDDING_MODEL_ID
    if EMBEDDING_MODEL_ID is None:
        try:
            response = ssm_client.get_parameter(Name=EMBEDDING_MODEL_PARAM, WithDecryption=True)
            EMBEDDING_MODEL_ID = response["Parameter"]["Value"]
        except Exception as e:
            logger.error(f"Error fetching parameter {EMBEDDING_MODEL_PARAM}: {e}")
            raise
    return EMBEDDING_MODEL_ID

def connect_to_db() -> PgConnection:
    global connection
    if connection is None or connection.closed:
        try:
            secret = get_secret()
            connection_params = {
                'dbname': secret["dbname"],
                'user': secret["username"],
                'password': secret["password"],
                'host': RDS_PROXY_ENDPOINT,
                'port': secret["port"]
            }
            connection_string = " ".join([f"{key}={value}" for key, value in connection_params.items()])
            connection = psycopg2.connect(connection_string)
            logger.info("Connected to the database!")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            if connection:
                connection.rollback()
                connection.close()
            raise
    return connection

def parse_s3_file_path(file_key):
    # Assuming the file path is of the format: agendas/{agenda_id}/{document_type}/{file_name}.{file_type}
    print(f"file_key: {file_key}")

    try:
        agenda_id, document_type, filename_with_ext = file_key.split('/')[1:]
        file_name, file_type = filename_with_ext.rsplit('.', 1)

        connection = connect_to_db()
        if connection is None:
            logger.error("Database connection failed. Unable to update ingestion status.")
            return

        try:
            if document_type == "context_documents":
                query = """
                SELECT id_context_doc, document_name, description
                FROM context_documents
                WHERE file_path = %s;
                """
            elif document_type == "observation_documents":
                query = """
                SELECT id_research_observations, document_name
                FROM research_observations
                WHERE file_path = %s;
                """
            else:
                raise ValueError(f"Unknown document type: {document_type}")

            cur = connection.cursor()
            cur.execute(query, (file_key,))
            result = cur.fetchone()

            if result is None:
                logger.warning(f"No document found with file_path: {file_key}")
                return None

            if document_type == "context_documents":
                doc_id, doc_name, doc_description = result
                logger.info(f"Found context document: {doc_name} with description: {doc_description}")
            else:
                doc_id, doc_name = result
                doc_description = ""
                logger.info(f"Found observation document: {doc_name}")

            cur.close()
            print(f"doc_id: {doc_id}, name: {doc_name}")

            return agenda_id, document_type, file_name, file_type, doc_id, doc_name, doc_description

        except Exception as e:
            if cur:
                cur.close()
            connection.rollback()
            logger.error(f"Error pulling document ID from database: {e}")
            raise

    except Exception as e:
        logger.error(f"Error parsing S3 file path: {e}")
        return {
                    "statusCode": 400,
                    "body": json.dumps("Error parsing S3 file path.")
                }

def insert_file_into_db(module_id, file_name, file_type, file_path, bucket_name):
    pass

def update_vectorstore_from_s3(bucket, agenda_id, document_type, file_name, doc_id, doc_name, doc_description):
    logger.info(f"Starting vectorstore update for file: {file_name}")
    logger.info(f"Bucket: {bucket}")
    logger.info(f"Full path: agendas/{agenda_id}/{document_type}/{file_name}")
    
    embeddings = BedrockEmbeddings(
        model_id=get_parameter(),
        client=bedrock_runtime,
        region_name=REGION
    )

    secret = get_secret()

    vectorstore_config_dict = {
        'collection_name': f'{doc_id}',
        'dbname': secret["dbname"],
        'user': secret["username"],
        'password': secret["password"],
        'host': RDS_PROXY_ENDPOINT,
        'port': secret["port"]
    }

    try:
        update_vectorstore(
            bucket=bucket,
            agenda_id=agenda_id,
            document_type=document_type,
            file_name=file_name,
            doc_name=doc_name,
            doc_description=doc_description,
            doc_id=doc_id,
            db_connection=connect_to_db(),
            vectorstore_config_dict=vectorstore_config_dict,
            embeddings=embeddings
        )
        logger.info("Vectorstore update completed successfully")
    except Exception as e:
        logger.error(f"Error updating vectorstore: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        raise

def handler(event, context):
    # get_secret, get_parameter, connect_to_db, parse_s3_file_path, insert_file_into_db, update_vectorstore_from_s3
    records = event.get('Records', [])
    if not records:
        return {
            "statusCode": 400,
            "body": json.dumps("No valid S3 event found.")
        }

    for record in records:
        event_name = record['eventName']
        bucket_name = record['s3']['bucket']['name']
        print(f"Processing event: {event_name} for bucket: {bucket_name}")

        # Only process files from the RDI_DATA_INGESTION_BUCKET
        if bucket_name != RDI_DATA_INGESTION_BUCKET:
            print(f"Ignoring event from non-target bucket: {bucket_name}")
            continue  # Ignore this event and move to the next one
        file_key = record['s3']['object']['key']

        # if event_name.startswith('ObjectCreated:'):
        # Parse the file path
        agenda_id, document_type, file_name, file_type, doc_id, doc_name, doc_description = parse_s3_file_path(file_key)
        if not agenda_id or not document_type or not file_name or not file_type or not doc_id:
            return {
                "statusCode": 400,
                "body": json.dumps("Error parsing S3 file path.")
            }

        try:
            update_vectorstore_from_s3(bucket_name, agenda_id, document_type, file_name, doc_id, doc_name, doc_description)
            logger.info(f"Vectorstore updated successfully for module for agenda {agenda_id} {document_type} {file_name}.")
        except Exception as e:
            logger.error(f"Error updating vectorstore for agenda {agenda_id} {document_type} {file_name}: {e}")
            return {
                "statusCode": 500,
                "body": json.dumps(f"File inserted, but error updating vectorstore: {e}")
            }

        connection = connect_to_db()
        if connection is None:
            logger.error("Database connection failed. Unable to update ingestion status.")
            return

        try:
            if document_type == "context_documents":
                query = """
                    UPDATE context_documents
                    SET upload_status = 'uploaded'
                    WHERE id_context_doc = %s;
                """
            elif document_type == "observation_documents":
                query = """
                    UPDATE research_observations
                    SET upload_status = 'uploaded'
                    WHERE id_research_observations = %s;
                """
            cur = connection.cursor()
            cur.execute(query, (doc_id,))
            connection.commit()

            cur.close()
            logger.info(f"Updated ingestion status for {document_type} with ID {doc_id} to 'uploaded'.")

        except Exception as e:
            if cur:
                cur.close()
            connection.rollback()
            logger.error(f"Error updating ingestion status: {e}")
            raise            

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "New file inserted into database.",
                "location": f"s3://{bucket_name}/{file_key}"
            })
        }

    return {
        "statusCode": 400,
        "body": json.dumps("No new file upload or deletion event found.")
    }