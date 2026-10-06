import chromadb
from app.config import CHROMA_PATH
client=chromadb.PersistentClient(path=CHROMA_PATH)
collection=client.get_or_create_collection(name="rag_documents",metadata={"hnsw:space":"cosine"})
def add_documents(ids,documents,embeddings,metadatas): collection.upsert(ids=ids,documents=documents,embeddings=embeddings,metadatas=metadatas)
def search(embedding,n_results=5):
    if collection.count()==0:return []
    r=collection.query(query_embeddings=[embedding],n_results=min(n_results,collection.count()),include=["documents","metadatas","distances"])
    return [{"document":d,"metadata":r["metadatas"][0][i],"distance":r["distances"][0][i]} for i,d in enumerate(r["documents"][0])]
def get_count(): return collection.count()
