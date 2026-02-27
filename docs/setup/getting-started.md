# Getting Started with HRMS

This guide provides instructions on how to set up the HRMS (Human Resource Management System) on your local machine for development.

## Prerequisites

Before you start, ensure you have the following installed on your machine:

1. **Node.js**: v18 or later.
2. **Git**: For version control.
3. **Redis**: v6 or later (Used by the backend for session management and rate limiting).
   * Ubuntu/Debian: `sudo apt install redis-server` (Make sure it's running via `redis-cli ping`).
4. **PostgreSQL Database**: You can use a local instance or a managed service like [Neon](https://neon.tech).

---

## 1. Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HRMS
   ```

2. **Install dependencies**
   The project uses NPM Workspaces. Simply run install from the root:
   ```bash
   npm install
   ```

---

## 2. Environment Configuration

You must configure environment variables for both the frontend and backend. 

### Backend Environment (`packages/backend/.env`)

1. Copy the example file:
   ```bash
   cp packages/backend/.env.example packages/backend/.env
   ```
2. Open `packages/backend/.env` and update the required values:
   - `DATABASE_URL`: Ensure this points to your Neon PostgreSQL connection string or your local PostgreSQL database.
     *Example: `postgresql://user:password@ep-xyz.region.aws.neon.tech/hrms?sslmode=require`*
   - `JWT_SECRET`: A secure random string for signing JWT tokens.
   - `REDIS_URL`: Usually `redis://localhost:6379`.

*For a full list of backend environment variables, see the [Environment Configuration Guide](./environment-config.md).*

### Frontend Environment (`packages/frontend/.env`)

1. Copy the example file:
   ```bash
   cp packages/frontend/.env.example packages/frontend/.env
   ```
2. Open `packages/frontend/.env` and verify the API URL:
   - `VITE_API_BASE_URL`: Should point to your local backend server (usually `http://localhost:5000/api/v1`).

---

## 3. Database Initialization

Once your `DATABASE_URL` is set in the backend `.env`, initialize your database tables:

```bash
cd packages/backend
npx prisma migrate dev --name init
npx prisma generate
```

*(Note: `migrate dev` automatically pushes your schema to the DB and runs any seed scripts if configured.)*

---

## 4. Run the Application

You can start the backend and frontend separately or simultaneously from the project root.

### Optionally: Run Environment Check
Verify your local environment (Node, Redis, PostgreSQL) is ready:
```bash
./packages/backend/scripts/check-env.sh
```

### Start Servers
From the root directory of the project:

**To start Backend and Frontend together:**
```bash
npm run dev
```

**To start Backend only:**
```bash
npm run dev:backend
```
*(The backend runs on http://localhost:5000, and its Swagger documentation is at http://localhost:5000/api-docs.)*

**To start Frontend only:**
```bash
npm run dev:frontend
```
*(The frontend runs on http://localhost:5173.)*

---

## Next Steps

- **Frontend Developers**: Check `packages/frontend/README.md` and the UI source files in `packages/frontend/src/`.
- **Backend Developers**: Check `packages/backend/README.md` and API route definitions in `packages/backend/src/routes/`.
- **API Documentation**: While the backend is running, visit `/api-docs` to interact with the endpoints.
