import os
import json
import boto3
import psycopg2
from psycopg2.extensions import AsIs
import secrets

DB_SECRET_NAME = os.environ["DB_SECRET_NAME"]
DB_USER_SECRET_NAME = os.environ["DB_USER_SECRET_NAME"]
DB_PROXY = os.environ["DB_PROXY"]

sm_client = boto3.client("secretsmanager")

def getDbSecret():
    response = sm_client.get_secret_value(SecretId=DB_SECRET_NAME)["SecretString"]
    secret = json.loads(response)
    return secret

def createConnection():
    connection = psycopg2.connect(
        user=dbSecret["username"],
        password=dbSecret["password"],
        host=dbSecret["host"],
        dbname=dbSecret["dbname"],
    )
    return connection

dbSecret = getDbSecret()
connection = createConnection()

def handler(event, context):
    global connection
    if connection.closed:
        connection = createConnection()
    
    cursor = connection.cursor()
    try:
        sqlTableCreation = """
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            CREATE EXTENSION IF NOT EXISTS "vector";

            CREATE TYPE upload_status AS ENUM ('uploaded', 'processing', 'failed', 'skipped');

            CREATE TABLE IF NOT EXISTS "users" (
                "user_id" SERIAL PRIMARY KEY,
                "cognito_id" varchar,
                "user_email" varchar UNIQUE,
                "username" varchar,
                "first_name" varchar,
                "last_name" varchar,
                "time_account_created" timestamp,
                "roles" varchar[],
                "last_sign_in" timestamp
            );

            CREATE TABLE IF NOT EXISTS "research_agenda" (
                "id_research_agenda" SERIAL PRIMARY KEY,
                "user_id" int REFERENCES users(user_id),
                "agenda_name" varchar NOT NULL,
                "metric_name" varchar NOT NULL,
                "metric_description" text,
                "num_uploaded_responses" int DEFAULT 0,
                "num_uploaded_context_documents" int DEFAULT 0,
                "created_at" timestamp DEFAULT now(),
                "updated_at" timestamp
            );

            CREATE TABLE IF NOT EXISTS "research_observations" (
                "id_research_observations" SERIAL PRIMARY KEY,
                "research_agenda_id" int REFERENCES research_agenda(id_research_agenda),
                "document_name" varchar NOT NULL,
                "file_path" varchar NOT NULL,
                "created_at" timestamp DEFAULT now(),
                "updated_at" timestamp,
                "metric_score" int
            );

            CREATE TABLE IF NOT EXISTS "context_documents" (
                "id_context_doc" SERIAL PRIMARY KEY,
                "research_agenda_id" int REFERENCES research_agenda(id_research_agenda),
                "document_name" varchar NOT NULL,
                "file_path" varchar NOT NULL,
                "description" text,
                "created_at" timestamp DEFAULT now(),
                "updated_at" timestamp
            );

            CREATE TABLE IF NOT EXISTS "user_interactions" (
                "id_user_interaction" SERIAL PRIMARY KEY,
                "user_id" int REFERENCES users(user_id),
                "research_agenda_id" int REFERENCES research_agenda(id_research_agenda),
                "query_text" text NOT NULL,
                "prompt" text,
                "response_text" text,
                "timestamp" timestamp DEFAULT now(),
                "model_used" varchar,
                "temperature" float,
                "top_k" int
            );

            CREATE TABLE IF NOT EXISTS "observation_embeddings" (
                "id_observation_embeddings" SERIAL PRIMARY KEY,
                "observation_id" int REFERENCES research_observations(id_research_observations),
                "embedding" vector NOT NULL,
                "metadata" jsonb,
                "model_name" varchar,
                "created_at" timestamp DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS "context_document_embeddings" (
                "id_context_document_embeddings" SERIAL PRIMARY KEY,
                "context_document_id" int REFERENCES context_documents(id_context_doc),
                "embedding" vector NOT NULL,
                "metadata" jsonb,
                "model_name" varchar,
                "created_at" timestamp DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS "user_interaction_observations" (
                "id_user_interaction_observations" SERIAL PRIMARY KEY,
                "user_interaction_id" int REFERENCES user_interactions(id_user_interaction),
                "observation_id" int REFERENCES observation_embeddings(id_observation_embeddings)
            );

            CREATE TABLE IF NOT EXISTS "user_interaction_context_docs" (
                "id_user_interaction_context_docs" SERIAL PRIMARY KEY,
                "user_interaction_id" int REFERENCES user_interactions(id_user_interaction),
                "context_document_id" int REFERENCES context_document_embeddings(id_context_document_embeddings)
            );

            CREATE TABLE IF NOT EXISTS "rag_prompt_history" (
                "user_id" SERIAL PRIMARY KEY,
                "user_interaction_id" int REFERENCES user_interactions(id_user_interaction),
                "prompt" text NOT NULL,
                "created_at" timestamp DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS "rag_interaction_history" (
                "id_rag_interaction_history" SERIAL PRIMARY KEY,
                "user_interaction_id" int REFERENCES user_interactions(id_user_interaction),
                "query_text" text NOT NULL,
                "response_text" text,
                "used_observation_ids" text,
                "used_context_document_ids" text,
                "timestamp" timestamp DEFAULT now()
            );
        """

        cursor.execute(sqlTableCreation)
        connection.commit()

        # Create users with limited permissions
        username = secrets.token_hex(8)
        password = secrets.token_hex(16)
        usernameTableCreator = secrets.token_hex(8)
        passwordTableCreator = secrets.token_hex(16)

        sqlCreateUser = """
            DO $$
            BEGIN
                CREATE ROLE readwrite;
            EXCEPTION
                WHEN duplicate_object THEN
                    RAISE NOTICE 'Role already exists.';
            END
            $$;

            GRANT CONNECT ON DATABASE postgres TO readwrite;
            GRANT USAGE ON SCHEMA public TO readwrite;
            GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO readwrite;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO readwrite;
            GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO readwrite;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO readwrite;

            CREATE USER "%s" WITH PASSWORD '%s';
            GRANT readwrite TO "%s";
        """
        
        sqlCreateTableCreator = """
            DO $$
            BEGIN
                CREATE ROLE tablecreator;
            EXCEPTION
                WHEN duplicate_object THEN
                    RAISE NOTICE 'Role already exists.';
            END
            $$;

            GRANT CONNECT ON DATABASE postgres TO tablecreator;
            GRANT USAGE, CREATE ON SCHEMA public TO tablecreator;
            GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tablecreator;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tablecreator;
            GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO tablecreator;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO tablecreator;

            CREATE USER "%s" WITH PASSWORD '%s';
            GRANT tablecreator TO "%s";
        """

        cursor.execute(sqlCreateUser, (AsIs(username), AsIs(password), AsIs(username)))
        connection.commit()
        cursor.execute(sqlCreateTableCreator, (AsIs(usernameTableCreator), AsIs(passwordTableCreator), AsIs(usernameTableCreator)))
        connection.commit()

        # Store credentials in Secrets Manager
        authInfoTableCreator = {"username": usernameTableCreator, "password": passwordTableCreator}
        dbSecret.update(authInfoTableCreator)
        sm_client.put_secret_value(SecretId=DB_PROXY, SecretString=json.dumps(dbSecret))

        authInfo = {"username": username, "password": password}
        dbSecret.update(authInfo)
        sm_client.put_secret_value(SecretId=DB_USER_SECRET_NAME, SecretString=json.dumps(dbSecret))

        cursor.close()
        connection.close()
        print("Research Data Insights initialization completed")
        
    except Exception as e:
        print(e)