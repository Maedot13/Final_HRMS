# HRMS Project Onboarding Guide

Welcome to the Bahir Dar University HRMS project! This guide will help you set up your local development environment and get started with the codebase.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your machine:

- **Node.js**: v18 or later ([Download](https://nodejs.org/))
- **npm**: v9 or later (comes with Node.js)
- **PostgreSQL**: A [Neon](https://neon.tech/) account (Recommended) or a local PostgreSQL instance.
- **Redis**: v6 or later (Used for session management and caching)
- **Git**: For version control

---

## 🛠️ Step 1: Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HRMS
   ```

2. **Install dependencies**
   We use npm workspaces. Run this in the root directory:
   ```bash
   npm install
   ```

---

## 🔑 Step 2: Configure Environment Variables

You need to set up `.env` files for both the backend and frontend.

### Backend Setup
1. Copy the example file:
   ```bash
   cp packages/backend/.env.example packages/backend/.env
   ```
2. Open `packages/backend/.env` and fill in the required values:
   - `DATABASE_URL`: Your **Neon connection string** (found in your Neon dashboard).
   - `JWT_SECRET`: A secure random string for authentication.
   - `REDIS_URL`: Usually `redis://localhost:6379`.

### Frontend Setup
1. Copy the example file:
   ```bash
   cp packages/frontend/.env.example packages/frontend/.env
   ```
2. Open `packages/frontend/.env` and ensure `VITE_API_BASE_URL` points to your local backend (usually `http://localhost:5000/api/v1`).

---

## 🗄️ Step 3: Database Initialization

Once your `DATABASE_URL` is set in the backend `.env`, run the following commands to initialize your database:

```bash
cd packages/backend
npx prisma migrate dev --name init
npx prisma generate
```

> [!TIP]
> The `migrate dev` command will also automatically run any seed scripts defined in `package.json` to populate your database with initial data.

---

## ✅ Step 4: Environment Check

To verify that your local environment is correctly configured (Node.js, Redis, PostgreSQL), run the included check script from the project root:

```bash
./packages/backend/scripts/check-env.sh
```

---

## 🚀 Step 5: Start Development

You can start both the backend and frontend separately from the project root.

**Start Backend:**
```bash
npm run dev:backend
```

**Start Frontend:**
```bash
npm run dev:frontend
```

---

## 📁 Project Structure

- `packages/frontend`: React frontend.
- `packages/backend`: Node.js/Express API server.
- `packages/types`: Shared TypeScript definitions.
- `docs/`: Technical documentation and design plans.

---

## 📝 Contribution Workflow

1. **Create a new branch** for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Follow Conventional Commits**: Use clear messages like `feat: add employee list`, `fix: resolve login bug`.
3. **Run Linting**: Before pushing, ensure your code follows the style guide:
   ```bash
   npm run lint --workspace=packages/backend
   ```
4. **Push and create a Pull Request**.

Happy coding! 🚀
