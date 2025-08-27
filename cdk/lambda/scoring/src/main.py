# src/main.py
import os
import json
import re
import html
import logging
import unicodedata
from collections import Counter
from functools import lru_cache
from io import BytesIO
import boto3
from botocore.config import Config
import psycopg
from psycopg.rows import dict_row
import inflect

# -------------------- Config --------------------
DB_SECRET_NAME = os.environ["SM_DB_CREDENTIALS"]
SCORING_BUCKET = os.environ["BUCKET"]
REGION = os.environ.get("REGION", "ca-central-1")
RDS_PROXY_ENDPOINT = os.environ["RDS_PROXY_ENDPOINT"]

# Clients (reused across invocations)
brt = boto3.client("bedrock-runtime", region_name=REGION, config=Config(retries={"max_attempts": 3}))
secrets = boto3.client("secretsmanager", region_name=REGION)
s3 = boto3.client('s3', region_name=REGION)

_db_conn = None
db_secret = None
_inflect_engine = inflect.engine()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

# -------------------- Utilities --------------------
def clean_text(s: str) -> str:
    """Light-clean input text to reduce noise without destroying semantics."""
    if not s:
        return s
    s = unicodedata.normalize("NFKC", s)
    s = html.unescape(s)
    s = re.sub(r"https?://\S+|www\.\S+", " ", s)        # remove URLs
    s = re.sub(r"\b\S+@\S+\.\S+\b", " ", s)             # remove emails
    s = re.sub(r"\s+", " ", s).strip()                  # collapse whitespace
    return s

def normalize_model_output(s: str) -> str:
    """Normalize LLM output before extracting a number."""
    if not s:
        return s
    return unicodedata.normalize("NFKC", s).strip()

def _load_db_creds_from_secret():
    global db_secret
    if not DB_SECRET_NAME:
        return None
    if db_secret is None:
        try:
            sec = secrets.get_secret_value(SecretId=DB_SECRET_NAME)
            db_secret = json.loads(sec["SecretString"])
        except Exception as e:
            logger.error(f"Error fetching secret: {e}")
            raise
    return db_secret

def _get_db_conn():
    """Reuse a global psycopg v3 connection (best with RDS Proxy)."""
    global _db_conn
    if _db_conn is None or _db_conn.closed:
        try:
            secret = _load_db_creds_from_secret()
            connection_params = {
                'dbname': secret["dbname"],
                'user': secret["username"],
                'password': secret["password"],
                'host': RDS_PROXY_ENDPOINT,
                'port': secret["port"]
            }
            connection_string = " ".join([f"{key}={value}" for key, value in connection_params.items()])
            _db_conn = psycopg.connect(conninfo=connection_string)
            logger.info("Connected to the database!")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            if _db_conn:
                _db_conn.rollback()
                _db_conn.close()
            raise
    return _db_conn

def get_scoring_prompt(research_agenda_id: str | None) -> str:
    """
    Priority:
      1) agenda-specific prompt_text (prompt_type='scoring')
      2) global default (research_agenda_id IS NULL)
      3) built-in fallback
    """
    conn = _get_db_conn()
    with conn.cursor(row_factory=dict_row) as cur:
        if research_agenda_id:
            cur.execute("""
                SELECT prompt_text
                FROM research_agenda_prompts
                WHERE prompt_type = 'scoring' AND research_agenda_id = %s
                ORDER BY is_default DESC, updated_at DESC NULLS LAST, created_at DESC
                LIMIT 1;
            """, (research_agenda_id,))
            row = cur.fetchone()
            if row and row.get("prompt_text"):
                return row["prompt_text"]

        cur.execute("""
            SELECT prompt_text
            FROM research_agenda_prompts
            WHERE prompt_type = 'scoring' AND research_agenda_id IS NULL
            ORDER BY is_default DESC, updated_at DESC NULLS LAST, created_at DESC
            LIMIT 1;
        """)
        row = cur.fetchone()
        if row and row.get("prompt_text"):
            return row["prompt_text"]

    return "Do you think the response invokes {{metric_name}}? Provide {{metric_description}}. Limit your response to an integer number between 1 and 10. Do not explain anything further. Please adhere to these guidelines strictly.\n\nText:\n{{text}}\n"

def render_prompt(template: str, *, text: str, metric_name: str = "", metric_description: str = "", **kwargs) -> str:
    """Supports both {{text}} and {text} placeholders, plus {{metric_name}} and {{metric_description}}."""
    p = template
    # Jinja-ish replacements
    p = re.sub(r"\{\{\s*text\s*\}\}", text, p)
    p = re.sub(r"\{\{\s*metric_name\s*\}\}", metric_name, p)
    p = re.sub(r"\{\{\s*metric_description\s*\}\}", metric_description, p)
    
    # Handle any additional kwargs
    for k, v in kwargs.items():
        p = re.sub(rf"\{{\{{\s*{re.escape(k)}\s*\}}\}}", str(v), p)
    
    # Python format fallback
    try:
        p = p.format(text=text, metric_name=metric_name, metric_description=metric_description, **kwargs)
    except Exception:
        pass
    return p

# -------- Number parsing (configurable) --------
@lru_cache(maxsize=16)
def make_num_words(N: int):
    """Mapping of number words/digits → int, cached per N."""
    num_words = {}
    for i in range(1, N + 1):
        word = _inflect_engine.number_to_words(i)            # "forty-two"
        num_words[word] = i
        num_words[word.replace("-", " ")] = i                # "forty two"
        num_words[str(i)] = i                                # "42"
    return num_words

def extract_integer_score(raw: str, N: int):
    """Extract integer in [1..N] from model output: digits or words."""
    if not raw:
        return None
    s = normalize_model_output(raw).lower()

    # 1) digits
    m = re.search(r"\b(\d{1,3})\b", s)
    if m:
        val = int(m.group(1))
        if 1 <= val <= N:
            return val

    # 2) words
    NUM_WORDS = make_num_words(N)
    for w, v in NUM_WORDS.items():
        if re.search(rf"\b{re.escape(w)}\b", s):
            if 1 <= v <= N:
                return v

    return None

# -------- Bedrock invocation --------
def invoke_model(model_id: str, prompt: str) -> str:
    """Provider-normalized Bedrock call; returns raw generation text."""
    if model_id.startswith("amazon.titan"):
        body = json.dumps({"inputText": prompt})
    else:
        body = json.dumps({"prompt": prompt})

    resp = brt.invoke_model(
        modelId=model_id,
        body=body,
        contentType="application/json",
        accept="application/json"
    )
    payload = json.loads(resp["body"].read().decode("utf-8"))

    if model_id.startswith("mistral."):
        outs = payload.get("outputs", [])
        return outs[0].get("text", "") if outs else ""
    elif model_id.startswith("amazon.titan"):
        res = payload.get("results", [])
        return res[0].get("outputText", "") if res else ""
    else:
        # Llama (compat) – adjust if your account returns a different schema
        return payload.get("generation", "") or payload.get("output", "")

def majority(scores):
    return Counter(scores).most_common(1)[0][0] if scores else None

def mean(scores):
    return sum(scores) / len(scores) if scores else None

def median(scores):
    if not scores:
        return None
    sorted_scores = sorted(scores)
    n = len(sorted_scores)
    return sorted_scores[n // 2] if n % 2 == 1 else (sorted_scores[n // 2 - 1] + sorted_scores[n // 2]) / 2

# -------- Grabbing agenda id, prompt, etc --------
def parse_s3_file_path(file_key):
    # Assuming the file path is of the format: agendas/{agenda_id}/{document_type}/{original_file_name}_page_{page_num}_response_{response_num}.{file_type == 'txt'} 
    print(f"file_key:  {file_key}")

    try:
        agenda_id, document_type, filename_with_ext = file_key.split('/')[1:]
        file_name, file_type = filename_with_ext.rsplit('.', 1)

        _db_conn = _get_db_conn()
        if _db_conn is None:
            logger.error("Database connection failed. Unable to update ingestion status.")
            return

        try:
            query = """
            SELECT metric_name, metric_description, hyperparameter_settings, scoring_models, scoring_method
            FROM research_agenda
            WHERE id_research_agenda = %s;
            """
            cur = _db_conn.cursor()
            cur.execute(query, (agenda_id,))
            result = cur.fetchone()

            if result is None:
                logger.warning(f"No document found with file_path: {file_key}")
                return None

            metric_name, metric_description, hyperparameter_settings, scoring_models, scoring_method = result
            cur.close()
            
            if isinstance(scoring_models, str):
                scoring_models = json.loads(scoring_models)
            elif scoring_models is None:
                scoring_models = []

            if isinstance(hyperparameter_settings, str):
                hyperparameter_settings = json.loads(hyperparameter_settings)
            elif hyperparameter_settings is None:
                hyperparameter_settings = {}


            return agenda_id, metric_name, metric_description, hyperparameter_settings, scoring_models, scoring_method

        except Exception as e:
            if cur:
                cur.close()
            _db_conn.rollback()
            logger.error(f"Error pulling document ID from database: {e}")
            raise

    except Exception as e:
        logger.error(f"Error parsing S3 file path: {e}")
        return {
                    "statusCode": 400,
                    "body": json.dumps("Error parsing S3 file path.")
                }

def get_response_text(file_key):
    try:
        output_buffer = BytesIO()
        s3.download_fileobj(SCORING_BUCKET, file_key, output_buffer)
        output_buffer.seek(0)
        return output_buffer.read().decode('utf-8')
    except Exception as e:
        logger.error(f"Error fetching response text from S3: {e}")
        raise

def update_response_score(file_path: str, cleaned_text: str, predicted_score: float | None):
    """Update the response record with scoring results and cleaned text."""
    conn = _get_db_conn()
    try:
        with conn.cursor() as cur:
            # Update the response with the score and cleaned text
            cur.execute("""
                UPDATE individual_responses 
                SET score = %s, 
                    response_text = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE file_path = %s;
            """, (predicted_score, cleaned_text, file_path))
            
            if cur.rowcount == 0:
                logger.warning(f"No response found with file_path: {file_path}")
                return False
            
            conn.commit()
            logger.info(f"Updated response score for {file_path}: {predicted_score}")
            return True
            
    except Exception as e:
        conn.rollback()
        logger.error(f"Error updating response score: {e}")
        raise



# -------------------- Lambda handler --------------------
def handler(event, context):
    
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

        if bucket_name != SCORING_BUCKET:
            print(f"Ignoring event from non-target bucket: {bucket_name}")
            continue  # Ignore this event and move to the next one
        file_key = record['s3']['object']['key']
    
        try:

            agenda_id, metric_name, metric_description, hyperparameter_settings, scoring_models, scoring_method = parse_s3_file_path(file_key)
            response_text = get_response_text(file_key)
            # 1) fetch template from DB (agenda-specific → global → fallback)
            template = get_scoring_prompt(agenda_id)
            text = clean_text(response_text)

            # 2) render prompt with metric information
            prompt = render_prompt(template, text=text, metric_name=metric_name, metric_description=metric_description)

            # 3) score using the specified scoring method
            per_model_scores = []
            for mid in scoring_models:
                try:
                    raw = invoke_model(mid, prompt)
                    score = extract_integer_score(raw, N=10)
                    if score is not None:
                        per_model_scores.append(score)
                except Exception as e:
                    print(f"[ModelError] {mid} on {file_key}: {e}")

            # Apply the appropriate scoring method
            if scoring_method == "Mean":
                predicted_score = mean(per_model_scores)
            elif scoring_method == "Median":
                predicted_score = median(per_model_scores)
            elif scoring_method == "Majority":
                predicted_score = majority(per_model_scores)
            else:
                # Default to majority if scoring_method is not recognized
                predicted_score = majority(per_model_scores)

            # Update the database with scoring results
            update_success = update_response_score(file_key, text, predicted_score)
            
            resp = {
                "file_key": file_key,
                "text": text,
                "metric": metric_name,
                "metric_description": metric_description,
                "hyperparameter_settings": hyperparameter_settings,
                "scoring_models": scoring_models,
                "scoring_method": scoring_method,
                "prompt": prompt,
                "model_scores": per_model_scores,
                "predicted_score": predicted_score,
                "db_updated": update_success
            }

            logger.info(f"Scoring completed for {file_key}: {predicted_score}")
            
            return {
                "statusCode": 200,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps(resp)
            }
        except Exception as e:
            print(f"[HandlerError] {e}")
            return {
                "statusCode": 500,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": str(e)})
            }
    return {
        "statusCode": 400,
        "body": json.dumps("No new file upload or deletion event found.")
    }
