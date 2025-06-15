"""
Main application entry point for the Documents Chat AI.
This is a minimalist main.py that only handles app setup and routing.
All business logic has been moved to services and routers.
"""

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from app.config import STATIC_DIR, TEMPLATES_DIR
from app.routers import documents, search, system, engine, models, debug, chat
from app.services.extraction_service import load_existing_documents
from app.services.engine_manager import engine_manager
from app.utils.logging import app_logger

# Create FastAPI application
app = FastAPI(
    title="Documents Chat AI",
    description="AI-powered document chat application with Ollama integration",
    version="2.0.0"
)

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Include routers
app.include_router(documents.router, tags=["Documents"])
app.include_router(search.router, tags=["Search"])
app.include_router(system.router, tags=["System"])
app.include_router(engine.router, tags=["Engine"])
app.include_router(models.router, tags=["Models"])
app.include_router(debug.router, tags=["Debug"])
app.include_router(chat.router, tags=["Chat"])

@app.get("/", response_class=HTMLResponse)
async def home():
    """Serve the main HTML interface."""
    with open(f"{TEMPLATES_DIR}/index.html", encoding="utf-8") as f:
        return f.read()

@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup."""
    app_logger.info("🚀 Starting Documents Chat AI v2.0.0")
    
    # Load existing documents
    app_logger.info("📂 Loading existing documents...")
    loaded_docs = load_existing_documents()
    documents.documents.update(loaded_docs)  # Update the documents dict in the router
    app_logger.info(f"📚 Loaded {len(loaded_docs)} existing documents")
    
    # Verify engine at startup
    app_logger.info("🤖 Verifying AI engine availability...")
    if not engine_manager.verify_engine_availability():
        app_logger.info("⚠️  Current engine not available, trying to initialize default...")
        engine_manager.initialize_default_engine()
    
    if engine_manager.current_engine:
        app_logger.info(f"✅ Engine ready: {engine_manager.current_engine}")
    else:
        app_logger.warning("⚠️  No AI engine available at startup. You'll need to download and run a model.")
    
    app_logger.info("🎉 Application startup complete!")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on application shutdown."""
    app_logger.info("👋 Shutting down Documents Chat AI...")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
