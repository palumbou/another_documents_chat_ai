"""
Models management router.
Handles model listing, pulling, and running operations.
"""

from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import StreamingResponse
import json

from app.schemas import ModelsResponse, ModelPullRequest, ModelRunRequest
from app.services.models_service import get_models_with_memory_info, pull_model, pull_model_with_progress
from app.services.engine_manager import engine_manager

router = APIRouter()

@router.get("/models", response_model=ModelsResponse)
async def list_models():
    """
    Return both locally available and remote pull-able models with memory info.
    """
    return get_models_with_memory_info()

@router.post("/models/pull")
async def pull_model_endpoint(name: str = Body(..., embed=True)):
    """
    Trigger a pull of the specified model on Ollama.
    """
    result = pull_model(name)
    
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
