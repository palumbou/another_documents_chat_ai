# Another Documents Chat AI - How To Use

This guide explains how to install, use, and manage the Another Documents Chat AI service.

## Quick Start with Management Script

The easiest way to manage the service is using the included management script:

```bash
./manage.sh
```

This will show an interactive menu with all available options.

## Installation

### Automatic Installation (Recommended)

```bash
./manage.sh install
```

The script will:
1. Check if Docker is installed
2. Install Docker if needed (requires sudo privileges)
3. Let you choose where to store documents:
   - **Project folder** (`./web/docs`) - Good for development
   - **Custom path** - Specify your own directory
   - **Docker volume** - Recommended for production
4. Build and start the services
5. Make the application available at http://localhost:8000

### Manual Installation

If you prefer to install manually:

1. **Install Docker and Docker Compose**
   
   Please follow the official Docker installation guide for your operating system:
   - **📋 Official Docker Installation Guide**: https://docs.docker.com/get-docker/
   - **🐧 Linux**: https://docs.docker.com/engine/install/
   - **🪟 Windows**: https://docs.docker.com/desktop/windows/install/
   - **🍎 macOS**: https://docs.docker.com/desktop/mac/install/
   
   **Alternative**: Use the provided installation script (Linux only):
   ```bash
   sudo bash tools/install_docker.sh
   ```

2. **Choose document storage method**
   
   **Option 1: Use project folder (default)**
   ```bash
   docker compose up -d
   ```
   
   **Option 2: Use custom path**
   ```bash
   export DOCS_VOLUME="/your/custom/path:/app/docs"
   docker compose up -d
   ```
   
   **Option 3: Use Docker volume**
   ```bash
   docker volume create documents_data
   export DOCS_VOLUME="documents_data:/app/docs"
   docker compose up -d
   ```

## Daily Usage

### Starting the Service
```bash
./manage.sh start
# or manually: docker compose up -d
```

### Stopping the Service
```bash
./manage.sh stop
# or manually: docker compose down
```

### Viewing Logs
```bash
./manage.sh logs
# or manually: docker compose logs -f
```

### Checking Status
```bash
./manage.sh status
# or manually: docker compose ps
```

## Document Management

### Adding Documents

1. **Via Web Interface** (Recommended)
   - Open http://localhost:8000
   - Click "Browse" or drag & drop files
   - Supported formats: PDF, DOCX, DOC, TXT, MD

2. **Via File System**
   - Copy files directly to the docs folder
   - The system automatically detects new files
   - Processing happens in the background

### Removing Documents

1. **Via Web Interface**
   - Click the trash icon next to any document
   
2. **Via File System**
   - Delete files from the docs folder
   - They automatically disappear from the interface

## Maintenance

### Updating the Service
```bash
./manage.sh update
```
This will:
- Pull latest code from repository
- Rebuild images with latest changes
- Restart services with new version

### Resetting the Service
```bash
./manage.sh reset
```
This will:
- Stop all containers
- Remove containers and images
- Rebuild everything from scratch
- Keep your documents safe

### Complete Removal
```bash
./manage.sh remove
```
⚠️ **WARNING**: This will delete EVERYTHING including your documents!

## Troubleshooting

### Service Won't Start
1. Check Docker is running: `docker info`
2. Check port availability: `netstat -tlnp | grep :8000`
3. View logs: `./manage.sh logs`

### Documents Not Processing
1. Check file format is supported
2. Ensure files are readable
3. Check container logs: `docker logs another-chat-web`

### Performance Issues
1. Ensure sufficient disk space
2. Check memory usage: `docker stats`
3. Consider using Docker volumes for better performance

## Configuration

### Environment Variables
You can customize the service using the `env.conf` configuration file:

```bash
# Edit the configuration file
nano env.conf

# Key settings:
WEB_PORT=8000                    # Web interface port
DOCS_VOLUME=./web/docs           # Document storage path
OLLAMA_HOST=ollama               # Ollama service hostname
OLLAMA_PORT=11434                # Ollama API port
NETWORK_NAME=another-chat-network # Docker network name
RESTART_POLICY=unless-stopped    # Container restart policy
```

### Port Configuration
To change the default port (8000), edit `docker-compose.yml`:
```yaml
ports:
  - "YOUR_PORT:8000"
```

## Advanced Usage

### Accessing Ollama Directly
The Ollama service is available at http://localhost:11434

### Custom Models
You can add custom models by connecting to the Ollama container:
```bash
docker exec -it ollama ollama pull your-model
```

### Backup and Restore
1. **Backup documents**: Copy the docs folder or export Docker volume
2. **Backup configuration**: Save your docker-compose.yml modifications
3. **Restore**: Copy files back and run `./manage.sh start`

## Security Considerations

- The service runs on localhost by default
- For production use, consider:
  - Adding authentication
  - Using HTTPS
  - Restricting network access
  - Regular backups

## Getting Help

- Check this documentation first
- View application logs: `./manage.sh logs`
- Check container status: `./manage.sh status`
- For issues, check the project repository

---

For more information, see the main README.md file.
