# Timezone Management

This document explains how to manage timezone settings for the Another Documents Chat AI containers.

## Problem

By default, Docker containers run in UTC timezone, which can cause confusion when comparing timestamps between:
- Chat messages displayed in the web interface
- Saved chat history 
- Container logs
- Host system time

## Solution

The project now includes automatic timezone management with the following features:

### 1. Environment Configuration

The timezone is configured in `env.conf`:

```bash
# Container timezone (default: Europe/Rome)
# You can change this to any valid timezone from /usr/share/zoneinfo/
# Examples: Europe/London, America/New_York, Asia/Tokyo, UTC
# If you want to use host timezone, set to "auto" and the management script
# will try to detect it automatically
TIMEZONE=Europe/Rome
```

### 2. Docker Configuration

Both `web` and `ollama` containers are configured to:
- Mount `/etc/localtime` from the host (read-only)
- Set the `TZ` environment variable from `env.conf`

### 3. Management Scripts

#### Using the Timezone Manager directly:

```bash
# Show current timezone configuration
./tools/timezone_manager.sh show

# Auto-detect host timezone and apply it
./tools/timezone_manager.sh auto

# Set a specific timezone
./tools/timezone_manager.sh set Europe/Rome
./tools/timezone_manager.sh set America/New_York

# List common timezones
./tools/timezone_manager.sh list

# Restart containers to apply changes
./tools/timezone_manager.sh restart
```

#### Using the main management script:

```bash
# Access timezone management through main script
./tools/manage.sh timezone show
./tools/manage.sh timezone auto
./tools/manage.sh timezone set Europe/Rome
./tools/manage.sh timezone list
```

#### Interactive mode:

```bash
# Run without arguments for interactive menu
./tools/manage.sh
# Then select option 9) Manage timezone
```

## Timezone Validation

The script validates timezones by checking if they exist in `/usr/share/zoneinfo/`. 

Common valid timezones include:
- **Europe**: Rome, London, Berlin, Paris, Madrid
- **America**: New_York, Chicago, Denver, Los_Angeles  
- **Asia**: Tokyo, Shanghai, Kolkata
- **Other**: UTC

## Automatic Detection

When using the `auto` command, the script tries to detect the host timezone using:
1. `timedatectl` (systemd systems)
2. `/etc/localtime` symlink
3. `/etc/timezone` file

If detection fails, it falls back to `Europe/Rome`.

## Manual Configuration

You can also manually edit `env.conf` and restart containers:

```bash
# Edit env.conf
nano env.conf
# Change TIMEZONE=Europe/Rome to your desired timezone

# Restart containers
docker compose restart
```

## Verification

After applying timezone changes, verify the configuration:

```bash
# Check host time
date

# Check container time
docker compose exec web date
docker compose exec ollama date

# Show complete configuration
./tools/timezone_manager.sh show
```

All times should now be synchronized and display the same timezone.
