import uuid
from pathlib import Path
from fastapi import APIRouter,UploadFile,File,HTTPException
from app.services.document_loader import extract_pdf,chunk_text
from app.services.gemini import embed_texts
from app.services.vectorstore import add_documents,get_count
router=APIRouter()
BASE_DIR=Path(__file__).resolve().parents[2]; UPLOAD_DIR=BASE_DIR/"documents"; UPLOAD_DIR.mkdir(exist_ok=True)
@router.post("/upload")
async def upload_document(file:UploadFile=File(...)):
    if not file.filename.lower().endswith(".pdf"): raise HTTPException(400,"Only PDF files are supported.")
    name=Path(file.filename).name; fid=uuid.uuid4().hex; path=UPLOAD_DIR/f"{fid}_{name}"; path.write_bytes(await file.read())
    try:
        pages=extract_pdf(str(path)); chunks=[]; metas=[]; ids=[]
        for pg in pages:
            for i,c in enumerate(chunk_text(pg["text"])):
                chunks.append(c); metas.append({"source":name,"page":pg["page"],"chunk":i}); ids.append(f"{fid}_{pg['page']}_{i}")
        if not chunks: raise HTTPException(400,"No readable text was found in the PDF.")
        total=0
        for s in range(0,len(chunks),50):
            b=chunks[s:s+50]; add_documents(ids[s:s+50],b,embed_texts(b),metas[s:s+50]); total+=len(b)
        return {"message":"Document uploaded and indexed successfully.","filename":name,"chunks_indexed":total,"total_chunks_in_database":get_count()}
    except HTTPException: path.unlink(missing_ok=True); raise
    except Exception as e: path.unlink(missing_ok=True); raise HTTPException(500,str(e))
