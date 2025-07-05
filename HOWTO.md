# Another Documents Chat AI - How To Use

This guide explains how to install, use, and manage the Another Documents Chat AI service.

## Quick Start with Management Script

The easiest way to manage the service is using the included management script:

```bash
./tools/manage.sh
```

This will show an interactive menu with all available options.

## Installation

### Automatic Installation (Recommended)

```bash
./tools/manage.sh install
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
./tools/manage.sh start
# or manually: docker compose up -d
```

### Stopping the Service
```bash
./tools/manage.sh stop
# or manually: docker compose down
```

### Viewing Logs
```bash
./tools/manage.sh logs
# or manually: docker compose logs -f
```

### Checking Status
```bash
./tools/manage.sh status
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

## Project Management

The application now supports **project-based document organization** with intelligent priority handling.

### Creating and Managing Projects

1. **Creating a New Project**
   - Use the project dropdown in the web interface
   - Type the name of a new project and press Enter
   - Projects are automatically created when you first upload documents to them

2. **Switching Between Projects**
   - Use the project selector dropdown
   - Select "Global" to work with documents outside any project
   - Select any existing project to work within that project's scope

3. **Uploading Documents to Projects**
   - Select the target project from the dropdown
   - Upload documents as usual - they will be stored in that project
   - Each project maintains its own isolated document collection

### Document Priority System

The application implements an intelligent priority system when searching and chatting:

**Priority Order:**
1. **Project Documents First**: If you're working in a project and it contains a document with the same name as a global document, the project version takes priority
2. **Global Documents Second**: Global documents are used when no matching document exists in the current project

**Example Scenarios:**
- Project "ClientA" has `report.pdf` and Global has `report.pdf` → When in "ClientA", the project's `report.pdf` is used
- Project "ClientA" has `contract.pdf` but Global doesn't → The project's `contract.pdf` is used
- Project "ClientA" doesn't have `manual.pdf` but Global does → The global `manual.pdf` is used
- Working in Global scope → Only global documents are considered

### Project Use Cases

**1. Client Isolation**
```
Projects/
├── ClientA/           # Client A's documents
│   ├── contract.pdf
│   └── requirements.docx
├── ClientB/           # Client B's documents  
│   ├── contract.pdf   # Different contract than ClientA
│   └── specifications.pdf
└── Global/            # Shared/general documents
    ├── company_policies.pdf
    └── templates.docx
```

**2. Version Management**
```
Projects/
├── ProjectV1/         # Version 1 documents
│   └── design.pdf
├── ProjectV2/         # Version 2 documents (updated design)
│   └── design.pdf     # Takes priority when in ProjectV2
└── Global/
    └── shared_resources.pdf
```

**3. Department Separation**
```
Projects/
├── Engineering/       # Technical documents
├── Marketing/         # Marketing materials
├── Legal/            # Legal documents
└── Global/           # Company-wide documents
```

### Best Practices

1. **Use Global for Shared Resources**: Store company policies, templates, and general references in Global
2. **Isolate Client/Project Data**: Keep each client's or project's documents in separate projects
3. **Consistent Naming**: Use clear, consistent naming for projects
4. **Regular Cleanup**: Remove obsolete projects and documents periodically

## Maintenance

### Updating the Service
```bash
./tools/manage.sh update
```
This will:
- Pull latest code from repository
- Rebuild images with latest changes
- Restart services with new version

### Resetting the Service
```bash
./tools/manage.sh reset
```
This will:
- Stop all containers
- Remove containers and images
- Rebuild everything from scratch
- Keep your documents safe

### Complete Removal
```bash
./tools/manage.sh remove
```
⚠️ **WARNING**: This will delete EVERYTHING including your documents!

## Troubleshooting

### Service Won't Start
1. Check Docker is running: `docker info`
2. Check port availability: `netstat -tlnp | grep :8000`
3. View logs: `./tools/manage.sh logs`

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
3. **Restore**: Copy files back and run `./tools/manage.sh start`

## Security Considerations

- The service runs on localhost by default
- For production use, consider:
  - Adding authentication
  - Using HTTPS
  - Restricting network access
  - Regular backups

## Getting Help

- Check this documentation first
- View application logs: `./tools/manage.sh logs`
- Check container status: `./tools/manage.sh status`
- For issues, check the project repository

---

For more information, see the main README.md file.

## User Interface & Themes

### 🎨 Customizable Theme System

The application features a powerful theme system with multiple built-in themes and support for custom themes:

#### Available Themes

1. **🎯 Base Theme**
   - Simple and clean design
   - Available in Light and Dark variants
   - Perfect for professional use

2. **🌸 Catppuccin Theme**
   - Soothing pastel colors
   - Mocha, Latte, Frappé, and Macchiato variants
   - Community favorite for coding environments

3. **🧛 Dracula Theme**
   - Dark theme with vibrant accents
   - High contrast and eye-friendly
   - Popular in developer communities

4. **🌃 Tokyo Night Theme**
   - Night and Day variants
   - Inspired by Tokyo's neon-lit nights
   - Modern and sleek appearance

5. **� Gruvbox Theme**
   - Retro groove warm color scheme
   - Dark and Light variants
   - Inspired by badwolf and jellybeans

6. **❄️ Nord Theme**
   - Arctic, north-bluish color palette
   - Dark and Light variants
   - Clean and minimalist design

7. **☀️ Solarized Theme**
   - Precision color scheme
   - Dark and Light variants
   - Scientifically designed for eye comfort

#### How to Use Themes

1. **Open Settings**: Click the ⚙️ gear icon in the top-left sidebar
2. **Select Theme**: Use the dropdown menu in the "Options" section
3. **View Theme Info**: Click the info button (ℹ️) next to any theme to see details and color palette
4. **Automatic Saving**: Your theme preference is automatically saved

#### Creating Custom Themes

You can create your own themes by adding JSON files to the `web/static/themes/` directory:

##### Theme File Structure

```json
{
  "name": "My Custom Theme",
  "description": "A beautiful custom theme",
  "author": "Your Name",
  "version": "1.0.0",
  "variants": {
    "dark": {
      "name": "My Custom Dark",
      "description": "Dark variant description",
      "type": "dark",
      "colors": {
        "--background": "#1a1a1a",
        "--text-primary": "#ffffff",
        "--primary-color": "#007bff",
        // ... add all required CSS variables
      }
    },
    "light": {
      "name": "My Custom Light",
      "description": "Light variant description", 
      "type": "light",
      "colors": {
        "--background": "#ffffff",
        "--text-primary": "#000000",
        "--primary-color": "#007bff",
        // ... add all required CSS variables
      }
    }
  }
}
```

##### Required CSS Variables

Your theme must include all these CSS variables:

**Backgrounds & Surfaces:**
- `--background`, `--background-light`, `--background-dark`
- `--surface`, `--surface-light`, `--surface-dark`

**Colors:**
- `--primary-color`, `--primary-hover`
- `--secondary-color`, `--accent-color`
- `--success-color`, `--warning-color`, `--error-color`, `--info-color`

**Text:**
- `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`

**Borders & Shadows:**
- `--border-color`, `--border-light`, `--border-dark`
- `--shadow-color`, `--shadow-light`, `--shadow-dark`

**Interactive Elements:**
- `--highlight-color`, `--selection-color`
- `--input-background`, `--input-border`, `--input-focus`
- `--button-primary`, `--button-primary-hover`
- `--button-secondary`, `--button-secondary-hover`

**Layout Specific:**
- `--sidebar-background`, `--header-background`, `--footer-background`
- `--modal-background`, `--modal-backdrop`
- `--code-background`, `--code-border`
- `--link-color`, `--link-hover`

##### Adding Your Theme

1. Save your theme file as `web/static/themes/your-theme-name.json`
2. Restart the application or refresh the page
3. Your theme will appear in the dropdown menu automatically

### 🎯 Visual Design Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Smooth Transitions**: Elegant animations between themes
- **High Contrast**: Accessibility-friendly color ratios
- **Modern UI**: Clean, professional interface design
