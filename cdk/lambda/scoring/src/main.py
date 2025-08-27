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

    return "You are a rater. Read the text and output ONLY a single integer 1-5.\n\nText:\n{{text}}\n"

def render_prompt(template: str, *, text: str, **kwargs) -> str:
    """Supports both {{text}} and {text} placeholders."""
    p = template
    # Jinja-ish
    p = re.sub(r"\{\{\s*text\s*\}\}", text, p)
    for k, v in kwargs.items():
        p = re.sub(rf"\{{\{{\s*{re.escape(k)}\s*\}}\}}", str(v), p)
    # Python format
    try:
        p = p.format(text=text, **kwargs)
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

# -------- Grabbing agenda id, prompt, etc --------
def parse_s3_file_path(file_key):
    # Assuming the file path is of the format: agendas/{agenda_id}/{document_type}/{original_file_name}_page_{page_num}_response_{response_num}.{file_type == 'txt'} 
    print(f"file_key: {file_key}")

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
            FROM context_documents
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
        agenda_id, metric_name, metric_description, hyperparameter_settings, scoring_models, scoring_method = parse_s3_file_path(file_key)
        response_text = get_response_text(file_key)
    
    try:

        # 1) fetch template from DB (agenda-specific → global → fallback)
        template = get_scoring_prompt(agenda_id)
        text = clean_text(response_text)

        # 2) render prompt
        prompt = render_prompt(template, text=text)

        # 3) score via majority vote
        per_model_scores = []
        for mid in scoring_models:
            try:
                raw = invoke_model(mid, prompt)
                score = extract_integer_score(raw, N=10)
                if score is not None:
                    per_model_scores.append(score)
            except Exception as e:
                print(f"[ModelError] {mid} on {file_key}: {e}")

        resp = {
            "file_key": file_key,
            "text": text,
            "model_scores": per_model_scores,
            "predicted_score": majority(per_model_scores)
        }
        
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
