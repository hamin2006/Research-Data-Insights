from typing import Dict

from langchain_core.vectorstores import VectorStoreRetriever
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains import create_history_aware_retriever

from helpers.helper import get_vectorstore

def get_agenda_retriever(
    llm,
    agenda_id: str,
    document_type: str,  # "context" or "observation"
    vectorstore_config_dict: Dict[str, str],
    embeddings  # BedrockEmbeddings
) -> VectorStoreRetriever:
    """
    Retrieve the vectorstore for a specific agenda and document type, return history-aware retriever.

    Args:
    llm: The language model instance used to generate the response.
    agenda_id (str): The research agenda ID.
    document_type (str): The document type ("context" or "observation").
    vectorstore_config_dict (Dict[str, str]): The configuration dictionary for the vectorstore.
    embeddings (BedrockEmbeddings): The embeddings instance used to process the documents.

    Returns:
    VectorStoreRetriever: A history-aware retriever instance.
    """
    # Create collection name for this agenda and document type
    collection_name = f"agenda_{agenda_id}_{document_type}"
    
    vectorstore, _ = get_vectorstore(
        collection_name=collection_name,
        embeddings=embeddings,
        dbname=vectorstore_config_dict['dbname'],
        user=vectorstore_config_dict['user'],
        password=vectorstore_config_dict['password'],
        host=vectorstore_config_dict['host'],
        port=int(vectorstore_config_dict['port'])
    )

    retriever = vectorstore.as_retriever()

    # Contextualize question for research queries
    contextualize_q_system_prompt = (
        "Given a chat history and the latest research question "
        "which might reference context in the chat history, "
        "formulate a standalone question which can be understood "
        "without the chat history. Do NOT answer the question, "
        "just reformulate it if needed and otherwise return it as is."
    )
    contextualize_q_prompt = ChatPromptTemplate.from_messages([
        ("system", contextualize_q_system_prompt),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ])
    
    history_aware_retriever = create_history_aware_retriever(
        llm, retriever, contextualize_q_prompt
    )

    return history_aware_retriever
