# HRMS Backend Architecture - Presentation Guide

Welcome to the backend architecture guide for the Human Resource Management System (HRMS). This document is designed to help you confidently present the backend structure, technologies, and data flow to any audience, even those without a deep technical background.

---

## 1. High-Level Architecture Overview

**What the Backend System Does:**
The backend is the "brain" of the HRMS application. It handles all the business rules, security, data storage, and communication with the frontend (what the user sees). If a user wants to log in, apply for leave, or view employee records, the backend is responsible for verifying who they are, checking if they have permission, fetching or saving the data, and returning the result.

**Main Technologies Used:**
*   **Node.js & Express.js:** The core engine and web framework. It acts as the traffic controller, receiving web requests from the frontend and routing them to the right place.
*   **TypeScript:** A strongly typed programming language built on top of JavaScript. It helps developers catch errors early by enforcing strict rules on what data looks like.
*   **PostgreSQL:** The relational database where all permanent information (users, campuses, leave requests) is stored in structured tables.
*   **Prisma ORM:** The bridge between our TypeScript code and the PostgreSQL database. It allows us to interact with the database using simple code instead of complex SQL queries.
*   **Redis & BullMQ:** Used for background tasks and queuing (like sending emails asynchronously without slowing down the main application).
*   **Zod:** A library used to validate data coming from the user (e.g., ensuring an email looks like a real email before saving it).

**Design Approach:**
The system uses a highly structured **Layered Architecture** (often called an N-Tier architecture). This means the code is divided into separate layers based on responsibility (Routing, Controlling, Business Logic, and Data Access). This makes the system scalable, easy to maintain, and secure.

---

## 2. The Backend Folder Structure

If you open the `packages/backend/src` folder, you will see several directories. Here is what the important ones do:

*   **`routes/` (The Traffic Cops):** Defines the URLs (endpoints) the frontend can communicate with. For example, it maps `POST /login` to the login function.
*   **`controllers/` (The Managers):** These receive the request from the route, check the input data, ask the Services to do the heavy lifting, and send the final response back to the user. 
*   **`services/` (The Workers):** This is where the core "Business Logic" lives. If you need to calculate leave balances, generate a new employee ID, or hash a password, it happens here.
*   **`middleware/` (The Bouncers):** Code that runs *before* the request reaches the controller. It checks things like: "Is this user logged in?" and "Are they an admin?".
*   **`utils/` (The Toolbelt):** Reusable helper functions used across the application, like generating tokens, handling errors consistently, or logging messages.
*   **`lib/` (External Connections):** Tools used to talk to outside systems, such as the Prisma database connection (`prisma.ts`) or Redis cache.
*   **`schemas/` (The Inspectors):** Contains Zod rules that strictly define what incoming data must look like.

---

## 3. The Backend Flow (Step-by-Step)

Imagine an employee tries to "Log in" using their Employee ID and Password. Here is how the request travels through the system:

1.  **Entry Point (`app.ts`):** The request arrives at the server. Global security checks are applied first (like preventing too many requests from the same person to stop hackers).
2.  **Routing (`routes/auth.routes.ts`):** The app sees the request is for `/api/v1/auth/login` and forwards it to the Auth Controller.
3.  **Controller (`controllers/auth.controller.ts`):** The controller answers the door. It first checks the `schema` to ensure both an ID and a password were provided. If yes, it calls the `Auth Service`.
4.  **Service/Business Logic (`services/auth.service.ts`):** The service takes over. It asks the database (via Prisma) if the user exists. It then securely compares the provided password with the hashed password in the database.
5.  **Data Access (`prisma/schema.prisma`):** The Prisma engine retrieves the user data from the PostgreSQL database tables.
6.  **Response (`utils/errorHandler.ts`):** If the login is successful, the service generates a secure "Token" (ID badge). The controller takes this token and uses standard response handlers to send a beautiful "200 OK - Login Successful" message back to the frontend.

---

## 4. Explaining Major Components (In Simple terms)

*   **Authentication & Authorization:** 
    *   *Authentication (Who are you?)* is handled securely using JSON Web Tokens (JWT). When a user logs in, they get a token. They show this token on every subsequent request instead of their password.
    *   *Authorization (What are you allowed to do?)* is role-based. A user might be an `ADMIN`, `HR_OFFICER`, or `EMPLOYEE`. The `authorize` middleware blocks employees from accessing admin-only pages.
*   **Validation (Zod):** Before we trust any data from the internet, it is inspected. If a user tries to create a leave request with an end date that is *before* the start date, the validation layer catches it instantly and returns an error without touching the database.
*   **Error Handling:** We have a centralized error system (`errorHandler.ts`). If something breaks anywhere in the app, it is caught here, translated into a friendly, standardized format, and safely returned to the user, preventing the system from crashing.
*   **Database Models (Schema):** The database is heavily relational. For example, a `Campus` has many `Employees`. An `Employee` has an associated `User` account for logging in, and can have many `LeaveRequests`. This ensures data connects logically.

---

## 5. Navigation Guide: Showcasing the Code

If you need to show the code during your presentation, follow this exact path to demonstrate how clean the architecture is (Using the "User Login" feature as an example):

1.  **Start at `src/app.ts`:** Show how the app starts, applies security like Rate Limiting, and loads the routing modules (`app.use('/api/v1/auth', authRoutes);`).
2.  **Move to `src/routes/auth.routes.ts`:** Show the exact line where `router.post('/login', authController.login)` is defined. Mention that this is just a map.
3.  **Move to `src/controllers/auth.controller.ts`:** Show the `login` function. Highlight how small and readable it is because it delegates work to the Service, and only handles sending responses.
4.  **Move to `src/services/auth.service.ts`:** Show the heavy lifting. This is where the database query happens (`prisma.user.findUnique`), the password is mathematically verified, and the secure token is created.
5.  **Show `prisma/schema.prisma`:** Show the audience the blueprint of the database. Point out the `User` model and `Employee` model to show how data is structured.

---

## 6. Key Files Summary

*   **`src/app.ts`:** The heart of the setup. It contains global security rules, CSRF protection, rate limits, and hooks up all the routes.
*   **`src/server.ts`:** The ignition switch. It imports `app.ts` and simply turns on the server to listen on a specific port (e.g., Port 5000).
*   **`prisma/schema.prisma`:** The absolute source of truth for the data structure. Any changes to database tables happen here.
*   **`src/middleware/auth.middleware.ts`:** The security guards. Contains functions like `authenticate` (checks if you have a valid token) and `authorize` (checks if you are an Admin).
*   **`src/utils/errorHandler.ts`:** The safety net. It ensures that whenever an error occurs, the user gets a predictable JSON response instead of a raw server exception.

---
*Generated for Final Year Project Presentation Prep*
