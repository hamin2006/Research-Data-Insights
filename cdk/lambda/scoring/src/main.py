import os
import json
import re
from collections import Counter
import boto3
from botocore.config import Config

# --- Postgres (psycopg v3)
import psycopg
from psycopg.rows import dict_row

# ---------- Config ----------
REGION = os.environ.get("AWS_REGION", "ca-central-1")
MODEL_IDS = os.environ.get(
    "MODEL_IDS",
    "meta.llama3-8b-instruct-v1:0,mistral.mistral-large-2402-v1:0,amazon.titan-text-express-v1"
).split(",")

# DB connection via env vars or Secrets Manager
DB_HOST = os.environ.get("DB_HOST")          # e.g., RDS Proxy endpoint
DB_PORT = int(os.environ.get("DB_PORT", "5432"))
DB_NAME = os.environ.get("DB_NAME")
DB_USER = os.environ.get("DB_USER")
DB_PASSWORD = os.environ.get("DB_PASSWORD")
DB_SECRET_ARN = os.environ.get("DB_SECRET_ARN")  # if using Secrets Manager instead

# Bedrock Runtime client (reuse)
brt = boto3.client("bedrock-runtime", region_name=REGION, config=Config(retries={"max_attempts": 3}))
secrets = boto3.client("secretsmanager", region_name=REGION)

# Cache global DB connection
_db_conn = None

# ---------- Helpers ----------
def _load_db_creds_from_secret():
    if not DB_SECRET_ARN:
        return
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
    global _db_conn
    if _db_conn and not _db_conn.closed:
        return _db_conn

    creds = {
        "host": DB_HOST, "port": DB_PORT, "dbname": DB_NAME, "user": DB_USER, "password": DB_PASSWORD
    }
    from_secret = _load_db_creds_from_secret()
    if from_secret:
        creds = from_secret

    # psycopg v3 connect
    _db_conn = psycopg.connect(
        host=creds["host"], port=creds["port"], dbname=creds["dbname"],
        user=creds["user"], password=creds["password"],
        connect_timeout=5, autocommit=True
    )
    return _db_conn

def get_scoring_prompt(research_agenda_id: str | None) -> str:
    """
    Fetch best scoring prompt:
    1) exact agenda_id & prompt_type='scoring' ordered by is_default DESC, updated_at DESC, created_at DESC
    2) global default (research_agenda_id IS NULL) for scoring
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

        # fallback: global default
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

    # final hard-coded fallback (rarely used if you seed a default)
    return "Based on the following text, output a number 1-5 only.\n\nText:\n{{text}}\n\nReturn only the number."

def render_prompt(template: str, *, text: str, **kwargs) -> str:
    """
    Supports both {{text}} and {text} placeholders.
    Extra kwargs can carry context (e.g., agenda_name) if you add placeholders later.
    """
    # brace-doubling safe path
    p = template
    # Handle Jinja-style {{var}}
    p = re.sub(r"\{\{\s*text\s*\}\}", text, p)
    for k, v in kwargs.items():
        p = re.sub(rf"\{{\{{\s*{re.escape(k)}\s*\}}\}}", str(v), p)

    # Handle python format-style {var}
    try:
        p = p.format(text=text, **kwargs)
    except Exception:
        pass
    return p

NUM_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5
}

def extract_integer_score(raw: str):
    if not raw:
        return None
    s = raw.strip().lower()
    m = re.search(r"\b([1-5])\b", s)
    if m:
        return int(m.group(1))
    for w, v in NUM_WORDS.items():
        if re.search(rf"\b{re.escape(w)}\b", s):
            if v in (1,2,3,4,5):
                return v
    return None

def invoke_model(model_id: str, prompt: str) -> str:
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
        return payload.get("generation", "") or payload.get("output", "")

def majority(scores):
    return Counter(scores).most_common(1)[0][0] if scores else None

# ---------- Handler ----------
def handler(event, context):
    """
    Expect:
    {
      "agenda_id": "uuid-or-null",
      "items": [{"id":"r1","text":"..."}, ...],
      "model_ids": [...]         # optional override
    }
    """
    try:
        body = event.get("body") if isinstance(event, dict) and "body" in event else event
        if isinstance(body, str):
            body = json.loads(body)

        agenda_id = (body or {}).get("agenda_id")
        items = (body or {}).get("items", [])
        model_ids = (body or {}).get("model_ids") or MODEL_IDS

        # 1) fetch prompt template from DB
        template = get_scoring_prompt(agenda_id)

        results = []
        for item in items:
            rid = item.get("id")
            text = item.get("text", "")

            # 2) render per-item prompt
            prompt = render_prompt(template, text=text)

            # 3) vote across models
            per_model_scores = []
            for mid in model_ids:
                try:
                    raw = invoke_model(mid, prompt)
                    score = extract_integer_score(raw)
                    if score is not None:
                        per_model_scores.append(score)
                except Exception as e:
                    print(f"[ModelError] {mid} on {rid}: {e}")

            results.append({
                "id": rid,
                "text": text,
                "model_scores": per_model_scores,
                "predicted_stars": majority(per_model_scores)
            })

        resp = {"results": results}
        return {"statusCode": 200, "headers": {"Content-Type": "application/json"}, "body": json.dumps(resp)}

    except Exception as e:
        print(f"[HandlerError] {e}")
        return {"statusCode": 500, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": str(e)})}
