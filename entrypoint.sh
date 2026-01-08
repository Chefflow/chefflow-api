#!/bin/sh
set -e

echo "🚀 Starting Chefflow API..."

echo "📦 Running Prisma migrations..."

PRISMA_CLI="./node_modules/prisma/build/index.js"

if [ -f "$PRISMA_CLI" ]; then
    echo "🎯 Executing migrations via: node $PRISMA_CLI"
    if ! node "$PRISMA_CLI" migrate deploy; then
      echo "❌ Prisma migrations failed"
      exit 1
    fi
else
    echo "⚠️ Prisma CLI not found at $PRISMA_CLI, trying fallback npx..."
    if ! npx prisma migrate deploy; then
        echo "❌ All migration attempts failed"
        exit 1
    fi
fi

echo "✅ Migrations applied successfully"

echo "🎯 Starting production server..."
exec node dist/main.js