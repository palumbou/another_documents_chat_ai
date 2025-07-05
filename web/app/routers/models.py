"""
Models management router.
Handles model listing, pulling, and running operations.
"""

from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import StreamingResponse
import json

from app.schemas import ModelsResponse, ModelPullRequest, ModelRunRequest
from app.services.models_service import (
    get_models_with_memory_info_async,
    pull_model_async, 
    pull_model_with_progress, 
    validate_model_exists_async,
    refresh_models_cache,
    get_remote_models_grouped
)
from app.services.engine_manager import engine_manager

router = APIRouter()

@router.get("/models", response_model=ModelsResponse)
async def list_models():
    """
    Return both locally available and remote pull-able models with memory info.
    """
    return await get_models_with_memory_info_async()

@router.post("/models/pull")
async def pull_model_endpoint(name: str = Body(..., embed=True)):
    """
    Trigger a pull of the specified model on Ollama.
    """
    result = await pull_model_async(name)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return {"pulled": result["pulled"]}

@router.post("/models/pull/stream")
async def pull_model_stream_endpoint(name: str = Body(..., embed=True)):
    """
    Trigger a pull of the specified model on Ollama with progress streaming.
    Returns Server-Sent Events with progress updates.
    """
    def generate_progress():
        try:
            for progress_data in pull_model_with_progress(name):
                # Format as Server-Sent Events
                yield f"data: {json.dumps(progress_data)}\n\n"
        except Exception as e:
            # Send error as final event
            error_data = {
                "status": "error", 
                "error": str(e),
                "completed": True
            }
            yield f"data: {json.dumps(error_data)}\n\n"
    
    return StreamingResponse(
        generate_progress(), 
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )

@router.post("/models/run")
async def run_model(name: str = Body(..., embed=True)):
    """
    Set the specified locally available model as the active engine for chat.
    Includes verification that the model actually works.
    """
    result = engine_manager.set_engine(name)
    
    if not result["success"]:
        if "not found locally" in result.get("error", ""):
            raise HTTPException(status_code=404, detail=result["error"])
        else:
            raise HTTPException(status_code=500, detail=result["error"])
    
    return {
        "running": result["running"],
        "verified": result["verified"],
        "message": result["message"]
    }

@router.post("/models/validate")
async def validate_model_endpoint(name: str = Body(..., embed=True)):
    """
    Validate if a model exists in the Ollama registry before attempting to pull it.
    """
    result = await validate_model_exists_async(name)
    
    if not result["exists"]:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return {"exists": True, "model": name}

@router.post("/models/refresh_cache")
async def refresh_models_cache_endpoint():
    """
    Force refresh of model cache.
    This will cause the next call to fetch fresh local model data from Ollama API.
    """
    refresh_models_cache()
    return {"message": "Models cache refreshed successfully"}


@router.get("/models/grouped")
async def get_grouped_models():
    """
    Get available models organized by family for better UI display.
    """
    try:
        from app.services.models_service import get_remote_models_grouped_async
        grouped_models = await get_remote_models_grouped_async()
        return {"grouped_models": grouped_models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching grouped models: {str(e)}")
