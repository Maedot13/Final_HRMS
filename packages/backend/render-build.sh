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

# 2. ISOLATION FIX
echo "Isolating backend for Render..."

# Pack the types package into a tarball
cd packages/types
npm pack
mv hrms-types-*.tgz ../backend/hrms-types.tgz
cd ../backend

# Move the root package.json temporarily so NPM doesn't see the workspace
mv ../../package.json ../../package.json.bak

# Update package.json to point to the packed tarball instead of workspace
sed -i 's/"@hrms\/types": "^1.0.0"/"@hrms\/types": "file:.\/hrms-types.tgz"/g' package.json

# Remove the symlinked node_modules
rm -rf node_modules

# Install production dependencies natively inside packages/backend
echo "Installing production dependencies locally..."
npm install --omit=dev

# Restore package.json to leave the repo clean
mv ../../package.json.bak ../../package.json
sed -i 's/"@hrms\/types": "file:.\/hrms-types.tgz"/"@hrms\/types": "^1.0.0"/g' package.json

echo "Build complete! Backend is perfectly isolated and ready to run."
