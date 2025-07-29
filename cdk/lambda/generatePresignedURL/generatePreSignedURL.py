import os, json
import boto3
from botocore.config import Config

BUCKET = os.environ["BUCKET"]
REGION = os.environ["REGION"]

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://s3.{REGION}.amazonaws.com",
    config=Config(
        s3={"addressing_style": "virtual"}, region_name=REGION, signature_version="s3v4"
    ),
)

def lambda_handler(event, context):
    query_params = event.get("queryStringParameters", {})

    if not query_params:
        return {
            'statusCode': 400,
            'body': json.dumps('Missing queries to generate pre-signed URL')
        }

    file_name = query_params.get("file_name", "")
    file_type = query_params.get("file_type", "")
    agenda_id = query_params.get("agenda_id", "")
    document_type = query_params.get("document_type", "")  # "context" or "observation"

    if not file_name or not file_type or not agenda_id or not document_type:
        return {
            'statusCode': 400,
            'body': json.dumps('Missing required parameters: file_name, file_type, agenda_id, document_type')
        }

    if document_type not in ["context", "observation"]:
        return {
            'statusCode': 400,
            'body': json.dumps('document_type must be either "context" or "observation"')
        }

    # Separate folders for different document types
    key = f"agendas/{agenda_id}/{document_type}_documents/{file_name}"

    try:
        presigned_url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": BUCKET,
                "Key": key,
                "ContentType": file_type,
            },
            ExpiresIn=300,
            HttpMethod="PUT",
        )

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            "body": json.dumps({"presignedurl": presigned_url, "key": key}),
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps('Internal server error')
        }
