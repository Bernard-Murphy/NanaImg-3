#!/bin/bash

# Prisma deployment script for production
# This script applies pending migrations to the database and regenerates the Prisma client

set -e  # Exit on error

echo "🚀 Starting Prisma deployment..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set your production database URL:"
    echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
    exit 1
fi

echo "📊 Database URL: ${DATABASE_URL%%@*}@***"  # Hide sensitive parts
echo ""

# Deploy pending migrations to production database
echo "📦 Deploying pending migrations..."
npx prisma migrate deploy

echo ""
echo "🔄 Generating Prisma Client..."
npx prisma generate

echo ""
echo "✅ Prisma deployment completed successfully!"
echo ""
echo "Next steps:"
echo "  1. If you have a running server, restart it to use the updated database schema"
echo "  2. Verify the application works correctly with the new schema"

