"""
System information router.
Handles system status, memory information, and health checks.
"""

from fastapi import APIRouter

from app.schemas import MemoryInfo, StatusResponse
from app.services.engine_manager import engine_manager
from app.utils.system_helpers import get_system_memory_info

router = APIRouter()

@router.get("/system/memory", response_model=MemoryInfo)
async def get_memory_info():
    """Return system memory information."""
    return get_system_memory_info()

@router.get("/status", response_model=StatusResponse)
async def status():
    """
    Check Ollama connectivity and report the active engine status with detailed verification.
    """
    return engine_manager.check_ollama_connectivity()
