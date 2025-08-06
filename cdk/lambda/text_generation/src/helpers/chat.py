import re
import boto3
from langchain_aws import ChatBedrock, BedrockLLM
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import DynamoDBChatMessageHistory
from langchain_core.pydantic_v1 import BaseModel, Field  

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
    """Generate a response to a research query using RAG with agenda-specific context."""
    
    # Get custom prompt from database
    custom_prompt = get_custom_prompt(agenda_id, connection)
    
    # Use custom prompt if available, otherwise use default
    if custom_prompt:
        system_prompt = custom_prompt
    else:
        system_prompt = (
            "You are a research assistant analyzing documents for this research agenda. "
            "Use the provided context documents and research observations to provide insights and answer questions. "
            "Be analytical and cite specific information from the documents when possible. "
            "If you cannot find relevant information in the provided context, say so clearly."
            "\n\nContext Documents:\n{context}"
        )
    
    qa_prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ])
    
    question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
    rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

    conversational_rag_chain = RunnableWithMessageHistory(
        rag_chain,
        lambda session_id: DynamoDBChatMessageHistory(
            table_name=table_name, 
            session_id=session_id
        ),
        input_messages_key="input",
        history_messages_key="chat_history",
        output_messages_key="answer",
    )
    
    response = generate_response(conversational_rag_chain, query, session_id)
    
    return {
        "response": response,
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
    """
    Check if both the LLM and the student have exchanged exactly one message each.
    If so, generate and return a session name using the content of the student's first message
    and the LLM's first response. Otherwise, return None.

    Args:
    session_id (str): The unique ID for the session.
    table_name (str): The DynamoDB table name where the conversation history is stored.

    Returns:
    str: The updated session name if conditions are met, otherwise None.
    """
    
    dynamodb_client = boto3.client("dynamodb")
    
    # Retrieve the conversation history from the DynamoDB table
    try:
        response = dynamodb_client.get_item(
            TableName=table_name,
            Key={
                'SessionId': {
                    'S': session_id
                }
            }
        )
    except Exception as e:
        print(f"Error fetching conversation history from DynamoDB: {e}")
        return None

    history = response.get('Item', {}).get('History', {}).get('L', [])



    human_messages = []
    ai_messages = []
    
    # Find the first human and ai messages in the history
    # Check if length of human messages is 2 since the prompt counts as 1
    # Check if length of AI messages is 2 since after first response by student, another response is generated
    for item in history:
        message_type = item.get('M', {}).get('data', {}).get('M', {}).get('type', {}).get('S')
        
        if message_type == 'human':
            human_messages.append(item)
            if len(human_messages) > 2:
                print("More than one student message found; not the first exchange.")
                return None
        
        elif message_type == 'ai':
            ai_messages.append(item)
            if len(ai_messages) > 2:
                print("More than one AI message found; not the first exchange.")
                return None

    if len(human_messages) != 2 or len(ai_messages) != 2:
        print("Not a complete first exchange between the LLM and student.")
        return None
    
    student_message = human_messages[0].get('M', {}).get('data', {}).get('M', {}).get('content', {}).get('S', "")
    llm_message = ai_messages[0].get('M', {}).get('data', {}).get('M', {}).get('content', {}).get('S', "")
    
    llm = BedrockLLM(
                        model_id = bedrock_llm_id
                    )
    
    system_prompt = """
        You are given the first message from an AI and the first message from a student in a conversation. 
        Based on these two messages, come up with a name that describes the conversation. 
        The name should be less than 30 characters. ONLY OUTPUT THE NAME YOU GENERATED. NO OTHER TEXT.
    """
    
    prompt = f"""
        <|begin_of_text|>
        <|start_header_id|>system<|end_header_id|>
        {system_prompt}
        <|eot_id|>
        <|start_header_id|>AI Message<|end_header_id|>
        {llm_message}
        <|eot_id|>
        <|start_header_id|>Student Message<|end_header_id|>
        {student_message}
        <|eot_id|>
        <|start_header_id|>assistant<|end_header_id|>
    """
    
    session_name = llm.invoke(prompt)
    return session_name
