# HRMS Quick Setup Guide
## React + Node.js + PostgreSQL

---

## Prerequisites

Before starting, install:

1. **Node.js v18+**: https://nodejs.org/
2. **PostgreSQL v14+**: https://www.postgresql.org/download/
3. **Git**: https://git-scm.com/
4. **VS Code** (recommended): https://code.visualstudio.com/

---

## Step 1: Create Project Structure (15 minutes)

```bash
# Create main directory
mkdir hrms && cd hrms

# Initialize root package.json
npm init -y

# Create packages directory
mkdir -p packages/frontend packages/backend packages/types docs

# Move planning documents to docs
mv architecture-plan.md api-contract.md frontend-plan.md backend-plan.md integration-testing-plan.md tech-stack.md docs/
```

---

## Step 2: Initialize Frontend (20 minutes)

```bash
cd packages/frontend

# Create Vite + React + TypeScript project
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install

# Install UI framework (Material-UI)
npm install @mui/material @emotion/react @emotion/styled

# Install routing
npm install react-router-dom

# Install HTTP client
npm install axios

# Install form libraries
npm install react-hook-form yup

# Install utilities
npm install date-fns react-dropzone react-toastify react-icons

# Install dev dependencies
npm install -D @types/node
```

**Create `.env` file**:
```bash
cat > .env << 'EOF'
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_ENVIRONMENT=development
EOF
```

**Test frontend**:
```bash
npm run dev
# Should open http://localhost:5173
```

---

## Step 3: Initialize Backend (20 minutes)

```bash
cd ../backend

# Initialize package.json
npm init -y

# Install production dependencies
npm install express cors helmet dotenv jsonwebtoken bcrypt zod winston morgan express-rate-limit @prisma/client

# Install dev dependencies
npm install -D typescript ts-node-dev prisma @types/node @types/express @types/cors @types/bcrypt @types/jsonwebtoken @types/morgan

# Initialize TypeScript
npx tsc --init

# Initialize Prisma
npx prisma init
```

**Update `tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**Update `package.json` scripts**:
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.ts",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  }
}
```

**Create `.env` file**:
```bash
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:password@localhost:5432/hrms_dev"
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
EOF
```

---

## Step 4: Set Up PostgreSQL Database (10 minutes)

**Option A: Local PostgreSQL**
```bash
# Create database
createdb hrms_dev

# Or using psql
psql -U postgres
CREATE DATABASE hrms_dev;
\q
```

**Option B: Docker (Recommended)**
```bash
# Create docker-compose.yml in backend directory
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:14
    container_name: hrms_postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: hrms_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
EOF

# Start PostgreSQL
docker-compose up -d
```

**Test connection**:
```bash
psql postgresql://postgres:password@localhost:5432/hrms_dev
\l  # List databases
\q  # Quit
```

---

## Step 5: Create Basic Backend Structure (15 minutes)

```bash
cd packages/backend

# Create directory structure
mkdir -p src/{routes,controllers,middleware,services,utils,types}

# Create basic index.ts
cat > src/index.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'HRMS API is running' });
});

// API routes
app.get('/api/v1', (req, res) => {
  res.json({ message: 'HRMS API v1' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
EOF
```

**Test backend**:
```bash
npm run dev
# Should show: 🚀 Server running on http://localhost:5000

# In another terminal:
curl http://localhost:5000/health
# Should return: {"status":"ok","message":"HRMS API is running"}
```

---

## Step 6: Initialize Prisma Schema (20 minutes)

**Edit `prisma/schema.prisma`**:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User model (for authentication)
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  role      Role
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  employee Employee?

  @@map("users")
}

// Employee model
model Employee {
  id           Int      @id @default(autoincrement())
  userId       Int      @unique
  employeeId   String   @unique
  firstName    String
  lastName     String
  department   String
  position     String
  hireDate     DateTime
  phone        String?
  address      String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@map("employees")
}

// Enum for user roles
enum Role {
  EMPLOYEE
  HR_OFFICER
  DEPARTMENT_HEAD
  FINANCE_OFFICER
  RECRUITMENT_COMMITTEE
  ADMIN
}
```

**Run migration**:
```bash
npx prisma migrate dev --name init
# This creates the database tables

npx prisma generate
# This generates Prisma Client
```

**Open Prisma Studio** (database GUI):
```bash
npx prisma studio
# Opens http://localhost:5555
```

---

## Step 7: Create Shared Types Package (10 minutes)

```bash
cd ../types

# Initialize package.json
npm init -y

# Install TypeScript
npm install -D typescript

# Initialize TypeScript
npx tsc --init

# Create src directory
mkdir src

# Create basic types
cat > src/user.types.ts << 'EOF'
export enum Role {
  EMPLOYEE = 'EMPLOYEE',
  HR_OFFICER = 'HR_OFFICER',
  DEPARTMENT_HEAD = 'DEPARTMENT_HEAD',
  FINANCE_OFFICER = 'FINANCE_OFFICER',
  RECRUITMENT_COMMITTEE = 'RECRUITMENT_COMMITTEE',
  ADMIN = 'ADMIN'
}

export interface User {
  id: number;
  email: string;
  role: Role;
  isActive: boolean;
}

export interface Employee {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  hireDate: string;
}
EOF

cat > src/index.ts << 'EOF'
export * from './user.types';
EOF
```

---

## Step 8: Set Up Monorepo (Optional but Recommended) (15 minutes)

```bash
cd ../../  # Back to root

# Install Turborepo
npm install -D turbo

# Create turbo.json
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
EOF

# Create pnpm-workspace.yaml (or use npm workspaces)
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'packages/*'
EOF

# Update root package.json
cat > package.json << 'EOF'
{
  "name": "hrms",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "latest"
  }
}
EOF
```

**Run everything**:
```bash
npm run dev
# Starts both frontend and backend
```

---

## Step 9: Set Up Git (5 minutes)

```bash
# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Prisma
prisma/migrations/
EOF

# Initialize Git
git init
git add .
git commit -m "Initial HRMS project setup"

# Create GitHub repository and push
# git remote add origin <your-repo-url>
# git push -u origin main
```

---

## Step 10: Verify Setup (5 minutes)

**Check frontend**:
```bash
cd packages/frontend
npm run dev
# Visit http://localhost:5173
```

**Check backend**:
```bash
cd packages/backend
npm run dev
# Visit http://localhost:5000/health
```

**Check database**:
```bash
cd packages/backend
npx prisma studio
# Visit http://localhost:5555
```

---

## Next Steps

✅ **Setup Complete!** You now have:
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL + Prisma
- Monorepo structure with Turborepo

**Start Development**:
1. Review `docs/frontend-plan.md` for frontend roadmap
2. Review `docs/backend-plan.md` for backend roadmap
3. Start with Week 1 tasks from frontend plan
4. Build authentication module first

---

## Troubleshooting

**Frontend won't start**:
```bash
cd packages/frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Backend won't start**:
```bash
cd packages/backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Database connection error**:
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

**Prisma errors**:
```bash
npx prisma generate
npx prisma migrate reset  # WARNING: Deletes all data
```

---

## Useful Commands

**Frontend**:
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

**Backend**:
```bash
npm run dev          # Start dev server
npm run build        # Compile TypeScript
npm run start        # Run compiled code
npx prisma studio    # Open database GUI
npx prisma migrate dev  # Run migrations
```

**Monorepo**:
```bash
npm run dev          # Run all packages
turbo run build      # Build all packages
turbo run test       # Test all packages
```

---

**Setup time**: ~2 hours  
**You're ready to start coding!** 🚀
