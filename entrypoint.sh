#!/bin/sh
set -e

echo "🚀 Starting Chefflow API..."

echo "📦 Running Prisma migrations..."
PRISMA_CLI="./node_modules/prisma/build/index.js"

if [ -f "$PRISMA_CLI" ]; then
    echo "🎯 Executing migrations via: node $PRISMA_CLI"
    node "$PRISMA_CLI" migrate deploy
else
    echo "⚠️ Prisma CLI not found, skipping migrations..."
fi

echo "✅ Migrations check finished"

echo "🎯 Searching for main.js..."
# Buscamos el archivo físicamente para no fallar
MAIN_PATH=$(find dist -name "main.js" | head -n 1)

if [ -z "$MAIN_PATH" ]; then
    echo "❌ ERROR: main.js not found in dist folder"
    ls -R dist
    exit 1
fi

echo "🚀 Running application from: $MAIN_PATH"
exec node "$MAIN_PATH"