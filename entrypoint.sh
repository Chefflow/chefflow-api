#!/bin/sh
set -e

echo "🚀 Starting Chefflow API..."

echo "🔄 Waiting for database to be ready..."
sleep 3


echo "📦 Running Prisma migrations..."

RETRIES=5
until pnpm prisma migrate deploy; do
  RETRIES=$((RETRIES-1))
  if [ "$RETRIES" -le 0 ]; then
    echo "❌ Prisma migrations failed after multiple attempts"
    exit 1
  fi
  echo "⏳ Migration failed, retrying in 5s..."
  sleep 5
done

echo "✅ Migrations applied"

exec node dist/src/main.js
