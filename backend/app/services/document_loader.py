from pypdf import PdfReader
def extract_pdf(path):
    reader=PdfReader(path); pages=[]
    for n,p in enumerate(reader.pages,1):
        t=p.extract_text() or ""
        if t.strip(): pages.append({"page":n,"text":t.strip()})
    return pages
def chunk_text(text,chunk_size=1000,overlap=150):
    text=" ".join(text.split()); chunks=[]; start=0
    while start<len(text):
        end=min(start+chunk_size,len(text)); c=text[start:end].strip()
        if c: chunks.append(c)
        if end>=len(text): break
        start=max(0,end-overlap)
    return chunks
