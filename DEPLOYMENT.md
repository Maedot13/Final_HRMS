# HRMS Deployment Guide

## Prerequisites
- Node.js 20+
- Neon PostgreSQL (or similar PostgreSQL 15+ instance)
- NPM or yarn
- PM2 (for production running)

## 1. Setup Environment
1. Clone the repository.
2. In the `packages/backend` directory, duplicate `.env.example` to `.env` and set the following:
   ```env
   DATABASE_URL="postgres://..."
   JWT_SECRET="your-secret"
   JWT_REFRESH_SECRET="your-refresh"
   PORT=4005
   ```
3. In `packages/frontend`, duplicate `.env.example` to `.env` and configure the API url:
   ```env
   VITE_API_URL="http://localhost:4005/api/v1"
   ```

## 2. Database Migration & Seeding
Navigate to the central root folder, or `packages/backend` and run:
```bash
npm install
npx prisma generate
npx prisma db push
npm run seed:dev
```
These steps will initialize your organizational hierarchy, campuses, test staff, and configuration for clearance units.

## 3. Build & Run Production Services
**Backend:**
```bash
cd packages/backend
npm run build
pm2 start dist/server.js --name hrms-backend
```

**Frontend:**
```bash
cd packages/frontend
npm run build
```
Once the `dist` UI folders are built, serve them directly through Nginx or a lightweight proxy (`serve -s dist`) to unify the frontend and backend under a 80/443 port scheme!
