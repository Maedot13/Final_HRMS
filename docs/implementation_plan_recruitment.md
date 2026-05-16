# Implementation Plan: Internal Job Posting Module

This plan outlines the step-by-step implementation of the Internal Job Posting Module as specified in [job_posting_plan.md](file:///home/kirubel/Desktop/Demo/-HR-management-system-/docs/job_posting_plan.md).

## Phase 1: Database & Schema Refinement
**Goal:** Align the existing database models with the new requirements.

1.  **Update `schema.prisma`**:
    *   Add `SELECTED` to `ApplicationStatus` enum.
    *   Add `SELECTED` or similar logic to `JobStatus` (or ensure `CLOSED` is used when a candidate is selected).
    *   (Optional) Rename `coverLetter` to `reasonForApplying` in `JobApplication` or use an alias in the code.
    *   Ensure `JobPosting` links to the `Department` model correctly (replace `deptLegacy` string with `departmentId` Int).
2.  **Run Migrations**:
    *   `npx prisma migrate dev --name update_job_posting_schema`
3.  **Update Zod Validation**:
    *   Update `recruitment.schema.ts` to reflect field changes and status enums.

## Phase 2: Backend Logic & Eligibility Checks
**Goal:** Implement the "Eligibility Rules" and refine API endpoints.

1.  **Implement Eligibility Service**:
    *   Check `probationStatus` (calculate based on `hireDate` + 6 months if not explicit).
    *   Check for `activeWarnings` (requires checking if a `Disciplinary` model exists or adding a simple flag).
    *   Verify `jobStatus === 'OPEN'` and `deadline > now()`.
2.  **Refine `applyForJob` Controller**:
    *   Integrate eligibility checks before allowing submission.
    *   Handle CV upload with `multer` (already partially implemented).
3.  **Refine `updateApplicationStatus` Controller**:
    *   Add logic: When status is set to `SELECTED`, automatically set the `JobPosting` status to `CLOSED`.
    *   Prevent further applications once closed.

## Phase 3: Frontend - HR Job Management
**Goal:** Provide HR with tools to create and manage vacancies.

1.  **Update `CreateJobPost` Page**:
    *   Implement form with Title, Department (dropdown), Description, Requirements, and Deadline.
    *   Add validation for required fields.
2.  **Update `ApplicationsPage`**:
    *   List all applicants for a specific posting.
    *   Display "Reason for Applying" and provide link to download CV.
    *   Implement actions: `Shortlist`, `Reject`, `Select Candidate`.
3.  **Dashboard Integration**:
    *   Add "Create Job Post" button for HR users.

## Phase 4: Frontend - Employee Portal
**Goal:** Allow employees to view and apply for internal roles.

1.  **`InternalJobs` Listing Page**:
    *   Display open vacancies in a grid/list.
    *   Show key info: Title, Dept, Deadline.
2.  **`JobDetails` & `ApplyForm`**:
    *   Display full job description.
    *   **Auto-fill**: Fetch and display logged-in employee's Name, ID, Dept, Position, and Hire Date.
    *   Input: "Reason for Applying" (Textarea).
    *   Input: CV Upload (File).
3.  **`My Applications` Page**:
    *   Show status of submitted applications (`Pending`, `Shortlisted`, `Rejected`, `Selected`).

## Phase 5: Polish & UI/UX
**Goal:** Premium look and feel with smooth interactions.

1.  **Aesthetics**:
    *   Use glassmorphism for job cards.
    *   Add micro-animations for status badges (e.g., pulsing green for `Selected`).
2.  **SEO & Metadata**:
    *   Add descriptive titles and meta tags for the recruitment pages.
3.  **Final Testing**:
    *   Test validation rules (e.g., applying after deadline).
    *   Test file upload constraints.

---
> [!IMPORTANT]
> This plan assumes the base infrastructure (Auth, Multer, Prisma) is already functional. Each phase should be verified with unit/integration tests.
