#!/usr/bin/env bash
# OpsMemory — quick Cloudflare tunnel (trycloudflare.com)
# Logs URL to tunnel-url.txt and updates base_url in .env when the tunnel comes up.
# Note: quick-tunnel URLs change whenever this service restarts. For a fixed hostname,
# use a named Cloudflare Tunnel (cloudflared tunnel login + tunnel create).

set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8000}"
ENV_FILE="${ENV_FILE:-/root/OpsMemory/opsmemory-backend/.env}"
URL_FILE="${URL_FILE:-/root/OpsMemory/tunnel-url.txt}"
LOG_FILE="${LOG_FILE:-/var/log/opsmemory-cloudflared.log}"

mkdir -p "$(dirname "$LOG_FILE")"

write_url() {
  local url="$1"
  echo "$url" > "$URL_FILE"
  if [[ -f "$ENV_FILE" ]] && grep -q '^base_url=' "$ENV_FILE"; then
    sed -i "s|^base_url=.*|base_url=${url}|" "$ENV_FILE"
  fi
  echo "$(date -Is) tunnel ready: $url" >> "$LOG_FILE"
  logger -t opsmemory-tunnel "OpsMemory tunnel URL: $url"
}

echo "$(date -Is) starting cloudflared -> $BACKEND_URL" >> "$LOG_FILE"

exec /usr/local/bin/cloudflared tunnel --url "$BACKEND_URL" 2>&1 | tee -a "$LOG_FILE" | while IFS= read -r line; do
  if [[ "$line" =~ https://[a-z0-9-]+\.trycloudflare\.com ]]; then
    url="$(echo "$line" | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1)"
    if [[ -n "$url" && "$(cat "$URL_FILE" 2>/dev/null || true)" != "$url" ]]; then
      write_url "$url"
    fi
  fi
done
