# HRMS Technology Stack
## Bahir Dar University – Final Year Project

---

## Confirmed Technology Stack

### **Frontend**: React + TypeScript + Vite
### **Backend**: Node.js + Express + TypeScript + Prisma
### **Database**: PostgreSQL

---

## 1. Frontend Stack

### Core Technologies

**React 18.x with TypeScript**
- **Purpose**: Dynamic and responsive web interface for employees and HR staff
- **Why**: Industry-standard, large ecosystem, excellent TypeScript support
- **Learning Resources**: https://react.dev/, https://www.typescriptlang.org/

**Vite**
- **Purpose**: Build tool and development server
- **Why**: Extremely fast HMR, optimized builds, better DX than CRA
- **Alternative**: Create React App (if team prefers)

**React Router 6.x**
- **Purpose**: Client-side routing
- **Why**: Standard routing solution for React SPAs

**React Context API**
- **Purpose**: State management
- **Why**: Built-in, sufficient for moderate complexity
- **Migration Path**: Can upgrade to Redux Toolkit if needed

### UI & Styling

**Material-UI (MUI) v5**
- **Purpose**: Component library
- **Why**: Comprehensive, accessible, customizable, good documentation
- **Alternatives**: Ant Design, Chakra UI, or Tailwind CSS

**React Icons**
- **Purpose**: Icon library
- **Why**: Large collection, tree-shakeable

### Data & Forms

**Axios**
- **Purpose**: HTTP client
- **Why**: Interceptors for auth, better error handling than fetch

**React Hook Form**
- **Purpose**: Form state management
- **Why**: Performant, less re-renders, great DX

**Yup**
- **Purpose**: Form validation
- **Why**: Schema-based, integrates well with React Hook Form

### Utilities

**date-fns**
- **Purpose**: Date manipulation
- **Why**: Lightweight, modular, TypeScript support

**react-dropzone**
- **Purpose**: File upload UI
- **Why**: Accessible, customizable

**react-toastify**
- **Purpose**: Toast notifications
- **Why**: Simple, customizable, accessible

### Development Tools

**TypeScript 5.x**
- **Purpose**: Type safety
- **Why**: Catch errors early, better IDE support, self-documenting

**ESLint + Prettier**
- **Purpose**: Code quality and formatting
- **Why**: Industry standard, enforces consistency

**Jest + React Testing Library**
- **Purpose**: Unit and component testing
- **Why**: Standard React testing tools

**Cypress**
- **Purpose**: End-to-end testing
- **Why**: Reliable, great DX, visual debugging

---

## 2. Backend Stack

### Core Technologies

**Node.js v18+ with TypeScript**
- **Purpose**: Server-side logic, RESTful APIs, authentication, database communication
- **Why**: JavaScript everywhere, large ecosystem, async I/O
- **Learning Resources**: https://nodejs.org/, https://expressjs.com/

**Express.js v4.x**
- **Purpose**: Web framework for RESTful APIs
- **Why**: Minimalist, flexible, large ecosystem, well-documented

**TypeScript 5.x**
- **Purpose**: Type safety for backend
- **Why**: Shared language with frontend, better maintainability

### Database & ORM

**PostgreSQL v14+**
- **Purpose**: Primary relational database for employee records and administrative data
- **Why**: ACID compliant, robust, excellent for complex queries, open-source
- **Features**: Transactions, constraints, indexes, JSON support

**Prisma v5.x**
- **Purpose**: ORM and database toolkit
- **Why**: 
  - Type-safe database client
  - Excellent TypeScript support
  - Schema-first approach
  - Auto-generated types
  - Migration system
  - Prisma Studio (database GUI)
- **Learning Resources**: https://www.prisma.io/docs/

### Authentication & Security

**jsonwebtoken**
- **Purpose**: JWT token generation and validation
- **Why**: Stateless authentication, standard

**bcrypt**
- **Purpose**: Password hashing
- **Why**: Industry standard, secure, salting built-in

**helmet**
- **Purpose**: Security headers
- **Why**: Protects against common vulnerabilities

**cors**
- **Purpose**: Cross-origin resource sharing
- **Why**: Control frontend access to API

**express-rate-limit**
- **Purpose**: Rate limiting
- **Why**: Prevent brute force attacks, API abuse

### Validation & Middleware

**Zod**
- **Purpose**: Request validation
- **Why**: TypeScript-first, excellent type inference, runtime validation
- **Alternative**: Joi (more mature, larger ecosystem)

**morgan**
- **Purpose**: HTTP request logging
- **Why**: Simple, configurable, standard

### Utilities

**dotenv**
- **Purpose**: Environment variable management
- **Why**: Standard, simple

**winston** or **pino**
- **Purpose**: Structured logging
- **Why**: Production-ready, configurable, multiple transports

**date-fns**
- **Purpose**: Date manipulation
- **Why**: Shared with frontend, consistent date handling

### Development Tools

**ts-node-dev**
- **Purpose**: TypeScript development server
- **Why**: Auto-reload, fast, TypeScript support

**Prisma Studio**
- **Purpose**: Database GUI
- **Why**: Visual database management, built-in with Prisma

**ESLint + Prettier**
- **Purpose**: Code quality
- **Why**: Consistency across frontend and backend

### Testing

**Jest**
- **Purpose**: Unit and integration testing
- **Why**: Standard, great TypeScript support

**Supertest**
- **Purpose**: API endpoint testing
- **Why**: Integrates with Jest, easy HTTP assertions

**@faker-js/faker**
- **Purpose**: Generate test data
- **Why**: Realistic fake data for testing

### API Documentation

**Swagger/OpenAPI 3.0**
- **Purpose**: API documentation
- **Why**: Standard, interactive docs, client generation

**swagger-ui-express**
- **Purpose**: Serve Swagger UI
- **Why**: Interactive API documentation in browser

---

## 3. Database: PostgreSQL

### Why PostgreSQL?

**Reliability**:
- ACID compliant transactions
- Data integrity constraints
- Robust and battle-tested

**Features**:
- Complex queries and joins
- JSON/JSONB support (if needed)
- Full-text search
- Excellent indexing

**Ecosystem**:
- Great tooling (pgAdmin, TablePlus, Prisma Studio)
- Large community
- Extensive documentation

**Performance**:
- Handles concurrent connections well
- Optimized for complex queries
- Scalable

### Database Tools

**Prisma**
- Schema management
- Migrations
- Type-safe queries

**pgAdmin** or **TablePlus**
- Database GUI for administration
- Query builder
- Visual schema designer

**Docker** (optional)
- Containerized PostgreSQL for development
- Consistent environment across team

---

## 4. Shared Technologies

### TypeScript
- **Frontend**: Type-safe React components
- **Backend**: Type-safe API endpoints
- **Shared**: Common types for API contracts

### date-fns
- **Frontend**: Display dates in UI
- **Backend**: Date calculations and validation
- **Benefit**: Consistent date handling

### ESLint + Prettier
- **Frontend**: Code quality
- **Backend**: Code quality
- **Benefit**: Consistent code style

---

## 5. Development Environment

### Required Software

**Node.js v18+**
```bash
# Check version
node --version  # Should be v18 or higher
npm --version   # Should be v9 or higher
```

**PostgreSQL v14+**
```bash
# Check version
psql --version  # Should be v14 or higher
```

**Git**
```bash
git --version
```

### Recommended Tools

**VS Code**
- Extensions:
  - ESLint
  - Prettier
  - TypeScript
  - Prisma
  - GitLens
  - Thunder Client (API testing)
  - PostgreSQL (syntax highlighting)

**Database GUI**
- pgAdmin (free, open-source)
- TablePlus (paid, better UX)
- Prisma Studio (built-in with Prisma)

**API Testing**
- Thunder Client (VS Code extension)
- Postman
- Insomnia

---

## 6. Project Structure

### Recommended Monorepo Structure

```
hrms/
├── packages/
│   ├── frontend/              # React application
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── backend/               # Node.js API server
│   │   ├── src/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── types/                 # Shared TypeScript types
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
│
├── docs/                      # Planning documents
│   ├── architecture-plan.md
│   ├── api-contract.md
│   ├── frontend-plan.md
│   ├── backend-plan.md
│   └── integration-testing-plan.md
│
├── package.json               # Root package.json
├── pnpm-workspace.yaml        # Workspace configuration
├── .gitignore
└── README.md
```

### Monorepo Tool

**Turborepo** (recommended)
- Fast builds
- Smart caching
- Simple configuration

**Alternative**: pnpm workspaces (lightweight)

---

## 7. Package Versions (Recommended)

### Frontend
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@mui/material": "^5.14.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "axios": "^1.6.0",
    "react-hook-form": "^7.48.0",
    "yup": "^1.3.0",
    "date-fns": "^2.30.0",
    "react-dropzone": "^14.2.0",
    "react-toastify": "^9.1.0",
    "react-icons": "^4.12.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0",
    "jest": "^29.7.0",
    "@testing-library/react": "^14.1.0",
    "cypress": "^13.6.0"
  }
}
```

### Backend
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "zod": "^3.22.0",
    "winston": "^3.11.0",
    "morgan": "^1.10.0",
    "express-rate-limit": "^7.1.0",
    "@prisma/client": "^5.7.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "ts-node-dev": "^2.0.0",
    "prisma": "^5.7.0",
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.0",
    "@types/cors": "^2.8.0",
    "@types/bcrypt": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0",
    "jest": "^29.7.0",
    "supertest": "^6.3.0",
    "@faker-js/faker": "^8.3.0"
  }
}
```

---

## 8. Quick Start Commands

### Initialize Frontend
```bash
cd packages/frontend
npm create vite@latest . -- --template react-ts
npm install
npm install @mui/material @emotion/react @emotion/styled
npm install react-router-dom axios react-hook-form yup
npm install date-fns react-dropzone react-toastify react-icons
```

### Initialize Backend
```bash
cd packages/backend
npm init -y
npm install express cors helmet dotenv jsonwebtoken bcrypt zod winston morgan express-rate-limit
npm install @prisma/client
npm install -D typescript ts-node-dev prisma
npm install -D @types/node @types/express @types/cors @types/bcrypt @types/jsonwebtoken
npx prisma init
```

### Initialize PostgreSQL Database
```bash
# Create database
createdb hrms_dev

# Or using psql
psql -U postgres
CREATE DATABASE hrms_dev;
```

---

## 9. Environment Variables

### Frontend `.env`
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_ENVIRONMENT=development
```

### Backend `.env`
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/hrms_dev"

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Server
PORT=5000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173
```

---

## 10. Why This Stack?

### Advantages

**Shared Language (TypeScript)**:
- Frontend and backend use same language
- Easier team collaboration
- Shared types between layers
- Better code reuse

**Modern & Popular**:
- Large communities
- Extensive documentation
- Many learning resources
- Easy to find help

**Type Safety**:
- TypeScript + Prisma = end-to-end type safety
- Catch errors at compile time
- Better IDE support
- Self-documenting code

**Developer Experience**:
- Vite: Fast development server
- Prisma: Excellent database DX
- Hot reload on both frontend and backend
- Great debugging tools

**Production Ready**:
- Battle-tested technologies
- Used by major companies
- Scalable architecture
- Good performance

**Academic Project Friendly**:
- Well-documented
- Easy to learn
- Good for demonstrations
- Impressive for defense

---

## 11. Learning Resources

### React
- Official Docs: https://react.dev/
- Tutorial: https://react.dev/learn

### TypeScript
- Official Docs: https://www.typescriptlang.org/docs/
- Handbook: https://www.typescriptlang.org/docs/handbook/intro.html

### Node.js + Express
- Node.js Docs: https://nodejs.org/docs/
- Express Guide: https://expressjs.com/en/guide/routing.html

### Prisma
- Getting Started: https://www.prisma.io/docs/getting-started
- Schema Reference: https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference

### PostgreSQL
- Official Docs: https://www.postgresql.org/docs/
- Tutorial: https://www.postgresqltutorial.com/

### Material-UI
- Getting Started: https://mui.com/material-ui/getting-started/
- Components: https://mui.com/material-ui/all-components/

---

**END OF TECH STACK DOCUMENTATION**
