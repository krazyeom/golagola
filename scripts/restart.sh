#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"
echo "🔄 Restarting golagola-lunch in PM2..."
pm2 restart golagola-lunch || pm2 start ecosystem.config.js
echo "✅ Restarted. Status:"
pm2 status golagola-lunch
