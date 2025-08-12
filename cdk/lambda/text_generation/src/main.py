import os
import json
import boto3
import logging
import psycopg2
from langchain_aws import BedrockEmbeddings
from langchain.retrievers import MergerRetriever

from helpers.vectorstore import get_agenda_retriever
from helpers.chat import get_bedrock_llm, format_research_query, create_dynamodb_history_table, get_response, update_session_name

# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

# Environment variables
DB_SECRET_NAME = os.environ["SM_DB_CREDENTIALS"]
REGION = os.environ["REGION"]
RDS_PROXY_ENDPOINT = os.environ["RDS_PROXY_ENDPOINT"]
BEDROCK_LLM_PARAM = os.environ["BEDROCK_LLM_PARAM"]
EMBEDDING_MODEL_PARAM = os.environ["EMBEDDING_MODEL_PARAM"]
TABLE_NAME_PARAM = os.environ["TABLE_NAME_PARAM"]

# AWS Clients
secrets_manager_client = boto3.client("secretsmanager")
ssm_client = boto3.client("ssm", region_name=REGION)
bedrock_runtime = boto3.client("bedrock-runtime", region_name=REGION)

# Cached resources
connection = None
db_secret = None
BEDROCK_LLM_ID = None
EMBEDDING_MODEL_ID = None
TABLE_NAME = None
embeddings = None

def get_secret(secret_name, expect_json=True):
    global db_secret
    if db_secret is None:
        try:
            response = secrets_manager_client.get_secret_value(SecretId=secret_name)["SecretString"]
            db_secret = json.loads(response) if expect_json else response
        except Exception as e:
            logger.error(f"Error fetching secret: {e}")
            raise
    return db_secret

def get_parameter(param_name, cached_var):
    if cached_var is None:
        try:
            response = ssm_client.get_parameter(Name=param_name, WithDecryption=True)
            cached_var = response["Parameter"]["Value"]
        except Exception as e:
            logger.error(f"Error fetching parameter {param_name}: {e}")
            raise
    return cached_var

def initialize_constants():
    global BEDROCK_LLM_ID, EMBEDDING_MODEL_ID, TABLE_NAME, embeddings
    BEDROCK_LLM_ID = get_parameter(BEDROCK_LLM_PARAM, BEDROCK_LLM_ID)
    EMBEDDING_MODEL_ID = get_parameter(EMBEDDING_MODEL_PARAM, EMBEDDING_MODEL_ID)
    TABLE_NAME = get_parameter(TABLE_NAME_PARAM, TABLE_NAME)

    if embeddings is None:
        embeddings = BedrockEmbeddings(
            model_id=EMBEDDING_MODEL_ID,
            client=bedrock_runtime,
            region_name=REGION,
        )
    
    create_dynamodb_history_table(TABLE_NAME)

def connect_to_db():
    global connection
    if connection is None or connection.closed:
        try:
            secret = get_secret(DB_SECRET_NAME)
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
            raise
    return connection
    
def handler(event, context):
    logger.info("Research RAG Lambda function is called!")
    logger.info(event)
    initialize_constants()


    query_params = event.get("queryStringParameters", {})
    path_params = event.get("pathParameters", {})
    model_id = query_params.get("model_id", BEDROCK_LLM_ID)  # Use frontend selection or default


    
    agenda_id = path_params.get("agenda_id", "")
    session_id = query_params.get("session_id", "")
    document_type = query_params.get("document_type", "context")  # default to context docs

    if not agenda_id:
        return {
            'statusCode': 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Missing required parameter: agenda_id')
        }

    if not session_id:
        return {
            'statusCode': 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Missing required parameter: session_id')
        }
    
    body = {} if event.get("body") is None else json.loads(event.get("body"))
    question = body.get("message_content", "")
    selected_documents = body.get("selected_documents", [])  
    
     try:
        llm = get_bedrock_llm(model_id)
    except Exception as e:
        logger.error(f"Error getting LLM from Bedrock: {e}")
        # Fallback to default model
        llm = get_bedrock_llm(BEDROCK_LLM_ID)
    except Exception as e:
        logger.error(f"Error getting LLM from Bedrock: {e}")
        return {
            'statusCode': 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Error getting LLM from Bedrock')
        }
    

    # Pass selected_documents to get_agenda_retriever:
    history_aware_retriever = get_agenda_retriever(
        llm=llm,
        agenda_id=agenda_id,
        document_type=document_type,
        vectorstore_config_dict=vectorstore_config_dict,
        embeddings=embeddings,
        selected_documents=selected_documents  # Add this parameter
    )

    
    if not question:
        return {
            'statusCode': 400,
            'body': json.dumps('Missing message_content in request body')
        }
    
    research_query = format_research_query(question)
    
    try:
        db_secret = get_secret(DB_SECRET_NAME)
        vectorstore_config_dict = {
            'dbname': db_secret["dbname"],
            'user': db_secret["username"],
            'password': db_secret["password"],
            'host': RDS_PROXY_ENDPOINT,
            'port': db_secret["port"]
        }
        
    except Exception as e:
        logger.error(f"Error retrieving vectorstore config: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps('Error retrieving vectorstore config')
        }
    
    try:
        history_aware_retriever = get_agenda_retriever(
            llm=llm,
            agenda_id=agenda_id,
            document_type=document_type,
            vectorstore_config_dict=vectorstore_config_dict,
            embeddings=embeddings,
        )
        
        # Check if retriever was created successfully
        if history_aware_retriever is None:
            logger.warning(f"No documents found for agenda {agenda_id}, type {document_type}")
            return {
                'statusCode': 200,
                'headers': {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                },
                'body': json.dumps({
                    "session_name": "Research Chat",
                    "response": "No documents have been uploaded for this research agenda yet. Please upload some documents first.",
                    "agenda_id": agenda_id
                })
            }
    
        # Test retrieval
        probe = history_aware_retriever.get_relevant_documents("test query")
        logger.info(f"RAG probe docs: {len(probe)}")

    except Exception as e:
        logger.error(f"Error creating retriever: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps('Error creating retriever')
        }

    
    try:
        connection = connect_to_db()
        response = get_response(
            query=research_query,
            agenda_id=agenda_id,
            llm=llm,
            history_aware_retriever=history_aware_retriever,
            table_name=TABLE_NAME,
            session_id=session_id,
            connection=connection
        )
        
        try:
            user_cognito_id = (
                event.get("requestContext", {})
                    .get("authorizer", {})
                    .get("userId")
            )

            with connection.cursor() as cur:
                user_id = None
                if user_cognito_id:
                    cur.execute(
                        'SELECT user_id FROM users WHERE cognito_id = %s LIMIT 1',
                        (user_cognito_id,)
                    )
                    row = cur.fetchone()
                    if row:
                        user_id = row[0]

                # Insert the interaction (query + response)
                cur.execute(
                    """
                    INSERT INTO user_interactions
                    (user_id, research_agenda_id, chat_session_id,
                    query_text, response_text, model_used, temperature)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        user_id,               # can be None if not found
                        agenda_id,
                        session_id,
                        question,              # original user message
                        response.get("response", ""),  # LLM answer text
                        model_id,
                        0                      # your temperature
                    )
                )

                # Keep sessions ordered by last activity
                cur.execute(
                    "UPDATE chat_sessions SET updated_at = now() WHERE id_chat_session = %s",
                    (session_id,)
                )

            connection.commit()
            logger.info("Saved user_interactions row and updated chat_sessions.updated_at")
        except Exception as e:
            connection.rollback()
            logger.error(f"Failed to save interaction: {e}")
        # --- END SAVE TURN ---

    except Exception as e:
        logger.error(f"Error getting response: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps('Error getting response')
        }
    
    try:
        potential_session_name = update_session_name(TABLE_NAME, session_id, BEDROCK_LLM_ID)
        session_name = potential_session_name if potential_session_name else "Research Chat"
    except Exception as e:
        logger.error(f"Error updating session name: {e}")
        session_name = "Research Chat"
    
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
        },
        "body": json.dumps({
            "session_name": session_name,
            "response": response.get("response", "Failed to generate response"),
            "agenda_id": response.get("agenda_id", agenda_id)
        })
    }
