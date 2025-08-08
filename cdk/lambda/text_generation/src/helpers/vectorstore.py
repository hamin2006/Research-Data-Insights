from typing import Dict, List
from langchain.retrievers import MergerRetriever
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains import create_history_aware_retriever
from helpers.helper import get_vectorstore

def _history_aware(llm, retriever):
    contextualize_q_prompt = ChatPromptTemplate.from_messages([
        ("system", "Given chat history and the latest question, rewrite it as a standalone question."),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ])
    return create_history_aware_retriever(llm, retriever, contextualize_q_prompt)

def get_agenda_retriever(
    llm,
    agenda_id: str,
    document_type: str,
    vectorstore_config_dict: Dict[str, str],
    embeddings
) -> VectorStoreRetriever:
    """Get retriever using correct collection names from database."""
    import psycopg2
    
    try:
        # Get document IDs from database
        conn = psycopg2.connect(
            dbname=vectorstore_config_dict['dbname'],
            user=vectorstore_config_dict['user'],
            password=vectorstore_config_dict['password'],
            host=vectorstore_config_dict['host'],
            port=int(vectorstore_config_dict['port'])
        )
        cur = conn.cursor()
        
        if document_type == "context":
            cur.execute("SELECT id_context_doc FROM context_documents WHERE research_agenda_id = %s", (agenda_id,))
        else:
            cur.execute("SELECT id_research_observations FROM research_observations WHERE research_agenda_id = %s", (agenda_id,))
        
        doc_ids = [str(row[0]) for row in cur.fetchall()]
        cur.close()
        conn.close()
        
        if not doc_ids:
            # Return empty retriever
            from langchain_core.vectorstores import VectorStore
            class EmptyVectorStore(VectorStore):
                def similarity_search(self, query, k=4, **kwargs):
                    return []
                def get_relevant_documents(self, query):
                    return []
            return EmptyVectorStore().as_retriever()
        
        # Use first document's collection
        collection_name = doc_ids[0]
        
        vectorstore, _ = get_vectorstore(
            collection_name=collection_name,
            embeddings=embeddings,
            dbname=vectorstore_config_dict['dbname'],
            user=vectorstore_config_dict['user'],
            password=vectorstore_config_dict['password'],
            host=vectorstore_config_dict['host'],
            port=int(vectorstore_config_dict['port'])
        )
        
        return vectorstore.as_retriever()
        
    except Exception as e:
        print(f"Error: {e}")
        from langchain_core.vectorstores import VectorStore
        class EmptyVectorStore(VectorStore):
            def similarity_search(self, query, k=4, **kwargs):
                return []
            def get_relevant_documents(self, query):
                return []
        return EmptyVectorStore().as_retriever()
