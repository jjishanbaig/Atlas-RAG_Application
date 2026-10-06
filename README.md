# AI RAG Application with Gemini

A ready-to-run starter RAG app using FastAPI, Gemini API, Gemini embeddings, ChromaDB and a simple HTML frontend.

## Run backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# Edit .env and add GEMINI_API_KEY
uvicorn app.main:app --reload
```

Open the app at http://127.0.0.1:8000. The frontend is served by FastAPI so PDF uploads do not trigger a separate development server's workspace reload. API docs: http://127.0.0.1:8000/docs

Never commit `.env` or your API key.
