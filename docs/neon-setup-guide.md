# HRMS Setup Guide with Neon PostgreSQL
## React + Node.js + Neon PostgreSQL (Serverless)

---

## Why Neon PostgreSQL?

✅ **No local database installation required**  
✅ **Free tier with 0.5 GB storage**  
✅ **Serverless and autoscaling**  
✅ **Perfect for development and testing**  
✅ **Easy to share across team**  
✅ **Production-ready when needed**  

---

## Prerequisites

Install these before starting:

1. **Node.js v18+**: https://nodejs.org/
2. **Git**: https://git-scm.com/
3. **VS Code** (recommended): https://code.visualstudio.com/

---

## Step 1: Create Neon PostgreSQL Database (5 minutes)

### 1.1 Sign Up for Neon
1. Go to https://neon.tech
2. Click "Sign Up" (you can use GitHub, Google, or email)
3. Verify your email if required

### 1.2 Create a New Project
1. Click **"New Project"**
2. Enter project details:
   - **Project Name**: `HRMS` or `BDU-HRMS`
   - **Region**: Choose closest to Ethiopia (EU/Asia recommended)
   - **PostgreSQL Version**: 15 or 16 (latest)
3. Click **"Create Project"**

### 1.3 Get Your Connection String
After creating the project, you'll see a connection string like this:
```
postgresql://username:password@ep-xyz.region.aws.neon.tech/dbname?sslmode=require
```

**IMPORTANT**: Copy this connection string - you'll need it for the backend setup!

### 1.4 Note Your Credentials
Neon will provide:
- **Host**: `ep-xyz.region.aws.neon.tech`
- **Database**: `dbname`
- **User**: `username`
- **Password**: `password`
- **Connection String**: Full connection URL

---

## Step 2: Create Project Structure (10 minutes)

```bash
# Navigate to HRMS directory
cd ~/Desktop/HRMS

# Create packages directory
mkdir -p packages/frontend packages/backend packages/types

# Create docs directory and move planning files
mkdir -p docs
mv architecture-plan.md api-contract.md frontend-plan.md backend-plan.md integration-testing-plan.md tech-stack.md docs/

# Create root package.json
cat > package.json << 'EOF'
{
  "name": "hrms",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev:frontend": "npm run dev --workspace=packages/frontend",
    "dev:backend": "npm run dev --workspace=packages/backend",
    "dev": "npm run dev:backend & npm run dev:frontend"
  }
}
EOF
```

---

## Step 3: Initialize Frontend (15 minutes)

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

### Create Frontend `.env` file:
```bash
cat > .env << 'EOF'
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_ENVIRONMENT=development
EOF
```

### Test frontend:
```bash
npm run dev
# Should open http://localhost:5173
```

Press `Ctrl+C` to stop the server.

---

## Step 4: Initialize Backend (20 minutes)

```bash
cd ../backend

# Initialize package.json
npm init -y

# Install production dependencies
npm install express cors helmet dotenv jsonwebtoken bcrypt zod winston morgan express-rate-limit @prisma/client

# Install dev dependencies
npm install -D typescript ts-node-dev prisma @types/node @types/express @types/cors @types/bcrypt @types/jsonwebtoken @types/morgan eslint prettier
```

### Configure TypeScript:
```bash
npx tsc --init
```

Update `tsconfig.json`:
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

### Update `package.json` scripts:
Edit `package.json` and update the `scripts` section:
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

---

## Step 5: Configure Prisma with Neon (10 minutes)

### Initialize Prisma:
```bash
npx prisma init
```

This creates:
- `prisma/schema.prisma` - Database schema file
- `.env` - Environment variables file

### Update `.env` with your Neon connection string:
```bash
# Replace with YOUR actual Neon connection string from Step 1
DATABASE_URL="postgresql://username:password@ep-xyz.region.aws.neon.tech/dbname?sslmode=require"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

**IMPORTANT**: Replace the `DATABASE_URL` with your actual connection string from Neon!

### Update `prisma/schema.prisma`:
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

### Run your first migration:
```bash
npx prisma migrate dev --name init
```

This will:
- Connect to your Neon database
- Create the tables defined in your schema
- Generate the Prisma Client

### Generate Prisma Client:
```bash
npx prisma generate
```

---

## Step 6: Create Basic Backend Server (10 minutes)

```bash
# Create directory structure
mkdir -p src/{routes,controllers,middleware,services,utils,types}

# Create main server file
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'HRMS API is running',
    timestamp: new Date().toISOString()
  });
});

// API base endpoint
app.get('/api/v1', (req, res) => {
  res.json({ 
    message: 'HRMS API v1',
    version: '1.0.0'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 HRMS Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 API endpoint: http://localhost:${PORT}/api/v1`);
});
EOF
```

### Test backend server:
```bash
npm run dev
```

You should see:
```
🚀 HRMS Server running on http://localhost:5000
📊 Health check: http://localhost:5000/health
🔌 API endpoint: http://localhost:5000/api/v1
```

Test in another terminal:
```bash
curl http://localhost:5000/health
```

Press `Ctrl+C` to stop the server.

---

## Step 7: Test Database Connection (5 minutes)

### Open Prisma Studio:
```bash
npx prisma studio
```

This opens a web interface at http://localhost:5555 where you can:
- View your database tables
- Add/edit/delete records
- Test your schema

You should see the `User`, `Employee`, and `Role` enum.

---

## Step 8: Create Shared Types Package (10 minutes)

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

# Create user types
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

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  employee?: Employee;
  token: string;
}
EOF

# Create index file
cat > src/index.ts << 'EOF'
export * from './user.types';
EOF
```

---

## Step 9: Set Up Git (5 minutes)

```bash
cd ../../  # Back to HRMS root

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

# Environment variables (IMPORTANT!)
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
yarn-debug.log*
yarn-error.log*

# Prisma
prisma/migrations/
EOF

# Initialize Git
git init
git add .
git commit -m "Initial HRMS project setup with Neon PostgreSQL"
```

---

## Step 10: Verify Complete Setup (5 minutes)

### Terminal 1 - Backend:
```bash
cd packages/backend
npm run dev
```

Should show: `🚀 HRMS Server running on http://localhost:5000`

### Terminal 2 - Frontend:
```bash
cd packages/frontend
npm run dev
```

Should show: `Local: http://localhost:5173`

### Terminal 3 - Database:
```bash
cd packages/backend
npx prisma studio
```

Should open: http://localhost:5555

---

## ✅ Setup Complete!

You now have:
- ✅ **Frontend**: React + TypeScript + Vite running on http://localhost:5173
- ✅ **Backend**: Node.js + Express + TypeScript running on http://localhost:5000
- ✅ **Database**: Neon PostgreSQL (remote, serverless)
- ✅ **ORM**: Prisma with initial schema
- ✅ **Types**: Shared TypeScript types package
- ✅ **Git**: Repository initialized

---

## Next Steps

### 1. Start Frontend Development
Review `docs/frontend-plan.md` and start with Week 1:
- Authentication pages (Login, Register)
- Dashboard layout
- Routing structure

### 2. Start Backend Development
Review `docs/backend-plan.md` and implement:
- Authentication endpoints (register, login)
- JWT middleware
- User CRUD operations

### 3. Test Integration
- Connect frontend to backend API
- Test authentication flow
- Verify database operations

---

## Useful Commands Reference

### Frontend (packages/frontend)
```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend (packages/backend)
```bash
npm run dev          # Start dev server (http://localhost:5000)
npm run build        # Compile TypeScript
npm run start        # Run compiled code

# Prisma commands
npx prisma studio           # Open database GUI
npx prisma migrate dev      # Create and apply migrations
npx prisma generate         # Generate Prisma Client
npx prisma migrate reset    # Reset database (WARNING: deletes data)
```

### From Root Directory
```bash
npm run dev:frontend    # Start only frontend
npm run dev:backend     # Start only backend
npm run dev             # Start both (may not work on all terminals)
```

---

## Troubleshooting

### Database Connection Issues
1. Verify your Neon connection string in `packages/backend/.env`
2. Check that `sslmode=require` is in the connection string
3. Ensure your Neon project is active (free tier may suspend after 7 days of inactivity)

### Prisma Migration Issues
```bash
cd packages/backend
npx prisma generate     # Regenerate Prisma Client
npx prisma db push      # Push schema without migration (for development)
```

### Port Already in Use
```bash
# Change PORT in packages/backend/.env
PORT=5001  # Instead of 5000
```

### Frontend Build Errors
```bash
cd packages/frontend
rm -rf node_modules package-lock.json
npm install
```

---

## Neon PostgreSQL Tips

### View Database in Neon Console
1. Go to https://console.neon.tech
2. Select your project
3. Click "Tables" to see your schema
4. Use SQL Editor to run queries

### Connection Pooling (Optional)
For production, use Neon's connection pooling:
```
postgresql://username:password@ep-xyz.region.aws.neon.tech/dbname?sslmode=require&pgbouncer=true
```

### Free Tier Limits
- Storage: 0.5 GB
- Compute: 100 hours/month
- Branches: 10

Perfect for development and small projects!

---

**Total Setup Time**: ~90 minutes  
**You're ready to start building the HRMS! 🚀**
