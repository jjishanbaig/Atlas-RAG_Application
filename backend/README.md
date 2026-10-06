# Gemini RAG Backend

1. Create and activate venv.
2. `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and add your Gemini API key.
4. Run `uvicorn app.main:app --reload`
5. Open the app at http://127.0.0.1:8000. The API docs are at http://127.0.0.1:8000/docs.

Pipeline: PDF -> extraction -> chunking -> Gemini embeddings -> ChromaDB -> similarity search -> Gemini answer.
