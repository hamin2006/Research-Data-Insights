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
            CREATE TYPE prompt_type AS ENUM ('self_aggregation', 'general_rag', 'scoring');

            CREATE TABLE IF NOT EXISTS "users" (
                "user_id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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
                "id_research_agenda" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "user_id" uuid REFERENCES users(user_id),
                "agenda_name" varchar NOT NULL,
                "metric_name" varchar NOT NULL,
                "metric_description" text,
                "num_uploaded_responses" int DEFAULT 0,
                "num_uploaded_context_documents" int DEFAULT 0,
                "status" varchar CHECK ("status" IN ('active', 'archived')) DEFAULT 'active',
                "created_at" timestamp DEFAULT now(),
                "updated_at" timestamp
            );
            
            CREATE TABLE IF NOT EXISTS "research_agenda_prompts" (
                "id_research_agenda_prompt" SERIAL PRIMARY KEY,
                "research_agenda_id" int REFERENCES research_agenda(id_research_agenda),
                "prompt_type" prompt_type NOT NULL,
                "prompt_text" text NOT NULL,
                "is_default" boolean DEFAULT false,
                "created_at" timestamp DEFAULT now(),
                "updated_at" timestamp
            );

            CREATE TABLE IF NOT EXISTS "agenda_collaborators" (
                "id_agenda_collaborator" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "research_agenda_id" uuid REFERENCES research_agenda(id_research_agenda),
                "user_id" uuid REFERENCES users(user_id),
                "added_at" timestamp DEFAULT now(),
                "added_by" uuid REFERENCES users(user_id),
                UNIQUE(research_agenda_id, user_id)
            );

            CREATE TABLE IF NOT EXISTS "research_observations" (
                "id_research_observations" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "research_agenda_id" uuid REFERENCES research_agenda(id_research_agenda),
                "document_name" varchar NOT NULL,
                "file_path" varchar NOT NULL,
                "upload_status" upload_status DEFAULT 'processing',
                "created_at" timestamp DEFAULT now(),
                "updated_at" timestamp,
                "metric_score" int
            );

            CREATE TABLE IF NOT EXISTS "context_documents" (
                "id_context_doc" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "research_agenda_id" uuid REFERENCES research_agenda(id_research_agenda),
                "document_name" varchar NOT NULL,
                "file_path" varchar NOT NULL,
                "upload_status" upload_status DEFAULT 'processing',
                "description" text,
                "created_at" timestamp DEFAULT now(),
                "updated_at" timestamp
            );

            CREATE TABLE IF NOT EXISTS "chat_sessions" (
                "id_chat_session" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "research_agenda_id" uuid REFERENCES research_agenda(id_research_agenda),
                "user_id" uuid REFERENCES users(user_id),
                "session_name" varchar NOT NULL,
                "created_at" timestamp DEFAULT now(),
                "updated_at" timestamp
            );

            CREATE TABLE IF NOT EXISTS "user_interactions" (
                "id_user_interaction" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "user_id" uuid REFERENCES users(user_id),
                "research_agenda_id" uuid REFERENCES research_agenda(id_research_agenda),
                "chat_session_id" uuid REFERENCES chat_sessions(id_chat_session),
                "query_text" text NOT NULL,
                "prompt" text,
                "response_text" text,
                "timestamp" timestamp DEFAULT now(),
                "model_used" varchar,
                "temperature" float,
                "top_k" int
            );

            CREATE TABLE IF NOT EXISTS "observation_embeddings" (
                "id_observation_embeddings" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "observation_id" uuid REFERENCES research_observations(id_research_observations),
                "embedding" vector NOT NULL,
                "metadata" jsonb,
                "model_name" varchar,
                "created_at" timestamp DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS "context_document_embeddings" (
                "id_context_document_embeddings" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "context_document_id" uuid REFERENCES context_documents(id_context_doc),
                "embedding" vector NOT NULL,
                "metadata" jsonb,
                "model_name" varchar,
                "created_at" timestamp DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS "user_interaction_observations" (
                "id_user_interaction_observations" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "user_interaction_id" uuid REFERENCES user_interactions(id_user_interaction),
                "observation_id" uuid REFERENCES observation_embeddings(id_observation_embeddings)
            );

            CREATE TABLE IF NOT EXISTS "user_interaction_context_docs" (
                "id_user_interaction_context_docs" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "user_interaction_id" uuid REFERENCES user_interactions(id_user_interaction),
                "context_document_id" uuid REFERENCES context_document_embeddings(id_context_document_embeddings)
            );

            CREATE TABLE IF NOT EXISTS "rag_prompt_history" (
                "id_rag_prompt" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "user_interaction_id" uuid REFERENCES user_interactions(id_user_interaction),
                "prompt" text NOT NULL,
                "created_at" timestamp DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS "rag_interaction_history" (
                "id_rag_interaction_history" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "user_interaction_id" uuid REFERENCES user_interactions(id_user_interaction),
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