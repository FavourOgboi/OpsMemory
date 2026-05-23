#!/usr/bin/env bash
# Install OpsMemory as systemd services (24/7, survives SSH disconnect).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SYSTEMD_DIR="/etc/systemd/system"

echo "Installing OpsMemory systemd units from $ROOT/deploy/systemd/"

chmod +x "$ROOT/opsmemory-backend/scripts/cloudflared-tunnel.sh"

for unit in opsmemory.target opsmemory-backend.service opsmemory-cloudflared.service; do
  cp "$ROOT/deploy/systemd/$unit" "$SYSTEMD_DIR/$unit"
  echo "  installed $unit"
done

# Ensure PostgreSQL starts on boot (native install on this VPS uses port 5433).
if systemctl list-unit-files postgresql.service &>/dev/null; then
  systemctl enable postgresql.service
  systemctl start postgresql.service || true
fi

systemctl daemon-reload
systemctl enable postgresql.service opsmemory.target opsmemory-backend.service opsmemory-cloudflared.service
systemctl restart opsmemory-backend.service
systemctl restart opsmemory-cloudflared.service

echo ""
echo "OpsMemory stack status:"
systemctl --no-pager status opsmemory-backend.service | head -8
echo ""
systemctl --no-pager status opsmemory-cloudflared.service | head -8
echo ""
if [[ -f "$ROOT/tunnel-url.txt" ]]; then
  echo "Public webhook base URL: $(cat "$ROOT/tunnel-url.txt")"
else
  echo "Tunnel URL not ready yet. Run: journalctl -u opsmemory-cloudflared -f"
fi
echo ""
echo "Useful commands:"
echo "  systemctl status opsmemory-backend opsmemory-cloudflared"
echo "  journalctl -u opsmemory-backend -f"
echo "  journalctl -u opsmemory-cloudflared -f"
echo "  cat $ROOT/tunnel-url.txt"
