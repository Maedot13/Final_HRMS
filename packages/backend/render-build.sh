#!/usr/bin/env bash
set -e

echo "Starting Render build specifically for packages/backend..."

# 1. Navigate to the root to properly install and build the monorepo
cd ../../

echo "Installing monorepo dependencies..."
npm install --include=dev

echo "Building Types package..."
npm run build --workspace=packages/types

echo "Generating Prisma Client..."
npm run prisma:generate --workspace=packages/backend

echo "Building Backend..."
npm run build:backend

echo "Deploying Migrations..."
npm run migrate:deploy --workspace=packages/backend

# 2. THE CRITICAL FIX FOR RENDER:
# Because you set the Render Root Directory to `packages/backend`, Render will delete the 
# root `node_modules` right after this script finishes. Since NPM workspaces stores Express, 
# Prisma, and @hrms/types in the root, your app will crash when it starts.
# To fix this, we physically copy the entire resolved root node_modules directly into the backend!
echo "Copying resolved root node_modules into backend to prevent runtime crash..."
rm -rf packages/backend/node_modules
cp -RL node_modules packages/backend/node_modules

echo "Build complete! Backend is ready to run in isolation."
