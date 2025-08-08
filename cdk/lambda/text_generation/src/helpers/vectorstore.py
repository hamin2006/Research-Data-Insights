from typing import Dict
from helpers.helper import get_vectorstore

def get_vectorstore_retriever(
    llm,
    vectorstore_config_dict: Dict[str, str],
    embeddings
):
    """Simple vectorstore retriever without complex history awareness."""
    
    vectorstore, _ = get_vectorstore(
        collection_name=vectorstore_config_dict['collection_name'],
        embeddings=embeddings,
        dbname=vectorstore_config_dict['dbname'],
        user=vectorstore_config_dict['user'],
        password=vectorstore_config_dict['password'],
        host=vectorstore_config_dict['host'],
        port=int(vectorstore_config_dict['port'])
    )
    
    return vectorstore.as_retriever()

def get_agenda_retriever(
    llm,
    agenda_id: str,
    document_type: str,
    vectorstore_config_dict: Dict[str, str],
    embeddings
):
    """Get retriever for agenda documents."""
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
            print(f"No documents found for agenda {agenda_id}, type {document_type}")
            return None
        
        # Use first document's collection
        collection_name = doc_ids[0]
        print(f"Using collection: {collection_name}")
        
        # Update config with collection name
        config = vectorstore_config_dict.copy()
        config['collection_name'] = collection_name
        
        return get_vectorstore_retriever(llm, config, embeddings)
        
    except Exception as e:
        print(f"Error in get_agenda_retriever: {e}")
        return None
