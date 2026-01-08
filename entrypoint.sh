#!/bin/sh
set -e

echo "🚀 Starting Chefflow API..."

if ! ./node_modules/.bin/prisma migrate deploy; then
  echo "❌ Prisma migrations failed"
  exit 1
fi

echo "✅ Migrations applied"
exec node dist/main.js