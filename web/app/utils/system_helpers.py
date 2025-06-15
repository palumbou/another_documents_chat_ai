"""
System utilities for memory management and performance monitoring.
"""

import psutil
import socket
from typing import Dict, Any

def get_system_memory_info() -> Dict[str, Any]:
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

def estimate_model_memory_requirements(model_name: str) -> Dict[str, Any]:
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
        "category": categorize_model_size(estimated_gb)
    }

def categorize_model_size(gb_required: int) -> str:
    """Categorize model size based on RAM requirements."""
    if gb_required <= 4:
        return "Small (up to 4GB)"
    elif gb_required <= 16:
        return "Medium (4-16GB)"
    elif gb_required <= 64:
        return "Large (16-64GB)"
    else:
        return "Extra Large (64GB+)"

def check_network_connectivity(host: str = "8.8.8.8", port: int = 53, timeout: int = 3) -> bool:
    """Check if network connectivity is available."""
    try:
        socket.setdefaulttimeout(timeout)
        socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect((host, port))
        return True
    except socket.error:
        return False

def get_cpu_info() -> Dict[str, Any]:
    """Get CPU information."""
    try:
        return {
            "cpu_count": psutil.cpu_count(),
            "cpu_count_logical": psutil.cpu_count(logical=True),
            "cpu_percent": psutil.cpu_percent(interval=1),
            "load_average": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
        }
    except Exception as e:
        print(f"Error getting CPU info: {e}")
        return {}

def get_disk_info(path: str = "/") -> Dict[str, Any]:
    """Get disk space information."""
    try:
        disk_usage = psutil.disk_usage(path)
        return {
            "total_gb": round(disk_usage.total / (1024**3), 2),
            "used_gb": round(disk_usage.used / (1024**3), 2),
            "free_gb": round(disk_usage.free / (1024**3), 2),
            "percent_used": round((disk_usage.used / disk_usage.total) * 100, 1)
        }
    except Exception as e:
        print(f"Error getting disk info: {e}")
        return {}
