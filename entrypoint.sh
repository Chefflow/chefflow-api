#!/bin/sh
set -e

echo "🚀 Starting Chefflow API..."

echo "📦 Running Prisma migrations..."

if ! npx prisma migrate deploy; then
  echo "❌ Prisma migrations failed"
  exit 1
fi

echo "✅ Migrations applied"

echo "🎯 Starting production server..."
exec node dist/main.js