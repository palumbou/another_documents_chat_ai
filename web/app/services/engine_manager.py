"""
Ollama engine management service.
Handles engine verification, health checks, and model management.
"""

import time
import requests
from typing import Optional, Dict, Any, List

from app.config import (
    OLLAMA_BASE_URL, OLLAMA_TIMEOUT, OLLAMA_HEALTH_TIMEOUT, 
    OLLAMA_QUICK_TIMEOUT, DEFAULT_MODEL, PREFERRED_MODELS
)
from app.utils.logging import log_engine_status

class EngineManager:
    def __init__(self):
        self.current_engine: Optional[str] = None
        self.initialize_default_engine()
    
    def verify_engine_availability(self) -> bool:
        """
        Verify that the current engine is actually available and responding.
        Reset current_engine if it's not working properly.
        """
        if not self.current_engine:
            print("No engine currently set")
            return False
        
        try:
            print(f"Verifying engine availability: {self.current_engine}")
            
            # First check if the model is in the local models list
            resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
            resp.raise_for_status()
            tags_data = resp.json()
            local_models = [model.get("name", "") for model in tags_data.get("models", [])]
            local_models = [name for name in local_models if name]
            
            if self.current_engine not in local_models:
                print(f"Engine {self.current_engine} not found in local models: {local_models}")
                self.current_engine = None
                return False
            
            # Test if the model actually responds to a simple query
            test_resp = requests.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": self.current_engine,
                    "prompt": "Test",
                    "stream": False,
                    "options": {
                        "num_predict": 1,  # Very short response
                        "temperature": 0.1
                    }
                },
                timeout=30  # Short timeout for test
            )
            test_resp.raise_for_status()
            test_data = test_resp.json()
            
            if test_data.get("response"):
                print(f"Engine {self.current_engine} is responding correctly")
                log_engine_status(self.current_engine, "verified", "responding correctly")
                return True
            else:
                print(f"Engine {self.current_engine} returned empty response")
                log_engine_status(self.current_engine, "failed", "empty response")
                self.current_engine = None
                return False
                
        except requests.exceptions.Timeout:
            print(f"Engine {self.current_engine} timed out during verification")
            log_engine_status(self.current_engine, "timeout", "verification timeout")
            self.current_engine = None
            return False
        except requests.exceptions.RequestException as e:
            print(f"Engine {self.current_engine} failed verification: {e}")
            log_engine_status(self.current_engine, "error", str(e))
            self.current_engine = None
            return False
        except Exception as e:
            print(f"Unexpected error verifying engine {self.current_engine}: {e}")
            log_engine_status(self.current_engine, "error", f"unexpected: {str(e)}")
            self.current_engine = None
            return False

    def initialize_default_engine(self) -> None:
        """
        Try to set a default engine if none is available.
        Looks for the smallest available model first.
        """
        if self.current_engine:
            return  # Already have a working engine
        
        try:
            resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
            resp.raise_for_status()
            tags_data = resp.json()
            local_models = [model.get("name", "") for model in tags_data.get("models", [])]
            local_models = [name for name in local_models if name]
            
            if not local_models:
                print("No local models available")
                return
            
            # First try preferred models
            for preferred in PREFERRED_MODELS:
                if preferred in local_models:
                    print(f"Setting preferred default engine: {preferred}")
                    self.current_engine = preferred
                    if self.verify_engine_availability():
                        return
            
            # If no preferred model, try the first available
            for model in sorted(local_models):
                print(f"Trying to set default engine: {model}")
                self.current_engine = model
                if self.verify_engine_availability():
                    return
                    
            print("No working engines found")
            self.current_engine = None
            
        except Exception as e:
            print(f"Error initializing default engine: {e}")
            self.current_engine = None

    def get_local_models(self) -> List[str]:
        """Get list of locally available models."""
        try:
            resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
            resp.raise_for_status()
            tags_data = resp.json()
            models = [model.get("name", "") for model in tags_data.get("models", [])]
            return [name for name in models if name]  # Filter out empty names
        except requests.RequestException as e:
            print(f"Error fetching local models: {e}")
            return []

    def check_ollama_connectivity(self) -> Dict[str, Any]:
        """Check Ollama connectivity and report the active engine status."""
        try:
            # Check Ollama connectivity
            resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
            resp.raise_for_status()
            tags_data = resp.json()
            local_models = [model.get("name", "") for model in tags_data.get("models", [])]
            local_models = [name for name in local_models if name]
            
            ollama_connected = True
            
            # Check current engine status
            engine_status = {
                "name": self.current_engine,
                "available": False,
                "responding": False,
                "verified": False
            }
            
            if self.current_engine:
                # Check if engine is in local models
                if self.current_engine in local_models:
                    engine_status["available"] = True
                    
                    # Quick test to see if engine responds
                    try:
                        test_resp = requests.post(
                            f"{OLLAMA_BASE_URL}/api/generate",
                            json={
                                "model": self.current_engine,
                                "prompt": "Hi",
                                "stream": False,
                                "options": {
                                    "num_predict": 1,
                                    "temperature": 0.1
                                }
                            },
                            timeout=OLLAMA_QUICK_TIMEOUT
                        )
                        test_resp.raise_for_status()
                        test_data = test_resp.json()
                        
                        if test_data.get("response"):
                            engine_status["responding"] = True
                            engine_status["verified"] = True
                        
                    except Exception as e:
                        print(f"Engine response test failed: {e}")
            
            return {
                "connected": ollama_connected,
                "engine": engine_status,
                "local_models": local_models,
                "total_models": len(local_models)
            }
            
        except (requests.RequestException, Exception) as e:
            print(f"Ollama connection failed: {e}")
            return {
                "connected": False,
                "engine": {
                    "name": self.current_engine,
                    "available": False,
                    "responding": False,
                    "verified": False
                },
                "local_models": [],
                "total_models": 0,
                "error": str(e)
            }

    def set_engine(self, model_name: str) -> Dict[str, Any]:
        """Set the specified locally available model as the active engine."""
        local_models = self.get_local_models()
        
        if model_name not in local_models:
            return {
                "success": False,
                "error": f"Model {model_name} not found locally",
                "available_models": local_models
            }

        # Set the engine temporarily
        old_engine = self.current_engine
        self.current_engine = model_name
        
        # Verify the engine actually works
        if self.verify_engine_availability():
            log_engine_status(model_name, "activated", "verified and working")
            return {
                "success": True,
                "running": model_name,
                "verified": True,
                "message": f"Model {model_name} is now active and responding"
            }
        else:
            # Restore old engine if verification failed
            self.current_engine = old_engine
            return {
                "success": False,
                "error": f"Model {model_name} failed verification test. It may be loading or corrupted.",
                "previous_engine": old_engine
            }

    def get_engine_health(self) -> Dict[str, Any]:
        """Get detailed health information about the current engine."""
        if not self.current_engine:
            return {
                "healthy": False,
                "engine": None,
                "message": "No engine selected"
            }
        
        try:
            # Test with a simple prompt
            start_time = time.time()
            resp = requests.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": self.current_engine,
                    "prompt": "Say 'OK'",
                    "stream": False,
                    "options": {
                        "num_predict": 5,
                        "temperature": 0.1
                    }
                },
                timeout=OLLAMA_HEALTH_TIMEOUT
            )
            resp.raise_for_status()
            response_time = time.time() - start_time
            
            data = resp.json()
            response_text = data.get("response", "").strip()
            
            return {
                "healthy": True,
                "engine": self.current_engine,
                "response_time_seconds": round(response_time, 2),
                "test_response": response_text,
                "message": f"Engine {self.current_engine} is healthy"
            }
            
        except requests.exceptions.Timeout:
            return {
                "healthy": False,
                "engine": self.current_engine,
                "error": "timeout",
                "message": f"Engine {self.current_engine} timed out"
            }
        except Exception as e:
            return {
                "healthy": False,
                "engine": self.current_engine,
                "error": str(e),
                "message": f"Engine {self.current_engine} failed health check"
            }

    def manual_verify(self) -> Dict[str, Any]:
        """Manually verify the current engine and try to initialize a default if needed."""
        initial_engine = self.current_engine
        verification_result = self.verify_engine_availability()
        
        if verification_result:
            return {
                "verified": True,
                "engine": self.current_engine,
                "message": f"Engine {self.current_engine} is working correctly"
            }
        else:
            print("Engine verification failed, trying to initialize default...")
            self.initialize_default_engine()
            
            if self.current_engine:
                return {
                    "verified": True,
                    "engine": self.current_engine,
                    "message": f"Previous engine failed, switched to {self.current_engine}",
                    "previous_engine": initial_engine
                }
            else:
                return {
                    "verified": False,
                    "engine": None,
                    "message": "No working engines available. Please download a model first.",
                    "previous_engine": initial_engine
                }

# Global engine manager instance
engine_manager = EngineManager()
