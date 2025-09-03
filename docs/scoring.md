# Research Data Insights - Scoring System Documentation

This document provides comprehensive documentation on how the automated scoring system works in the Research Data Insights platform.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Scoring Workflow](#scoring-workflow)
- [Database Schema](#database-schema)
- [Prompt System](#prompt-system)
- [Multi-Model Scoring](#multi-model-scoring)
- [Score Aggregation Methods](#score-aggregation-methods)
- [Text Processing](#text-processing)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## Overview

The Research Data Insights platform uses an automated LLM-based scoring system to evaluate research responses against custom metrics. The system is designed to provide consistent, scalable evaluation of qualitative research data by leveraging multiple Large Language Models and sophisticated aggregation techniques.

### Key Features

- **Event-Driven**: Automatically triggered when research observation files are uploaded to S3
- **Multi-Model**: Uses multiple LLM models for robust scoring
- **Customizable**: Supports custom metrics, prompts, and scoring methods
- **Scalable**: Processes files asynchronously through AWS Lambda
- **Flexible**: Supports various aggregation methods (Mean, Median, Majority)

## System Architecture

```
S3 Upload Event → Lambda Trigger → Scoring Function → Database Update
     ↓                ↓               ↓                ↓
Research File    Parse Config    Multi-Model      Store Results
Upload           From Database   LLM Scoring      in Database
```

### Components

1. **S3 Event Source**: Triggers scoring when files are uploaded to the scoring bucket
2. **Scoring Lambda**: `cdk/lambda/scoring/src/main.py` - Main scoring logic
3. **Database**: PostgreSQL with scoring configuration and results storage
4. **Bedrock Integration**: AWS Bedrock for LLM model access
5. **Multi-Model Pipeline**: Parallel scoring across multiple LLM models

## Scoring Workflow

### 1. File Upload Trigger

When a research observation file is uploaded to S3, the system:

```python
# S3 event structure
{
    "Records": [{
        "eventName": "ObjectCreated:Put",
        "s3": {
            "bucket": {"name": "scoring-bucket"},
            "object": {"key": "agendas/{agenda_id}/observation/{filename}.txt"}
        }
    }]
}
```

### 2. Configuration Extraction

The system parses the S3 file path to extract agenda configuration:

```python
def parse_s3_file_path(file_key):
    # Path format: agendas/{agenda_id}/{document_type}/{filename}
    agenda_id, document_type, filename_with_ext = file_key.split('/')[1:]

    # Query database for scoring configuration
    query = """
    SELECT metric_name, metric_description, hyperparameter_settings,
           scoring_models, scoring_method
    FROM research_agenda
    WHERE id_research_agenda = %s;
    """
```

### 3. Prompt Generation

The system retrieves and renders the scoring prompt:

```python
def get_scoring_prompt(research_agenda_id):
    """
    Priority order:
    1. Agenda-specific prompt (research_agenda_id = specific_id)
    2. Global default prompt (research_agenda_id IS NULL)
    3. Built-in fallback prompt
    """

# Base template with placeholders
base_prompt = """Do you think the response invokes {{metric_name}} (scoring metric)?
Metric Description: {{metric_description}}.
Limit your response to only a number. Do not explain anything further.
Please adhere to these guidelines strictly.

Text:
{{text}}
"""
```

### 4. Multi-Model Scoring

The system scores the text using multiple LLM models:

```python
per_model_scores = []
for model_id in scoring_models:
    try:
        raw_response = invoke_model(model_id, prompt)
        score = extract_integer_score(raw_response, N=10)
        if score is not None:
            per_model_scores.append(score)
    except Exception as e:
        logger.error(f"Model {model_id} failed: {e}")
```

### 5. Score Aggregation

Multiple model scores are combined using the specified method:

```python
if scoring_method == "Mean":
    predicted_score = mean(per_model_scores)
elif scoring_method == "Median":
    predicted_score = median(per_model_scores)
elif scoring_method == "Majority":
    predicted_score = majority(per_model_scores)
```

### 6. Database Update

Final scores are stored in the database:

```python
def update_response_score(file_path, cleaned_text, predicted_score):
    cur.execute("""
        UPDATE individual_responses
        SET score = %s,
            response_text = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE file_path = %s;
    """, (predicted_score, cleaned_text, file_path))
```

## Database Schema

### Core Tables

#### research_agenda

Stores scoring configuration for each research agenda:

```sql
CREATE TABLE research_agenda (
    id_research_agenda uuid PRIMARY KEY,
    user_id uuid REFERENCES users(user_id),
    agenda_name varchar NOT NULL,
    metric_name varchar NOT NULL,
    metric_description text,
    scoring_models jsonb DEFAULT '["meta.llama3-8b-instruct-v1:0"]',
    scoring_method text DEFAULT 'Mean',
    created_at timestamp DEFAULT now(),
    updated_at timestamp
);
```

#### research_agenda_prompts

Stores custom scoring prompts:

```sql
CREATE TABLE research_agenda_prompts (
    id_research_agenda_prompt uuid PRIMARY KEY,
    research_agenda_id uuid REFERENCES research_agenda(id_research_agenda),
    prompt_type prompt_type NOT NULL, -- 'scoring', 'general_rag', 'self_aggregation'
    prompt_text text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp DEFAULT now(),
    updated_at timestamp
);
```

#### individual_responses

Stores scoring results:

```sql
CREATE TABLE individual_responses (
    id_individual_response uuid PRIMARY KEY,
    observation_id uuid REFERENCES research_observations(id_research_observations),
    research_agenda_id uuid REFERENCES research_agenda(id_research_agenda),
    response_text text NOT NULL,
    response_order int,
    score decimal(5,2), -- Supports scores like 7.33
    metadata jsonb,
    file_path varchar,
    created_at timestamp DEFAULT now(),
    updated_at timestamp
);
```

### Default Configuration

New research agendas are created with default scoring settings:

```sql
-- Default scoring models
scoring_models: ["meta.llama3-8b-instruct-v1:0"]

-- Default scoring method
scoring_method: "Mean"

-- Default prompt (if no custom prompt exists)
-- Uses built-in template with metric_name and metric_description placeholders
```

## Prompt System

### Prompt Hierarchy

The system uses a hierarchical prompt system:

1. **Agenda-Specific Prompts**: Custom prompts for specific research agendas
2. **Global Default Prompts**: Default prompts that apply to all agendas
3. **Built-in Fallback**: Hard-coded prompt if no database prompts exist

### Prompt Templates

Prompts support template variables using double curly braces:

- `{{metric_name}}`: Name of the scoring metric
- `{{metric_description}}`: Detailed description of the metric
- `{{text}}`: The research response text to be scored

### Example Custom Prompt

```sql
INSERT INTO research_agenda_prompts (
    research_agenda_id,
    prompt_type,
    prompt_text,
    is_default
) VALUES (
    'agenda-uuid-here',
    'scoring',
    'You are an expert research evaluator specializing in {{metric_name}}.

    Evaluation Criteria:
    {{metric_description}}

    Instructions:
    - Read the response carefully
    - Consider the depth of analysis, evidence quality, and relevance
    - Rate on a scale of 1-10 where:
      * 1-3: Poor demonstration of {{metric_name}}
      * 4-6: Moderate demonstration of {{metric_name}}
      * 7-8: Good demonstration of {{metric_name}}
      * 9-10: Excellent demonstration of {{metric_name}}

    Response to evaluate:
    {{text}}

    Provide only a single number from 1-10:',
    false
);
```

## Multi-Model Scoring

### Supported Models

The system supports various AWS Bedrock models:

#### Mistral Models

```python
# Mistral Large
"mistral.mistral-large-2402-v1:0"

# Response format
{
    "outputs": [
        {"text": "8"}
    ]
}
```

#### Meta Llama Models

```python
# Llama 3 70B
"meta.llama3-70b-instruct-v1:0"

# Llama 3 8B (default)
"meta.llama3-8b-instruct-v1:0"

# Response format
{
    "generation": "7"
}
```

#### Amazon Titan Models

```python
# Titan Text Premier
"amazon.titan-text-premier-v1:0"

# Titan Text Express
"amazon.titan-text-express-v1"

# Response format
{
    "results": [
        {"outputText": "6"}
    ]
}
```

### Model Invocation

```python
def invoke_model(model_id: str, prompt: str) -> str:
    """Provider-normalized Bedrock call"""
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

    # Extract response based on model provider
    if model_id.startswith("mistral."):
        return payload.get("outputs", [{}])[0].get("text", "")
    elif model_id.startswith("amazon.titan"):
        return payload.get("results", [{}])[0].get("outputText", "")
    else:  # Llama models
        return payload.get("generation", "") or payload.get("output", "")
```

## Score Aggregation Methods

### Mean (Default)

Calculates the arithmetic mean of all model scores:

```python
def mean(scores):
    return sum(scores) / len(scores) if scores else None

# Example: [7, 8, 6] → 7.0
```

### Median

Finds the middle value when scores are sorted:

```python
def median(scores):
    if not scores:
        return None
    sorted_scores = sorted(scores)
    n = len(sorted_scores)
    if n % 2 == 1:
        return sorted_scores[n // 2]
    else:
        return (sorted_scores[n // 2 - 1] + sorted_scores[n // 2]) / 2

# Example: [7, 8, 6] → 7.0
# Example: [7, 8, 6, 9] → 7.5
```

### Majority

Returns the most frequently occurring score:

```python
def majority(scores):
    from collections import Counter
    return Counter(scores).most_common(1)[0][0] if scores else None

# Example: [7, 7, 8, 6] → 7
# Example: [7, 8, 6] → 7 (first occurrence if tied)
```

## Text Processing

### Text Cleaning Pipeline

Before scoring, response text goes through a cleaning pipeline:

```python
def clean_text(s: str) -> str:
    """Light-clean input text to reduce noise without destroying semantics"""
    if not s:
        return s

    # Unicode normalization
    s = unicodedata.normalize("NFKC", s)

    # HTML entity decoding
    s = html.unescape(s)

    # Remove URLs
    s = re.sub(r"https?://\S+|www\.\S+", " ", s)

    # Remove email addresses
    s = re.sub(r"\b\S+@\S+\.\S+\b", " ", s)

    # Collapse whitespace
    s = re.sub(r"\s+", " ", s).strip()

    return s
```

### Score Extraction

The system extracts numerical scores from LLM responses using multiple patterns:

```python
def extract_integer_score(raw: str, N: int):
    """Extract integer in [1..N] from model output"""
    if not raw:
        return None

    s = normalize_model_output(raw).lower()

    # Pattern 1: Direct digits
    m = re.search(r"\b(\d{1,3})\b", s)
    if m:
        val = int(m.group(1))
        if 1 <= val <= N:
            return val

    # Pattern 2: Number words (one, two, three, etc.)
    NUM_WORDS = make_num_words(N)  # Cached mapping
    for word, value in NUM_WORDS.items():
        if re.search(rf"\b{re.escape(word)}\b", s):
            if 1 <= value <= N:
                return value

    return None
```

### Number Word Mapping

The system supports both digits and written numbers:

```python
@lru_cache(maxsize=16)
def make_num_words(N: int):
    """Generate mapping of number words to integers"""
    num_words = {}
    for i in range(1, N + 1):
        word = inflect_engine.number_to_words(i)  # "forty-two"
        num_words[word] = i
        num_words[word.replace("-", " ")] = i     # "forty two"
        num_words[str(i)] = i                     # "42"
    return num_words
```

## Configuration

### Research Agenda Configuration

Each research agenda can be configured with:

```json
{
  "metric_name": "Critical Thinking",
  "metric_description": "The ability to analyze information objectively and make reasoned judgments",
  "scoring_models": [
    "meta.llama3-70b-instruct-v1:0",
    "mistral.mistral-large-2402-v1:0"
  ],
  "scoring_method": "Mean",
  "hyperparameter_settings": {
    "temperature": 0.1,
    "max_tokens": 50
  }
}
```

### Environment Variables

The scoring Lambda requires these environment variables:

```bash
SM_DB_CREDENTIALS=arn:aws:secretsmanager:region:account:secret:db-credentials
RDS_PROXY_ENDPOINT=rds-proxy-endpoint.region.rds.amazonaws.com
BUCKET=scoring-bucket-name
REGION=ca-central-1
```

### IAM Permissions

The scoring Lambda needs permissions for:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": [
        "arn:aws:bedrock:*:*:foundation-model/meta.llama3-*",
        "arn:aws:bedrock:*:*:foundation-model/mistral.*",
        "arn:aws:bedrock:*:*:foundation-model/amazon.titan-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::scoring-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:*:*:secret:db-credentials*"
    }
  ]
}
```

## Troubleshooting

### Common Issues

#### 1. No Scores Generated

**Symptoms**: Files uploaded but no scores appear in database

**Debugging Steps**:

```bash
# Check CloudWatch logs
aws logs filter-log-events \
    --log-group-name /aws/lambda/scoring-function \
    --start-time $(date -d '1 hour ago' +%s)000

# Verify S3 event configuration
aws s3api get-bucket-notification-configuration \
    --bucket scoring-bucket-name

# Check database connection
SELECT COUNT(*) FROM individual_responses
WHERE created_at > NOW() - INTERVAL '1 hour';
```

**Common Causes**:

- S3 event not configured correctly
- Lambda function timeout (increase to 5+ minutes)
- Database connection issues
- Missing IAM permissions

#### 2. Model Invocation Failures

**Symptoms**: Partial scores or model-specific errors in logs

**Debugging Steps**:

```python
# Test individual model invocation
import boto3
bedrock = boto3.client('bedrock-runtime')

response = bedrock.invoke_model(
    modelId='meta.llama3-8b-instruct-v1:0',
    body=json.dumps({'prompt': 'Rate this text from 1-10: Hello world'}),
    contentType='application/json'
)
```

**Common Causes**:

- Model not available in region
- Insufficient Bedrock quotas
- Malformed request body
- Model-specific response format changes

#### 3. Score Extraction Issues

**Symptoms**: Models respond but scores are None

**Debugging Steps**:

```python
# Test score extraction
raw_response = "The score is 8 out of 10"
score = extract_integer_score(raw_response, 10)
print(f"Extracted score: {score}")

# Check model responses in logs
logger.info(f"Raw model response: {raw_response}")
```

**Common Causes**:

- Models not following prompt instructions
- Unexpected response format
- Score extraction regex patterns need updating

#### 4. Database Update Failures

**Symptoms**: Scores calculated but not saved

**Debugging Steps**:

```sql
-- Check for matching file paths
SELECT file_path, score, updated_at
FROM individual_responses
WHERE file_path LIKE '%your-file-name%';

-- Verify agenda configuration
SELECT scoring_models, scoring_method
FROM research_agenda
WHERE id_research_agenda = 'your-agenda-id';
```

**Common Causes**:

- File path mismatch between S3 and database
- Database transaction rollback
- Connection timeout during update

### Performance Optimization

#### 1. Reduce Latency

- Use smaller models for faster responses
- Implement connection pooling for database
- Cache prompt templates

#### 2. Improve Reliability

- Add retry logic for model invocations
- Implement dead letter queues for failed events
- Use multiple scoring methods for validation

#### 3. Scale for Volume

- Increase Lambda concurrency limits
- Use SQS for batch processing
- Implement async scoring for large files

### Monitoring and Alerts

Set up CloudWatch alarms for:

```json
{
    "MetricName": "Duration",
    "Threshold": 300000,
    "ComparisonOperator": "GreaterThanThreshold"
},
{
    "MetricName": "Errors",
    "Threshold": 5,
    "ComparisonOperator": "GreaterThanThreshold"
},
{
    "MetricName": "Invocations",
    "Statistic": "Sum",
    "Period": 300
}
```

This comprehensive documentation provides everything needed to understand, configure, and troubleshoot the Research Data Insights scoring system.
