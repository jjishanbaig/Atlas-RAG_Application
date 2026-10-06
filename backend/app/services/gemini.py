from google import genai
from app.config import GEMINI_API_KEY,GEMINI_MODEL,EMBEDDING_MODEL
client=genai.Client(api_key=GEMINI_API_KEY)

def generate_answer(question,context):
    prompt=f"""You are a helpful RAG assistant. Answer the user's question using only the provided context. Do not use general knowledge to fill gaps. If the context does not contain enough information to answer the question, return exactly this token and nothing else: INSUFFICIENT_DOCUMENT_CONTEXT

CONTEXT:
{context}

USER QUESTION:
{question}"""
    r=client.models.generate_content(model=GEMINI_MODEL,contents=prompt)
    return r.text or "No answer was generated."

def generate_general_answer(question: str) -> str:
    """Answer with Gemini's general knowledge, without document context."""
    prompt=f"""You are a helpful AI assistant. The user's question is not sufficiently related to the documents in the knowledge base, so answer using your general knowledge only. Do not claim that your answer came from an uploaded document. Be accurate, clear, and useful, and state uncertainty when appropriate.

USER QUESTION:
{question}"""
    r=client.models.generate_content(model=GEMINI_MODEL,contents=prompt)
    return r.text or "No answer was generated."

def embed_texts(texts):
    r=client.models.embed_content(model=EMBEDDING_MODEL,contents=texts)
    return [x.values for x in r.embeddings]
