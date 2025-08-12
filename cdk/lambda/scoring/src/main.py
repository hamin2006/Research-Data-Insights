# src/main.py
import os
import json
import re
import html
import unicodedata
from collections import Counter
from functools import lru_cache

import boto3
from botocore.config import Config
import psycopg
from psycopg.rows import dict_row
import inflect

# -------------------- Config --------------------
REGION = os.environ.get("AWS_REGION", "ca-central-1")
MODEL_IDS = os.environ.get(
    "MODEL_IDS",
    "meta.llama3-8b-instruct-v1:0,mistral.mistral-large-2402-v1:0,amazon.titan-text-express-v1"
).split(",")

# DB: either plain env vars or Secrets Manager (DB_SECRET_ARN)
DB_HOST = os.environ.get("DB_HOST")
DB_PORT = int(os.environ.get("DB_PORT", "5432"))
DB_NAME = os.environ.get("DB_NAME")
DB_USER = os.environ.get("DB_USER")
DB_PASSWORD = os.environ.get("DB_PASSWORD")
DB_SECRET_ARN = os.environ.get("DB_SECRET_ARN")

# Clients (reused across invocations)
brt = boto3.client("bedrock-runtime", region_name=REGION, config=Config(retries={"max_attempts": 3}))
secrets = boto3.client("secretsmanager", region_name=REGION)

_db_conn = None
_inflect_engine = inflect.engine()

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
    if not DB_SECRET_ARN:
        return None
    sec = secrets.get_secret_value(SecretId=DB_SECRET_ARN)
    data = json.loads(sec["SecretString"])
    return {
        "host": data.get("host", DB_HOST),
        "port": int(data.get("port", DB_PORT or 5432)),
        "dbname": data.get("dbname", DB_NAME),
        "user": data.get("username", DB_USER),
        "password": data.get("password", DB_PASSWORD),
    }

def _get_db_conn():
    """Reuse a global psycopg v3 connection (best with RDS Proxy)."""
    global _db_conn
    if _db_conn and not _db_conn.closed:
        return _db_conn
    creds = {"host": DB_HOST, "port": DB_PORT, "dbname": DB_NAME, "user": DB_USER, "password": DB_PASSWORD}
    from_secret = _load_db_creds_from_secret()
    if from_secret:
        creds = from_secret
    _db_conn = psycopg.connect(
        host=creds["host"], port=creds["port"], dbname=creds["dbname"],
        user=creds["user"], password=creds["password"],
        connect_timeout=5, autocommit=True
    )
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

# -------------------- Lambda handler --------------------
def handler(event, context):
    """
    Request (via API Gateway or direct invoke):
    {
      "agenda_id": "<uuid-or-null>",
      "max_score": 5,                 # optional; default 5
      "items": [{"id": "r1", "text": "..."}],
      "model_ids": ["..."]            # optional override
    }
    """
    try:
        body = event.get("body") if isinstance(event, dict) and "body" in event else event
        if isinstance(body, str):
            body = json.loads(body)

        agenda_id  = (body or {}).get("agenda_id")
        max_score  = int((body or {}).get("max_score", 5))
        items      = (body or {}).get("items", [])
        model_ids  = (body or {}).get("model_ids") or MODEL_IDS

        # 1) fetch template from DB (agenda-specific → global → fallback)
        template = get_scoring_prompt(agenda_id)

        results = []
        for item in items:
            rid  = item.get("id")
            text = clean_text(item.get("text", ""))

            # 2) render per-item prompt
            prompt = render_prompt(template, text=text)

            # 3) score via majority vote
            per_model_scores = []
            for mid in model_ids:
                try:
                    raw = invoke_model(mid, prompt)
                    score = extract_integer_score(raw, N=max_score)
                    if score is not None:
                        per_model_scores.append(score)
                except Exception as e:
                    print(f"[ModelError] {mid} on {rid}: {e}")

            results.append({
                "id": rid,
                "text": text,
                "model_scores": per_model_scores,
                "predicted_score": majority(per_model_scores)
            })

        resp = {"results": results}
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
