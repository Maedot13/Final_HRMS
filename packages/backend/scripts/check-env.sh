#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Checking execution environment..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Node.js is installed ($(node -v))${NC}"
fi

# Check Redis
if ! command -v redis-cli &> /dev/null; then
    echo -e "${RED}❌ Redis CLI is not installed.${NC}"
    echo "Please install Redis: sudo apt install redis-server"
    exit 1
else
    # Check if Redis is running
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis is running${NC}"
    else
        echo -e "${RED}❌ Redis is installed but not running.${NC}"
        echo "Start it with: sudo systemctl start redis-server"
        exit 1
    fi
fi

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${RED}⚠️  PostgreSQL client (psql) is not installed.${NC}"
    echo "If you are using a local database, please install it: sudo apt install postgresql-client"
    echo "If you are using Neon (cloud), you might not need it for running the app, but it is useful for debugging."
else
    echo -e "${GREEN}✅ PostgreSQL client is installed${NC}"
fi

echo -e "\n${GREEN}🎉 Environment looks good! You can run the app locally.${NC}"
