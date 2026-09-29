# MyLeaseAudit — Validation Module Enhancements Implementation Guide

**Document Version:** 1.0  
**Date:** September 29, 2026  
**Module:** Audit Validation Module (`/auditing?tab=validation`)  
**Client Requirements References:**
- `docs/MyLeaseAudit_Validation_Module_client_meeting_bug_24_09_26.md` (Sections A.6, A.8, B.4, B.7)
- `docs/MyLeaseAudit_Validation_UI_Changes_To_Implement.md` (Sections 26, 27, 28)

---

## Table of Contents
1. [Overview & Objectives](#1-overview--objectives)
2. [Feature 1: Non-PES / Non-OpEx Ledger & Validation Engine](#2-feature-1-non-pes--non-opex-ledger--validation-engine)
   - 2.1 Problem Analysis & Previous State
   - 2.2 Database Schema & Migrations
   - 2.3 Backend API & Controller
   - 2.4 Frontend Reactive Implementation
   - 2.5 Validation → Observation → Savings Workflow
3. [Feature 2: Statement Versioning & Compare Versions](#3-feature-2-statement-versioning--compare-versions)
   - 3.1 Problem Analysis & Static Mock Elimination
   - 3.2 Backend Endpoint: `GET /api/validation/statement-versions`
   - 3.3 Dynamic Multi-Statement Selection & Toolbar Unification
   - 3.4 Live Side-by-Side Comparison Modal & Variance Math
   - 3.5 Active Statement Promotion (`[Use for Validation]`)
4. [File Inventory & Change Log](#4-file-inventory--change-log)
5. [Verification & Test Results (Audit 808)](#5-verification--test-results-audit-808)

---

## 1. Overview & Objectives

During the validation module review for client acceptance, two critical areas required complete architectural overhaul to replace static/hardcoded placeholders with dynamic, data-driven systems:

1. **Non-PES / Non-OpEx Validation Panel (Subtab 3):**
   - Previous state used static mock text, mismatched hardcoded card amounts, non-functional save/delete buttons, and lacked database persistence.
   - Required full conversion to a financial ledger pattern with dynamic obligation persistence, confirmed payment tracking, automated remaining balance calculation, and direct observation generation.

2. **Statement Versioning & Version Comparison Modal:**
   - Previous state displayed duplicate statement dropdowns in the toolbar and a hardcoded comparison table ($50,000 vs $60,500, 8 vs 10 lines, "+ Roof Repair").
   - Required a unified navigation dropdown and a 100% dynamic comparison modal powered by backend aggregations that calculate live mathematical variance, line deltas, category additions/removals, and allows promoting any statement version to active validation.

---

## 2. Feature 1: Non-PES / Non-OpEx Ledger & Validation Engine

### 2.1 Problem Analysis & Previous State
* The previous UI was labeled "Non-CAM" instead of "Non-PES / Non-OpEx".
* Card values were hardcoded (e.g. Card showed `$25,000` remaining while dialog showed `$75,000` required vs `$50,000` paid).
* Payment ledgers had no add/delete actions connected to real API endpoints.
* Unconfirmed balances did not dynamically carry into the Observation creation workflow.

### 2.2 Database Schema & Migrations

Created separate, production-grade migrations ensuring backward compatibility and strict database conventions:

1. **[`backend/database/migrations/2026_09_29_100001_create_non_pes_tables.php`](file:///home/c864/Projects/mylease/backend/database/migrations/2026_09_29_100001_create_non_pes_tables.php)**:
   - **`non_pes_obligations`**:
     - `id` (bigint, PK)
     - `audit_id` (foreign key -> audits.id)
     - `obligation_key` (enum: `ti`, `sec`, `moving`, `rent`, etc.)
     - `title` (varchar)
     - `category` (varchar)
     - `required_amount` (decimal 12,2)
     - `determination` (enum: `Pending`, `Confirmed`, `Disputed`, `Not Applicable`)
     - `reason` (text)
     - `confirmed_by` (varchar)
     - `confirmed_at` (timestamp)
   - **`non_pes_payments`**:
     - `id` (bigint, PK)
     - `obligation_id` (foreign key -> non_pes_obligations.id ON DELETE CASCADE)
     - `payment_date` (date)
     - `amount` (decimal 12,2)
     - `evidence` (varchar)
     - `confirmed_by` (varchar)

2. **[`backend/database/migrations/2026_09_29_110001_update_validation_findings_statement_columns.php`](file:///home/c864/Projects/mylease/backend/database/migrations/2026_09_29_110001_update_validation_findings_statement_columns.php)**:
   - Adds `statement_id` indexing to validation tables as an isolated migration rather than modifying older historical migration scripts.

### 2.3 Backend API & Controller

- **Controller:** [`backend/app/Http/Controllers/API/NonPesValidationController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/NonPesValidationController.php)
- **Routes:** Registered in [`backend/routes/api.php`](file:///home/c864/Projects/mylease/backend/routes/api.php):
  - `GET /api/validation/non-pes?audit_id={auditId}` — Fetches all obligations, associated payments, and pre-calculated confirmed/unconfirmed balances. Seeds baseline contract obligations automatically if none exist for the audit.
  - `POST /api/validation/non-pes/payments` — Inserts a confirmed payment record, returning updated totals.
  - `DELETE /api/validation/non-pes/payments/{id}` — Deletes a payment record.
  - `PUT /api/validation/non-pes/obligations/{id}` — Updates obligation determination status, required amounts, or auditor notes.

### 2.4 Frontend Reactive Implementation

File: [`frontend/pages/auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue)

- **Unified Metric Summary Cards:**
  - Card 1: **Contract Obligation** (`requiredAmount`)
  - Card 2: **Confirmed Payments** (`computed: totalConfirmed`)
  - Card 3: **Unconfirmed Balance / Exposure** (`computed: remainingBalance`)
- **Interactive Confirmed Payment Ledger:**
  - Auditors can view transaction history (Date, Evidence / Check #, Amount, Confirmed By).
  - Built-in `[+ Add Payment]` form validates input and performs instant reactive calculation.
  - Delete action with confirmation prompt recalculates exposure immediately.
- **Base Rent & Escalation Validation:**
  - Period-by-period dynamic schedule comparison.
  - Explicit overbill / underbill flag with variance metrics.

### 2.5 Validation → Observation → Savings Workflow
- When an unconfirmed balance or rent overbill is detected, clicking **`[Create Observation]`**:
  - Sets `drawerSource = 'non_pes_tab'`.
  - Invokes `openOrInitFindingDrawer()` with pre-populated financial exposure, category, finding title, and auditor justification.
  - Automatically ties into the master audit savings pipeline upon auditor confirmation.

---

## 3. Feature 2: Statement Versioning & Compare Versions

### 3.1 Problem Analysis & Static Mock Elimination
* Previously, the header toolbar contained duplicate statement selectors.
* Clicking "Compare Versions" rendered a hardcoded dialog featuring sample data ($50,000 vs $60,500, "+ Roof Repair", "+ Legal Fees").
* The modal had no connection to backend statements and no ability to switch the active statement.

### 3.2 Backend Endpoint: `GET /api/validation/statement-versions`

- **Controller:** [`backend/app/Http/Controllers/API/ValidationController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/ValidationController.php#L1075-L1142)
- **Route:** Registered in [`backend/routes/api.php`](file:///home/c864/Projects/mylease/backend/routes/api.php#L612-L618)
- **Logic:**
  1. Retrieves all statements for the audit from `statement` table.
  2. Eager-loads non-zero `statementExpenses` where `current_amount` is not empty.
  3. Parses and cleans `current_amount` to calculate dynamic `total_billed`.
  4. Counts valid expense line items as `line_count`.
  5. Collects distinct category names (`landlord_expense_category` / `rrg_category`).
  6. Tags each statement chronologically (`V1 – Original`, `V2 – Revised / Detailed`).

### 3.3 Dynamic Multi-Statement Selection & Toolbar Unification
- In [`frontend/pages/auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue#L4195-L4215):
  - Consolidated into a single **Active Statement** dropdown on the left side of the Validation sub-navigation bar.
  - Formatted labels using `getStatementDisplayLabel(st)` (e.g. `ST-808-01: 2025 (Annual Reconciliation)`).
  - Renders the **`[Compare Versions]`** button immediately next to the dropdown whenever `auditStatementsList.length > 1`.

### 3.4 Live Side-by-Side Comparison Modal & Variance Math
Located in [`frontend/pages/auditing.vue:L1570-L1685`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue#L1570-L1685):
- **Base vs Target Dropdowns:**
  - Auditor can compare any two statements dynamically (e.g. V1 Original vs V2 Revised, or V2 vs V10).
- **Live Mathematical Variance:**
  - `Total Billed Variance`: Computed as `target.total_billed - base.total_billed` (e.g. `+$191,300.00`).
  - `Expense Line Delta`: Computed as `target.line_count - base.line_count` (e.g. `+3 Lines`).
- **Dynamic Category Delta:**
  - Computes `Added Categories` (`target.categories \ base.categories`) displaying real database categories (e.g. `+ Building Automation System`, `+ Debt Repayment`, `+ Owner Personal Expenses`).
  - Computes `Removed Categories` (`base.categories \ target.categories`).

### 3.5 Active Statement Promotion (`[Use for Validation]`)
- Clicking **`[Use for Validation]`**:
  - Updates `selectedAuditStatementId` to the selected comparison statement ID.
  - Closes the modal.
  - Dispatches `onStatementSelected()`, triggering immediate refreshes of:
    - PES line items and totals (`fetchStatementData`)
    - TRS reconciliation exposure balances
    - Validation findings and cap history traces (`fetchValidationFindings`)
    - Validation summary cards (`fetchValidationSummary`)

---

## 4. File Inventory & Change Log

| File Path | Action | Description |
| :--- | :--- | :--- |
| [`backend/database/migrations/2026_09_29_100001_create_non_pes_tables.php`](file:///home/c864/Projects/mylease/backend/database/migrations/2026_09_29_100001_create_non_pes_tables.php) | **Created** | Database migration for `non_pes_obligations` and `non_pes_payments`. |
| [`backend/database/migrations/2026_09_29_110001_update_validation_findings_statement_columns.php`](file:///home/c864/Projects/mylease/backend/database/migrations/2026_09_29_110001_update_validation_findings_statement_columns.php) | **Created** | Isolated migration for statement column indexes on validation findings. |
| [`backend/app/Models/NonPesObligation.php`](file:///home/c864/Projects/mylease/backend/app/Models/NonPesObligation.php) | **Created** | Eloquent model for Non-PES obligations with payment relationships. |
| [`backend/app/Models/NonPesPayment.php`](file:///home/c864/Projects/mylease/backend/app/Models/NonPesPayment.php) | **Created** | Eloquent model for confirmed ledger payments. |
| [`backend/app/Http/Controllers/API/NonPesValidationController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/NonPesValidationController.php) | **Created** | API controller for Non-PES obligations, payment CRUD, and calculations. |
| [`backend/app/Http/Controllers/API/ValidationController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/ValidationController.php) | **Modified** | Added `getStatementVersions` endpoint with real expense sums and category delta sets. |
| [`backend/routes/api.php`](file:///home/c864/Projects/mylease/backend/routes/api.php) | **Modified** | Registered routes for `validation/non-pes/*` and `validation/statement-versions`. |
| [`frontend/pages/auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue) | **Modified** | Replaced static Non-PES and version compare modals with dynamic data-driven UI. |

---

## 5. Verification & Test Results (Audit 808)

### Test Environment
* **URL:** `http://localhost:3000/auditing?tab=validation&id=808`
* **Backend:** Laravel 10 running on PHP 8.2 (Port 8000 via Docker)
* **Frontend:** Nuxt 2 / Vue 2 running on Node 18 (Port 3000 via Docker)

### Verification Summary

| Test Case | Method | Expected Output | Actual Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Non-PES Ledger Ingestion** | API & UI Load | 3 obligations loaded with payments and unconfirmed balances | Obligation cards loaded dynamically from API | ✅ Passed |
| **Add Confirmed Payment** | UI Modal Form | Balance updates; unconfirmed exposure recalculates | Instantly recalculated in reactive state & persisted in DB | ✅ Passed |
| **Create Observation from Non-PES** | Action Button | Opens Finding drawer with prepopulated exposure & notes | Drawer opens with calculated balance ($25,000) and rationale | ✅ Passed |
| **Statement Versions Discovery** | `curl` & Controller | Returns 10 statements with real billed amounts | HTTP 200: V1 ($59,800) to V10 ($251,100) returned with line counts | ✅ Passed |
| **Live Math Variance** | Modal Compare | Total Billed diff: `+$191,300`, Line diff: `+3` | Live values rendered with color-coded positive delta | ✅ Passed |
| **Dynamic Category Delta** | Modal Categories | Detects items unique to V10 | Real categories displayed: Building Automation, Debt Repayment, etc. | ✅ Passed |
| **Promote Statement** | Modal `[Use for Validation]` | Switches active statement and refreshes validation findings | Active statement switched to ST-808-10; findings re-evaluated | ✅ Passed |
| **Nuxt Compilation** | Webpack build | 0 build errors | Compiled successfully in 4.37s | ✅ Passed |

---
*End of Implementation Guide.*
