#!/usr/bin/env bash
set -euo pipefail

# Color definitions for output - Rosé Pine Dawn palette
FOAM='\033[38;2;86;148;159m'    # #56949f (teal/green for success)
LOVE='\033[38;2;180;99;122m'    # #b4637a (red/pink for errors)
GOLD='\033[38;2;234;157;52m'    # #ea9d34 (yellow/gold for warnings)
PINE='\033[38;2;40;105;131m'    # #286983 (blue/green for info)
NC='\033[0m' # No Color

# 1) Check for existing Docker
echo -e "${FOAM}Checking for existing Docker installation...${NC}"
if command -v docker &>/dev/null; then
  echo -e "${FOAM}Docker is already installed: $(docker --version)${NC}"
  exit 0
fi
echo -e "${LOVE}Docker not found. Proceeding with installation...${NC}"

# 2) Detect OS
OS=""
if [[ -f /etc/os-release ]]; then
  . /etc/os-release
  ID_LOWER="${ID,,}"
  if [[ "$ID_LOWER" =~ (ubuntu|debian) ]]; then
    OS="debian"
  elif [[ "$ID_LOWER" =~ (centos|rhel|rocky) ]]; then
    OS="centos"
  elif [[ "$ID_LOWER" == "fedora" ]]; then
    OS="fedora"
  elif [[ "$ID_LOWER" == "arch" ]]; then
    OS="arch"
  fi
fi

if [[ -z "$OS" ]]; then
  echo -e "${LOVE}Unsupported or undetectable OS. Exiting.${NC}"
  exit 1
fi
echo -e "${FOAM}Detected OS: $OS${NC}"

# 3) Install functions
install_debian() {
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl gnupg lsb-release
  curl -fsSL https://download.docker.com/linux/$(. /etc/os-release && echo "$ID")/gpg \
    | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
     https://download.docker.com/linux/$(. /etc/os-release && echo "$ID") \
     $(lsb_release -cs) stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
}

install_centos() {
  sudo yum install -y yum-utils
  sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
  sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
}

install_fedora() {
  sudo dnf -y install dnf-plugins-core
  # Create repo file manually (config-manager --add-repo may not work)
  sudo tee /etc/yum.repos.d/docker-ce.repo > /dev/null <<EOF
[docker-ce-stable]
name=Docker CE Stable - \$basearch
baseurl=https://download.docker.com/linux/fedora/\$releasever/\$basearch/stable
enabled=1
gpgcheck=1
gpgkey=https://download.docker.com/linux/fedora/gpg
EOF
  sudo dnf -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin
}

install_arch() {
  sudo pacman -Sy --noconfirm docker docker-compose
}

# 4) Run installer
case "$OS" in
  debian) install_debian ;;
  centos) install_centos ;;
  fedora) install_fedora ;;
  arch)   install_arch ;;
esac

# 5) Enable & start Docker
echo -e "${FOAM}Enabling and starting Docker service...${NC}"
sudo systemctl enable docker
sudo systemctl start docker

# 6) Add user to docker group
echo -e "${FOAM}Adding user '$USER' to docker group...${NC}"
sudo usermod -aG docker "$USER"

# 7) Reload session so group change takes effect
echo -e "${FOAM}Reloading session to apply group changes...${NC}"
# This will start a new shell with the docker group active
exec newgrp docker

# 8) Final verification (will only run if newgrp fails to replace shell)
echo -e "${FOAM}Verifying Docker installation...${NC}"
if docker --version &>/dev/null; then
  echo -e "${FOAM}Docker was installed successfully!${NC}"
else
  echo -e "${LOVE}Docker installation failed.${NC}"
  exit 1
fi
