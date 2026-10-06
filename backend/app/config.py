import os
from dotenv import load_dotenv
load_dotenv()
GEMINI_API_KEY=os.getenv("GEMINI_API_KEY")
GEMINI_MODEL=os.getenv("GEMINI_MODEL","gemini-2.5-flash")
EMBEDDING_MODEL=os.getenv("EMBEDDING_MODEL","gemini-embedding-001")
CHROMA_PATH=os.getenv("CHROMA_PATH","./chroma_db")
RAG_DISTANCE_THRESHOLD = float(os.getenv("RAG_DISTANCE_THRESHOLD", "0.50"))
if not GEMINI_API_KEY: raise RuntimeError("GEMINI_API_KEY is missing. Add it to backend/.env")
