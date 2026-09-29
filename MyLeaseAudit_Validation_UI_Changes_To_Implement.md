# MyLeaseAudit Validation UI – Changes to Implement

## Purpose

Update the current Validation UI demo based on the latest design review.

Keep the existing A–K page structure. Do not redesign the whole page. Extend it so the UI correctly represents the validation rules, auditor workflow, CAM reconciliation, Non-CAM validation, evidence handling, and run history.

**UI/demo only:** use mock data and do not modify production validation calculations or production data.

---

## 1. Expense Validation Results

Change the result table to show:

```text
Expense
Billed Amount
Allowed Amount
Status
Exposure
Category
Lease Treatment
Reason
Actions
```

Example:

```text
Property Management Fee

Billed:   $28,500
Allowed:  $15,000
Status:   🟠 Cap Exceeded
Exposure: $13,500

Lease Treatment:
Included – Fixed Whole Cap

Reason:
Billed amount exceeds contractual cap.
```

For Excluded:

```text
Billed:   $20,000
Allowed:  N/A
Status:   🔴 Excluded
Exposure: $20,000
```

For Needs Review:

```text
Billed:   $4,000
Allowed:  N/A
Status:   🟡 Needs Review
Exposure: Not calculated
```

---

## 2. Automatic Lease Matching

Do not allow manual Original Lease / Lease Amendment selection.

Use:

```text
Statement Date
→ Lease Effective Dates
→ Automatically determine active lease
```

Show the reason:

```text
Matched Lease:
🟢 Lease Amendment

Effective:
01-Jul-2025

Why:
Statement date 15-Aug-2025 is on/after
the amendment effective date.
```

The matched lease must be read-only.

---

## 3. Lease Timeline

Keep the timeline informational:

```text
01-Jan-2024
└── Original Lease
    Superseded

01-Jul-2025
└── Lease Amendment
    🟢 Active
```

Do not allow the user to change the active lease by clicking the timeline.

---

## 4. Lease Expense Matrix

The matrix must represent the **lease rules**, not only the expenses present in the statement.

Show:

```text
Category
Treatment
Cap Type
Effective Date
Rule Source
```

Example:

```text
Janitorial & Cleaning       🟢 Included
Real Estate Taxes           🟢 Included
Property Management Fee     🟠 Included – Cap
Roof Replacement            🔴 Excluded
Structural Repair           🔴 Excluded
Legal Fees                  🔴 Excluded
```

The matrix must show lease categories even if the current statement has no expense for that category.

Clicking a row opens:

```text
LEASE RULE DETAILS

Category:
Property Management Fee

Matched Lease:
Lease Amendment

Effective Date:
01-Jul-2025

Treatment:
Included

Increase Cap:
Fixed Whole

Fixed Amount:
$15,000

Rule Source:
Lease Amendment
```

---

## 5. Increase Cap Types

Calculation Details must support all five types.

### No

```text
Base: $10,000
Rate: 0%
Allowed Cap: $10,000
```

### % Increase

```text
Base: $10,000
Rate: 5%

$10,000 × 1.05
= $10,500
```

### Index

```text
Base: $10,000
Index: 6%

$10,000 × 1.06
= $10,600
```

### Cost/Size

```text
Cost per Size: $4.24
Size: 2,500 SF

$4.24 × 2,500
= $10,600
```

### Fixed Whole

```text
Fixed Amount: $15,000
Allowed Cap: $15,000
```

---

## 6. Cap Effective-Date Selection

Show cap history:

```text
01-Jan-2024 → No → $10,000
01-Apr-2024 → % Increase → 5%
01-Jul-2024 → Index → 6%
```

For a statement dated 15-Aug-2024, show:

```text
Applicable Rule:
Index

Effective:
01-Jul-2024

Rate:
6%

Allowed Cap:
$10,600

✓ Latest cap rule effective on statement date
```

---

## 7. Calculation Details Drawer

Use:

```text
CALCULATION DETAILS

Expense:
Property Management Fee

Statement Amount:
$28,500

Matched Lease:
Lease Amendment

Lease Effective Date:
01-Jul-2025

Lease Treatment:
Included

Increase Cap:
Fixed Whole

Cap Effective Date:
01-Jul-2025

Allowed Cap:
$15,000

CALCULATION

$28,500 - $15,000
= $13,500 Exposure

RESULT

🟠 CAP EXCEEDED

Reason:
Billed amount exceeds contractual cap.

[View Lease Rule]
[View Statement]
[Review & Correct]
```

---

## 8. Excluded Expense Details

Show the exact reason:

```text
Expense:
Roof Replacement

Amount:
$20,000

Treatment:
🔴 Excluded

Reason:
Expense category is excluded by the
matched lease operational-cost definition.

Allowed Amount:
N/A

Exposure:
$20,000
```

Do not show only `Excluded`.

---

## 9. Needs Review

Add:

```text
🟡 Needs Review
```

Use when the system cannot safely determine the result.

Examples:

- Missing lease rule
- Ambiguous category
- Missing evidence
- Unsupported calculation
- Manual auditor decision required

Example:

```text
Unknown Utility Charge

Status:
🟡 Needs Review

Reason:
No matching lease expense definition found.

Exposure:
Not calculated

[Review]
[Request Evidence]
```

---

## 10. Review & Correct

Do not make Override automatically mean Allowed.

Use:

```text
REVIEW & CORRECT

Engine Result:
🔴 Excluded

Engine Exposure:
$20,000

Auditor Decision:

( ) Use Engine Result
( ) Allowed
( ) Excluded
( ) Cap Exceeded
( ) Needs Review

Corrected Amount:
[          ]

Reason *:
[........................]

[Cancel]
[Save Draft]
[Save & Recalculate]
```

If the auditor changes the result, a reason is mandatory.

Always preserve:

```text
Engine Result
Auditor Decision
Final Confirmed Result
```

---

## 11. Save & Recalculate Preview

Before recalculation:

```text
CHANGE PREVIEW

BEFORE
Status: 🔴 Excluded
Exposure: $20,000

AFTER
Status: 🟢 Allowed
Exposure: $0

Change:
Exposure reduced by $20,000

Reason:
Lease amendment permits this category.

[Back]
[Confirm & Recalculate]
```

After recalculation:

```text
Previous Run:
VR-001

New Proposed Run:
VR-002

Total Exposure:
Before: $41,700
After:  $21,700

Status:
🟡 Proposed
```

---

# 12. CAM Reconciliation

Keep the current summary, but add a calculation drawer.

```text
Landlord CAM:             $100,000
Excluded Expenses:        -$10,000
Cap Adjustments:           -$5,000
Corrected CAM:             $85,000
Tenant Share:                  10%
Tenant CAM:                $8,500
Already Paid:              -$8,000
Final Balance:                $500 Due

[View Calculation]
```

Calculation drawer:

```text
Landlord Reported CAM
↓
Excluded Expenses
↓
Cap Adjustments
↓
Corrected Expense Pool
↓
Tenant Share
↓
Tenant CAM
↓
Payments
↓
Final Balance
```

---

# 13. Base Year Contribution & Floor

Add a section/drawer:

```text
BASE YEAR CONTRIBUTION & FLOOR

Janitorial             $12,000
Insurance               $8,000
Real Estate Taxes      $15,000
Security                $5,000
------------------------------
Comparable Pool        $40,000

Tenant Share               10%
Tenant Contribution      $4,000
Floor                       $0
```

Show:

```text
Zero floor is applied once at the
lease-defined pool / tenant level.
```

Do not apply the zero floor separately to every excluded category.

---

# 14. Opex + Tax Reconciliation

Add:

```text
LANDLORD PRESENTATION

Operating Expenses:
$100,000

Taxes:
$11,000

Reported Total:
$111,000
```

Then:

```text
LEASE REQUIREMENT

Operating Expenses + Taxes
must be evaluated together.
```

Then:

```text
CORRECTED RESULT

Operating Expenses:
$95,000

Taxes:
$11,000

Corrected Combined Pool:
$106,000
```

Add `[View Calculation]`.

---

# 15. Reconciliation Inputs & Evidence

Add:

```text
RECONCILIATION INPUTS

Effective Tenant Share
[10%]

Base Year
[2023]

Floor
[$0]

Tax
[$11,000]

Payment Evidence
[Payment_2024.pdf]
```

Evidence status:

```text
Effective Share       🟢 Confirmed
Base Year             🟢 Confirmed
Floor                 🟢 Confirmed
Tax                   🟡 Source Only
Payment Evidence      🟢 Confirmed
```

Buttons:

```text
[Save Draft]
[Save & Recalculate]
```

---

# 16. Non-CAM Validation

Replace the simple placeholder with six cards:

```text
Tenant Improvement Allowance
🟡 Pending
[Open]

Security Deposit
🟢 No Issue
[Open]

Base Rent Schedule
🟠 Variance Found
[Open]

Expense Abatement
🟢 No Issue
[Open]

Rent Escalation
🟠 Variance Found
[Open]

Moving / Signage Allowance
🟡 Needs Review
[Open]
```

---

# 17. Tenant Improvement Allowance

Show:

```text
Allowance:
$50,000

Used:
$30,000

Remaining:
$20,000

Savings Determination:
[Pending ▼]
```

Options:

```text
Pending
Yes
No
Partial
Not Yet Due
Unable to Determine
```

Add:

```text
Reason:
[.........................]

[Save]
```

---

# 18. Security Deposit

Show:

```text
Required Deposit:
$25,000

Original Deposit:
$25,000

Returned:
$5,000

Currently Held:
$20,000

Difference:
$0

Status:
🟢 No Issue
```

---

# 19. Base Rent Schedule

Use period-by-period comparison:

```text
Period       Expected    Billed     Variance

Jan-2025     $10,000     $10,000    $0
Feb-2025     $10,000     $11,000    +$1,000
Mar-2025     $11,000     $11,000    $0
Apr-2025     $11,000     $10,500    -$500
```

Important:

Do not automatically net overbilling against underbilling. Keep both visible.

---

# 20. Expense Abatement

Show:

```text
Condition:
Construction Period

Start:
01-Jun-2025

End:
30-Jun-2025

Expected Credit:
$5,000

Applied Credit:
$5,000

Variance:
$0

Status:
🟢 No Issue
```

---

# 21. Rent Escalation

Show month-by-month expected vs billed:

```text
Month       Base Rent   Expected   Billed   Variance

Jan-2025    $10,000     $10,000    $10,000   $0
Feb-2025    $10,000     $10,500    $10,500   $0
Mar-2025    $10,000     $10,500    $11,000   +$500
```

Also show:

```text
Annual Increase:
5%

Effective:
01-Feb-2025

[View Calculation]
```

---

# 22. Moving / Signage Allowance

Show:

```text
Contract Allowance:
$15,000

Amount Used:
$10,000

Remaining:
$5,000

Evidence:
Invoice attached

Status:
🟢 No Issue
```

If evidence is missing:

```text
🟡 Needs Review
```

---

# 23. Evidence Escalation

Add `[Request Evidence]` for unresolved items.

Drawer:

```text
EVIDENCE ESCALATION

Reason:
Statement does not contain enough detail.

Requested Evidence:

☑ General Ledger Detail
☑ Invoice Support

Affected Categories:

☑ Repairs
☑ Utilities

Current State:
🟡 Unresolved

Savings Treatment:
Not counted as savings until evidence
is received.

[Save Request]
```

---

# 24. Review Workflow State

Add progress:

```text
✓ Source Received
✓ Extraction Reviewed
● Validation Proposed
○ Auditor Review
○ Confirmed
```

The current stage should be highlighted.

---

# 25. Run History

Use:

```text
Run ID    Version   State        Date

VR-001    V1        Superseded   20-Sep-2026
VR-002    V2        Confirmed    21-Sep-2026
VR-003    V2        Proposed     23-Sep-2026
```

Also show:

```text
Created By
Created Date
Statement Version
Reason
```

Actions:

```text
[View]
[Compare]
```

Run states:

```text
🟡 Proposed
🟢 Confirmed
⚪ Superseded
```

Do not use only `Completed`.

---

# 26. Confirmation Screen

Show:

```text
CONFIRM VALIDATION

Allowed:
6

Excluded:
2

Cap Exceeded:
1

Needs Review:
1

Total Exposure:
$41,700

⚠ 1 item requires review
⚠ 1 evidence request outstanding

[Back to Review]
[Confirm Validation]
```

After confirmation:

```text
CONFIRMED

Auditor:
Current User

Confirmed At:
23-Sep-2026 04:30 PM

Run:
VR-003
```

Auditor and timestamp should be system-generated.

---

# 27. Statement Versioning

Show:

```text
2024 Statement #4

Version:
V2 – Detailed Statement
```

Dropdown:

```text
V1 – Original
V2 – Detailed
```

Lineage:

```text
V1 Original
↓
V2 Detailed
↓
Current Validation Run
```

Add:

```text
[Compare Versions]
```

---

# 28. Version Comparison

Example:

```text
VERSION COMPARISON

                    V1          V2

Total Amount        $50,000     $60,500
Expense Lines       8           10
Detail Level        Summary     Detailed

New Categories:
+ Roof Repair
+ Legal Fees

[Use V2 for Validation]
```

---

# 29. Validation Run Scope

Add an expandable section:

```text
VALIDATION RUN SCOPE

Rule Set:
Lease CAM Rules – 2026.1

Tolerance:
$0.01

Rounding:
2 decimals

Gross-up:
Lease-defined

[View Scope]
```

---

# 30. Future-Proofing UI Hooks

Do not implement future business logic now, but keep these fields/components available:

```text
Pool:
Operating Expenses

Reconciliation Group:
RG-2026-001

Rule Version:
CAM-2026.1

Calculation Context:
VR-003

Override Scope:
Expense Item

Override Version:
1
```

These should not require a redesign later.

---

# 31. Observation / Finding

Keep the current manual behavior:

```text
OBSERVATION / FINDING

[Create Observation]
```

Do not implement automated observation lifecycle yet.

---

# 32. Status Colors

Use consistently:

```text
🟢 Allowed
🔴 Excluded
🟠 Cap Exceeded
🟡 Needs Review
🔵 Informational
```

Do not use red for every validation conflict.

---

# 33. Final UI Navigation

```text
VALIDATION

Statement / Version
Matched Lease
Statement Period

KPI SUMMARY

[Expense Validation]
[CAM Reconciliation]
[Non-CAM Validation]
[Run History]
```

Expense Validation:

```text
Expense Statement
Validation Results
Lease Expense Matrix
Calculation Details
Review & Correct
Evidence Escalation
Reconciliation Inputs
```

CAM:

```text
Summary
Calculation Trace
Base Year Contribution
Opex + Tax Reconciliation
Inputs & Evidence
```

Non-CAM:

```text
Tenant Improvement
Security Deposit
Base Rent
Abatement
Escalation
Moving / Signage
```

Run History:

```text
Proposed
Confirmed
Superseded
Compare
```

---

# 34. Acceptance Checklist

### Core

- [ ] Statement selection
- [ ] Version selection
- [ ] Automatic lease matching
- [ ] Lease matching explanation
- [ ] Lease timeline
- [ ] Expense status
- [ ] Billed amount
- [ ] Allowed amount
- [ ] Exposure
- [ ] Lease treatment
- [ ] Exclusion reason
- [ ] Needs Review

### Cap Rules

- [ ] No
- [ ] % Increase
- [ ] Index
- [ ] Cost/Size
- [ ] Fixed Whole
- [ ] Effective-date selection
- [ ] Calculation formula

### Auditor Review

- [ ] Engine result preserved
- [ ] Auditor decision separate
- [ ] Reason required
- [ ] Before/After preview
- [ ] Save Draft
- [ ] Save & Recalculate

### CAM

- [ ] CAM summary
- [ ] Calculation trace
- [ ] Base Year contribution
- [ ] Zero floor
- [ ] Opex + Tax reconciliation
- [ ] Reconciliation inputs
- [ ] Evidence state

### Non-CAM

- [ ] Tenant Improvement Allowance
- [ ] Security Deposit
- [ ] Base Rent Schedule
- [ ] Expense Abatement
- [ ] Rent Escalation
- [ ] Moving / Signage Allowance

### Evidence

- [ ] Request Evidence
- [ ] General Ledger request
- [ ] Invoice request
- [ ] Affected categories
- [ ] Unresolved state
- [ ] Unresolved amounts not counted as savings

### Run Management

- [ ] Proposed
- [ ] Confirmed
- [ ] Superseded
- [ ] Run History
- [ ] Run Comparison
- [ ] Statement Version Lineage
- [ ] Confirmation workflow

### Future Hooks

- [ ] Pool
- [ ] Reconciliation Group
- [ ] Rule Version
- [ ] Calculation Context
- [ ] Override Scope
- [ ] Observation placeholder

---

# 35. Core UI Principle

For every validation result, the auditor must be able to understand:

```text
Statement
↓
Statement Version
↓
Matched Lease
↓
Lease Rule
↓
Increase Cap
↓
Effective Date
↓
Allowed Amount
↓
Billed Amount
↓
Calculation
↓
Status
↓
Exposure
↓
Auditor Decision
↓
Validation Run
```

The auditor should not need to inspect the database or source code to understand why a result was generated.
