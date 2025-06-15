# Management Script Usage

## Quick Reference

```bash
# Show interactive menu
./manage.sh

# Direct commands
./manage.sh install    # First-time installation
./manage.sh start      # Start services
./manage.sh stop       # Stop services
./manage.sh restart    # Restart services
./manage.sh status     # Show container status
./manage.sh logs       # Show live logs
./manage.sh update     # Update and rebuild
./manage.sh reset      # Reset everything (keeps data)
./manage.sh remove     # Complete removal (DELETES DATA!)
./manage.sh help       # Show help
```

## Document Storage Options

During installation, you can choose:

1. **Project folder** (`./web/docs`) - Good for development
2. **Custom path** - Your own directory
3. **Docker volume** - Best for production (survives container removal)

The choice is saved in `env.conf` file and can be changed by editing `DOCS_VOLUME`.

## Environment Configuration

Edit `env.conf` file to customize all settings:

```bash
# Web service
WEB_PORT=8000                    # Web interface port
WEB_CONTAINER_NAME=another-chat-web

# Ollama service  
OLLAMA_HOST=ollama               # Ollama hostname
OLLAMA_PORT=11434                # Ollama API port
OLLAMA_CONTAINER_NAME=ollama

# Document storage
DOCS_VOLUME=./web/docs           # Document storage path

# Docker configuration
NETWORK_NAME=another-chat-network
RESTART_POLICY=unless-stopped
```

## Troubleshooting

1. **Script not working**: Make sure it's executable: `chmod +x manage.sh`
2. **Docker not found**: Script will offer to install Docker automatically
3. **Ports in use**: Change `WEB_PORT` in `.env` file
4. **Permission issues**: Run with `sudo` if needed for Docker operations

For detailed instructions, see [HOWTO.md](HOWTO.md) or [HOWTO.it.md](HOWTO.it.md).
