#!/bin/bash

# Another Documents Chat AI - Project Management Script
# Manages installation, updates, reset and removal of the service

set -e

PROJECT_NAME="another-documents-chat-ai"
DOCKER_COMPOSE_FILE="docker-compose.yml"
REPO_URL="https://github.com/your-username/another_documents_chat_ai.git"  # Update with actual repo URL
DOCKER_INSTALL_SCRIPT="tools/install_docker.sh"

# Colors for output - Rosé Pine Dawn palette
LOVE='\033[38;2;180;99;122m'    # #b4637a (red/pink)
GOLD='\033[38;2;234;157;52m'    # #ea9d34 (yellow/gold)
ROSE='\033[38;2;215;130;126m'   # #d7827e (light pink)
PINE='\033[38;2;40;105;131m'    # #286983 (blue/green)
FOAM='\033[38;2;86;148;159m'    # #56949f (teal)
IRIS='\033[38;2;144;122;169m'   # #907aa9 (purple)
TEXT='\033[38;2;87;82;121m'     # #575279 (main text)
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    echo -e "${1}${2}${NC}"
}

print_header() {
    echo
    print_color "$PINE" "=================================="
    print_color "$PINE" "  Another Documents Chat AI"
    print_color "$PINE" "  Project Management Script"
    print_color "$PINE" "=================================="
    echo
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        print_color "$GOLD" "Docker is not installed on this system."
        return 1
    fi
    
    if ! docker info &> /dev/null; then
        print_color "$GOLD" "Docker is installed but not running or accessible."
        return 2
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_color "$GOLD" "Docker Compose is not available."
        return 3
    fi
    
    return 0
}

install_docker() {
    print_color "$GOLD" "Docker installation required."
    echo "This script will install Docker using the provided installation script."
    echo "Administrator privileges will be required."
    echo
    read -p "Do you want to proceed with Docker installation? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_color "$LOVE" "Docker installation cancelled. Cannot proceed without Docker."
        exit 1
    fi
    
    if [ ! -f "$DOCKER_INSTALL_SCRIPT" ]; then
        print_color "$LOVE" "Docker installation script not found at: $DOCKER_INSTALL_SCRIPT"
        exit 1
    fi
    
    print_color "$PINE" "Installing Docker..."
    chmod +x "$DOCKER_INSTALL_SCRIPT"
    sudo bash "$DOCKER_INSTALL_SCRIPT"
    
    print_color "$FOAM" "Docker installation completed. Please log out and log back in, or restart your system."
    print_color "$GOLD" "After restarting, run this script again to continue with the installation."
    exit 0
}

setup_documents_storage() {
    echo
    print_color "$PINE" "Choose documents storage location:"
    echo "1) Project docs folder (./web/docs)"
    echo "2) Custom path on host"
    echo "3) Docker volume (recommended for production)"
    echo
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            DOCS_PATH="./web/docs"
            print_color "$FOAM" "Using project docs folder: ./web/docs"
            ;;
        2)
            read -p "Enter custom path for documents: " custom_path
            if [ ! -d "$custom_path" ]; then
                print_color "$GOLD" "Creating directory: $custom_path"
                mkdir -p "$custom_path"
            fi
            DOCS_PATH="$custom_path"
            print_color "$FOAM" "Using custom path: $custom_path"
            ;;
        3)
            DOCS_PATH="documents_data"
            print_color "$FOAM" "Using Docker volume: documents_data"
            # Create volume if it doesn't exist
            docker volume create documents_data 2>/dev/null || true
            ;;
        *)
            print_color "$LOVE" "Invalid choice. Using default (project docs folder)."
            DOCS_PATH="./web/docs"
            ;;
    esac
    
    # Update env.conf file with the chosen storage path
    if [ -f "env.conf" ]; then
        # Update existing env.conf file
        sed -i "s|^DOCS_VOLUME=.*|DOCS_VOLUME=$DOCS_PATH|" env.conf
    else
        # Create new env.conf file
        cat > env.conf << 'EOF'
# Another Documents Chat AI - Configuration File
# This file contains all environment variables used by docker-compose.yml

# =============================================================================
# WEB SERVICE CONFIGURATION  
# =============================================================================
WEB_PORT=8000
WEB_CONTAINER_NAME=another-chat-web

# =============================================================================
# OLLAMA SERVICE CONFIGURATION
# =============================================================================
OLLAMA_HOST=ollama
OLLAMA_PORT=11434
OLLAMA_CONTAINER_NAME=ollama

# =============================================================================
# DOCUMENT STORAGE CONFIGURATION
# =============================================================================
DOCS_VOLUME=./web/docs

# =============================================================================
# DOCKER VOLUMES
# =============================================================================
OLLAMA_VOLUME=ollama_data
DOCUMENTS_VOLUME=documents_data

# =============================================================================
# NETWORK CONFIGURATION
# =============================================================================
NETWORK_NAME=another-chat-network

# =============================================================================
# RESTART POLICY
# =============================================================================
RESTART_POLICY=unless-stopped
EOF
        # Update with the chosen path
        sed -i "s|^DOCS_VOLUME=.*|DOCS_VOLUME=$DOCS_PATH|" env.conf
        # Create symlink for docker-compose
        ln -sf env.conf .env
    fi
    
    print_color "$PINE" "Updated env.conf file with DOCS_VOLUME=$DOCS_PATH"
}

run_compose() {
    if command -v docker-compose &> /dev/null; then
        docker-compose "$@"
    elif docker compose version &> /dev/null 2>&1; then
        docker compose "$@"
    else
        print_color "$LOVE" "Error: Neither docker-compose nor docker compose is available."
        return 1
    fi
}

install_service() {
    print_header
    print_color "$FOAM" "Starting installation of Another Documents Chat AI..."
    
    # Check Docker installation
    check_docker_result=$?
    if [ $check_docker_result -ne 0 ]; then
        install_docker
    fi
    
    print_color "$FOAM" "Docker is available."
    
    # Setup documents storage
    setup_documents_storage
    
    # Build and start services
    print_color "$PINE" "Building and starting services..."
    run_compose build --no-cache
    run_compose up -d
    
    echo
    print_color "$FOAM" "Installation completed successfully!"
    print_color "$PINE" "Access the application at: http://localhost:8000"
    print_color "$GOLD" "Documents will be stored in: $DOCS_PATH"
    echo
    print_color "$PINE" "Useful commands:"
    echo "  - View logs: ./manage.sh logs"
    echo "  - Stop services: ./manage.sh stop"
    echo "  - Update services: ./manage.sh update"
}

update_service() {
    print_header
    print_color "$FOAM" "Updating Another Documents Chat AI..."
    
    # Pull latest changes from repository
    print_color "$PINE" "Pulling latest changes from repository..."
    git pull origin main || {
        print_color "$GOLD" "Warning: Could not pull from git. Continuing with local version."
    }
    
    # Stop current services
    print_color "$PINE" "Stopping current services..."
    run_compose down
    
    # Build new images
    print_color "$PINE" "Building updated images..."
    run_compose build --no-cache
    
    # Start updated services
    print_color "$PINE" "Starting updated services..."
    run_compose up -d
    
    print_color "$FOAM" "Update completed successfully!"
    print_color "$PINE" "Access the application at: http://localhost:8000"
}

reset_service() {
    print_header
    print_color "$GOLD" "Resetting Another Documents Chat AI..."
    echo "This will:"
    echo "  - Stop all containers"
    echo "  - Remove all containers and images"
    echo "  - Remove networks"
    echo "  - Keep volumes (your documents will be preserved)"
    echo
    read -p "Are you sure you want to reset the service? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_color "$GOLD" "Reset cancelled."
        return
    fi
    
    print_color "$PINE" "Stopping and removing containers..."
    run_compose down --rmi all --remove-orphans
    
    print_color "$PINE" "Removing project-specific networks..."
    docker network rm "${PROJECT_NAME}_default" 2>/dev/null || true
    
    print_color "$PINE" "Rebuilding and starting services..."
    run_compose build --no-cache
    run_compose up -d
    
    print_color "$FOAM" "Reset completed successfully!"
    print_color "$PINE" "Access the application at: http://localhost:8000"
}

remove_service() {
    print_header
    print_color "$LOVE" "Removing Another Documents Chat AI..."
    echo "This will:"
    echo "  - Stop and remove all containers"
    echo "  - Remove all images"
    echo "  - Remove all networks"
    echo "  - Remove all volumes (YOUR DOCUMENTS WILL BE DELETED)"
    echo "  - Remove project files"
    echo
    print_color "$LOVE" "THIS ACTION CANNOT BE UNDONE!"
    echo
    read -p "Are you sure you want to completely remove the service? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_color "$GOLD" "Removal cancelled."
        return
    fi
    
    print_color "$LOVE" "Final confirmation - type 'DELETE' to proceed: "
    read confirmation
    
    if [ "$confirmation" != "DELETE" ]; then
        print_color "$GOLD" "Removal cancelled."
        return
    fi
    
    print_color "$PINE" "Stopping and removing all containers, images, networks, and volumes..."
    run_compose down --rmi all --volumes --remove-orphans
    
    print_color "$PINE" "Removing any remaining project resources..."
    docker system prune -f
    docker volume rm documents_data 2>/dev/null || true
    docker network rm "${PROJECT_NAME}_default" 2>/dev/null || true
    
    print_color "$PINE" "Removing project files..."
    cd ..
    rm -rf "another_documents_chat_ai"
    
    print_color "$FOAM" "Service completely removed."
}

show_logs() {
    run_compose logs -f
}

stop_service() {
    print_color "$PINE" "Stopping services..."
    run_compose down
    print_color "$FOAM" "Services stopped."
}

start_service() {
    print_color "$PINE" "Starting services..."
    run_compose up -d
    print_color "$FOAM" "Services started."
    print_color "$PINE" "Access the application at: http://localhost:8000"
}

show_status() {
    print_color "$PINE" "Service Status:"
    run_compose ps
}

show_help() {
    print_header
    echo "Usage: ./manage.sh [COMMAND]"
    echo
    echo "Commands:"
    echo "  install    Install and setup the service"
    echo "  update     Update the service to latest version"
    echo "  reset      Reset the service (rebuild everything)"
    echo "  remove     Completely remove the service and data"
    echo "  start      Start the service"
    echo "  stop       Stop the service"
    echo "  restart    Restart the service"
    echo "  status     Show service status"
    echo "  logs       Show service logs"
    echo "  timezone   Manage container timezone settings"
    echo "             Examples:"
    echo "               ./manage.sh timezone show     - Show current timezone"
    echo "               ./manage.sh timezone auto     - Auto-detect timezone"
    echo "               ./manage.sh timezone set Europe/Rome  - Set specific timezone"
    echo "  help       Show this help message"
    echo
    echo "For detailed instructions, see HOWTO.md (English) or HOWTO.it.md (Italiano)"
}

# Main script logic
case "${1:-}" in
    install)
        install_service
        ;;
    update)
        update_service
        ;;
    reset)
        reset_service
        ;;
    remove)
        remove_service
        ;;
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        stop_service
        start_service
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    timezone)
        if [[ -f "tools/timezone_manager.sh" ]]; then
            tools/timezone_manager.sh "${@:2}"
        else
            print_color "$LOVE" "Timezone manager not found at tools/timezone_manager.sh"
        fi
        ;;
    help|--help|-h)
        show_help
        ;;
    "")
        print_header
        echo "Choose an action:"
        echo "1) Install service"
        echo "2) Update service"
        echo "3) Reset service"
        echo "4) Remove service"
        echo "5) Start service"
        echo "6) Stop service"
        echo "7) Show status"
        echo "8) Show logs"
        echo "9) Manage timezone"
        echo "10) Help"
        echo
        read -p "Enter your choice (1-10): " choice
        
        case $choice in
            1) install_service ;;
            2) update_service ;;
            3) reset_service ;;
            4) remove_service ;;
            5) start_service ;;
            6) stop_service ;;
            7) show_status ;;
            8) show_logs ;;
            9) 
                if [[ -f "tools/timezone_manager.sh" ]]; then
                    tools/timezone_manager.sh
                else
                    print_color "$LOVE" "Timezone manager not found"
                fi
                ;;
            10) show_help ;;
            *) print_color "$LOVE" "Invalid choice." ;;
        esac
        ;;
    *)
        print_color "$LOVE" "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
