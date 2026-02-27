# HRMS Frontend

This is the React Single Page Application (SPA) for the University Human Resource Management System (HRMS). It is built with Vite for rapid development and optimized builds.

## Tech Stack Overview

- **Core**: React 18, TypeScript, Vite
- **UI Framework**: Material-UI (MUI) v5
- **Routing**: React Router DOM v6
- **State/Data Fetching**: Axios
- **Form Handling & Validation**: React Hook Form + Yup
- **Utilities**: date-fns (date manipulation), react-toastify (notifications), react-icons

## Documentation

For a comprehensive guide on the frontend architecture, sprint planning, and component requirements, please refer to the main repository documentation:

* [Frontend Architecture Plan](../../docs/archive/frontend-plan.md)
* [API Contract Reference](../../docs/architecture/api-contract.md)

## Development Setup

1. Ensure your `.env` is configured (copy from `.env.example`).
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api/v1
   VITE_ENVIRONMENT=development
   ```

2. Start the development server from the repository root:
   ```bash
   npm run dev:frontend
   ```

*The frontend will launch at `http://localhost:5173` with Hot Module Replacement enabled.*
