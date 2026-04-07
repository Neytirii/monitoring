#!/usr/bin/env bash
set -euo pipefail

# Usage: install-agent-linux.sh --server-url <URL> --token <TOKEN>
# Or via env vars: SERVER_URL and AGENT_TOKEN

SERVER_URL="${SERVER_URL:-}"
AGENT_TOKEN="${AGENT_TOKEN:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --server-url)
      SERVER_URL="$2"
      shift 2
      ;;
    --token)
      AGENT_TOKEN="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

if [[ -z "$SERVER_URL" ]]; then
  echo "Error: --server-url is required"
  exit 1
fi

if [[ -z "$AGENT_TOKEN" ]]; then
  echo "Error: --token is required"
  exit 1
fi

# Detect OS and architecture
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  aarch64 | arm64) ARCH="arm64" ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

BINARY_URL="${SERVER_URL}/agent/download/${OS}/${ARCH}/monitoring-agent"
INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="/etc/monitoring-agent"
SERVICE_FILE="/etc/systemd/system/monitoring-agent.service"

echo "==> Downloading monitoring agent (${OS}/${ARCH})..."
curl -fsSL "$BINARY_URL" -o /tmp/monitoring-agent
chmod +x /tmp/monitoring-agent
mv /tmp/monitoring-agent "${INSTALL_DIR}/monitoring-agent"
echo "    Installed to ${INSTALL_DIR}/monitoring-agent"

echo "==> Creating configuration directory..."
mkdir -p "$CONFIG_DIR"
cat > "${CONFIG_DIR}/config.env" <<EOF
SERVER_URL=${SERVER_URL}
AGENT_TOKEN=${AGENT_TOKEN}
COLLECT_INTERVAL=10
EOF
chmod 600 "${CONFIG_DIR}/config.env"
echo "    Config saved to ${CONFIG_DIR}/config.env"

echo "==> Creating systemd service..."
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Monitoring Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=${CONFIG_DIR}/config.env
ExecStart=${INSTALL_DIR}/monitoring-agent
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=monitoring-agent
User=root

[Install]
WantedBy=multi-user.target
EOF

echo "==> Enabling and starting the service..."
systemctl daemon-reload
systemctl enable monitoring-agent
systemctl start monitoring-agent

echo ""
echo "✓ Monitoring agent installed and started successfully!"
echo "  Check status: systemctl status monitoring-agent"
echo "  View logs:    journalctl -u monitoring-agent -f"
