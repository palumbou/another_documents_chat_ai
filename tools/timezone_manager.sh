#!/bin/bash

# =============================================================================
# Timezone Manager for Another Documents Chat AI
# =============================================================================
# This script helps manage timezone configuration for the Docker containers
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
TIMEZONE_LIST="/usr/share/zoneinfo/"

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

# Function to validate timezone
validate_timezone() {
    local tz="$1"
    
    if [[ "$tz" == "UTC" ]]; then
        return 0
    fi
    
    if [[ -f "/usr/share/zoneinfo/$tz" ]]; then
        return 0
    else
        return 1
    fi
}

# Function to get host timezone
get_host_timezone() {
    local host_tz=""
    
    # Try different methods to detect host timezone
    if command -v timedatectl >/dev/null 2>&1; then
        host_tz=$(timedatectl show --property=Timezone --value 2>/dev/null || echo "")
    fi
    
    if [[ -z "$host_tz" ]] && [[ -L /etc/localtime ]]; then
        host_tz=$(readlink /etc/localtime | sed 's|.*/zoneinfo/||')
    fi
    
    if [[ -z "$host_tz" ]] && [[ -f /etc/timezone ]]; then
        host_tz=$(cat /etc/timezone)
    fi
    
    echo "$host_tz"
}

# Function to update env.conf
update_env_conf() {
    local new_timezone="$1"
    
    if grep -q "^TIMEZONE=" "$ENV_FILE"; then
        sed -i "s|^TIMEZONE=.*|TIMEZONE=$new_timezone|" "$ENV_FILE"
    else
        echo "TIMEZONE=$new_timezone" >> "$ENV_FILE"
    fi
}

# Function to show current timezone configuration
show_current_config() {
    print_info "Current timezone configuration:"
    echo
    
    # Host timezone
    local host_tz=$(get_host_timezone)
    echo "Host timezone: ${host_tz:-"Unknown"}"
    
    # Current env.conf setting
    if [[ -f "$ENV_FILE" ]]; then
        local current_tz=$(grep "^TIMEZONE=" "$ENV_FILE" | cut -d'=' -f2 || echo "Not set")
        echo "Container timezone (env.conf): $current_tz"
    else
        echo "Container timezone: env.conf file not found"
    fi
    
    # Container timezone (if running)
    if docker compose ps web --format "table {{.Status}}" | grep -q "Up"; then
        echo "Web container:"
        local web_tz=$(docker compose exec web date 2>/dev/null || echo "Container not accessible")
        echo "  Current time: $web_tz"
        local web_tz_env=$(docker compose exec web printenv TZ 2>/dev/null || echo "TZ not set")
        echo "  TZ environment: $web_tz_env"
    else
        echo "Web container: Not running"
    fi
    
    if docker compose ps ollama --format "table {{.Status}}" | grep -q "Up"; then
        echo "Ollama container:"
        local ollama_tz=$(docker compose exec ollama date 2>/dev/null || echo "Container not accessible")
        echo "  Current time: $ollama_tz"
        local ollama_tz_env=$(docker compose exec ollama printenv TZ 2>/dev/null || echo "TZ not set")
        echo "  TZ environment: $ollama_tz_env"
        
        # Check if Ollama shows the expected timezone
        if [[ "$ollama_tz" == *"Europe"* ]] && [[ "$ollama_tz" != *"CEST"* ]] && [[ "$ollama_tz" != *"CET"* ]]; then
            print_warning "Ollama container shows 'Europe' timezone, which might indicate incomplete timezone configuration"
            print_info "This is usually fine for functionality, but display may not show the expected timezone name"
        fi
    else
        echo "Ollama container: Not running"
    fi
    
    echo
}

# Function to set timezone automatically
set_auto_timezone() {
    print_info "Attempting to detect host timezone automatically..."
    
    local host_tz=$(get_host_timezone)
    
    if [[ -n "$host_tz" ]]; then
        if validate_timezone "$host_tz"; then
            print_success "Detected host timezone: $host_tz"
            update_env_conf "$host_tz"
            print_success "Updated env.conf with timezone: $host_tz"
            return 0
        else
            print_warning "Detected timezone '$host_tz' is not valid"
        fi
    else
        print_warning "Could not automatically detect host timezone"
    fi
    
    print_info "Falling back to default timezone: Europe/Rome"
    update_env_conf "Europe/Rome"
    return 1
}

# Function to set timezone manually
set_manual_timezone() {
    local timezone="$1"
    
    print_info "Validating timezone: $timezone"
    
    if validate_timezone "$timezone"; then
        update_env_conf "$timezone"
        print_success "Updated env.conf with timezone: $timezone"
        return 0
    else
        print_error "Invalid timezone: $timezone"
        print_info "Please use a valid timezone from /usr/share/zoneinfo/"
        print_info "Examples: Europe/Rome, Europe/London, America/New_York, Asia/Tokyo, UTC"
        return 1
    fi
}

# Function to list common timezones
list_common_timezones() {
    print_info "Common timezones:"
    echo
    echo "Europe:"
    echo "  Europe/Rome (Italy)"
    echo "  Europe/London (UK)"
    echo "  Europe/Berlin (Germany)"
    echo "  Europe/Paris (France)"
    echo "  Europe/Madrid (Spain)"
    echo
    echo "America:"
    echo "  America/New_York (US Eastern)"
    echo "  America/Chicago (US Central)"
    echo "  America/Denver (US Mountain)"
    echo "  America/Los_Angeles (US Pacific)"
    echo
    echo "Asia:"
    echo "  Asia/Tokyo (Japan)"
    echo "  Asia/Shanghai (China)"
    echo "  Asia/Kolkata (India)"
    echo
    echo "Other:"
    echo "  UTC (Coordinated Universal Time)"
    echo
    print_info "For a complete list, check /usr/share/zoneinfo/"
}

# Function to restart containers with new timezone
restart_containers() {
    print_info "Restarting containers to apply timezone changes..."
    
    if docker compose ps --format "table {{.Status}}" | grep -q "Up"; then
        docker compose restart
        print_success "Containers restarted successfully"
        
        # Wait a moment and check the new timezone
        sleep 3
        local web_tz=$(docker compose exec web date 2>/dev/null || echo "Error checking web timezone")
        local ollama_tz=$(docker compose exec ollama date 2>/dev/null || echo "Error checking ollama timezone")
        print_info "Web container time is now: $web_tz"
        print_info "Ollama container time is now: $ollama_tz"
    else
        print_warning "Containers are not running. Start them with: docker compose up -d"
    fi
}

# Main function
main() {
    echo "==================================================================="
    echo "🕐 Timezone Manager for Another Documents Chat AI"
    echo "==================================================================="
    echo
    
    case "${1:-}" in
        "show"|"status")
            show_current_config
            ;;
        "auto")
            show_current_config
            if set_auto_timezone; then
                restart_containers
            fi
            ;;
        "set")
            if [[ -z "${2:-}" ]]; then
                print_error "Please specify a timezone"
                print_info "Usage: $0 set <timezone>"
                print_info "Example: $0 set Europe/Rome"
                exit 1
            fi
            show_current_config
            if set_manual_timezone "$2"; then
                restart_containers
            fi
            ;;
        "list")
            list_common_timezones
            ;;
        "restart")
            restart_containers
            ;;
        *)
            echo "Usage: $0 {show|auto|set <timezone>|list|restart}"
            echo
            echo "Commands:"
            echo "  show     - Show current timezone configuration"
            echo "  auto     - Automatically detect and set host timezone"
            echo "  set <tz> - Set specific timezone (e.g., Europe/Rome)"
            echo "  list     - List common timezones"
            echo "  restart  - Restart containers to apply changes"
            echo
            echo "Examples:"
            echo "  $0 show                    # Show current configuration"
            echo "  $0 auto                    # Auto-detect timezone"
            echo "  $0 set Europe/Rome         # Set to Rome timezone"
            echo "  $0 set America/New_York    # Set to New York timezone"
            echo "  $0 list                    # Show common timezones"
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
