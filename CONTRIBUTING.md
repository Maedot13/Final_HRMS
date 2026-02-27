# HRMS Project Contribution Guidelines

Welcome to the Bahir Dar University HRMS project! We're excited to have you contribute. 

To keep our codebase clean and organized, please follow these guidelines when submitting code.

---

## 🚀 Environment Setup

If you haven't already, please follow our comprehensive **[Getting Started Guide](docs/setup/getting-started.md)** to configure Node.js, your `.env` variables, and the PostgreSQL database.

---

## 📝 Contribution Workflow

1. **Create a new branch** for your feature or bugfix:
   Ensure you create branches off the `main` branch.
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   # OR for bugs:
   # git checkout -b fix/issue-description
   ```

2. **Follow Conventional Commits**: 
   Use clear, standardized commit messages linking to the feature you are working on.
   - `feat: add employee leave table` (for new features)
   - `fix: resolve login token expiration bug` (for bug fixes)
   - `docs: update API contract for authentication` (for documentation)
   - `chore: update npm dependencies` (for maintenance)

3. **Run Code Quality Checks**: 
   Before pushing, ensure your code builds correctly and passes all format checks/linting rules:
   ```bash
   # From root:
   npm run build
   # Or from backend specifically:
   npm run lint --workspace=packages/backend
   npm run test --workspace=packages/backend
   ```

4. **Push and create a Pull Request**:
   Describe your changes clearly in the PR description so reviewers understand the scope of work and what was modified.

---

## 📁 Project Structure Refresher

- `packages/frontend/`: React Vite SPA.
- `packages/backend/`: Node.js/Express API. Ensure you are familiar with our [Backend Architecture Plans](docs/architecture/).
- `packages/types/`: Shared TypeScript type boundaries to keep frontend and backend synchronized.

Happy coding! 🚀
