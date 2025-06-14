import os
import time
import socket
import psutil
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Body
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import requests
from bs4 import BeautifulSoup
from docx import Document
from PyPDF2 import PdfReader

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

# Directory to store uploaded documents
DOCS_DIR = "docs"
os.makedirs(DOCS_DIR, exist_ok=True)
documents = {}

def extract_text(path: str) -> str:
    """
    Extract text from supported document types (PDF, DOCX, TXT).
    """
    if path.lower().endswith(".pdf"):
        reader = PdfReader(path)
        texts = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(texts)
    elif path.lower().endswith(".docx"):
        doc = Document(path)
        return "\n".join([p.text for p in doc.paragraphs])
    else:
        with open(path, encoding="utf-8", errors="ignore") as f:
            return f.read()

def load_existing_documents():
    """Load documents that are already in the docs folder."""
    documents.clear()
    for filename in os.listdir(DOCS_DIR):
        if filename.lower().endswith(('.pdf', '.docx', '.txt')):
            file_path = os.path.join(DOCS_DIR, filename)
            try:
                documents[filename] = extract_text(file_path)
                print(f"Loaded existing document: {filename}")
            except Exception as e:
                print(f"Error loading {filename}: {e}")

# Load existing documents at startup
load_existing_documents()

def get_system_memory_info():
    """Get system memory information in GB."""
    try:
        memory = psutil.virtual_memory()
        return {
            "total_gb": round(memory.total / (1024**3), 2),
            "available_gb": round(memory.available / (1024**3), 2),
            "used_gb": round(memory.used / (1024**3), 2),
            "percent_used": memory.percent
        }
    except Exception as e:
        print(f"Error getting memory info: {e}")
        return {
            "total_gb": 0,
            "available_gb": 0,
            "used_gb": 0,
            "percent_used": 0
        }

def estimate_model_memory_requirements(model_name: str) -> dict:
    """
    Estimate memory requirements for Ollama models based on model name.
    Returns estimated RAM needed in GB.
    """
    model_lower = model_name.lower()
    
    # Extract size info from model name
    if ':' in model_lower:
        base_name, variant = model_lower.split(':', 1)
    else:
        base_name = model_lower
        variant = ""
    
    # Size mapping based on common model variants
    size_requirements = {
        # Small models (1-3B parameters)
        "1b": 2,
        "1.1b": 2,
        "2b": 3,
        "2.7b": 4,
        "3b": 4,
        "mini": 2,
        
        # Medium models (7-13B parameters) 
        "7b": 8,
        "8b": 9,
        "9b": 10,
        "11b": 12,
        "13b": 14,
        "14b": 15,
        
        # Large models (20-70B parameters)
        "22b": 24,
        "27b": 30,
        "33b": 36,
        "34b": 38,
        "70b": 80,
        "72b": 82,
        
        # Extra large models (100B+ parameters)
        "405b": 450,
        
        # Special variants
        "instruct": 8,  # Default to medium size
        "latest": 8,    # Default to medium size
        "code": 15,     # Code models tend to be larger
    }
    
    # Try to match variant first
    estimated_gb = None
    for size_key, gb_needed in size_requirements.items():
        if size_key in variant:
            estimated_gb = gb_needed
            break
    
    # If no variant match, try to infer from base name
    if estimated_gb is None:
        if any(name in base_name for name in ["tinyllama", "phi"]):
            estimated_gb = 3
        elif any(name in base_name for name in ["llama3.2", "gemma", "mistral"]):
            estimated_gb = 8
        elif any(name in base_name for name in ["mixtral", "qwen2"]):
            estimated_gb = 12
        elif any(name in base_name for name in ["codellama", "deepseek"]):
            estimated_gb = 15
        else:
            estimated_gb = 8  # Default estimate
    
    # Add some overhead (20% more for safety)
    estimated_gb = int(estimated_gb * 1.2)
    
    return {
        "model": model_name,
        "estimated_ram_gb": estimated_gb,
        "category": _categorize_model_size(estimated_gb)
    }

def _categorize_model_size(gb_required: int) -> str:
    """Categorize model size based on RAM requirements."""
    if gb_required <= 4:
        return "Small (up to 4GB)"
    elif gb_required <= 16:
        return "Medium (4-16GB)"
    elif gb_required <= 64:
        return "Large (16-64GB)"
    else:
        return "Extra Large (64GB+)"

# Cache for scraped remote model variants
enabled_models_cache = {"time": 0, "models": []}
CACHE_TTL = 60 * 5  # cache TTL in seconds (5 minutes)

# Currently selected engine for chat (must be a locally available model)
current_engine = None

@app.get("/", response_class=HTMLResponse)
async def home():
    """Serve the main HTML interface."""
    with open("templates/index.html", encoding="utf-8") as f:
        return f.read()

@app.get("/documents")
async def list_documents():
    """Return the list of currently loaded documents."""
    return {"documents": list(documents.keys())}

@app.get("/system/memory")
async def get_memory_info():
    """Return system memory information."""
    return get_system_memory_info()

@app.post("/upload")
async def upload(files: list[UploadFile] = File(...), overwrite: str = Form("false")):
    """Handle document uploads and extract their text."""
    results = {"uploaded": [], "existing": [], "errors": []}
    overwrite_all = overwrite.lower() == "true"
    
    for f in files:
        dest = os.path.join(DOCS_DIR, f.filename)
        
        # Check if file already exists
        if os.path.exists(dest) and not overwrite_all:
            results["existing"].append(f.filename)
            continue
        
        try:
            content = await f.read()
            with open(dest, "wb") as out:
                out.write(content)
            documents[f.filename] = extract_text(dest)
            results["uploaded"].append(f.filename)
        except Exception as e:
            results["errors"].append(f"Error uploading {f.filename}: {str(e)}")
    
    return results

def truncate_documents_intelligently(documents_dict: dict, max_chars: int = 12000) -> str:
    """
    Intelligently truncate documents to fit within token limits.
    Prefers to keep beginning and end of each document.
    """
    if not documents_dict:
        return ""
    
    # Calculate how much space each document can have
    num_docs = len(documents_dict)
    chars_per_doc = max_chars // num_docs
    
    truncated_parts = []
    
    for filename, content in documents_dict.items():
        if len(content) <= chars_per_doc:
            truncated_parts.append(f"[Document: {filename}]\n{content}")
        else:
            # Take first and last part of document
            first_part = content[:chars_per_doc//2]
            last_part = content[-(chars_per_doc//2):]
            truncated_content = f"{first_part}\n\n[... middle section truncated ...]\n\n{last_part}"
            truncated_parts.append(f"[Document: {filename}]\n{truncated_content}")
    
    return "\n\n" + "="*50 + "\n\n".join(truncated_parts)

@app.delete("/documents/{filename}")
async def delete_document(filename: str):
    """Delete a document from the docs folder and memory."""
    file_path = os.path.join(DOCS_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Document {filename} not found")
    
    try:
        os.remove(file_path)
        if filename in documents:
            del documents[filename]
        return {"deleted": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting {filename}: {str(e)}")

@app.post("/chat")
async def chat(query: str = Form(...), model: str = Form(None)):
    """
    Perform a chat query using Ollama. Uses the provided model, or the
    currently selected engine, or fallback to a default model.
    """
    default_model = "llama3.2"
    chosen_model = model or current_engine or default_model

    # Build prompt with intelligently truncated documents
    context = truncate_documents_intelligently(documents, max_chars=10000)
    
    prompt = f"""Based on the following documents, please answer the question.

{context}

Question: {query}

Answer:"""

    try:
        # Call Ollama generate API with increased timeout and error handling
        resp = requests.post(
            "http://ollama:11434/api/generate",
            json={
                "model": chosen_model, 
                "prompt": prompt, 
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "num_ctx": 4096  # Set context window explicitly
                }
            },
            timeout=120  # Increased timeout to 2 minutes
        )
        resp.raise_for_status()
        data = resp.json()

        # Ollama generate API returns response in "response" field
        text = data.get("response", "No response generated")
        return {"response": text, "model": chosen_model}
        
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Request timed out. The model may be taking too long to respond.")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Ollama: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.get("/status")
async def status():
    """
    Check Ollama connectivity and report the active engine tag.
    """
    try:
        resp = requests.get("http://ollama:11434/api/tags", timeout=2)
        resp.raise_for_status()
        tags_data = resp.json()
        # Extract model names from the tags response
        models = [model.get("name", "") for model in tags_data.get("models", [])]
        models = [name for name in models if name]  # Filter out empty names
        engine = current_engine or (models[0] if models else "unknown")
        return {"connected": True, "engine": engine}
    except (requests.RequestException, socket.error):
        return {"connected": False, "engine": None}

def fetch_available_models_from_library() -> list[str]:
    """
    Scrape available models from https://ollama.com/library
    Following the approach from: https://github.com/ollama/ollama/issues/1473#issuecomment-2465945641
    """
    try:
        print("Fetching models from https://ollama.com/library...")
        
        # Fetch the main library page
        resp = requests.get("https://ollama.com/library", timeout=15, headers={
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        resp.raise_for_status()
        
        soup = BeautifulSoup(resp.text, "html.parser")
        models = set()
        
        # Look for model cards or links in the library page
        # The models are typically in <a> tags with href="/library/model-name"
        for link in soup.find_all("a", href=True):
            href = link.get("href", "")
            # Match links like "/library/llama3.2" or "/library/mistral"
            if href.startswith("/library/") and href.count("/") == 2:
                model_name = href.split("/")[-1]
                if model_name and not any(char in model_name for char in [":", "?", "#"]):
                    models.add(model_name)
        
        # Also try to find models in spans or other elements that might contain model names
        for element in soup.find_all(["span", "div", "h3", "h4"]):
            text = element.get_text(strip=True).lower()
            # Look for common model patterns
            if any(pattern in text for pattern in ["llama", "mistral", "gemma", "phi", "qwen", "codestral"]):
                # Extract just the model name part
                words = text.split()
                for word in words:
                    if any(pattern in word for pattern in ["llama", "mistral", "gemma", "phi", "qwen", "codestral"]):
                        clean_word = word.strip(".,!?()[]{}").lower()
                        if clean_word and len(clean_word) > 2:
                            models.add(clean_word)
        
        base_models = sorted(list(models))
        print(f"Found {len(base_models)} base models: {base_models[:10]}...")
        
        if not base_models:
            raise Exception("No base models found during scraping")
        
        # For each base model, add common variants
        all_models = []
        for model in base_models:
            all_models.append(model)
            # Add common size variants for each model
            for variant in ["latest", "7b", "13b", "70b", "1b", "3b", "instruct"]:
                all_models.append(f"{model}:{variant}")
        
        # Remove duplicates and sort
        all_models = sorted(list(set(all_models)))
        print(f"Generated {len(all_models)} total models (including variants)")
        
        return all_models
        
    except requests.RequestException as e:
        error_msg = f"Network error while fetching models from Ollama library: {str(e)}"
        print(error_msg)
        raise Exception(error_msg)
    except Exception as e:
        error_msg = f"Error scraping models from Ollama library: {str(e)}"
        print(error_msg)
        raise Exception(error_msg)

def get_models() -> list[str]:
    """
    Return cached remote models or refresh via scraping if cache expired.
    Raises exception if unable to fetch models.
    """
    now = time.time()
    if now - enabled_models_cache["time"] > CACHE_TTL:
        # Try to fetch new models
        models = fetch_available_models_from_library()
        
        # Sort models for better organization
        def sort_key(model):
            # Extract base name and size for sorting
            if ':' in model:
                base, variant = model.split(':', 1)
                # Extract numeric size if present
                size_num = 0
                if variant.replace('.', '').replace('b', '').isdigit():
                    size_num = float(variant.replace('b', ''))
                return (base.lower(), size_num, variant)
            else:
                return (model.lower(), 0, '')
        
        enabled_models_cache["models"] = sorted(models, key=sort_key)
        enabled_models_cache["time"] = now
    
    return enabled_models_cache["models"]

@app.get("/models")
async def list_models():
    """
    Return both locally available and remote pull-able models with memory info.
    """
    try:
        remote = get_models()
    except Exception as e:
        # If we can't fetch remote models, return error info
        remote = []
        remote_error = str(e)
    else:
        remote_error = None
    
    try:
        resp = requests.get("http://ollama:11434/api/tags", timeout=2)
        resp.raise_for_status()
        tags_data = resp.json()
        # Extract model names from the tags response
        local = [model.get("name", "") for model in tags_data.get("models", [])]
        local = [name for name in local if name]  # Filter out empty names
    except requests.RequestException as e:
        print(f"Error fetching local models: {e}")
        local = []

    # Add memory requirements to remote models
    remote_with_memory = []
    for model in remote:
        memory_info = estimate_model_memory_requirements(model)
        remote_with_memory.append({
            "name": model,
            "estimated_ram_gb": memory_info["estimated_ram_gb"],
            "category": memory_info["category"]
        })

    # Add memory requirements to local models
    local_with_memory = []
    for model in local:
        memory_info = estimate_model_memory_requirements(model)
        local_with_memory.append({
            "name": model,
            "estimated_ram_gb": memory_info["estimated_ram_gb"],
            "category": memory_info["category"]
        })

    # Get system memory info
    system_memory = get_system_memory_info()

    result = {
        "local": local_with_memory,
        "remote": remote_with_memory,
        "system_memory": system_memory
    }
    if remote_error:
        result["remote_error"] = remote_error
    
    return result

@app.post("/models/pull")
async def pull_model(name: str = Body(..., embed=True)):
    """
    Trigger a pull of the specified model on Ollama.
    """
    try:
        resp = requests.post(
            "http://ollama:11434/api/pull",
            json={"model": name},
            timeout=60
        )
        resp.raise_for_status()
        # Invalidate cache so remote list refreshes
        enabled_models_cache["time"] = 0
        return {"pulled": name}
    except requests.RequestException:
        raise HTTPException(status_code=500, detail=f"Failed to pull model {name}")

@app.post("/models/run")
async def run_model(name: str = Body(..., embed=True)):
    """
    Set the specified locally available model as the active engine for chat.
    """
    global current_engine
    try:
        resp = requests.get("http://ollama:11434/api/tags", timeout=2)
        resp.raise_for_status()
        tags_data = resp.json()
        # Extract model names from the tags response
        models = [model.get("name", "") for model in tags_data.get("models", [])]
        models = [name for name in models if name]  # Filter out empty names
    except requests.RequestException:
        raise HTTPException(status_code=503, detail="Cannot reach Ollama")

    if name not in models:
        raise HTTPException(status_code=404, detail=f"Model {name} not found locally")

    current_engine = name
    return {"running": name}
