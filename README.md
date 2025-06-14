# Another Documents Chat AI 🤖📄

> **Available languages**: [English (current)](README.md) | [Italiano](README.it.md)

## What is this project?

This is an experimental project to understand how local AI works, specifically exploring RAG (Retrieval-Augmented Generation) systems and testing how much computational power is needed to interrogate even simple PDF documents using AI models.

## Project goals

- 🧠 **Learning local AI**: understanding how AI models work locally without cloud dependencies
- 📚 **RAG experimentation**: exploring document-based AI question answering
- 💻 **Resource assessment**: testing computational requirements for local AI
- 🔍 **PDF processing**: simple document analysis and chat functionality

## Features

### Core features
- 📄 **Document upload**: support for PDF, DOCX, and TXT files
- 🤖 **AI chat**: interactive chat with your documents using Ollama models
- 💾 **Memory monitoring**: real-time RAM usage tracking and model requirements estimation
- 🌐 **Model management**: download and run different AI models locally
- 🔄 **Web scraping**: automatic discovery of available Ollama models from the official library

### Technical features
- ⚡ **FastAPI backend**: modern Python web framework
- 🐳 **Docker support**: containerized deployment
- 🎨 **Responsive UI**: clean web interface
- 📊 **System monitoring**: RAM usage and model memory requirements
- 🔗 **Ollama integration**: local AI model execution

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
PyPDF2           # PDF document processing
beautifulsoup4   # Web scraping for model discovery
lxml             # XML/HTML parser for BeautifulSoup
psutil           # System and process monitoring (RAM usage)
```

### Why these dependencies?

- **FastAPI + Uvicorn**: Provides the web server and API endpoints for the application
- **python-multipart**: Enables file uploads through web forms
- **requests**: Communicates with the local Ollama API to manage and query AI models
- **python-docx + PyPDF2**: Extract text from uploaded documents for AI processing
- **beautifulsoup4 + lxml**: Scrape the Ollama models library website to discover available models
- **psutil**: Monitor system RAM usage and estimate memory requirements for different AI models

## How it works

### Web scraping for models

The application automatically scrapes the official Ollama models library (https://ollama.com/library) to discover available models. This provides users with:

- **Real-time model list**: Always up-to-date with the latest available models
- **Memory estimation**: Calculates approximate RAM requirements based on model size
- **Smart categorization**: Groups models by size (Small, Medium, Large, Extra Large)

### Document processing pipeline

1. **Upload**: User uploads PDF, DOCX, or TXT files
2. **Extraction**: Text is extracted using appropriate libraries
3. **Storage**: Documents are stored locally for processing
4. **Chat**: User can ask questions about the uploaded documents
5. **AI Response**: Ollama processes the query with document context

### Memory management

The application provides intelligent memory management:

- **Real-time monitoring**: Shows current RAM usage
- **Model requirements**: Estimates memory needed for each model
- **Smart warnings**: Helps users choose appropriate models for their system

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

1. **Check system resources**: The app will show your current RAM usage
2. **Download a model**: Choose a model that fits your system (start with smaller ones like `llama3.2:1b`)
3. **Upload documents**: Add your PDF, DOCX, or TXT files
4. **Start chatting**: Ask questions about your documents!

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

- **Local AI deployment**: How to run AI models without cloud services
- **RAG systems**: How to build AI that can reference specific documents
- **Resource requirements**: Real-world computational needs for AI applications
- **Model selection**: Choosing the right model for your hardware constraints
- **Document processing**: Handling various file formats for AI consumption

## Troubleshooting

### Common issues

1. **Out of Memory**: Choose a smaller model or close other applications
2. **Slow responses**: Normal for larger models on limited hardware
3. **Model download fails**: Check internet connection and available disk space
4. **Ollama not responding**: Restart the Docker containers

### Performance tips

- Close unnecessary applications to free RAM
- Use SSD storage for better model loading times
- Consider model quantization for memory efficiency
- Monitor system temperature during intensive usage

## Disclaimer

This is an experimental project for learning purposes. Performance and accuracy may vary based on your hardware and the chosen AI model. Always verify important information from AI responses.

---

## License

This project is released under the MIT License - see the [LICENSE](LICENSE) file for details.

This project is for learning, educational and experimental purposes. Please respect the terms of use of Ollama and the individual AI models.
