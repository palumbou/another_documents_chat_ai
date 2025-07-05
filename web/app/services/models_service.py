"""
Model management service for Ollama models.
Handles fetching available models, pulling new models, and model metadata.
Uses official Ollama API endpoints for local models and web scraping for available models.
"""

import time
import json
import requests
import re
from typing import List, Dict, Any, Optional
import asyncio
import aiohttp

from app.config import OLLAMA_BASE_URL, MODELS_CACHE_TTL
from app.utils.system_helpers import estimate_model_memory_requirements, get_system_memory_info

# Cache for models
available_models_cache = {"time": 0, "models": []}
local_models_cache = {"time": 0, "models": []}

# Regex patterns for parsing Ollama search page (from ollama-remote-models)
model_block_regex = re.compile(r'(?s)<li x-test-model[^>]*>.*?</li>')
title_regex = re.compile(r'<span x-test-search-response-title>(.*?)</span>')
desc_regex = re.compile(r'<p class="max-w-lg break-words[^>]*>(.*?)</p>')
size_regex = re.compile(r'<span[^>]*x-test-size[^>]*>(\d+(?:x\d+)?(?:\.\d+)?[mbB])</span>')
pulls_regex = re.compile(r'<span x-test-pull-count[^>]*>([^<]+)</span>')
tags_regex = re.compile(r'<span x-test-tag-count[^>]*>([^<]+)</span>')
updated_regex = re.compile(r'<span x-test-updated[^>]*>([^<]+)</span>')


class OllamaModel:
    """Model class for Ollama models parsed from search page"""
    
    def __init__(self, name):
        self.name = name
        self.description = ""
        self.size = ""
        self.pulls = ""
        self.tags = ""
        self.updated = ""

    def to_dict(self):
        return {
            "name": self.name,
            "description": self.description,
            "size": self.size,
            "pulls": self.pulls,
            "tags": self.tags,
            "updated": self.updated
        }


def format_model_name(name):
    """Format model name according to Ollama conventions"""
    return name.strip().lower().replace(" ", "-")


def extract_all_sizes(size_str):
    """Extract all sizes from size string"""
    return re.findall(r'\d+(?:x\d+)?(?:\.\d+)?[mbB]', size_str.lower())


def extract_numeric_value(size_str):
    """Extract numeric value for sorting sizes"""
    size_str = size_str.lower().strip()

    # Composite format: 8x7b, 4x3.5m, etc.
    match = re.match(r'(\d+)x(\d+(?:\.\d+)?)([mb])$', size_str)
    if match:
        count, size, unit = match.groups()
        count = int(count)
        size = float(size)
    else:
        # Simple format: 7b, 344m, etc.
        match = re.match(r'(\d+(?:\.\d+)?)([mb])$', size_str)
        if match:
            count = 1
            size, unit = match.groups()
            size = float(size)
        else:
            return float('inf')  # Invalid format goes last

    if unit == 'b':
        multiplier = 1_000_000_000
    elif unit == 'm':
        multiplier = 1_000_000
    else:
        return float('inf')

    return count * size * multiplier


def parse_models_from_html(html):
    """Parse models from Ollama search page HTML and expand all variants"""
    models = []
    
    model_blocks = model_block_regex.findall(html)
    
    if not model_blocks:
        print("Warning: No models found in HTML response")
        return models

    for block in model_blocks:
        title_match = title_regex.search(block)
        if not title_match:
            continue

        base_name = format_model_name(title_match.group(1))
        
        # Get common information for this model
        desc_match = desc_regex.search(block)
        description = desc_match.group(1).strip() if desc_match else ""

        size_matches = size_regex.findall(block)
        sizes = [s.strip() for s in size_matches]
        
        # Sort sizes by their numeric value
        sorted_sizes = sorted(sizes, key=extract_numeric_value)

        pulls_match = pulls_regex.search(block)
        pulls = pulls_match.group(1).strip() if pulls_match else ""

        tags_match = tags_regex.search(block)
        tags = tags_match.group(1).strip() if tags_match else ""

        updated_match = updated_regex.search(block)
        updated = updated_match.group(1).strip() if updated_match else ""

        # Create a model entry for each size variant
        if sorted_sizes:
            for size in sorted_sizes:
                # Create the full model name with size tag
                if size.lower().endswith('b') or size.lower().endswith('m'):
                    # Standard size format (7b, 3.5b, 344m, etc.)
                    variant_name = f"{base_name}:{size.lower()}"
                else:
                    # Fallback for unusual formats
                    variant_name = f"{base_name}:{size}"
                
                model_obj = OllamaModel(variant_name)
                model_obj.description = description
                model_obj.size = size
                model_obj.pulls = pulls
                model_obj.tags = tags
                model_obj.updated = updated
                
                models.append(model_obj)
        else:
            # No sizes found, create base model entry
            model_obj = OllamaModel(base_name)
            model_obj.description = description
            model_obj.size = ""
            model_obj.pulls = pulls
            model_obj.tags = tags
            model_obj.updated = updated
            
            models.append(model_obj)

    return models


async def get_local_models_async() -> List[str]:
    """
    Get list of locally available models using Ollama API.
    Simple and reliable approach using /api/tags endpoint.
    """
    now = time.time()
    if now - local_models_cache["time"] > 30:  # Cache for 30 seconds
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=aiohttp.ClientTimeout(total=5)) as response:
                    response.raise_for_status()
                    
                    data = await response.json()
                    models = []
                    
                    for model in data.get("models", []):
                        name = model.get("name", "")
                        if name:
                            models.append(name)
                    
                    local_models_cache["models"] = sorted(models)
                    local_models_cache["time"] = now
                    
                    print(f"Fetched {len(models)} local models from Ollama API")
                    
        except Exception as e:
            print(f"Error fetching local models: {e}")
            # Return cached data if available, otherwise empty list
            if not local_models_cache["models"]:
                local_models_cache["models"] = []
    
    return local_models_cache["models"]


def get_local_models() -> List[str]:
    """
    Synchronous wrapper for get_local_models_async.
    """
    try:
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(get_local_models_async())
    except RuntimeError:
        return asyncio.run(get_local_models_async())


async def fetch_available_models_async() -> List[Dict[str, Any]]:
    """
    Fetch available models from Ollama search page.
    Uses web scraping based on ollama-remote-models approach.
    """
    now = time.time()
    if now - available_models_cache["time"] > MODELS_CACHE_TTL:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get("https://ollama.com/search", timeout=aiohttp.ClientTimeout(total=30)) as response:
                    if response.status == 200:
                        html_content = await response.text()
                        
                        # Parse models from HTML
                        models = parse_models_from_html(html_content)
                        
                        # Convert to dict format
                        models_data = [model.to_dict() for model in models]
                        
                        available_models_cache["models"] = models_data
                        available_models_cache["time"] = now
                        
                        print(f"Fetched {len(models_data)} available models from Ollama search")
                        return models_data
                    else:
                        print(f"Failed to fetch Ollama search page: HTTP {response.status}")
                        return available_models_cache.get("models", [])
                        
        except Exception as e:
            print(f"Error fetching available models: {e}")
            return available_models_cache.get("models", [])
    
    return available_models_cache["models"]


def fetch_available_models() -> List[Dict[str, Any]]:
    """
    Synchronous wrapper for fetch_available_models_async.
    """
    try:
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(fetch_available_models_async())
    except RuntimeError:
        return asyncio.run(fetch_available_models_async())


def organize_models(models: List[str]) -> Dict[str, List[str]]:
    """
    Organize models by family name, following your suggested approach.
    """
    organized = {}
    for model_name in models:
        parts = model_name.split(':')
        if len(parts) > 1:
            main_name, subcategory = parts[0], parts[1]
            if main_name not in organized:
                organized[main_name] = []
            organized[main_name].append(subcategory)
        else:
            organized[model_name] = []
    return organized


def get_remote_models() -> List[str]:
    """
    Get list of available models for download (from Ollama search).
    Now returns all variants/sizes for each model.
    """
    models_data = fetch_available_models()
    return [model["name"] for model in models_data]


async def get_remote_models_grouped_async() -> Dict[str, List[str]]:
    """
    Return available models organized by family for better UI display.
    Now includes all variants/sizes for each model.
    """
    models_data = await fetch_available_models_async()
    model_names = [model["name"] for model in models_data]
    return organize_models(model_names)


def get_remote_models_grouped() -> Dict[str, List[str]]:
    """
    Return available models organized by family for better UI display.
    Now includes all variants/sizes for each model.
    """
    models_data = fetch_available_models()
    model_names = [model["name"] for model in models_data]
    return organize_models(model_names)


async def get_model_info_from_ollama_async(model_name: str) -> Optional[Dict[str, Any]]:
    """
    Get detailed model information using Ollama's show API with aiohttp.
    Returns None if model is not available locally.
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{OLLAMA_BASE_URL}/api/show",
                json={"name": model_name},
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                
                if response.status == 200:
                    return await response.json()
                else:
                    return None
                    
    except Exception as e:
        print(f"Error getting model info for {model_name}: {e}")
        return None


def get_model_info_from_ollama(model_name: str) -> Optional[Dict[str, Any]]:
    """
    Synchronous wrapper for get_model_info_from_ollama_async.
    """
    try:
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(get_model_info_from_ollama_async(model_name))
    except RuntimeError:
        return asyncio.run(get_model_info_from_ollama_async(model_name))


async def get_models_with_memory_info_async() -> Dict[str, Any]:
    """
    Return both locally available and remote models with memory info.
    Local models come from /api/tags, remote models from scraping Ollama search.
    Now includes all variants/sizes for each model with full details.
    """
    try:
        # Get local models (already downloaded)
        local_models = await get_local_models_async()
        
        # Get available models (for download) - now returns all variants
        remote_models_data = await fetch_available_models_async()
        
        # Add memory requirements to local models
        local_with_memory = []
        for model in local_models:
            memory_info = estimate_model_memory_requirements(model)
            local_with_memory.append({
                "name": model,
                "estimated_ram_gb": memory_info["estimated_ram_gb"],
                "category": memory_info["category"]
            })

        # Add memory requirements to remote models and include all details
        remote_with_memory = []
        for model_data in remote_models_data:
            model_name = model_data["name"]
            memory_info = estimate_model_memory_requirements(model_name)
            
            remote_with_memory.append({
                "name": model_name,
                "description": model_data.get("description", ""),
                "size": model_data.get("size", ""),
                "pulls": model_data.get("pulls", ""),
                "tags": model_data.get("tags", ""),
                "updated": model_data.get("updated", ""),
                "estimated_ram_gb": memory_info["estimated_ram_gb"],
                "category": memory_info["category"]
            })

        # Get system memory info
        system_memory = get_system_memory_info()

        return {
            "local": local_with_memory,
            "remote": remote_with_memory,
            "system_memory": system_memory
        }
        
    except Exception as e:
        print(f"Error getting models with memory info: {e}")
        import traceback
        traceback.print_exc()
        return {
            "local": [],
            "remote": [],
            "system_memory": get_system_memory_info(),
            "error": f"Error fetching models: {str(e)}"
        }


def get_models_with_memory_info() -> Dict[str, Any]:
    """
    Synchronous wrapper for get_models_with_memory_info_async.
    """
    try:
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(get_models_with_memory_info_async())
    except RuntimeError:
        return asyncio.run(get_models_with_memory_info_async())


def refresh_models_cache():
    """
    Force refresh of model caches.
    """
    global available_models_cache, local_models_cache
    available_models_cache["time"] = 0
    available_models_cache["models"] = []
    local_models_cache["time"] = 0
    local_models_cache["models"] = []
    print("All model caches have been refreshed")


async def pull_model_async(name: str) -> Dict[str, Any]:
    """
    Trigger a pull of the specified model using Ollama API with aiohttp.
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{OLLAMA_BASE_URL}/api/pull",
                json={"name": name},
                timeout=aiohttp.ClientTimeout(total=60)
            ) as response:
                response.raise_for_status()
                
                # Check for errors in the response
                async for line in response.content:
                    if line:
                        try:
                            data = json.loads(line.decode('utf-8'))
                            if 'error' in data:
                                return {"success": False, "error": data['error']}
                        except json.JSONDecodeError:
                            continue
                
                # Invalidate cache so lists refresh with new model
                local_models_cache["time"] = 0
                
                return {"success": True, "pulled": name}
                
    except Exception as e:
        return {"success": False, "error": f"Failed to pull model {name}: {str(e)}"}


def pull_model(name: str) -> Dict[str, Any]:
    """
    Synchronous wrapper for pull_model_async.
    """
    try:
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(pull_model_async(name))
    except RuntimeError:
        return asyncio.run(pull_model_async(name))


def pull_model_with_progress(name: str):
    """
    Pull a model with progress updates using Ollama API.
    Yields progress data as the model is being downloaded.
    """
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/pull",
            json={"name": name},
            timeout=300,  # Longer timeout for downloads
            stream=True
        )
        response.raise_for_status()
        
        total_size = 0
        downloaded_size = 0
        last_status = ""
        
        for line in response.iter_lines():
            if line:
                try:
                    data = json.loads(line.decode('utf-8'))
                    
                    # Check for errors
                    if 'error' in data:
                        yield {
                            "status": "error",
                            "error": data['error'],
                            "model_name": name,
                            "completed": True,
                            "progress_percent": 0
                        }
                        return
                    
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
        
        # Invalidate cache so lists refresh with new model
        local_models_cache["time"] = 0
        
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
    
    # Try to get additional info from Ollama if model is local
    ollama_info = None
    if name in local_models:
        ollama_info = get_model_info_from_ollama(name)
    
    result = {
        "name": name,
        "is_local": name in local_models,
        "estimated_ram_gb": memory_info["estimated_ram_gb"],
        "category": memory_info["category"],
        "model_info": memory_info
    }
    
    if ollama_info:
        result["ollama_info"] = ollama_info
    
    return result


async def validate_model_exists_async(name: str) -> Dict[str, Any]:
    """
    Simplified model validation: check if it exists locally or in available models.
    """
    try:
        # First check if model exists locally
        local_models = await get_local_models_async()
        if name in local_models:
            return {"exists": True, "location": "local"}
        
        # Check if model is in available models list
        available_models_data = await fetch_available_models_async()
        available_models = [model["name"] for model in available_models_data]
        if name in available_models:
            return {"exists": True, "location": "remote"}
        
        return {"exists": False, "error": f"Model '{name}' not found in local or available model lists"}
        
    except Exception as e:
        return {
            "exists": False, 
            "error": f"Error validating model: {str(e)}"
        }


def validate_model_exists(name: str) -> Dict[str, Any]:
    """
    Synchronous wrapper for validate_model_exists_async.
    """
    try:
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(validate_model_exists_async(name))
    except RuntimeError:
        return asyncio.run(validate_model_exists_async(name))
