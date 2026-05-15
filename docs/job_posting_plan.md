# Simple Internal Job Posting Module Documentation

> Version: 1.0  
> Module Type: Internal Recruitment  
> Status: MVP / Simplified Version

---

# 1. Overview

The Internal Job Posting Module allows employees within the organization to apply for internal job vacancies.

The module is designed to be simple, lightweight, and easy to maintain.

Workflow:

```text
HR Creates Job Post
→ Employees View Jobs
→ Employee Applies
→ HR Reviews
→ HR Selects Employee
→ Job Closed
```

# 2. Objectives

The module aims to:

- Allow internal recruitment
- Simplify promotion and transfer
- Give employees career opportunities
- Reduce manual HR processes
- Provide a clean and easy workflow

# 3. Create Internal Job Posting

HR/Admin can create internal vacancies.

### Fields
| Field | Description |
| :--- | :--- |
| Job Title | Position name |
| Department | Department name |
| Description | Job summary |
| Requirements | Required skills/experience |
| Deadline | Last application date |
| Status | Open / Closed |
| Created By | HR/Admin |
| Created At | Auto-generated date |

# 4. Internal Job Listing

Employees can:

- View available jobs
- Read job descriptions
- View deadlines
- Apply for jobs

# 5. Apply for Job

Employees apply internally through the system.

### Required Inputs
#### 1. Reason for Applying
Textarea field:
> "Why are you applying for this position?"

**Purpose:**
- Understand employee motivation
- Help HR evaluation

#### 2. CV / Resume Upload
**Allowed formats:**
- PDF
- DOCX

**Purpose:**
- Review updated experience
- Compare candidates

# 6. Auto-Filled Employee Information

The system automatically displays:

- Full Name
- Employee ID
- Department
- Current Position
- Employment Date

Employees do not need to enter this manually.

# 7. Eligibility Rules

Employees can apply only if:

- Probation completed
- No active warning
- Job is OPEN
- Deadline not passed
- Employee has not already applied

# 8. Application Statuses
| Status | Description |
| :--- | :--- |
| Pending | Application submitted |
| Shortlisted | HR shortlisted employee |
| Rejected | Application rejected |
| Selected | Employee selected |

# 9. HR Review Process

HR can:

- View applicants
- Read application reasons
- Download CVs
- Shortlist applicants
- Reject applicants
- Select final candidate

# 10. Job Closing

After selecting a candidate:
- Job Status = CLOSED

No more applications are allowed.

# 11. Minimal Workflow
Create Job → Publish Job → Employee Applies → HR Reviews → HR Selects Candidate → Close Job

# 12. User Roles

### HR/Admin
**Permissions:**
- Create job posts
- Edit job posts
- Close job posts
- View applications
- Select candidates

### Employee
**Permissions:**
- View internal jobs
- Apply for jobs
- View application status

# 13. Database Design

### job_posts
| Column | Type |
| :--- | :--- |
| id | UUID |
| title | String |
| department_id | UUID |
| description | Text |
| requirements | Text |
| deadline | Date |
| status | Enum |
| created_by | UUID |
| created_at | Timestamp |

### job_applications
| Column | Type |
| :--- | :--- |
| id | UUID |
| job_post_id | UUID |
| employee_id | UUID |
| reason_for_applying | Text |
| cv_file | String |
| status | Enum |
| applied_at | Timestamp |

# 14. Required Pages

### HR Pages
- **Create Job Post**: Create internal vacancies.
- **Applications Page**: Manage applicants.

### Employee Pages
- **Internal Jobs**: View open vacancies.
- **My Applications**: Track submitted applications.

# 15. Simple UI Structure
Dashboard
├── Internal Jobs
├── My Applications
└── Create Job Post (HR)

# 16. Validation Rules

### Job Posting Validation
- Job title required
- Description required
- Deadline required

### Application Validation
- CV required
- Cannot apply twice
- Cannot apply after deadline

# 17. Conclusion

This simplified Internal Job Posting Module is designed to be:
- Easy to build
- Easy to maintain
- User friendly
- Suitable for HRMS integration

The module focuses only on essential internal recruitment features without unnecessary complexity.
