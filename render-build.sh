#!/usr/bin/env bash
set -e

echo "Starting Render build from monorepo root..."

echo "1. Installing dependencies from monorepo root..."
npm install --include=dev

echo "2. Generating Prisma Client..."
npm run prisma:generate --workspace=packages/backend

echo "3. Building Types..."
npm run build --workspace=packages/types

echo "4. Building Backend..."
npm run build:backend

echo "5. Deploying Migrations..."
npm run migrate:deploy --workspace=packages/backend

echo "Build complete!"
