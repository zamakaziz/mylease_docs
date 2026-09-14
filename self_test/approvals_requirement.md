# Implementation Prompt — Audit Approval Management

## Objective

Create a new **Approvals** section under the Auditing module.

URL:

https://myleaseaudit.qloop.com/audits/

There is already an Auditing submenu called:

**Approvals**

Implement the complete approval request workflow including:

1. Approval listing
2. New Approval Request
3. Approver selection
4. Audit stage advancement request
5. Approve / Reject workflow
6. Bell notifications
7. Email notifications
8. Approver's assigned approval list
9. Database migration
10. Authorization
11. Automated tests

Use the attached Approval UI screenshot as the primary design reference.

The new approval request form should reuse the existing **"Select Next"** modal/form styling and components wherever possible.

---

# 1. Approvals Listing Page

Create/implement the **Approvals** page under Auditing.

Page heading:

**Approvals**

Description:

> Manage approval requests for stage advancement and other audit actions.

Add the following button at the top-right:

**+ New Approval Request**

Clicking this button must open the New Approval Request modal.

---

# 2. Approval Summary Cards

Display three summary cards:

### Pending

Display the number of pending approval requests.

### Approved

Display the number of approved approval requests.

### Rejected

Display the number of rejected approval requests.

Counts must be loaded dynamically from the database.

---

# 3. Approval Tabs

Add:

- All Requests
- Pending
- Approved
- Rejected

Each tab should filter the approval listing according to the selected status.

---

# 4. Approval Listing

Display approval requests in a table similar to the attached screenshot.

Recommended columns:

| Column | Description |
|---|---|
| Request ID | Unique approval request ID |
| Audit | Associated audit |
| Type | Approval type |
| From Stage | Current audit stage when request was created |
| To Stage | Requested stage |
| Requested By | User who created the request |
| Requested On | Request creation date/time |
| Approver | Selected approver |
| Status | Pending / Approved / Rejected |
| Due Date | Approval due date |
| Actions | Available actions |

For stage advancement requests, Type should display:

**Stage Advancement**

---

# 5. New Approval Request Modal

When the user clicks:

**+ New Approval Request**

open a modal.

The modal must be visually similar to the existing **Select Next** modal.

Reuse the existing:

- Modal
- Date picker
- Select/dropdown
- Form controls
- Validation
- Buttons
- Styling
- Layout
- Responsive behavior

Do not create a completely new UI design.

---

# 6. New Approval Request Form

Modify the existing Select Next form as follows.

## 6.1 Due Date

Rename:

**Approval Date**

to:

**Due Date**

Requirements:

- Required
- Use the existing date picker
- Store in the approvals table
- Do not allow invalid dates
- Preferably prevent selecting a date before the current date

---

## 6.2 Approver

Add a select box:

**Approver**

The dropdown must list users belonging to the company associated with the selected audit.

Flow:

Audit
→ Audit Company
→ Company Users
→ Approver Dropdown

Only active/eligible users should be listed.

Do not load all system users.

If the existing application already has roles/permissions for approval users, respect those rules.

The backend must also validate that the selected approver belongs to the audit's company.

---

## 6.3 From Stage

Add/display:

**From Stage**

This value must automatically come from the selected audit's current stage.

The user must NOT manually enter this value.

Example:

Audit current stage:

`IRL`

Then:

`From Stage = IRL`

The backend must determine/validate the current audit stage and must not blindly trust a client-submitted From Stage value.

Preferably display From Stage as read-only.

---

## 6.4 To Stage

Add a dropdown:

**To Stage**

Options must be exactly:

- PIRL
- IRL
- COFR
- Payment Request (PR)
- Audit Report (AR)
- Close - Savings
- Close - NMD
- Hold - Client
- Hold - RRG

If the project already has centralized stage constants/enums/configuration, reuse them.

Do not duplicate existing stage definitions.

---

# 7. Stage Validation

The selected To Stage must be different from From Stage.

Reject:

From Stage = IRL
To Stage = IRL

The backend must validate this.

If the existing application already has rules for valid stage transitions, reuse those rules.

Do not create a second independent stage workflow.

---

# 8. Record Comments

Keep the existing:

**Record Comments**

field.

This should be optional and saved with the approval request.

Example:

> Please review the audit findings and approve advancement to COFR.

---

# 9. Years

If the existing Select Next functionality requires the audit year, retain the existing Years field/relationship.

Use the existing audit/year relationship.

Do not create a duplicate year implementation.

---

# 10. Buttons

For the New Approval Request modal:

REMOVE/HIDE:

- Change Status
- Change Status & Add Document
- Cancel

Replace them with:

**Save**

The form should have one primary submit button:

**Save**

Keep the existing modal close `X` if that is part of the existing modal design.

---

# 11. Save Approval Request

When Save is clicked:

Frontend validation:

- Due Date required
- Approver required
- To Stage required
- Audit required
- Any other existing required fields

Backend must validate all fields again.

Do not trust frontend validation.

The following fields must be controlled by the backend:

- requested_by
- status
- request_id

The authenticated user must automatically become:

`requested_by`

New requests must default to:

`status = pending`

---

# 12. Approval Request ID

Generate a unique human-readable request ID.

Example:

- APR-2026-001
- APR-2026-002
- APR-2026-003

Use the project's existing ID-generation conventions if available.

The displayed Request ID must be unique.

Do not rely only on the database auto-increment ID.

---

# 13. Database Migration

Create a new Laravel migration for approval requests.

Prefer a table named:

`approvals`

Before creating the migration, inspect the existing project schema/models and use the actual existing table names and relationships for:

- audits
- users
- companies
- audit years
- stages

Do not guess existing table names.

Suggested logical fields:

```text
id
request_id
audit_id
company_id
audit_year_id
type
from_stage
to_stage
requested_by
approver_id
due_date
comments
status
approved_by
approved_at
rejected_by
rejected_at
rejection_reason
created_at
updated_at


migrations:

Schema::create('approvals', function (Blueprint $table) {
    $table->id();

    $table->string('request_id')->unique();

    $table->foreignId('audit_id')
        ->constrained()
        ->cascadeOnDelete();

    $table->foreignId('company_id')
        ->constrained()
        ->cascadeOnDelete();

    $table->foreignId('requested_by')
        ->constrained('users');

    $table->foreignId('approver_id')
        ->constrained('users');

    $table->string('type')->default('stage_advancement');

    $table->string('from_stage');

    $table->string('to_stage');

    $table->date('due_date');

    $table->text('comments')->nullable();

    $table->string('status')->default('pending');

    $table->foreignId('approved_by')
        ->nullable()
        ->constrained('users');

    $table->timestamp('approved_at')->nullable();

    $table->foreignId('rejected_by')
        ->nullable()
        ->constrained('users');

    $table->timestamp('rejected_at')->nullable();

    $table->text('rejection_reason')->nullable();

    $table->timestamps();

    $table->index(['audit_id', 'status']);
    $table->index(['approver_id', 'status']);
    $table->index(['company_id', 'status']);
    $table->index('due_date');
});