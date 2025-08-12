from typing import Dict
from helpers.helper import get_vectorstore

def get_vectorstore_retriever(llm, vectorstore_config_dict: Dict[str, str], embeddings):
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

def get_agenda_retriever(llm, agenda_id: str, document_type: str, vectorstore_config_dict: Dict[str, str], embeddings, selected_documents=None):
    """Get retriever for selected agenda documents only."""
    import psycopg2
    
    try:
        conn = psycopg2.connect(
            dbname=vectorstore_config_dict['dbname'],
            user=vectorstore_config_dict['user'],
            password=vectorstore_config_dict['password'],
            host=vectorstore_config_dict['host'],
            port=int(vectorstore_config_dict['port'])
        )
        cur = conn.cursor()
        
        if document_type == "context":
            if selected_documents:
                # Only get selected documents
                placeholders = ','.join(['%s'] * len(selected_documents))
                cur.execute(f"SELECT id_context_doc FROM context_documents WHERE research_agenda_id = %s AND id_context_doc IN ({placeholders})", [agenda_id] + selected_documents)
            else:
                cur.execute("SELECT id_context_doc FROM context_documents WHERE research_agenda_id = %s", (agenda_id,))
        else:
            if selected_documents:
                placeholders = ','.join(['%s'] * len(selected_documents))
                cur.execute(f"SELECT id_research_observations FROM research_observations WHERE research_agenda_id = %s AND id_research_observations IN ({placeholders})", [agenda_id] + selected_documents)
            else:
                cur.execute("SELECT id_research_observations FROM research_observations WHERE research_agenda_id = %s", (agenda_id,))
        
        doc_ids = [str(row[0]) for row in cur.fetchall()]
        print(f"Using selected documents: {doc_ids}")
        
        if not doc_ids:
            print(f"No documents found for agenda {agenda_id}, type {document_type}")
            cur.close()
            conn.close()
            return None
        
        # Create retrievers for ALL documents
        retrievers = []
        for doc_id in doc_ids:
            try:
                config = vectorstore_config_dict.copy()
                config['collection_name'] = doc_id
                retriever = get_vectorstore_retriever(llm, config, embeddings)
                retrievers.append(retriever)
                print(f"Added retriever for collection: {doc_id}")
            except Exception as e:
                print(f"Failed to create retriever for {doc_id}: {e}")
        
        cur.close()
        conn.close()
        
        if not retrievers:
            print("No valid retrievers created")
            return None
        
        # If only one retriever, return it directly
        if len(retrievers) == 1:
            return retrievers[0]
        
        # Merge multiple retrievers
        from langchain.retrievers import MergerRetriever
        merged_retriever = MergerRetriever(retrievers=retrievers)
        print(f"Created merged retriever with {len(retrievers)} collections")
        return merged_retriever
        
    except Exception as e:
        print(f"Error in get_agenda_retriever: {e}")
        return None
