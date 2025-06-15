# Another Documents Chat AI 🤖📄

> **Available languages**: [English (current)](README.md) | [Italiano](README.it.md)

## What is this project?

This is an experimental project to understand how local AI works, specifically exploring RAG (Retrieval-Augmented Generation) systems and testing how much computational power is needed to interrogate even simple PDF documents using AI models.

## Project goals

- 🧠 **Learning local AI**: understanding how AI models work locally without cloud dependencies
- 📚 **RAG experimentation**: exploring document-based AI question answering
- 💻 **Resource assessment**: testing computational requirements for local AI
- 🔍 **PDF processing**: simple document analysis and chat functionality

## 🚀 Quick Start

**For detailed installation and usage instructions, please read:**
- 📖 **[HOWTO.md](HOWTO.md)** - Complete English guide
- 📖 **[HOWTO.it.md](HOWTO.it.md)** - Guida completa in italiano
- 🛠️ **[MANAGE.md](MANAGE.md)** - Management script quick reference

**Quick installation:**
```bash
./manage.sh install
```

**Quick start:**
```bash
./manage.sh start
```

Then open http://localhost:8000 in your browser.

## Features

### Core features
- 📄 **Document upload**: support for PDF, DOCX, and TXT files with intelligent size handling
- 🤖 **AI chat**: interactive chat with documents using advanced chunking and relevance scoring
- 💾 **Memory monitoring**: real-time RAM usage tracking and model requirements estimation
- 🌐 **Model management**: download and run different AI models locally with automated discovery
- 🔄 **Web scraping**: automatic discovery of available Ollama models from the official library
- 📊 **Document management**: view document chunks, delete documents, overwrite confirmation
- ⚡ **Performance optimization**: 5-minute timeout, intelligent chunking, large file handling
- 🎨 **Beautiful UI**: rosé Pine themed interface with Dawn/Moon mode switcher

### UI Design & Theming
The interface features a beautiful **Rosé Pine** color scheme with two modes:

#### 🌅 Rosé Pine Dawn (Light Theme - Default)
- **Background**: `#faf4ed` (warm cream base)
- **Sidebar**: `#f2e9e1` (soft rose surface)  
- **Text**: `#575279` (muted purple text)
- **Primary**: `#d7827e` (dusty rose)
- **Success**: `#56949f` (pine green)
- **Warning**: `#ea9d34` (warm gold)

#### 🌙 Rosé Pine Moon (Dark Theme)
- **Background**: `#232136` (deep night base)
- **Sidebar**: `#2a273f` (darker surface)
- **Text**: `#e0def4` (soft lavender text)  
- **Primary**: `#eb6f92` (bright rose)
- **Success**: `#9ccfd8` (foam blue)
- **Warning**: `#f6c177` (golden yellow)

**Theme Features**:
- 🔄 **One-click theme switcher** in the sidebar header
- 💾 **Theme persistence** across browser sessions
- 🎯 **Consistent color palette** throughout the interface
- ✨ **Smooth transitions** between light and dark modes

### Technical features
- ⚡ **FastAPI backend**: modern Python web framework with async support and modular router architecture
- 🏗️ **Modular architecture**: clean separation of concerns with dedicated routers for documents, chat, models, search, and system monitoring
- 🐳 **Docker support**: containerized deployment with Ollama integration
- 🎨 **Responsive UI**: clean web interface with modal dialogs and real-time feedback
- 📊 **System monitoring**: RAM usage, model memory requirements, and performance metrics
- 🔗 **Ollama integration**: local AI model execution with optimized parameters
- 🧠 **Smart chunking**: 6K character chunks with multi-criteria relevance scoring
- 📈 **Scalable processing**: handle large documents (35MB+) without timeouts
- 🔍 **Advanced search**: multi-criteria chunk scoring with exact matches and proximity bonuses
- 🔄 **Asynchronous processing**: instant file upload with background text extraction and OCR
- 📊 **Processing status tracking**: real-time progress indicators for document processing

### Document Processing & Limits

#### File size and processing limits
- **Maximum file size**: 50MB per file
- **Supported formats**: PDF, DOCX, DOC, TXT, MD
- **OCR page limit**: 20 pages for files >10MB (to manage processing time)
- **Character extraction limits**:
  - PyPDF2: 500,000 characters per document
  - pdfplumber: 400,000 characters per document  
  - OCR: 300,000 characters per document
- **Processing timeout**: 5 minutes per query

#### Asynchronous processing workflow
1. **Instant upload**: files are saved immediately to disk
2. **Background processing**: text extraction happens asynchronously
3. **Status tracking**: real-time progress updates (pending → processing → completed/error)
4. **Auto-refresh**: uI automatically updates processing status every 3 seconds
5. **Error handling**: retry mechanism for failed processing

#### Chunking strategy
- **Chunk size**: 6,000 characters (optimized for LLM context windows)
- **Overlap**: 200 characters between chunks for context continuity
- **Intelligent splitting**: preserves paragraphs and sentences when possible
- **Relevance scoring**: multi-criteria scoring system:
  - Exact keyword matches (high weight)
  - Partial matches and synonyms (medium weight)
  - Proximity bonuses for related terms
  - Document frequency scoring
- **Context optimization**: maximum 3 most relevant chunks per query

## Requirements

### System requirements
- **Docker** and **Docker Compose**
- **Minimum 4GB RAM** (8GB+ recommended for larger models)
- **x86_64 architecture** (for Ollama compatibility)

### Python dependencies

```
fastapi          # Modern web framework for APIs
uvicorn[standard] # ASGI server for FastAPI
python-multipart # File upload support
jinja2           # Template engine (though we use simple HTML)
requests         # HTTP client for Ollama API calls
python-docx      # Microsoft Word document processing
PyPDF2           # PDF document processing (primary method)
pdfplumber       # Advanced PDF text extraction (fallback method)
beautifulsoup4   # Web scraping for model discovery
lxml             # XML/HTML parser for BeautifulSoup
psutil           # System and process monitoring (RAM usage)
pytesseract      # OCR engine for scanned PDFs
Pillow           # Image processing for OCR
pdf2image        # Convert PDF pages to images for OCR
```

### System dependencies (automatically installed in Docker)

```
poppler-utils    # PDF to image conversion tools
tesseract-ocr    # OCR engine
tesseract-ocr-ita # Italian language pack for OCR
tesseract-ocr-eng # English language pack for OCR
```

### Why these dependencies?

- **FastAPI + Uvicorn**: provides the web server and API endpoints for the application
- **python-multipart**: enables file uploads through web forms
- **requests**: communicates with the local Ollama API to manage and query AI models
- **python-docx**: extract text from Microsoft Word documents
- **PyPDF2 + pdfplumber**: multi-strategy PDF text extraction (PyPDF2 first, pdfplumber as fallback)
- **pytesseract + Pillow + pdf2image**: oCR functionality for scanned PDFs with no extractable text
- **poppler-utils + tesseract-ocr**: system tools for PDF-to-image conversion and optical character recognition
- **beautifulsoup4 + lxml**: scrape the Ollama models library website to discover available models
- **psutil**: monitor system RAM usage and estimate memory requirements for different AI models

## How it works

### Enhanced PDF text extraction with multi-strategy approach

The application implements a robust three-tier PDF text extraction system:

#### 1. PyPDF2 extraction (Primary)
- Fast and efficient for standard PDFs with embedded text
- Handles most common PDF formats
- Limited success with scanned or image-based PDFs

#### 2. pdfplumber extraction (Fallback)
- More robust text extraction for complex PDF layouts
- Better handling of tables, columns, and formatted text
- Alternative extraction when PyPDF2 fails

#### 3. OCR extraction (Final fallback)
- Optical Character Recognition for scanned PDFs and images
- Converts PDF pages to images and extracts text using Tesseract OCR
- Supports Italian and English text recognition
- Automatic fallback when both text extraction methods yield minimal results
- Smart processing limits to manage performance

#### OCR configuration and limits
```python
{
    "languages": ["ita", "eng"],           # Italian and English language packs
    "dpi": 150,                           # Image resolution for OCR (balance quality/speed)
    "config": "--psm 3 --oem 3",          # Page segmentation mode 3, OCR engine mode 3
    "max_pages": 20,                      # Page limit for large files (>10MB)
    "max_chars": 300000,                  # Character extraction limit for OCR
    "timeout": 300,                       # 5-minute timeout for OCR processing
    "image_format": "PNG",                # Conversion format for PDF pages
    "preprocessing": True                  # Image enhancement before OCR
}
```

#### Text extraction limits by method
- **PyPDF2**: 500,000 characters per document (fast extraction)
- **pdfplumber**: 400,000 characters per document (comprehensive extraction)
- **OCR**: 300,000 characters per document (resource-intensive processing)
- **Page limits**: 20 pages maximum for OCR on files >10MB
- **File size limits**: 50MB maximum per uploaded file

### Intelligent document chunking system

The application implements an advanced chunking strategy to handle large documents efficiently:

#### Chunking parameters
- **Chunk size**: 6,000 characters per chunk (optimized for context window usage)
- **Overlap**: 200 characters between chunks to maintain context continuity
- **Maximum chunks processed**: 5 most relevant chunks per query
- **Processing timeout**: 300 seconds (5 minutes) for large document handling

#### Smart text splitting algorithm
```
1. Split by paragraphs (double newlines) first
2. If paragraph > chunk_size, split by single newlines
3. If still too large, split by sentence endings (. ! ?)
4. Final fallback: character-based splitting with word boundaries
```

#### Multi-criteria relevance scoring

The system uses a sophisticated scoring algorithm to find the most relevant chunks:

**Scoring components:**
- **Exact phrase matches**: +10 points per match
- **Individual word matches**: +2 points per word
- **Partial word matches**: +1 point per partial match
- **Phrase proximity bonus**: +5 points when query words appear close together
- **Length bonus**: +1 point per 100 characters (rewards comprehensive chunks)

**Scoring weights:**
- Case-insensitive matching for better recall
- Word boundary detection to avoid false partial matches
- Distance-based proximity scoring (words within 50 characters get bonus)

### Document processing pipeline

1. **Upload**: user uploads PDF, DOCX, or TXT files
2. **Extraction**: text is extracted with size-based optimizations:
   - **Large files (>10MB)**: limited to first 50 pages to prevent timeouts
   - **Character limits**: 500,000 characters max per document
   - **Memory-efficient processing**: streaming extraction for large PDFs
3. **Chunking**: documents are intelligently split using the chunking algorithm
4. **Storage**: both original documents and processed chunks are stored locally
5. **Chat**: user queries are matched against chunks using the scoring system
6. **AI Response**: top 5 relevant chunks are sent to Ollama for context-aware responses

### Ollama integration and configuration

#### Model parameters
```python
{
    "model": selected_model,
    "prompt": formatted_prompt_with_context,
    "stream": false,
    "options": {
        "temperature": 0.7,      # Balanced creativity vs consistency
        "top_p": 0.9,           # Nucleus sampling for diverse responses
        "num_ctx": 8192,        # Extended context window (8K tokens)
        "num_predict": 1024,    # Maximum response length (1K tokens)
        "stop": ["User:", "Assistant:"]  # Conversation boundaries
    }
}
```

#### API timeout configuration
- **Connection timeout**: 300 seconds (5 minutes)
- **Read timeout**: 300 seconds for model response generation
- **Retry logic**: automatic fallback for connection issues

### Web scraping for models

The application automatically scrapes the official Ollama models library (https://ollama.com/library) to discover available models:

#### Scraping features
- **Real-time model discovery**: always up-to-date with latest models
- **Memory estimation**: RAM requirements calculated from model sizes
- **Fallback models**: curated list ensures basic functionality
- **Error handling**: graceful degradation if scraping fails

#### Model categorization algorithm
```python
size_categories = {
    "Small": "< 4GB RAM",      # 1B-3B parameter models
    "Medium": "4-8GB RAM",     # 7B parameter models  
    "Large": "8-16GB RAM",     # 8B-13B parameter models
    "Extra Large": "> 16GB RAM" # 70B+ parameter models
}
```

### Memory management and monitoring

#### System monitoring
- **Real-time RAM usage**: updated every page load using `psutil`
- **Available memory calculation**: total - Used memory
- **Model requirements estimation**: based on parameter count and quantization

#### Memory estimation formula
```python
def estimate_memory_gb(model_name):
    # Base estimates for common model sizes
    size_map = {
        "1b": 2,    # 1B parameters ≈ 2GB RAM
        "3b": 4,    # 3B parameters ≈ 4GB RAM  
        "7b": 9,    # 7B parameters ≈ 9GB RAM
        "8b": 12,   # 8B parameters ≈ 12GB RAM
        "70b": 40,  # 70B parameters ≈ 40GB RAM
    }
    # Includes model weights + context + overhead
```

### Performance optimizations

#### Document processing optimizations
- **Page limits**: 50 pages max for files >10MB
- **Character limits**: 500K characters max per document
- **Streaming extraction**: memory-efficient PDF processing
- **Intelligent chunking**: context-preserving text splitting

#### Response optimization
- **Chunk pre-filtering**: only process most relevant chunks
- **Context window management**: optimal use of 8K token limit
- **Timeout handling**: graceful degradation for long operations

## Quick start

### 1. Clone and start

```bash
git clone git@github.com:palumbou/another_documents_chat_ai.git
cd another_documents_chat_ai
docker compose up -d --build
```

### 2. Access the application

Open your browser and go to: http://localhost:8000

### 3. First steps

1. **Check system resources**: the app will show your current RAM usage
2. **Download a model**: choose a model that fits your system (start with smaller ones like `llama3.2:1b`)
3. **Upload documents**: add your PDF, DOCX, or TXT files
4. **Start chatting**: ask questions about your documents!

## API Endpoints

### Core application endpoints

#### `GET /`
- **Description**: serve the main HTML interface
- **Response**: hTML page with chat interface and Rosé Pine theming
- **Usage**: main entry point for the web application

#### `POST /upload`
- **Description**: handle asynchronous document uploads (PDF, DOCX, TXT)
- **Parameters**: 
  - `files`: List of files to upload
  - `overwrite`: Boolean to overwrite existing files
- **Response**: upload results with processing status
- **Features**: 
  - Instant file upload (saved immediately)
  - Background text extraction and OCR processing
  - Processing status tracking
  - Support for files up to 50MB

#### `POST /chat`
- **Description**: perform AI chat query with or without document context
- **Parameters**:
  - `query`: User question/query
  - `model`: AI model to use (optional, uses current engine)
- **Response**: aI response with context metadata
- **Features**: 
  - Works with uploaded documents (RAG mode)
  - General AI chat without documents
  - Intelligent chunk selection and context formatting
  - Up to 2048 tokens response length

### Document management endpoints

#### `GET /documents`
- **Description**: list all uploaded documents with processing status
- **Response**: document list with processing status, chunk info, and metadata
- **Features**: 
  - Real-time processing status (pending/processing/completed/error)
  - Progress tracking for background processing
  - Chunk and character count information
  - Processing summary statistics

#### `GET /documents/status`
- **Description**: get processing status for all documents
- **Response**: complete status overview with progress information
- **Features**: real-time status updates for async processing

#### `GET /documents/status/{filename}`
- **Description**: get detailed processing status for a specific document
- **Response**: individual document status with progress and metadata
- **Usage**: monitor specific document processing progress

#### `GET /documents/{filename}/chunks`
- **Description**: get detailed chunk information for a specific document
- **Response**: list of chunks with previews and metadata
- **Usage**: debug document processing and chunking
- **Note**: only available for completed documents

#### `DELETE /documents/{filename}`
- **Description**: delete a document from storage
- **Response**: confirmation of deletion
- **Features**: removes file, processed data, and status tracking

#### `POST /documents/{filename}/retry`
- **Description**: retry processing for a failed document
- **Response**: new processing task initiation
- **Usage**: recover from processing errors

#### `POST /documents/reprocess/{filename}`
- **Description**: reprocess an existing document with current extraction settings
- **Response**: reprocessing task initiation with updated status
- **Usage**: improve extraction results after system updates or settings changes
- **Features**: 
  - Overwrites existing processed data
  - Uses latest extraction algorithms and settings
  - Maintains document upload timestamp

### Search and chunk management

#### `POST /search-chunks`
- **Description**: search for relevant chunks across all processed documents
- **Parameters**:
  - `query`: Search query
  - `max_results`: Maximum number of results (default: 5)
- **Response**: ranked list of relevant document chunks
- **Features**: 
  - Multi-criteria relevance scoring
  - Exact match and proximity bonuses
  - Context-aware chunk selection

### Debug and diagnostic endpoints

#### `GET /debug/pdf/{filename}`
- **Description**: test PyPDF2 extraction on a specific PDF
- **Response**: extracted text and metadata
- **Usage**: diagnose PDF text extraction issues

#### `GET /debug/pdf-plumber/{filename}`
- **Description**: test pdfplumber extraction on a specific PDF
- **Response**: extracted text and metadata
- **Usage**: alternative PDF extraction diagnosis

#### `GET /debug/pdf-ocr/{filename}`
- **Description**: test OCR extraction on a specific PDF
- **Response**: oCR extracted text and metadata
- **Usage**: diagnose OCR processing for scanned documents

### AI model management

#### `GET /models`
- **Description**: list both local and remote available models
- **Response**: complete model catalog with memory requirements
- **Features**: 
  - Real-time model discovery from Ollama library
  - Memory estimation for each model
  - Categorization by model family and size

#### `POST /models/pull`
- **Description**: download a model from Ollama library
- **Parameters**: `name`: Model name to download
- **Response**: download confirmation
- **Features**: background model downloading

#### `POST /models/run`
- **Description**: set active AI model for chat
- **Parameters**: `name`: Model name to activate
- **Response**: model activation confirmation with verification
- **Features**: 
  - Model availability verification
  - Health check and engine status update
  - Memory requirement validation

### System monitoring and health

#### `GET /status`
- **Description**: check system and AI engine status
- **Response**: comprehensive system health information
- **Features**: 
  - Ollama connectivity status
  - Current engine verification
  - Model availability check
  - Engine health indicators

#### `GET /system/memory`
- **Description**: get current system memory usage
- **Response**: RAM usage statistics and available memory
- **Features**: real-time memory monitoring for model selection

#### `GET /system/memory`
- **Description**: get current system memory information
- **Response**: RAM usage statistics in GB
- **Features**: total, used, available memory with percentages

#### `GET /engine/health`
- **Description**: detailed health check for current AI engine
- **Response**: engine performance metrics and response times
- **Features**: test query execution and performance measurement

#### `POST /engine/verify`
- **Description**: verify current engine and initialize fallback if needed
- **Response**: verification results with potential engine switching
- **Features**: automatic fallback to working models

### Debug and diagnostic endpoints

#### `GET /debug/pdf/{filename}`
- **Description**: analyze PDF structure and extraction issues
- **Parameters**: `filename`: PDF file to analyze
- **Response**: detailed PDF analysis with page-by-page breakdown
- **Features**: page count, text extraction success, annotations, images

#### `GET /debug/pdf-plumber/{filename}`
- **Description**: test both PyPDF2 and pdfplumber extraction methods
- **Parameters**: `filename`: PDF file to test
- **Response**: comparison of extraction methods with results
- **Features**: side-by-side comparison of text extraction quality

#### `GET /debug/pdf-ocr/{filename}`
- **Description**: test all three extraction methods including OCR
- **Parameters**: `filename`: PDF file to test with OCR
- **Response**: complete extraction test results
- **Features**: pyPDF2, pdfplumber, and OCR results comparison

### API usage examples

#### Upload a document
```bash
curl -X POST "http://localhost:8000/upload" \
  -F "file=@document.pdf" \
  -F "overwrite=false"
```

#### Chat with documents
```bash
curl -X POST "http://localhost:8000/chat" \
  -F "query=What is the main topic?" \
  -F "model=llama3.2:1b"
```

#### Test PDF extraction
```bash
curl "http://localhost:8000/debug/pdf-ocr/document.pdf"
```

#### Download a model
```bash
curl -X POST "http://localhost:8000/models/pull" \
  -H "Content-Type: application/json" \
  -d '{"name": "llama3.2:1b"}'
```

#### Check system status
```bash
curl "http://localhost:8000/status"
```

## Model recommendations

### For limited RAM (< 8GB)
- `llama3.2:1b` (2GB RAM) - Good for basic tasks
- `phi3.5:mini` (3GB RAM) - Efficient small model
- `gemma3:1b` (2GB RAM) - Google's lightweight model

### For moderate RAM (8-16GB)
- `llama3.2:3b` (4GB RAM) - Better performance
- `mistral:7b` (9GB RAM) - Excellent balance
- `codellama:7b` (9GB RAM) - Great for code-related documents

### For high RAM (16GB+)
- `llama3.1:8b` (12GB RAM) - High quality responses
- `mixtral:8x7b` (26GB RAM) - Very capable model
- `llama3.1:70b` (40GB RAM) - Top performance (requires powerful hardware)

## Learning objectives

This project is designed to explore and understand:

- **Local AI deployment**: how to run AI models without cloud services
- **RAG systems**: advanced document chunking and retrieval strategies
- **Resource requirements**: real-world computational needs for AI applications
- **Model selection**: choosing the right model for your hardware constraints
- **Document processing**: handling various file formats with size optimizations
- **Performance optimization**: timeout management, memory efficiency, and scalability
- **Relevance scoring**: multi-criteria algorithms for finding relevant document chunks
- **System monitoring**: real-time resource tracking and capacity planning

## Technical specifications

### Document processing limits
- **Maximum file size**: 35MB+ supported with optimizations
- **Large file handling**: 50 pages max for files >10MB
- **Character limit**: 500,000 characters per document
- **Supported formats**: PDF, DOCX, DOC, TXT, MD

### Chunking system parameters
- **Chunk size**: 6,000 characters (optimal for 8K context window)
- **Overlap**: 200 characters between chunks
- **Maximum chunks per query**: 5 most relevant chunks
- **Processing timeout**: 300 seconds (5 minutes)

### AI model configuration
- **Context window**: 8,192 tokens (num_ctx)
- **Response length**: 1,024 tokens max (num_predict)
- **Temperature**: 0.7 (balanced creativity)
- **Top-p**: 0.9 (nucleus sampling)
- **Timeout**: 300 seconds for model responses

### Scoring algorithm weights
- **Exact phrase match**: +10 points
- **Word match**: +2 points
- **Partial match**: +1 point
- **Proximity bonus**: +5 points (words within 50 chars)
- **Length bonus**: +1 point per 100 characters

## Troubleshooting

### Common issues

1. **Out of Memory**: choose a smaller model or close other applications
2. **Slow responses**: normal for larger models on limited hardware
3. **Model download fails**: check internet connection and available disk space
4. **Ollama not responding**: restart the Docker containers
5. **Large document timeout**: files >35MB may need manual chunking
6. **Chunk processing errors**: check document format and encoding
7. **OCR extraction fails**: verify PDF contains images/scanned content
8. **Poor OCR quality**: document may have low resolution or poor scan quality
9. **OCR language detection**: currently supports Italian and English only

### PDF extraction troubleshooting

#### No text extracted from PDF
1. **Check PDF type**: use `/debug/pdf/{filename}` to analyze PDF structure
2. **Test extraction methods**: use `/debug/pdf-plumber/{filename}` for method comparison
3. **Try OCR**: use `/debug/pdf-ocr/{filename}` for scanned PDFs
4. **Reprocess document**: use `/documents/reprocess/{filename}` after improvements

#### OCR-specific issues
- **"poppler not found"**: system dependencies missing (automatically installed in Docker)
- **"tesseract not found"**: oCR engine not installed (automatically installed in Docker)
- **Slow OCR processing**: normal for high-resolution scanned documents
- **OCR timeout**: large documents may take several minutes to process
- **Poor text quality**: scanned documents with low resolution or poor quality

### Performance tips

- **Memory management**: close unnecessary applications to free RAM
- **Storage optimization**: use SSD storage for better model loading times
- **Model selection**: consider model quantization for memory efficiency
- **System monitoring**: monitor temperature during intensive usage
- **Document optimization**: break very large documents into smaller files
- **Chunking strategy**: use the chunk viewer to understand document processing
- **OCR optimization**: for better OCR results, ensure scanned documents have good quality and contrast

### Advanced configuration

#### Timeout adjustments
```python
# In main.py, modify these values:
PROCESSING_TIMEOUT = 300  # 5 minutes for document processing
OLLAMA_TIMEOUT = 300     # 5 minutes for AI responses
```

#### Chunking parameters
```python
# Adjust these constants for different chunking behavior:
CHUNK_SIZE = 6000        # Characters per chunk
CHUNK_OVERLAP = 200      # Overlap between chunks  
MAX_CHUNKS = 5           # Maximum chunks per query
```

#### Model parameters
```python
# Ollama request options can be modified:
options = {
    "temperature": 0.7,      # 0.0-1.0 (creativity vs consistency)
    "top_p": 0.9,           # 0.0-1.0 (nucleus sampling)
    "num_ctx": 8192,        # Context window size
    "num_predict": 1024,    # Max response tokens
}
```

## Disclaimer

This is an experimental project for learning purposes. Performance and accuracy may vary based on your hardware and the chosen AI model. Always verify important information from AI responses.

---

## License

This project is released under the MIT License - see the [LICENSE](LICENSE) file for details.

This project is for learning, educational and experimental purposes. Please respect the terms of use of Ollama and the individual AI models.
