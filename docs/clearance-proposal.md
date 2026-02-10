# Proposal: Dynamic Clearance System

## The Challenge
The initial plan uses a hardcoded `Enum` for clearance departments (HR, IT, Finance, Property, Library).
However, in reality, a university clearance process may involve **22+ checkpoints** (e.g., Housing, Cafeteria, Sports Club, Police, Faculty, Lab, etc.).
Hardcoding 22 departments into an Enum is:
1.  **Rigid**: Adding the 23rd department requires code changes and redployment.
2.  **Unmanageable**: Complex switch-cases for 22 types.

## The Solution: Dynamic Clearance Units
We will move from `Enum` to a **Database-driven** configuration.

### 1. Schema Changes
We will introduce a `ClearanceUnit` table to define the checkpoints dynamically.

```prisma
model ClearanceUnit {
  id          Int      @id @default(autoincrement())
  name        String   @unique // e.g., "Library", "Housing Office"
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  
  // Relations
  approvals   ClearanceApproval[]
}

model ClearanceApproval {
  id              Int             @id @default(autoincrement())
  clearanceRequestId Int
  clearanceUnitId    Int
  status          ClearanceStatus @default(PENDING)
  approverId      Int?
  comment         String?
  
  // Relations
  clearanceRequest ClearanceRequest @relation(...)
  clearanceUnit    ClearanceUnit    @relation(...)
}
```

### 2. Workflow Changes
1.  **Setup**: Admin/HR populates `ClearanceUnit` table with the 22 required places.
2.  **Initiation**: When an employee starts clearance:
    *   Backend fetches all active `ClearanceUnit`s.
    *   Backend generates a `ClearanceApproval` record for *each* unit (22 records).
3.  **Approval**:
    *   Approvers (Department Heads) log in.
    *   They see a list of requests pending *for their specific unit*.
    *   They approve/reject their slice.
4.  **Completion**:
    *   Clearance is "COMPLETE" only when all 22 associated `ClearanceApproval` records are "APPROVED".

## Benefits
- **Scalability**: Can handle 5, 22, or 50 departments without code changes.
- **Flexibility**: Admin can disable/add units at runtime.
- **Simplicity**: Code loop is generic (`foreach unit in active_units`), avoiding giant switch statements.

## Next Steps
If this is agreed:
1.  Refactor `schema.prisma` (Remove `DepartmentType` enum, add models).
2.  Run migration.
3.  Implement `ClearanceService` with dynamic logic.
