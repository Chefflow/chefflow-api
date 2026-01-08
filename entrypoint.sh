#!/bin/sh
set -e

echo "🚀 Starting Chefflow API..."


echo "📦 Running Prisma migrations..."
if ! npx prisma migrate deploy; then
  echo "❌ Migrations failed, retrying with direct path..."
  ./node_modules/.bin/prisma migrate deploy
fi

echo "✅ Migrations applied"

echo "🎯 Starting production server..."
exec node dist/main.js