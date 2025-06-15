"""
Models management router.
Handles model listing, pulling, and running operations.
"""

from fastapi import APIRouter, HTTPException, Body

from app.schemas import ModelsResponse, ModelPullRequest, ModelRunRequest
from app.services.models_service import get_models_with_memory_info, pull_model
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
