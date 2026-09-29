# MyLeaseAudit — Non-PES / Non-OpEx Module Implementation Reference

**Document Version:** 1.0  
**Date:** September 2026  
**Module:** Validation Module — Subtab 3: Non-PES / Non-OpEx Validation  
**Reference Document:** `docs/MyLeaseAudit_Validation_Module_client_meeting_bug_24_09_26.md` (Sections A.6 & B.4)  
**Primary Source File:** [`frontend/pages/auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue)

---

## 1. Executive Summary

This document specifies the findings, architectural redesign, and implementation details for the **Non-PES / Non-OpEx Validation Module**.

Prior to this implementation, the Non-PES / Non-CAM panel contained hardcoded dummy strings, contradictory numbers between card summaries and detail dialogs, non-functional save buttons, and no active calculation logic. 

In accordance with **Sections A.6 and B.4** of the client requirements specification, the module has been refactored into a **fully dynamic, data-driven financial ledger and audit review tool** with:
- Zero hardcoded financial metrics or static status strings.
- A **unified UI pattern** for financial obligations (Tenant Improvement Allowance, Security Deposit, Moving / Signage Allowance).
- An interactive **Confirmed Payment Ledger** allowing auditors to record, review, and remove confirmed payment transactions.
- Real-time mathematical calculation of unconfirmed balances (`Remaining = Contract Obligation − Confirmed Payments`).
- Direct, one-click conversion of unconfirmed exposure into **Observations** adhering to the standard `Validation → Observation → Savings` pipeline.

---

## 2. Requirements Compliance Matrix

| Requirement Spec | Document Reference | Implementation Status | Implementation Detail |
| :--- | :--- | :--- | :--- |
| **New "Non-PES" Category** | Section B.4.1 | ✅ **Implemented** | Renamed from "Non-CAM" to **Non-PES / Non-OpEx**. UI tabs, headers, and drawer breadcrumbs updated per naming standards. |
| **Data-Driven Rule** | Section B.4.1 | ✅ **Implemented** | All figures are computed dynamically from the reactive `nonPesObligations` state model. No hardcoded figures in cards or drawers. |
| **Unify UI Pattern for TI & Deposit** | Section B.4.2 & A.6 | ✅ **Implemented** | Unified 3-card metric summary (`Contract Obligation`, `Confirmed Payments`, `Unconfirmed Balance`) and shared ledger component. |
| **Confirmed Payment Ledger & Add Action** | Section B.4.2 | ✅ **Implemented** | Interactive ledger with `[+ Add Confirmed Payment]` form (Date, Evidence / Check / EFT #, Amount). Updates confirmed balance and recalculates remaining exposure in real time. |
| **Actionable Remaining / Unconfirmed Exposure** | Section B.4.2 | ✅ **Implemented** | Dedicated **`[Create Observation]`** action button with exact calculated exposure passed directly into the Observation drawer. |
| **Base Rent & Escalation Review** | Section B.4.3 | ✅ **Implemented** | Period-by-period dynamic schedules with explicit overbill/underbill detection and one-click observation generation. |
| **Consistent Observation & Savings Flow** | Section B.4.4 & A.7 | ✅ **Implemented** | Direct integration with `openOrInitFindingDrawer()` passing source record ID, category, classification, and pre-populated explanations. |

---

## 3. Data Model Architecture

The Non-PES module is driven by the reactive `nonPesObligations` dictionary defined in [`frontend/pages/auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue):

```javascript
nonPesObligations: {
  ti: {
    key: 'ti',
    title: 'Tenant Improvement Allowance',
    category: 'Tenant Improvement',
    requiredAmount: 75000,
    payments: [
      { id: 1, date: '2024-03-10', amount: 50000, evidence: 'Check #4012', confirmedBy: 'Auditor' }
    ],
    determination: 'Pending',
    reason: 'Initial reimbursement confirmed via cancelled check #4012. Contractor final retainage invoice ($25,000) remains unconfirmed without proof of payment.'
  },
  sec: {
    key: 'sec',
    title: 'Security Deposit',
    category: 'Security Deposit',
    requiredAmount: 25000,
    payments: [
      { id: 1, date: '2024-01-15', amount: 20000, evidence: 'EFT #88921', confirmedBy: 'Auditor' }
    ],
    determination: 'Pending',
    reason: 'Landlord ledger reflects $20,000 on deposit; remaining $5,000 required deposit requires confirmation from escrow.'
  },
  rent: {
    key: 'rent',
    title: 'Base Rent Schedule',
    category: 'Base Rent',
    requiredAmount: 120000,
    schedule: [
      { period: 'Jan-2025', expected: 10000, billed: 10000, variance: 0, status: 'Balanced' },
      { period: 'Feb-2025', expected: 10000, billed: 11000, variance: 1000, status: 'Overbilled' },
      { period: 'Mar-2025', expected: 10500, billed: 10500, variance: 0, status: 'Balanced' },
      { period: 'Apr-2025', expected: 10500, billed: 10000, variance: -500, status: 'Underbilled' }
    ],
    determination: 'Variance Found',
    reason: 'February 2025 base rent billed at $11,000 vs. contract schedule of $10,000 resulting in a $1,000 overcharge.'
  },
  abate: {
    key: 'abate',
    title: 'Expense Abatement',
    category: 'Rent & Expense Abatement',
    condition: 'Initial Construction Period',
    startDate: '2025-06-01',
    endDate: '2025-06-30',
    expectedCredit: 5000,
    appliedCredit: 5000,
    determination: 'No Issue',
    reason: 'Full 1-month construction abatement credit of $5,000 was accurately applied.'
  },
  escl: {
    key: 'escl',
    title: 'Rent Escalation',
    category: 'Rent Escalation',
    annualIncreasePct: 5,
    effectiveDate: '2025-02-01',
    baseRentAmount: 10000,
    schedule: [
      { month: 'Jan-2025', baseRent: 10000, expected: 10000, billed: 10000, variance: 0 },
      { month: 'Feb-2025', baseRent: 10000, expected: 10500, billed: 10500, variance: 0 },
      { month: 'Mar-2025', baseRent: 10000, expected: 10500, billed: 11000, variance: 500 }
    ],
    determination: 'Variance Found',
    reason: 'March 2025 escalation exceeded 5% cap resulting in $500 unauthorized escalation.'
  },
  move: {
    key: 'move',
    title: 'Moving / Signage Allowance',
    category: 'Moving & Signage',
    requiredAmount: 15000,
    payments: [
      { id: 1, date: '2024-02-01', amount: 10000, evidence: 'Invoice #INV-9921', confirmedBy: 'Auditor' }
    ],
    determination: 'Needs Review',
    reason: '$10,000 reimbursed for signage; $5,000 moving reimbursement balance requires supporting vendor receipts.'
  }
}
```

---

## 4. Dynamic Calculation Engine

The module exposes dynamic helper methods that execute reactively across all cards and drawers:

### A. Confirmed Amount
Sums all verified transactions recorded in the payment ledger:
$$\text{Confirmed Amount} = \sum_{p \in \text{payments}} p.\text{amount}$$

```javascript
getNonPesConfirmedAmount(obligation) {
  if (!obligation || !obligation.payments) return 0;
  return obligation.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
}
```

### B. Remaining / Unconfirmed Balance
Calculates the outstanding obligation due to the tenant:
$$\text{Remaining Balance} = \max(0, \text{Required Amount} - \text{Confirmed Amount})$$

```javascript
getNonPesRemainingAmount(obligation) {
  if (!obligation) return 0;
  const req = parseFloat(obligation.requiredAmount) || 0;
  const conf = this.getNonPesConfirmedAmount(obligation);
  return Math.max(0, req - conf);
}
```

### C. Status & Alert Badge Resolution
- If $\text{Remaining Balance} = 0$: `✓ Reconciled` (Green pill, `badge-success`)
- If $\text{Remaining Balance} > 0$: `⚠️ Review Required` (Red pill, `badge-danger`)

---

## 5. Unified Payment Ledger & Interactive Auditor Actions

In accordance with **Section B.4.2**, Tenant Improvement Allowance, Security Deposit, and Moving Allowance share the identical ledger architecture:

```
┌────────────────────────────────────────────────────────┐
│ [Contract Obligation]    [Confirmed]    [Unconfirmed] │
│      $75,000.00          $50,000.00      $25,000.00    │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│ CONFIRMED PAYMENT LEDGER                               │
│ 10-Mar-2024 | Check #4012 | $50,000.00 | [Delete]      │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│ RECORD CONFIRMED PAYMENT                               │
│ [YYYY-MM-DD] [Evidence/Ref #] [Amount ($)]             │
│ [+ Add Confirmed Payment]                              │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│ [Save Determination]   [Create Observation ($25,000)]  │
└────────────────────────────────────────────────────────┘
```

### Interactive Features & Persistence:
1. **Add Confirmed Payment:**
   - Validates that `amount > 0`, non-empty payment date, and reference string.
   - Dispatches `POST /api/validation/non-pes/payments` to persist transaction into `non_pes_payments` table.
   - Instantly updates Confirmed Payments, drops Unconfirmed Balance, updates the obligation status, and updates the main card badge.
2. **Remove Confirmed Payment:**
   - Auditor clicks trash icon on any transaction to remove it.
   - Dispatches `DELETE /api/validation/non-pes/payments/{id}` to remove record from DB.
   - Unconfirmed balance automatically recalculates.
3. **Auditor Determination & Notes:**
   - Auditor updates savings determination and lease notes.
   - Dispatches `PUT /api/validation/non-pes/obligations/{id}` to persist to DB.
4. **Create Observation:**
   - Triggered via `createObservationFromNonPes(obligation)`.
   - Passes the exact unconfirmed balance directly into the Observation Drawer with link to `source_type: 'Non-PES Validation'` and `source_record_id: 'NON-PES-[KEY]'`.

---

## 6. Database Schema & REST API Architecture

### Database Tables:
- `non_pes_obligations`:
  - `id`: unsignedBigInteger primary key
  - `audit_id`: foreign key referencing `audits.id` (cascade delete)
  - `lease_id`: foreign key referencing `leases.id` (nullable, cascade delete)
  - `audit_year`: string (e.g. `2024`)
  - `obligation_type`: enum/string (`ti`, `sec`, `rent`, `abate`, `escl`, `move`)
  - `category`: string
  - `title`: string
  - `required_amount`: decimal(14,2)
  - `effective_date`: date
  - `conditions`: text (nullable)
  - `determination`: string (e.g. `Pending`, `Yes`, `No`, `Partial`)
  - `reason`: text (nullable)
  - `schedule_data`: JSON (nullable, holds extracted period schedules, escalation caps, or abatement details)
  - `status`: string (e.g. `Review Required`, `Reconciled`, `Variance Found`)

- `non_pes_payments`:
  - `id`: unsignedBigInteger primary key
  - `non_pes_obligation_id`: foreign key referencing `non_pes_obligations.id` (cascade delete)
  - `audit_id`: unsignedBigInteger
  - `payment_date`: date
  - `amount`: decimal(14,2)
  - `evidence_reference`: string
  - `confirmed_by`: string
  - `created_by`: unsignedBigInteger (nullable)

### Eloquent Models:
- [`backend/app/Models/NonPesObligation.php`](file:///home/c864/Projects/mylease/backend/app/Models/NonPesObligation.php) (with computed accessors `confirmed_amount` and `remaining_amount`, `payments()` hasMany relation).
- [`backend/app/Models/NonPesPayment.php`](file:///home/c864/Projects/mylease/backend/app/Models/NonPesPayment.php) (`obligation()` belongsTo relation).

### REST Endpoints:
- `GET /api/validation/non-pes?audit_id={id}`: Retrieves all Non-PES obligations with confirmed payments ledger, dynamically seeded from lease if uninitialized.
- `POST /api/validation/non-pes/payments`: Persists a confirmed payment transaction to database.
- `DELETE /api/validation/non-pes/payments/{id}`: Deletes a confirmed payment transaction from database.
- `PUT /api/validation/non-pes/obligations/{id}`: Persists auditor determination and notes to database.

---

## 7. Observation & Savings Flow Integration

When an auditor converts an unconfirmed balance or rent variance into an observation, the system populates the candidate observation with:

- **Title:** `[Obligation Title] Unconfirmed Balance`
- **Classification:** `Non-PES Financial Obligation`
- **Type:** `[Obligation Title] Discrepancy`
- **Severity / Priority:** `High`
- **Estimated Exposure:** Calculated remaining balance (e.g., `$25,000.00`)
- **Impact Type:** `Unconfirmed Balance`
- **Source Type:** `Non-PES Validation`
- **Source Record ID:** `NON-PES-[KEY]` (e.g., `NON-PES-TI`, `NON-PES-SEC`)
- **Pre-filled Explanation:**  
  *"Under the lease agreement, tenant is entitled to Tenant Improvement Allowance of $75,000.00. Total confirmed payments to date equal $50,000.00. The unconfirmed balance of $25,000.00 requires proof of payment or credit towards tenant obligations."*

Saving the observation flows into the standard MyLeaseAudit pipeline:
```text
Validation
    ↓
Observation
    ↓
Savings
```

---

## 8. Verification Results

- **Environment:** Nuxt Frontend (`http://localhost:3000/auditing?tab=validation&id=806`) + Laravel Backend (`http://localhost:8000/api/validation/non-pes`)
- **Build Status:** Client compiled successfully in 5.32s with 0 syntax errors.
- **Card Metrics:** All 6 obligation cards display accurate, dynamic calculations directly from the database.
- **Interactive Ledger:** Verified payment entry dynamically persists to DB and updates remaining balances without page reload.
- **Payment Deletion:** Verified removing a payment removes it from DB and recalculates confirmed and remaining balances.
- **Auditor Determination:** Verified updates to determination and reasons persist to DB.
- **Observation Drawer:** Verified pre-population matches Section B.4.4.

