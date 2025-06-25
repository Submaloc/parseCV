from pydantic_settings import BaseSettings
from pydantic import BaseModel
import pdfplumber
import docx
from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import requests

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

class Settings(BaseSettings):
    ollama_host: str = "http://localhost:11434/api/generate"
    ollama_model: str = "gemma3:1b"  # or "mistral", "phi", etc.
    allowed_file_types: list = ["pdf", "docx", "txt"]
    max_file_size: int = 5  # in MB

settings = Settings()


class CVParseResponse(BaseModel):
    content: str
    extracted_data: dict[str,str]
    status: str
    message: str | None = None

class ErrorResponse(BaseModel):
    detail: str


app = FastAPI(title="CV Parser API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_text_from_file(file: UploadFile) -> str:
    content = ""
    file_extension = file.filename.split(".")[-1].lower()
    
    if file_extension == "pdf":
        with pdfplumber.open(file.file) as pdf:
            for page in pdf.pages:
                content += page.extract_text() or ""
    elif file_extension == "docx":
        doc = docx.Document(file.file)
        content = "\n".join([para.text for para in doc.paragraphs])
    elif file_extension == "txt":
        content = file.file.read().decode("utf-8")
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file_extension}"
        )
    
    return content

def parse_cv_with_ollama(text: str,extract_fields: list | None = None):
    if not extract_fields:
        extract_fields = ["name", "email", "skills", "experience", "education"]
    
    prompt = f"""
    Analyze the following CV/resume text and extract the following information as JSON:
    Fields to extract: {', '.join(extract_fields)}
    
    CV Text:
    {text}
    
    Return only a valid JSON object with the extracted fields. If a field cannot be found, 
    set its value to null.
    """
    
    try:
        response = requests.post(
            settings.ollama_host,
            json={"model": settings.ollama_model, "prompt": prompt,"stream": False}
        )
        response.raise_for_status()
        response_text = response.json()["response"]
        return {"response": response_text}
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Ollama: {str(e)}")


@app.post("/parse-cv", response_model=CVParseResponse)
async def parse_cv(file: UploadFile = File(),request: list[str] | None = None
):
    """Endpoint to upload and parse a CV/resume"""
   
    file.file.seek(0, 2) 
    file_size = file.file.tell() / (1024 * 1024)  # MB
    file.file.seek(0) 
    
    if file_size > settings.max_file_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {settings.max_file_size}MB"
        )
  
    file_extension = file.filename.split(".")[-1].lower()
    if file_extension not in settings.allowed_file_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed types: {', '.join(settings.allowed_file_types)}"
        )   
    try:
        text_content = extract_text_from_file(file)
        extract_fields = request if request else None
        extracted_data = parse_cv_with_ollama(text_content, extract_fields)
        
        return CVParseResponse(
            content=text_content,
            extracted_data=extracted_data,
            status="success",
            message="CV parsed successfully"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing CV: {str(e)}"
        )


app.mount(
    "/static",
    StaticFiles(directory=os.path.join(os.path.dirname(__file__), "static"), html=True),
    name="static"
)

@app.get("/", include_in_schema=False)
async def serve_index():
    return FileResponse(os.path.join(os.path.dirname(__file__), "static", "index.html"))
