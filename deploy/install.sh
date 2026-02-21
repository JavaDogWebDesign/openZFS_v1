#!/usr/bin/env bash
#
# OpenZFS Manager — Install Script for Debian 12+
#
# Run on a fresh Debian 12+ system:
#   sudo bash deploy/install.sh
#
# What it does:
#   1. Enables contrib repo and installs system packages
#      (zfsutils-linux, python3, nodejs, nginx, samba, nfs)
#   2. Creates a Python venv and installs backend dependencies
#   3. Builds the React frontend
#   4. Copies everything to /opt/openzfs-manager
#   5. Configures Samba include and NFS exports directory
#   6. Generates a JWT secret key
#   7. Installs and enables the systemd service + nginx config
#
set -euo pipefail

INSTALL_DIR="/opt/openzfs-manager"
SERVICE_NAME="openzfs-manager"
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "${DEPLOY_DIR}")"

# ── Helpers ──────────────────────────────────────────────────────

info()  { printf '\033[1;34m[INFO]\033[0m  %s\n' "$*"; }
ok()    { printf '\033[1;32m[OK]\033[0m    %s\n' "$*"; }
warn()  { printf '\033[1;33m[WARN]\033[0m  %s\n' "$*"; }
err()   { printf '\033[1;31m[ERROR]\033[0m %s\n' "$*" >&2; }
fatal() { err "$@"; exit 1; }

# ── Pre-flight checks ───────────────────────────────────────────

[[ $EUID -eq 0 ]] || fatal "This script must be run as root (sudo bash $0)"

if ! grep -qi debian /etc/os-release 2>/dev/null; then
    warn "This installer is designed for Debian 12+. Proceeding anyway..."
fi

# ── 1. Enable contrib repo (ZFS lives in contrib, not main) ─────

info "Ensuring 'contrib' component is enabled in apt sources..."
SOURCES_LIST="/etc/apt/sources.list"
SOURCES_DIR="/etc/apt/sources.list.d"

# Debian 12+ uses .sources files in /etc/apt/sources.list.d/
if ls "${SOURCES_DIR}"/*.sources &>/dev/null 2>&1; then
    for src_file in "${SOURCES_DIR}"/*.sources; do
        if grep -q "^Components:" "$src_file" && ! grep -q "contrib" "$src_file"; then
            info "Adding 'contrib' to $src_file"
            sed -i 's/^Components:.*/& contrib/' "$src_file"
        fi
    done
elif [[ -f "$SOURCES_LIST" ]]; then
    # Traditional sources.list format
    if ! grep -qE "^deb .+ contrib" "$SOURCES_LIST"; then
        info "Adding 'contrib' to $SOURCES_LIST"
        sed -i '/^deb .* main/ s/$/ contrib/' "$SOURCES_LIST"
    fi
fi

info "Updating package lists..."
apt-get update -qq

# ── 2. Install kernel headers (needed by ZFS DKMS module) ───────

KERNEL_HEADERS="linux-headers-$(uname -r)"
if ! dpkg -s "$KERNEL_HEADERS" &>/dev/null 2>&1; then
    info "Installing kernel headers: ${KERNEL_HEADERS}"
    apt-get install -y -qq "$KERNEL_HEADERS"
fi

# ── 3. Install system packages ──────────────────────────────────

PACKAGES=(
    zfsutils-linux          # zfs and zpool commands
    python3                 # Python runtime
    python3-venv            # Python virtual environments
    python3-pip             # pip package manager
    python3-dev             # Python headers (for bcrypt compilation)
    build-essential         # gcc/make (for native Python extensions)
    libffi-dev              # libffi (needed by cryptography/bcrypt)
    nodejs                  # Node.js runtime
    npm                     # Node package manager
    nginx                   # Reverse proxy / static file server
    rsync                   # Used by this script to copy files
    openssl                 # For generating JWT secret keys
    samba                   # SMB/CIFS file sharing
    nfs-kernel-server       # NFS file sharing
    smartmontools           # smartctl for drive health monitoring
)

info "Installing system packages: ${PACKAGES[*]}"
apt-get install -y -qq "${PACKAGES[@]}"

# Verify ZFS is available
if ! command -v zpool &>/dev/null; then
    fatal "zpool command not found after installing zfsutils-linux. Check kernel modules: modprobe zfs"
fi
if ! command -v zfs &>/dev/null; then
    fatal "zfs command not found after installing zfsutils-linux."
fi
ok "ZFS tools installed: $(zpool version 2>/dev/null | head -1 || echo 'version unknown')"

# Verify other critical tools
for cmd in python3 node npm nginx openssl; do
    command -v "$cmd" &>/dev/null || fatal "${cmd} not found after package install"
done
ok "All system dependencies satisfied"

# ── 4. Copy project files ───────────────────────────────────────

info "Installing to ${INSTALL_DIR}..."
mkdir -p "${INSTALL_DIR}"

# Clear stale Python bytecache before copying — rsync --exclude='__pycache__'
# preserves old .pyc files in the destination, which causes Python to run
# outdated code even after deploying new .py files.
find "${INSTALL_DIR}/backend" -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true

# Copy backend
rsync -a --delete \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='venv' \
    --exclude='data' \
    --exclude='.pytest_cache' \
    "${PROJECT_DIR}/backend/" "${INSTALL_DIR}/backend/"

# Copy frontend source (needed for build)
rsync -a --delete \
    --exclude='node_modules' \
    --exclude='dist' \
    "${PROJECT_DIR}/frontend/" "${INSTALL_DIR}/frontend/"

ok "Project files copied"

# ── 5. Python venv + backend dependencies ───────────────────────

info "Setting up Python virtual environment..."
python3 -m venv "${INSTALL_DIR}/venv"
"${INSTALL_DIR}/venv/bin/pip" install --quiet --upgrade pip setuptools wheel
"${INSTALL_DIR}/venv/bin/pip" install --quiet -r "${INSTALL_DIR}/backend/requirements.txt"
ok "Backend dependencies installed"

# ── 6. Build frontend ───────────────────────────────────────────

info "Building frontend..."
cd "${INSTALL_DIR}/frontend"
npm install --silent
npm run build --silent
ok "Frontend built -> ${INSTALL_DIR}/frontend/dist/"

# ── 7. Create data directory + reset database ─────────────────

mkdir -p "${INSTALL_DIR}/data"

# Remove old database so the default admin user is re-created with a
# valid bcrypt hash matching the current code.  The JWT secret also
# changes on each install, so old sessions are invalid anyway.
if [[ -f "${INSTALL_DIR}/data/openzfs.db" ]]; then
    info "Removing old database (will be re-created on first start)..."
    rm -f "${INSTALL_DIR}/data/openzfs.db"
fi
ok "Data directory ready: ${INSTALL_DIR}/data"

# ── 8. Configure Samba include ──────────────────────────────────

SMB_INCLUDE="/etc/samba/openzfs-shares.conf"
info "Setting up Samba include file..."
touch "${SMB_INCLUDE}"

if [[ -f /etc/samba/smb.conf ]]; then
    if ! grep -q "include = ${SMB_INCLUDE}" /etc/samba/smb.conf 2>/dev/null; then
        echo "" >> /etc/samba/smb.conf
        echo "# OpenZFS Manager managed shares" >> /etc/samba/smb.conf
        echo "include = ${SMB_INCLUDE}" >> /etc/samba/smb.conf
        ok "Added Samba include directive to smb.conf"
    else
        ok "Samba include directive already present"
    fi
else
    warn "smb.conf not found — Samba include will need manual setup"
fi

# ── 9. Configure NFS exports directory ──────────────────────────

info "Setting up NFS exports directory..."
mkdir -p /etc/exports.d
touch /etc/exports.d/openzfs.exports
ok "NFS exports directory configured"

# ── 10. Generate JWT secret key ─────────────────────────────────

SECRET_KEY=$(openssl rand -hex 32)
info "Generated JWT secret key"

# ── 11. Install systemd service ─────────────────────────────────

info "Installing systemd service..."
sed "s/CHANGE_ME_GENERATE_WITH_openssl_rand_hex_32/${SECRET_KEY}/" \
    "${DEPLOY_DIR}/openzfs.service" > "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
ok "Systemd service installed and enabled"

# ── 12. Install nginx config ────────────────────────────────────

if [[ -d /etc/nginx/sites-available ]]; then
    info "Installing nginx reverse-proxy config..."
    cp "${DEPLOY_DIR}/nginx.conf" "/etc/nginx/sites-available/${SERVICE_NAME}"
    ln -sf "/etc/nginx/sites-available/${SERVICE_NAME}" "/etc/nginx/sites-enabled/${SERVICE_NAME}"

    # Remove default nginx site to avoid port 80 conflict
    if [[ -L /etc/nginx/sites-enabled/default ]]; then
        rm -f /etc/nginx/sites-enabled/default
        info "Removed default nginx site"
    fi

    nginx -t 2>/dev/null && systemctl reload nginx
    ok "Nginx config installed and active"
else
    warn "Nginx sites-available directory not found — skipping nginx config"
fi

# ── 13. Enable supporting services ──────────────────────────────

info "Enabling supporting services..."
systemctl enable --now smbd nmbd 2>/dev/null || warn "Could not enable Samba services"
systemctl enable --now nfs-kernel-server 2>/dev/null || warn "Could not enable NFS server"

# ── 14. Start the application ───────────────────────────────────

info "Starting ${SERVICE_NAME}..."
systemctl restart "${SERVICE_NAME}"

sleep 2
if systemctl is-active --quiet "${SERVICE_NAME}"; then
    ok "${SERVICE_NAME} is running"
else
    err "${SERVICE_NAME} failed to start. Check: journalctl -u ${SERVICE_NAME} -n 50"
fi

# ── Done ─────────────────────────────────────────────────────────

IP_ADDR=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")

echo ""
ok "OpenZFS Manager installed successfully!"
echo ""
echo "  Dashboard:  http://${IP_ADDR}"
echo "  API Docs:   http://${IP_ADDR}/docs"
echo "  Service:    systemctl status ${SERVICE_NAME}"
echo "  Logs:       journalctl -u ${SERVICE_NAME} -f"
echo ""
echo "  Default login:  admin / admin"
echo "  IMPORTANT: Change the default password immediately!"
echo ""
echo "  For HTTPS, edit the nginx config:"
echo "    vim /etc/nginx/sites-available/${SERVICE_NAME}"
echo ""
