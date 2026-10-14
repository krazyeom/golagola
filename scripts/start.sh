#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

if [ ! -d ".next" ]; then
  echo "📦 No build found. Running build first..."
  npm run build
fi

echo "🚀 Starting golagola-lunch on port 18429 with PM2..."
pm2 start ecosystem.config.js
pm2 save
echo "✅ Server started. Status:"
pm2 status golagola-lunch
echo ""
echo "🌐 App is running at http://localhost:18429"
