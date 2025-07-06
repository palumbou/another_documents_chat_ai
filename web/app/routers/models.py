"""
Models management router.
Handles model listing, pulling, and running operations.
"""

from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import StreamingResponse
from typing import List
import json
import requests

from app.config import OLLAMA_BASE_URL
from app.schemas import ModelsResponse, ModelPullRequest, ModelRunRequest
from app.services import models_service
from app.services.models_service import (
    get_models_with_memory_info_async,
    pull_model_async, 
    pull_model_with_progress, 
    validate_model_exists_async,
    refresh_models_cache,
    get_remote_models_grouped,
    cancel_model_pull_async
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
        error_type = result.get("error_type", "unknown")
        error_details = result.get("details", "")
        
        # Customize HTTP status codes based on error type
        if error_type == "model_not_found":
            status_code = 404
        elif error_type in ["timeout", "server_error"]:
            status_code = 503  # Service Unavailable
        else:
            status_code = 500
        
        # Create detailed error message
        error_message = result["error"]
        if error_details:
            error_message += f" Details: {error_details}"
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": error_message,
                "error_type": error_type,
                "model_name": name,
                "details": error_details,
                "suggestions": get_error_suggestions(error_type)
            }
        )
    
    return {
        "running": result["running"],
        "verified": result["verified"],
        "message": result["message"]
    }


def get_error_suggestions(error_type: str) -> List[str]:
    """Get user-friendly suggestions based on error type."""
    suggestions = {
        "model_not_found": [
            "The model may have been deleted or corrupted",
            "Try refreshing the models list",
            "Consider re-downloading the model"
        ],
        "timeout": [
            "The model may be too large for your system",
            "Try a smaller model variant",
            "Wait a few minutes for the model to finish loading",
            "Check if Ollama has enough memory available"
        ],
        "empty_response": [
            "The model may still be loading",
            "Wait a few minutes and try again",
            "The model files might be corrupted - consider re-downloading"
        ],
        "server_error": [
            "Ollama may be experiencing issues",
            "Try restarting Ollama",
            "Check Ollama logs for more details"
        ],
        "network_error": [
            "Check your connection to Ollama",
            "Ensure Ollama is running and accessible",
            "Verify Ollama is listening on the correct port"
        ]
    }
    return suggestions.get(error_type, ["Try again later or contact support"])

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

@router.post("/models/cancel")
async def cancel_model_pull(name: str = Body(..., embed=True)):
    """
    Cancel the download of a model and remove partial files.
    """
    result = await cancel_model_pull_async(name)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return {"cancelled": True, "message": result["message"]}

@router.delete("/models/{model_name}")
async def delete_model(model_name: str):
    """
    Delete a locally installed model.
    If the model is currently active, it will be deactivated first.
    """
    try:
        # Check if model exists locally
        local_models = await models_service.get_local_models_async()
        if model_name not in local_models:
            raise HTTPException(
                status_code=404, 
                detail=f"Model {model_name} not found locally"
            )
        
        # Check if this model is currently active
        current_engine = engine_manager.current_engine
        was_active = current_engine == model_name
        
        if was_active:
            # Deactivate the current engine
            engine_manager.current_engine = None
            print(f"Deactivated model {model_name} before deletion")
        
        # Delete the model using Ollama API
        response = requests.delete(
            f"{OLLAMA_BASE_URL}/api/delete",
            json={"name": model_name},
            timeout=30
        )
        
        if response.status_code == 200:
            # Invalidate local models cache
            models_service.local_models_cache["time"] = 0
            
            return {
                "success": True,
                "message": f"Model {model_name} deleted successfully",
                "was_active": was_active
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete model {model_name}: {response.text}"
            )
            
    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error communicating with Ollama: {str(e)}"
        )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error deleting model: {str(e)}"
        )
