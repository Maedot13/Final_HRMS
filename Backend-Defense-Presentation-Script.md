# HRMS Backend - Final Defense Presentation Script & Showcase Guide

This document is your **step-by-step script and master guide** for your final year project defense. It is designed to help you explain the backend from scratch, demonstrate the complex business logic (like Sabbatical Leave), and showcase your professional testing strategy using Jest.

---

## Part 1: Introduction & Architecture (The "From Scratch" Explanation)

**Goal:** Establish that you understand enterprise software architecture, not just basic coding.

**🗣️ What to Say:**
> "Welcome to the backend architecture of the Human Resource Management System (HRMS). I designed this backend from the ground up to be scalable, secure, and easily maintainable. 
>
> To achieve this, I used a modern tech stack: **Node.js** with **Express** as the engine, **TypeScript** for strict type safety, and **PostgreSQL** managed by **Prisma ORM** for our relational database.
>
> The fundamental design principle of this backend is the **N-Tier (Layered) Architecture**. Instead of mixing all code together, every request flows through distinct layers:
> 1. **Routes:** The entry points (URLs).
> 2. **Controllers:** The traffic managers that validate incoming data using **Zod**.
> 3. **Services:** The core brain where all the complex **Business Logic** happens.
> 4. **Data Access (Prisma):** The only layer allowed to talk to the database."

**💻 What to Show on Screen:**
- Briefly open `packages/backend/src/routes/sabbatical.routes.ts` → `controllers/sabbatical.controller.ts` → `services/sabbatical.service.ts` to visually prove the separation of concerns.

---

## Part 2: Deep Dive into Complex Business Logic (Sabbatical Leave)

**Goal:** Show the panel that your system doesn't just do basic "CRUD" (Create, Read, Update, Delete) but handles real-world, complex university HR rules.

**🗣️ What to Say:**
> "To demonstrate how the Business Logic layer works, let's look at the **Sabbatical Leave** module. Sabbatical isn't just a standard leave—it has strict institutional rules. 
> 
> When an employee applies for a sabbatical, the system doesn't just save it. It routes the request to `timeoff.service.ts` which acts as our rule engine. The system automatically enforces two major constraints:
> 1. **Rule 1: 7 Years of Service.** The employee must have worked at the institution for at least 7 years.
> 2. **Rule 2: 7-Year Cooldown.** If they've had a sabbatical before, exactly 7 years must have passed since the end date of their *last* sabbatical."

**💻 What to Show on Screen:**
- Open `packages/backend/src/services/timeoff.service.ts`.
- Highlight the `checkSabbaticalEligibility` function. Look specifically at:
  ```typescript
  if (employee.serviceYears < 7) {
      throw new Error(`Sabbatical requires 7 years of service.`);
  }
  // And the cooldown logic:
  const yearsSinceLast = differenceInYears(new Date(), lastSabbatical.endDate);
  ```

---

## Part 3: The Testing Strategy showcase (Jest & Mocking)

**Goal:** This is the "Special Thing". Testing is what separates junior projects from professional, production-ready software.

**🗣️ What to Say:**
> "Because the Sabbatical rules are so strict, it is critical that we have automated tests to guarantee the system works perfectly every time code is updated. For this, I implemented a robust testing suite using **Jest**.
>
> Instead of constantly hitting a real database for unit tests, which is slow and unpredictable, I used **Dependency Mocking**."
> 
> *[Show `sabbatical.service.test.ts`]*
> 
> "In this test suite, you c an see I am mocking the `checkSabbaticalEligibility` function.
> 
> 1. **The Success Case:** In the first test, I use `jest.Mock().mockResolvedValue` to simulate that the user *is* eligible. I then assert that the `createSabbaticalRequest` function executes successfully and sets the status to `PENDING`.
> 2. **The Failure Case:** In the second test, I use `mockRejectedValue(new Error('Not eligible'))` to simulate an employee who hasn't worked for 7 years. I then use Jest's `expect(...).rejects.toThrow()` to mathematically prove that the system successfully blocks the request and throws the correct error."

**💻 What to Show on Screen:**
- Open `packages/backend/src/services/__tests__/sabbatical.service.test.ts`.
- Scroll to line `33`: `(timeoffService.checkSabbaticalEligibility as jest.Mock).mockResolvedValue(undefined);`
- Scroll to line `59`: `it('should fail if eligibility check fails'...)`
- **Action:** Open your terminal and run the specific test live to prove it works:
  ```bash
  # Run this exact command during the presentation
  npm run test -- sabbatical.service.test.ts
  ```
  *(Point out the satisfying green checkmarks ✅ to the examiners)*

---

## Part 4: Zero-to-End Live API Showcase (Using Postman or Swagger)

**Goal:** Prove the backend works in a live environment, enforcing the rules you just explained.

**🗣️ What to Say:**
> "Now, I will demonstrate this entire flow working live through our API endpoints."

**💻 Live Demo Steps:**

**Step 1: The Validation Rejection (Zod)**
- **Action:** Send a `POST /api/v1/sabbatical` request but leave out the `purpose` or `plan`.
- **Say:** "First, our Zod schema validation blocks bad data before it even hits the controller, preventing server crashes." (Show the 400 Bad Request error).

**Step 2: The Business Logic Rejection (Cooldown/Service Years)**
- **Action:** Authenticate as a new employee (less than 7 years of service). Send a valid Sabbatical payload.
- **Say:** "Here, the data is perfectly formatted, but our `timeoff.service` catches that the employee hasn't served 7 years." (Show the 400/403 Error message with the text: "Sabbatical requires 7 years of service").

**Step 3: The Successful Application**
- **Action:** Authenticate as a senior employee (7+ years of service). Send the request.
- **Say:** "Finally, an eligible employee applies. The system verifies eligibility, checks for overlapping leaves, saves the record to PostgreSQL, and returns a 201 Created."

---

## Summary for the Defense Panel

To conclude your backend explanation, wrap up with this strong statement:

> "In summary, by utilizing a strict layered architecture, rigorous business logic validation, and comprehensive automated testing via Jest, I've ensured this HRMS application isn't just a prototype, but a secure, reliable, and enterprise-ready backend system."
