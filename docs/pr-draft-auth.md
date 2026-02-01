# Pull Request: Basic Authentication Module

## Description
This PR addresses Part 1 of the Authentication Module implementation (Phase 2.3). It sets up the security foundation for the backend.

## Changes
- **Backend Architecture**: Added Service/Controller/Route structure for Auth.
- **Security**:
  - Implemented JWT-based authentication.
  - Added Password Hashing (using bcrypt/argon2 via utilities).
  - Created `authenticate` and `authorize` middleware for Role-Based Access Control (RBAC).
- **API Endpoints**:
  - `POST /api/v1/auth/register`: Create new user/employee.
  - `POST /api/v1/auth/login`: Authenticate and receive token.
  - `GET /api/v1/auth/me`: Get current user context.
- **Types**: Updated shared types with Auth DTOs.

## Verification
- [x] Server starts successfully (`npm run dev`).
- [x] Database connects.
- [x] Login returns a valid JWT token.
- [x] Protected routes reject requests without token.

## Next Steps
- Implement Refresh Token mechanism.
- Implement Logout.
