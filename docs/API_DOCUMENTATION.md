# API Documentation

This document provides a comprehensive overview of all available API endpoints in the Document Chat AI application.

## 📋 Table of Contents

- [System & Status](#system--status)
- [Projects Management](#projects-management)
- [Documents Management](#documents-management)
- [Chat & Chat History](#chat--chat-history)
- [Models Management](#models-management)
- [Search & Debug](#search--debug)
- [Engine Management](#engine-management)

---

## 🖥️ System & Status

### GET `/status`
**Description**: Get overall system status including Ollama connection and engine information  
**Response**: 
```json
{
  "connected": true,
  "engine": {
    "name": "llama3.1:8b",
    "available": true,
    "verified": true
  },
  "local_models": ["model1", "model2"]
}
```

### GET `/system/memory`
**Description**: Get current system memory usage information  
**Response**:
```json
{
  "total_gb": 16.0,
  "used_gb": 8.5,
  "available_gb": 7.5,
  "percent_used": 53.1
}
```

---

## 📁 Projects Management

### GET `/projects`
**Description**: List all available projects  
**Response**: Array of project objects with documents count and metadata

### POST `/projects`
**Description**: Create a new project  
**Body**: `{"name": "project_name"}`

### DELETE `/projects/{project_name}`
**Description**: Delete a project and all its documents

### GET `/projects/names`
**Description**: Get list of project names only

### GET `/projects/{project_name}/overview`
**Description**: Get detailed overview of a specific project with document statistics

### POST `/projects/{project_name}/refresh`
**Description**: Refresh project data and synchronize with filesystem

### POST `/projects/move-document`
**Description**: Move a document from one project to another  
**Body**: `{"filename": "doc.pdf", "from_project": "old", "to_project": "new"}`

---

## 📄 Documents Management

### GET `/documents`
**Description**: List all documents in current project with processing status
**Query Params**: `?project=project_name`

### POST `/upload`
**Description**: Upload new document file(s)  
**Content-Type**: `multipart/form-data`

### DELETE `/documents/{doc_key}`
**Description**: Delete a specific document

### GET `/documents/{filename}/chunks`
**Description**: Get all chunks/segments of a processed document

### POST `/documents/reprocess/{filename}`
**Description**: Reprocess a document (useful if processing failed)

### GET `/documents/status`
**Description**: Get processing status of all documents

### GET `/documents/status/{filename}`
**Description**: Get processing status of a specific document

### POST `/documents/{filename}/retry`
**Description**: Retry processing a failed document

### GET `/documents/watch`
**Description**: WebSocket endpoint for real-time document processing updates

---

## 💬 Chat & Chat History

### POST `/chat`
**Description**: Send a chat message and get AI response  
**Body**: 
```json
{
  "query": "Your question here",
  "model": "llama3.1:8b",
  "debug": false
}
```

### GET `/chats/{project_name}`
**Description**: Get all chat sessions for a project

### GET `/chats/{project_name}/{chat_id}`
**Description**: Get messages from a specific chat session

### POST `/chats/{project_name}/new`
**Description**: Create a new chat session

### POST `/chats/{project_name}/{chat_id}/chat`
**Description**: Send message in a specific chat session

### DELETE `/chats/{project_name}/{chat_id}`
**Description**: Delete a chat session

### GET `/chats/{project_name}/{chat_id}/export`
**Description**: Export chat session as file (JSON/Markdown)

---

## 🤖 Models Management

### GET `/models`
**Description**: Get all available models (local and remote) with system information

### POST `/models/pull`
**Description**: Download/pull a new model  
**Body**: `{"name": "llama3.1:8b"}`

### POST `/models/pull/stream`
**Description**: Stream model download progress (Server-Sent Events)

### POST `/models/run`
**Description**: Load and run a specific model  
**Body**: `{"name": "llama3.1:8b"}`

### DELETE `/models/{model_name}`
**Description**: Delete a local model

### POST `/models/validate`
**Description**: Validate if a model exists and is accessible

### POST `/models/refresh_cache`
**Description**: Refresh the models cache

### GET `/models/grouped`
**Description**: Get models grouped by categories (size, type, etc.)

### POST `/models/cancel`
**Description**: Cancel ongoing model download

---

## 🔍 Search & Debug

### POST `/search-chunks`
**Description**: Search through document chunks  
**Body**: 
```json
{
  "query": "search term",
  "project": "project_name",
  "limit": 10
}
```

### GET `/debug/pdf/{filename}`
**Description**: Get debug information about PDF processing

### GET `/debug/pdf-plumber/{filename}`
**Description**: Get PDF text extraction debug info using pdf-plumber

### GET `/debug/pdf-ocr/{filename}`
**Description**: Get PDF OCR extraction debug info

---

## ⚙️ Engine Management

### POST `/engine/verify`
**Description**: Verify current AI engine connectivity and functionality

### GET `/engine/health`
**Description**: Get detailed health status of the AI engine

---

## 📝 Response Format

All API responses follow this general format:

### Success Response
```json
{
  "data": { ... },
  "message": "Operation successful",
  "status": "success"
}
```

### Error Response
```json
{
  "detail": "Error description",
  "status": "error"
}
```

## 🔒 Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible when the application is running.

## 📊 Rate Limiting

No rate limiting is currently implemented, but it's recommended to avoid excessive concurrent requests, especially for model operations and file uploads.

## 🌐 Base URL

When running locally: `http://localhost:8000`  
When running with Docker: `http://localhost:8000`

## 💡 Usage Examples

### Check System Status
```bash
curl http://localhost:8000/status
```

### Upload a Document
```bash
curl -X POST -F "files=@document.pdf" -F "project=my_project" \
  http://localhost:8000/upload
```

### Send Chat Message
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"Explain this document","debug":false}' \
  http://localhost:8000/chat
```

### Download a Model
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"llama3.1:8b"}' \
  http://localhost:8000/models/pull
```
