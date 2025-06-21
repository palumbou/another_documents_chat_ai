"""
Model management service for Ollama models.
Handles fetching available models, pulling new models, and model metadata.
"""

import time
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any

from app.config import OLLAMA_BASE_URL, MODELS_CACHE_TTL
from app.utils.system_helpers import estimate_model_memory_requirements, get_system_memory_info

# Cache for scraped remote model variants
enabled_models_cache = {"time": 0, "models": []}

def fetch_available_models_from_library() -> List[str]:
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

def get_remote_models() -> List[str]:
    """
    Return cached remote models or refresh via scraping if cache expired.
    Raises exception if unable to fetch models.
    """
    now = time.time()
    if now - enabled_models_cache["time"] > MODELS_CACHE_TTL:
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

def get_local_models() -> List[str]:
    """Get list of locally available models."""
    try:
        resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=2)
        resp.raise_for_status()
        tags_data = resp.json()
        # Extract model names from the tags response
        models = [model.get("name", "") for model in tags_data.get("models", [])]
        return [name for name in models if name]  # Filter out empty names
    except requests.RequestException as e:
        print(f"Error fetching local models: {e}")
        return []

def get_models_with_memory_info() -> Dict[str, Any]:
    """
    Return both locally available and remote pull-able models with memory info.
    """
    try:
        remote = get_remote_models()
        remote_error = None
    except Exception as e:
        # If we can't fetch remote models, return error info
        remote = []
        error_msg = str(e)
        
        # Provide a user-friendly error message for common cases
        if "Connection" in error_msg or "timeout" in error_msg.lower():
            remote_error = "⚠️ Ollama servers for downloading models are temporarily unreachable. Please try again later."
        elif "Network" in error_msg:
            remote_error = "⚠️ Network error while fetching remote models. Please check your internet connection."
        else:
            remote_error = f"⚠️ Error fetching remote models: {error_msg}"
    
    local = get_local_models()

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

def pull_model(name: str) -> Dict[str, Any]:
    """Trigger a pull of the specified model on Ollama."""
    try:
        resp = requests.post(
            f"{OLLAMA_BASE_URL}/api/pull",
            json={"model": name},
            timeout=60
        )
        resp.raise_for_status()
        # Invalidate cache so remote list refreshes
        enabled_models_cache["time"] = 0
        return {"success": True, "pulled": name}
    except requests.RequestException as e:
        return {"success": False, "error": f"Failed to pull model {name}: {str(e)}"}

def pull_model_with_progress(name: str):
    """
    Pull a model with progress updates.
    Yields progress data as the model is being downloaded.
    """
    try:
        import json
        resp = requests.post(
            f"{OLLAMA_BASE_URL}/api/pull",
            json={"model": name},
            timeout=300,  # Longer timeout for downloads
            stream=True
        )
        resp.raise_for_status()
        
        total_size = 0
        downloaded_size = 0
        last_status = ""
        
        for line in resp.iter_lines():
            if line:
                try:
                    data = json.loads(line.decode('utf-8'))
                    
                    # Extract progress information
                    status = data.get('status', '')
                    total = data.get('total', 0)
                    completed = data.get('completed', 0)
                    
                    # Calculate progress percentage
                    progress_percent = 0
                    if total > 0:
                        progress_percent = min(100, (completed / total) * 100)
                        total_size = total
                        downloaded_size = completed
                    
                    # Format size information
                    def format_bytes(bytes_val):
                        if bytes_val == 0:
                            return "0 B"
                        for unit in ['B', 'KB', 'MB', 'GB']:
                            if bytes_val < 1024.0:
                                return f"{bytes_val:.1f} {unit}"
                            bytes_val /= 1024.0
                        return f"{bytes_val:.1f} TB"
                    
                    # Prepare progress data
                    progress_data = {
                        "status": status,
                        "progress_percent": round(progress_percent, 1),
                        "downloaded": format_bytes(downloaded_size),
                        "total": format_bytes(total_size),
                        "model_name": name,
                        "completed": False
                    }
                    
                    # Check if this is a new status worth reporting
                    if status != last_status or progress_percent > 0:
                        yield progress_data
                        last_status = status
                    
                    # Check if pulling is complete
                    if status == "success" or "success" in status.lower():
                        progress_data["completed"] = True
                        progress_data["progress_percent"] = 100
                        yield progress_data
                        break
                        
                except json.JSONDecodeError:
                    # Skip malformed lines
                    continue
        
        # Invalidate cache so remote list refreshes
        enabled_models_cache["time"] = 0
        
    except requests.RequestException as e:
        yield {
            "status": "error",
            "error": f"Failed to pull model {name}: {str(e)}",
            "model_name": name,
            "completed": True,
            "progress_percent": 0
        }

def get_model_info(name: str) -> Dict[str, Any]:
    """Get detailed information about a specific model."""
    memory_info = estimate_model_memory_requirements(name)
    local_models = get_local_models()
    
    return {
        "name": name,
        "is_local": name in local_models,
        "estimated_ram_gb": memory_info["estimated_ram_gb"],
        "category": memory_info["category"],
        "model_info": memory_info
    }
