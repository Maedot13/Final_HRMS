# HRMS - Human Resource Management System
## Bahir Dar University Final Year Project

A comprehensive Human Resource Management System for Bahir Dar University built with React, Node.js, and PostgreSQL.

## 🏗️ Project Structure

This is a monorepo containing three packages:

- **`packages/frontend/`** - React + TypeScript + Vite frontend application
- **`packages/backend/`** - Node.js + Express + TypeScript API server
- **`packages/types/`** - Shared TypeScript type definitions

## 📚 Documentation Directory

Our newly consolidated documentation is neatly organized natively within the `docs/` repository directory:

- 🛠️ **[Setup & Getting Started](docs/setup/)**: Includes the complete, unified [Getting Started Guide](docs/setup/getting-started.md), [Environment Configurations](docs/setup/environment-config.md), and production [Deployment Guide](docs/setup/deployment-guide.md).
- 🏛️ **[Architecture](docs/architecture/)**: Detailed [System Architecture](docs/architecture/architecture-plan.md), [Multi-Campus Scale Plans](docs/architecture/multi-campus-architecture.md), [Tech Stack Maps](docs/architecture/tech-stack.md), and the exact [API Contracts](docs/architecture/api-contract.md).
- 🧪 **[Testing](docs/testing/)**: Instructions on API interaction testing with Postman guides and our fully automated integration testing strategy.
- 🗄️ **[Archive](docs/archive/)**: Historical proposal documents, initial roadmaps, and sprint feature plans (Frontend & Backend breakdown).

## 🚀 Quick Start & Local Development

For a comprehensive, step-by-step walkthrough of local development (Node.js, Redis, Neon PostgreSQL configuration), check out our definitive **[Getting Started Guide](docs/setup/getting-started.md)**.

For contribution guidelines and branching strategies, refer to our **[Onboarding Guide (CONTRIBUTING.md)](CONTRIBUTING.md)**.

## 🛠️ Monorepo Scripts

To quickly start the application once configured:

```bash
# Run the backend locally
npm run dev:backend

# Run the frontend locally
npm run dev:frontend
```

## 🏛️ Core Tech Stack

### Frontend
- React 18 with TypeScript
- Vite (fast build tool)
- Material-UI (component library)
- React Hook Form + Yup (validation)
- Axios (HTTP client)

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM + PostgreSQL (Neon Serverless)
- JWT Authentication
- Zod (input schema validation)
- Redis Server (state management and rate-limit persistence)

## 👥 Team

Bahir Dar University - BSc Computer Science Final Year Project (3 members)

## 📝 License

MIT
