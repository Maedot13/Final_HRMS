#!/usr/bin/env bash
set -e

echo "Starting Render build from packages/backend..."

# Render puts us in packages/backend, but we MUST run npm install from the repo root
# so that it understands NPM workspaces and installs @hrms/types correctly!
cd ../../

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
