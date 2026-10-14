#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"
echo "🛑 Stopping golagola-lunch in PM2..."
pm2 stop golagola-lunch || true
echo "✅ Stopped."
