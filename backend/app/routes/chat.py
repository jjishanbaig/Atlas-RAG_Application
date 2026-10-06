from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import RAG_DISTANCE_THRESHOLD
from app.services.gemini import embed_texts, generate_answer, generate_general_answer
from app.services.vectorstore import get_count, search

router = APIRouter()


class ChatRequest(BaseModel):
    question: str = Field(min_length=1)
    top_k: int = Field(default=5, ge=1, le=10)


def _explicitly_requests_general_answer(question: str) -> bool:
    """Honor questions that directly ask for an answer beyond the documents."""
    normalized = " ".join(question.casefold().split())
    phrases = (
        "general knowledge",
        "general answer",
        "outside the document",
        "outside documents",
        "outside the docs",
        "outside docs",
        "beyond the document",
        "beyond documents",
        "without the document",
        "without using the document",
        "not based on the document",
        "not in the document",
    )
    return any(phrase in normalized for phrase in phrases)


@router.post("/")
def chat(request: ChatRequest):
    try:
        # A direct request for general knowledge overrides a nearby match that
        # may only be similar because the question mentions the documents.
        if _explicitly_requests_general_answer(request.question):
            return {
                "answer": generate_general_answer(request.question),
                "answer_type": "general",
                "sources": [],
            }

        # With no indexed documents there is nothing to embed-search, so answer
        # directly with Gemini's general knowledge.
        if get_count() == 0:
            return {
                "answer": generate_general_answer(request.question),
                "answer_type": "general",
                "sources": [],
            }

        question_embedding = embed_texts([request.question])[0]
        matches = search(question_embedding, request.top_k)

        # ChromaDB always returns nearest neighbors when documents exist. Keep
        # only chunks whose cosine distance meets the configurable threshold.
        relevant_matches = [
            match for match in matches
            if match["distance"] <= RAG_DISTANCE_THRESHOLD
        ]

        # Do not send unrelated chunks to Gemini. Fall back to a context-free
        # general answer when nothing is sufficiently relevant.
        if not relevant_matches:
            return {
                "answer": generate_general_answer(request.question),
                "answer_type": "general",
                "sources": [],
            }

        context = "\n\n---\n\n".join(
            f"[Source: {match['metadata']['source']}, Page: {match['metadata']['page']}]\n"
            f"{match['document']}"
            for match in relevant_matches
        )
        sources = [
            {
                "source": match["metadata"]["source"],
                "page": match["metadata"]["page"],
                "distance": round(match["distance"], 4),
            }
            for match in relevant_matches
        ]
        document_answer = generate_answer(request.question, context)

        # Similar chunks can still be too incomplete to answer the question.
        # In that case, ask Gemini again without passing any document context.
        if "INSUFFICIENT_DOCUMENT_CONTEXT" in document_answer.upper():
            return {
                "answer": generate_general_answer(request.question),
                "answer_type": "general",
                "sources": [],
            }

        return {
            "answer": document_answer,
            "answer_type": "document",
            "sources": sources,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
