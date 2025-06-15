"""
Engine management router.
Handles AI engine verification, health checks, and model switching.
"""

from fastapi import APIRouter, Body

from app.schemas import EngineVerifyResponse, EngineHealthResponse
from app.services.engine_manager import engine_manager

router = APIRouter()

@router.post("/engine/verify", response_model=EngineVerifyResponse)
async def verify_engine():
    """
    Manually verify the current engine and try to initialize a default if needed.
    """
    return engine_manager.manual_verify()

@router.get("/engine/health", response_model=EngineHealthResponse)
async def engine_health():
    """
    Get detailed health information about the current engine.
    """
    return engine_manager.get_engine_health()
