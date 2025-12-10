#!/bin/sh
set -e

# Extract DB host from DATABASE_URL or use default
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_HOST=${DB_HOST:-postgres}

echo "🔄 Waiting for database at $DB_HOST:5432..."

timeout=30
elapsed=0

until nc -z "$DB_HOST" 5432 || [ $elapsed -eq $timeout ]; do
  echo "⏳ Database not ready ($elapsed/$timeout)s"
  sleep 2
  elapsed=$((elapsed + 2))
done

if [ $elapsed -eq $timeout ]; then
  echo "❌ Timeout connecting to database"
  exit 1
fi

echo "✅ Database ready"
echo "🚀 Running migrations..."
npx prisma migrate deploy

echo "✅ Ready"
exec node dist/src/main.js