#!/usr/bin/env bash
set -e

echo "Starting Render build..."

echo "1. Installing dependencies..."
npm install --include=dev

echo "2. Generating Prisma Client..."
npm run prisma:generate --workspace=packages/backend

echo "3. Building Backend..."
npm run build:backend

echo "4. Deploying Migrations..."
npm run migrate:deploy --workspace=packages/backend

echo "Build complete!"
