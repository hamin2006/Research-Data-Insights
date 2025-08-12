import re
import boto3
from langchain_aws import ChatBedrock, BedrockLLM
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import DynamoDBChatMessageHistory
from langchain_core.pydantic_v1 import BaseModel, Field  
import logging

class ResearchResponse(BaseModel):
    response: str = Field(description="AI response to the research query with insights from documents.")
    sources_used: list = Field(description="List of document sources used in the response.")


def create_dynamodb_history_table(table_name: str) -> bool:
    """Create a DynamoDB table to store chat session history for research agendas."""
    dynamodb_resource = boto3.resource("dynamodb")
    dynamodb_client = boto3.client("dynamodb")
    
    existing_tables = []
    exclusive_start_table_name = None
    
    while True:
        if exclusive_start_table_name:
            response = dynamodb_client.list_tables(ExclusiveStartTableName=exclusive_start_table_name)
        else:
            response = dynamodb_client.list_tables()
        
        existing_tables.extend(response.get('TableNames', []))
        
        if 'LastEvaluatedTableName' in response:
            exclusive_start_table_name = response['LastEvaluatedTableName']
        else:
            break
    
    if table_name not in existing_tables:
        table = dynamodb_resource.create_table(
            TableName=table_name,
            KeySchema=[{"AttributeName": "SessionId", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "SessionId", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
        table.meta.client.get_waiter("table_exists").wait(TableName=table_name)

def get_bedrock_llm(
    bedrock_llm_id: str,
    temperature: float = 0
) -> ChatBedrock:
    """
    Retrieve a Bedrock LLM instance based on the provided model ID.

    Args:
    bedrock_llm_id (str): The unique identifier for the Bedrock LLM model.
    temperature (float, optional): The temperature parameter for the LLM, controlling 
    the randomness of the generated responses. Defaults to 0.

    Returns:
    ChatBedrock: An instance of the Bedrock LLM corresponding to the provided model ID.
    """
    return ChatBedrock(
        model_id=bedrock_llm_id,
        model_kwargs=dict(temperature=temperature),
    )

def get_custom_prompt(agenda_id: str, connection) -> str:
    """Get the custom general_rag prompt for the agenda from the database."""
    if connection is None:
        return None
    
    try:
        cur = connection.cursor()
        cur.execute("""
            SELECT prompt_text FROM research_agenda_prompts 
            WHERE research_agenda_id = %s AND prompt_type = 'general_rag'
            ORDER BY created_at DESC LIMIT 1
        """, (agenda_id,))
        
        result = cur.fetchone()
        cur.close()
        return result[0] if result else None
    except Exception as e:
        if cur:
            cur.close()
        return None

def format_research_query(raw_query: str) -> str:
    """Format the user's research query."""
    return raw_query  # Simple formatting for research queries


def get_response(
    query: str,
    agenda_id: str,
    llm: ChatBedrock,
    history_aware_retriever,
    table_name: str,
    session_id: str,
    connection
) -> dict:
    """Generate response with debug logging."""
    
    import logging
    logger = logging.getLogger()
    
    logger.info(f"get_response called with query: {query[:50]}...")
    
    try:
        # Test retriever first
        docs = history_aware_retriever.get_relevant_documents(query)
        logger.info(f"Retrieved {len(docs)} documents")
        
        # Log details about each document
        for i, doc in enumerate(docs[:5]):  # Show first 5 docs
            source = doc.metadata.get('source', 'unknown')
            content_preview = doc.page_content[:100] if doc.page_content else 'empty'
            logger.info(f"Doc {i}: source={source}, content_preview={content_preview}...")
        
        if not docs:
            logger.warning("No documents retrieved - returning fallback response")
            return {
                "response": "I don't have access to any relevant documents for this research agenda. Please ensure documents have been uploaded and processed.",
                "agenda_id": agenda_id
            }
        
        # Use more documents in context
        context = "\n\n".join([f"Document {i+1}: {doc.page_content}" for i, doc in enumerate(docs[:5])])
        
        prompt = f"""You are a research assistant. Answer based on ALL the context documents provided below.

Context Documents:
{context}

Question: {query}

Answer based on information from ALL the documents above:"""
        logger.info("Calling LLM...")
        response = llm.invoke(prompt)
        logger.info(f"LLM response: {response.content[:100]}...")
        
        return {
            "response": response.content,
            "agenda_id": agenda_id
        }
        
    except Exception as e:
        logger.error(f"Error in get_response: {e}")
        return {
            "response": f"Error: {str(e)}",
            "agenda_id": agenda_id
        }



def generate_response(conversational_rag_chain: object, query: str, session_id: str) -> str:
    """
    Invokes the RAG chain to generate a response to a given query.

    Args:
    conversational_rag_chain: The Conversational RAG chain object that processes the query and retrieves relevant responses.
    query (str): The input query for which the response is being generated.
    session_id (str): The unique identifier for the current conversation session.

    Returns:
    str: The answer generated by the Conversational RAG chain, based on the input query and session context.
    """
    return conversational_rag_chain.invoke(
        {
            "input": query
        },
        config={
            "configurable": {"session_id": session_id}
        },  # constructs a key "session_id" in `store`.
    )["answer"]

def format_research_output(response: str, agenda_id: str) -> dict:
    """Format the research response output."""
    return {
        "research_output": response,
        "agenda_id": agenda_id
    }

def split_into_sentences(paragraph: str) -> list[str]:
    """
    Splits a given paragraph into individual sentences using a regular expression to detect sentence boundaries.

    Args:
    paragraph (str): The input text paragraph to be split into sentences.

    Returns:
    list: A list of strings, where each string is a sentence from the input paragraph.

    This function uses a regular expression pattern to identify sentence boundaries, such as periods, question marks, 
    or exclamation marks, and avoids splitting on abbreviations (e.g., "Dr." or "U.S.") by handling edge cases. The 
    resulting list contains sentences extracted from the input paragraph.
    """
    # Regular expression pattern
    sentence_endings = r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)\s'
    sentences = re.split(sentence_endings, paragraph)
    return sentences



def update_session_name(table_name: str, session_id: str, bedrock_llm_id: str) -> str:
    """Generate session name from first exchange."""
    
    dynamodb_client = boto3.client("dynamodb")
    
    try:
        response = dynamodb_client.get_item(
            TableName=table_name,
            Key={'SessionId': {'S': session_id}}
        )
        
        history = response.get('Item', {}).get('History', {}).get('L', [])
        
        if len(history) < 2:
            return None
            
        # Just use first human and AI messages
        human_msg = None
        ai_msg = None
        
        for item in history:
            msg_type = item.get('M', {}).get('type', {}).get('S')
            content = item.get('M', {}).get('data', {}).get('M', {}).get('content', {}).get('S', '')
            
            if msg_type == 'human' and not human_msg:
                human_msg = content
            elif msg_type == 'ai' and not ai_msg:
                ai_msg = content
                
            if human_msg and ai_msg:
                break
        
        if not human_msg or not ai_msg:
            return None
            
        # Generate simple name
        llm = BedrockLLM(model_id=bedrock_llm_id)
        prompt = f"Generate a short chat name (max 25 chars) for this conversation:\nUser: {human_msg[:100]}\nAI: {ai_msg[:100]}\nName:"
        
        session_name = llm.invoke(prompt)
        return session_name[:25]  # Truncate to 25 chars
        
    except Exception as e:
        print(f"Error updating session name: {e}")
        return None

