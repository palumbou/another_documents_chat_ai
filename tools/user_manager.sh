#!/bin/bash

# =============================================================================
# User Manager for Another Documents Chat AI
# =============================================================================
# This script helps manage user and group configuration for Docker containers
# to ensure proper file ownership and permissions
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE="env.conf"

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to get current user/group IDs
get_user_ids() {
    local uid=$(id -u)
    local gid=$(id -g)
    echo "$uid:$gid"
}

# Function to update user configuration in env.conf
update_user_config() {
    local user_ids=$(get_user_ids)
    local uid=$(echo $user_ids | cut -d: -f1)
    local gid=$(echo $user_ids | cut -d: -f2)
    
    # Update or add USER_ID
    if grep -q "^USER_ID=" "$ENV_FILE"; then
        sed -i "s|^USER_ID=.*|USER_ID=$uid|" "$ENV_FILE"
    else
        echo "USER_ID=$uid" >> "$ENV_FILE"
    fi
    
    # Update or add GROUP_ID
    if grep -q "^GROUP_ID=" "$ENV_FILE"; then
        sed -i "s|^GROUP_ID=.*|GROUP_ID=$gid|" "$ENV_FILE"
    else
        echo "GROUP_ID=$gid" >> "$ENV_FILE"
    fi
    
    print_success "Updated user configuration: UID=$uid, GID=$gid"
}

# Function to show current user configuration
show_current_config() {
    print_info "Current user configuration:"
    echo
    
    # Host user info
    local host_user=$(id -un)
    local host_uid=$(id -u)
    local host_gid=$(id -g)
    echo "Host user: $host_user (UID: $host_uid, GID: $host_gid)"
    
    # Current env.conf settings
    if [[ -f "$ENV_FILE" ]]; then
        local current_uid=$(grep "^USER_ID=" "$ENV_FILE" | cut -d'=' -f2 2>/dev/null || echo "Not set")
        local current_gid=$(grep "^GROUP_ID=" "$ENV_FILE" | cut -d'=' -f2 2>/dev/null || echo "Not set")
        echo "Container UID (env.conf): $current_uid"
        echo "Container GID (env.conf): $current_gid"
    else
        echo "Container configuration: env.conf file not found"
    fi
    
    # Container user info (if running)
    if docker compose ps web --format "table {{.Status}}" | grep -q "Up" 2>/dev/null; then
        echo "Web container:"
        local web_user=$(docker compose exec web whoami 2>/dev/null || echo "Container not accessible")
        echo "  Current user: $web_user"
        local web_id=$(docker compose exec web id 2>/dev/null || echo "Container not accessible")
        echo "  User details: $web_id"
    else
        echo "Web container: Not running"
    fi
    
    echo
}

# Function to test file ownership
test_file_ownership() {
    print_info "Testing file ownership..."
    
    if ! docker compose ps web --format "table {{.Status}}" | grep -q "Up" 2>/dev/null; then
        print_error "Web container is not running. Please start it first with: docker compose up -d"
        return 1
    fi
    
    # Test file creation inside container
    print_info "Creating test file inside container..."
    docker compose exec web touch /app/test_ownership.txt
    local container_ownership=$(docker compose exec web ls -la /app/test_ownership.txt 2>/dev/null)
    echo "  Container file: $container_ownership"
    
    # Test file creation in mounted volume
    print_info "Creating test file in mounted volume..."
    docker compose exec web touch /app/docs/projects/test_volume_ownership.txt
    local host_ownership=$(ls -la /home/ugo/another_documents_chat_ai/web/docs/projects/test_volume_ownership.txt 2>/dev/null || echo "File not found on host")
    echo "  Host file: $host_ownership"
    
    # Cleanup
    docker compose exec web rm -f /app/test_ownership.txt
    rm -f /home/ugo/another_documents_chat_ai/web/docs/projects/test_volume_ownership.txt
    
    print_success "File ownership test completed"
}

# Function to rebuild containers with new user configuration
rebuild_containers() {
    print_info "Rebuilding containers to apply user configuration changes..."
    
    # Rebuild web container
    docker compose build --no-cache web
    print_success "Web container rebuilt successfully"
    
    # Restart containers
    if docker compose ps --format "table {{.Status}}" | grep -q "Up" 2>/dev/null; then
        docker compose restart
        print_success "Containers restarted successfully"
    else
        print_info "Starting containers..."
        docker compose up -d
    fi
    
    # Wait a moment for containers to start
    sleep 3
    print_success "User configuration applied successfully"
}

# Main function
main() {
    echo "==================================================================="
    echo "👤 User Manager for Another Documents Chat AI"
    echo "==================================================================="
    echo
    
    case "${1:-}" in
        "show"|"status")
            show_current_config
            ;;
        "update"|"set")
            show_current_config
            update_user_config
            print_warning "User configuration updated. You need to rebuild containers to apply changes."
            print_info "Run: $0 rebuild"
            ;;
        "rebuild")
            show_current_config
            update_user_config
            rebuild_containers
            ;;
        "test")
            show_current_config
            test_file_ownership
            ;;
        *)
            echo "Usage: $0 {show|update|rebuild|test}"
            echo
            echo "Commands:"
            echo "  show     - Show current user configuration"
            echo "  update   - Update user ID configuration from current host user"
            echo "  rebuild  - Update configuration and rebuild containers"
            echo "  test     - Test file ownership after configuration"
            echo
            echo "Examples:"
            echo "  $0 show        # Show current user configuration"
            echo "  $0 update      # Update user IDs in env.conf"
            echo "  $0 rebuild     # Update and rebuild containers"
            echo "  $0 test        # Test file ownership"
            exit 1
            ;;
    esac
}

# Check if we're in the right directory
if [[ ! -f "$ENV_FILE" ]]; then
    print_error "env.conf file not found. Please run this script from the project root directory."
    exit 1
fi

main "$@"
