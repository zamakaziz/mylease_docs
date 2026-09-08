# Lease Expense Validation – Calculation Logic & Examples

## 1. Purpose

This document explains how an Expense Statement should be validated against the applicable Lease or Lease Amendment.

The basic idea is:

> **Find the correct lease → find the lease's expense rules → find the applicable Increase Cap → calculate the allowed amount → compare each statement expense → save the validation result.**

---

# 2. Overall Validation Flow

```text
Selected Expense Statement
        |
        v
Get Statement Date
        |
        v
Find Lease / Lease Amendment active on that date
        |
        v
Get that lease's operational cost definitions
        |
        v
Check whether expense category is excluded
        |
        +---- YES ----> Excluded
        |
        NO
        |
        v
Check whether expense category is included
        |
        +---- NO -----> Excluded
        |
        YES
        |
        v
Find Increase Cap applicable on statement date
        |
        v
Calculate applicable cap
        |
        v
Compare Statement Expense with Cap
        |
        +---- <= Cap ----> Allowed
        |
        +---- > Cap -----> Cap Exceeded
```

---

# 3. Step 1 – Select the Correct Lease

A statement must be validated against the Lease document that was active when the statement occurred.

Example:

```text
Original Lease
Effective: 01-Jan-2024
Lease ID: 500

Lease Amendment
Effective: 01-Jul-2025
Lease ID: 510
```

### Statement dated 15-Feb-2024

The Amendment was not active yet.

Therefore:

```text
Statement
    ↓
Original Lease #500
```

### Statement dated 15-Aug-2025

The Amendment became effective on 01-Jul-2025.

Therefore:

```text
Statement
    ↓
Lease Amendment #510
```

## Important Rule

Do not always use the latest lease.

Use the lease/amendment whose effective date applies to the statement date.

---

# 4. Step 2 – Lease Operational Cost Definitions

Each lease has its own operational cost rules.

The table:

```text
lease_operation_cost_definitions
```

acts like a rule book for that lease.

For example:

### Original Lease – `lease_id = 500`

Allowed categories:

```text
Janitorial & Cleaning
Landscaping & Grounds Maintenance
Building Insurance
Real Estate Taxes
Trash & Waste Disposal
Security Services
Elevator Maintenance
Pest Control Services
Water & Sewer Utilities
Property Management Fee
...
```

Excluded categories:

```text
Roof Replacement & Structural Beam Repair
Building Exterior Foundation Replacement
Landlord Executive Bonus Overhead
HVAC Capital Upgrade
```

### Lease Amendment – `lease_id = 510`

Allowed categories:

```text
Property Management Fee
Real Estate Taxes
Building Property Insurance
Common Area Electricity
Janitorial & Facility Sanitation
Security Operations
Grounds & Snow Removal
Elevator Inspection & Service
```

Excluded categories:

```text
Structural Parking Deck Reconstruction
Unapproved Landlord Legal Fees
```

## Important Rule

The Original Lease and Amendment can have different expense rules.

Therefore:

```text
Find applicable lease
        ↓
Use THAT lease's operational cost definitions
```

Do not use the Original Lease's expense definitions after an applicable Amendment takes effect.

---

# 5. Step 3 – Expense Category Check

Each statement expense should first be checked against the lease's operational cost rules.

There are two important lists:

```text
oper_cost_definition_intro_includes_values
```

and

```text
oper_cost_exclusion_intro_includes_values
```

## Excluded Expense

If the expense matches an excluded category:

```text
Result = Excluded
Status = Red
Exposure = Entire expense amount
```

Example:

```text
Roof Replacement = $35,000

Roof is excluded
        ↓
Excluded
        ↓
Exposure = $35,000
```

The cap calculation is bypassed.

---

## Included Expense

If the expense matches an allowed/included category:

```text
Continue to cap calculation
```

Example:

```text
Security Services = $8,000

Security is included
        ↓
Continue
        ↓
Calculate applicable cap
```

---

## Not Found in Included List

If the business rule treats the included list as a whitelist:

```text
Expense not in included list
        ↓
Excluded
```

In simple words:

> If the lease does not explicitly allow the expense, it should not automatically be considered allowed.

---

# 6. Step 4 – Find the Applicable Increase Cap

The lease can have Increase Cap configurations stored in:

```text
lease_increase_caps
```

Possible types:

```text
No
% Increase
Index
Cost/Size
Fixed Whole
```

Each configuration can have an effective date.

Example:

```text
01-Jan-2024 → 5%
01-Jan-2025 → 7%
01-Jan-2026 → 10%
```

For a statement dated 15-May-2025, use:

```text
7%
```

because:

```text
01-Jan-2025 <= 15-May-2025
```

and it is the latest applicable configuration.

## Effective Date Rule

Conceptually:

```text
Find Increase Cap
WHERE from_date <= statement_date

Then select the latest applicable from_date.
```

Do not simply use the current/latest record without considering the statement date.

---

# 7. Increase Cap – No

If:

```text
Increase Cap = No
```

there is no increase.

Example:

```text
Base Allowance = $10,000
Increase = 0%

Allowed Cap = $10,000
```

Comparison:

```text
$9,500  <= $10,000 → Allowed
$10,000 <= $10,000 → Allowed
$10,500 >  $10,000 → Cap Exceeded
```

For $10,500:

```text
Exposure = $10,500 - $10,000
         = $500
```

---

# 8. Increase Cap – % Increase

Example:

```text
Base Allowance = $10,000
Increase Cap = % Increase
Rate = 5%
```

Calculation:

```text
Increase = $10,000 × 5%
         = $500

Allowed Cap = $10,000 + $500
            = $10,500
```

Comparison:

```text
$10,200 <= $10,500 → Allowed
$10,500 <= $10,500 → Allowed
$11,000 >  $10,500 → Cap Exceeded
```

For $11,000:

```text
Exposure = $11,000 - $10,500
         = $500
```

## Important

The exact base amount used for the percentage must follow the existing Lease Create/Edit business logic.

Do not invent a new calculation if the application already has one.

---

# 9. Increase Cap – Index

For the examples discussed, Index is represented as a 6% increase.

Example:

```text
Base Allowance = $10,000
Index = 6%
```

Calculation:

```text
$10,000 × 6% = $600

Allowed Cap = $10,600
```

However, Index may be implemented differently in the actual application if it uses an external/index factor.

Therefore:

> Reuse the existing Index calculation/business rule from the Lease configuration.

Do not assume that every real-world Index calculation is simply a percentage.

---

# 10. Different Expense Types Can Have Different Base Caps

The cap does not necessarily have to be the same for every expense.

Example:

```text
Normal Expenses:
Base = $10,000

Management Fee:
Base = $15,000

CAM:
Base = $30,000
```

With a 6% increase:

```text
Normal:
$10,000 × 1.06 = $10,600

Management:
$15,000 × 1.06 = $15,900

CAM:
$30,000 × 1.06 = $31,800
```

Therefore the validation engine must determine the applicable expense type before calculating the cap.

---

# 11. Increase Cap – Cost/Size

For `Cost/Size`, use the existing lease configuration and calculation rules.

Conceptually:

```text
Cost / Rate
    ×
Applicable Size
    =
Allowed Amount
```

The actual formula should come from the existing Lease Create/Edit implementation.

Do not create a new interpretation if the application already has Cost/Size business logic.

---

# 12. Increase Cap – Fixed Whole

`Fixed Whole` means the configured fixed amount is the allowed cap.

Example:

```text
Increase Cap = Fixed Whole
Fixed Amount = $15,000
```

Therefore:

```text
Allowed Cap = $15,000
```

Comparison:

```text
$9,500  <= $15,000 → Allowed
$15,000 <= $15,000 → Allowed
$16,000 >  $15,000 → Cap Exceeded
```

For $16,000:

```text
Exposure = $16,000 - $15,000
         = $1,000
```

---

# 13. Status Rules

There are three main statuses.

## Allowed – Green

The expense is:

1. Not excluded.
2. Included/allowed by the lease.
3. Within the calculated cap.

```text
Status = Allowed
Color = Green
Exposure = $0
```

Example:

```text
Security Services = $8,000
Allowed Cap = $10,600

$8,000 <= $10,600

→ Allowed
→ Exposure = $0
```

---

## Cap Exceeded – Orange

The expense is allowed by category, but its amount exceeds the applicable cap.

```text
Status = Cap Exceeded
Color = Orange
Exposure = Current Amount - Allowed Cap
```

Example:

```text
Security Services = $11,000
Allowed Cap = $10,600

$11,000 > $10,600

→ Cap Exceeded
→ Exposure = $400
```

---

## Excluded – Red

The expense itself is not allowed under the lease rule.

```text
Status = Excluded
Color = Red
Exposure = Entire Current Amount
```

Example:

```text
Roof Replacement = $35,000

Roof is excluded

→ Excluded
→ Exposure = $35,000
```

The cap is not used for an excluded item.

---

# 14. Important Difference Between Excluded and Cap Exceeded

This is one of the most important rules.

### Excluded

```text
Expense itself is not allowed.
```

Example:

```text
Legal Fees = $5,000
```

Even if the cap is $15,000:

```text
$5,000 < $15,000
```

it can still be:

```text
Excluded
```

because the expense category is prohibited.

Exposure:

```text
$5,000
```

### Cap Exceeded

```text
Expense category is allowed,
but the amount is too high.
```

Example:

```text
Security = $17,000
Cap = $15,000
```

Result:

```text
Cap Exceeded
Exposure = $2,000
```

---

# 15. Recommended Validation Order

The implementation should follow this order:

```text
1. Get selected statement
        ↓
2. Get statement date
        ↓
3. Find applicable lease/amendment
        ↓
4. Get that lease's operational cost definition
        ↓
5. Check excluded categories
        ↓
   If excluded → Excluded
        ↓
6. Check included categories
        ↓
   If not included → Excluded
        ↓
7. Find Increase Cap active on statement date
        ↓
8. Determine expense type/base cap
        ↓
9. Calculate allowed cap
        ↓
10. Compare statement amount
        ↓
11. Allowed OR Cap Exceeded
        ↓
12. Save validation finding
```

This order prevents an excluded item from accidentally becoming Allowed just because its amount is below the cap.

---

# 16. Statement #1 Example – Increase Cap: No

### Input

```text
Statement ID = 566
Statement Date = 15-Feb-2024

Lease:
ID = 500
Type = Original Lease

Base Allowance = $10,000

Increase Cap:
Type = No
Effective Date = 01-Jan-2024
Rate = 0%
```

Calculation:

```text
$10,000 × 1.00
= $10,000
```

Allowed Cap:

```text
$10,000
```

Example expense:

```text
Janitorial = $5,000
```

Result:

```text
$5,000 <= $10,000

→ Allowed
→ Exposure = $0
```

If the expense were:

```text
Security = $12,000
```

then:

```text
$12,000 > $10,000

→ Cap Exceeded
→ Exposure = $2,000
```

---

# 17. Statement #2 Example – % Increase + Excluded Repairs

### Input

```text
Statement Date = 15-May-2024

Lease:
Original Lease #500

Base Allowance = $10,000

Increase Cap:
Type = % Increase
Rate = 5%
Effective Date = 01-Apr-2024
```

Calculation:

```text
$10,000 × 5% = $500

Allowed Cap = $10,500
```

### Excluded Item

```text
Roof Replacement = $35,000
```

Roof is excluded.

Result:

```text
Excluded
Exposure = $35,000
```

The $10,500 cap is not used.

### Normal Item

```text
Real Estate Taxes = $10,200
```

Taxes are allowed.

```text
$10,200 <= $10,500
```

Result:

```text
Allowed
Exposure = $0
```

### If normal expense were $11,000

```text
$11,000 > $10,500

→ Cap Exceeded
→ Exposure = $500
```

---

# 18. Statement #3 Example – Index + Cap Exceeded

### Input

```text
Statement Date = 15-Aug-2024

Lease:
Original Lease #500

Increase Cap:
Type = Index
Rate = 6%
Effective Date = 01-Jul-2024
```

For this test scenario:

```text
Normal Base = $10,000
Management Base = $15,000
CAM Base = $30,000
```

After 6% increase:

```text
Normal Cap = $10,600
Management Cap = $15,900
CAM Cap = $31,800
```

### Management Fee

```text
Billed = $28,500
Cap = $15,900
```

Result:

```text
Cap Exceeded
Exposure = $28,500 - $15,900
         = $12,600
```

### CAM

```text
Billed = $42,000
Cap = $31,800
```

Result:

```text
Cap Exceeded
Exposure = $10,200
```

### Overhead

```text
Billed = $18,000
```

Overhead is excluded.

Result:

```text
Excluded
Exposure = $18,000
```

### Normal Expense

```text
Real Estate Taxes = $11,500
Cap = $10,600
```

Result:

```text
Cap Exceeded
Exposure = $900
```

---

# 19. Statement #3 Summary

```text
Total Billed = $123,600

Allowed:
$28,600

Cap Exceeded:
$23,700

Excluded:
$18,000

Total Exposure:
$23,700 + $18,000
= $41,700
```

---

# 20. Statement #5 Example – Fixed Whole + Lease Amendment

### Input

```text
Statement Date = 15-Aug-2025

Original Lease:
Effective before 2025

Lease Amendment:
ID = 510
Effective = 01-Jul-2025
```

Because:

```text
01-Jul-2025 <= 15-Aug-2025
```

use:

```text
Lease Amendment #510
```

Increase Cap:

```text
Type = Fixed Whole
Amount = $15,000
```

Therefore:

```text
Allowed Cap = $15,000
```

---

## Property Management Fee

```text
Billed = $32,000
Cap = $15,000
```

Result:

```text
Cap Exceeded
Exposure = $17,000
```

---

## Structural Parking Deck Reconstruction

```text
Billed = $50,000
```

This category is excluded under the Amendment.

Result:

```text
Excluded
Exposure = $50,000
```

Do not calculate:

```text
$50,000 - $15,000
```

because the expense is excluded entirely.

---

## Real Estate Taxes

```text
Billed = $16,000
Cap = $15,000
```

Result:

```text
Cap Exceeded
Exposure = $1,000
```

---

## Building Property Insurance

```text
Billed = $9,500
Cap = $15,000
```

Result:

```text
Allowed
Exposure = $0
```

---

## Unapproved Landlord Legal Fees

```text
Billed = $12,500
```

Although:

```text
$12,500 < $15,000
```

the category is explicitly excluded.

Therefore:

```text
Excluded
Exposure = $12,500
```

---

# 21. Statement #5 Summary

```text
Total Billed = $142,500

Allowed = $62,000

Cap Exceeded = $18,000

Excluded = $62,500

Total Exposure:
$18,000 + $62,500
= $80,500
```

---

# 22. Database Mapping

## `statements`

Important fields:

```text
id
statement_name
date_of_statement
```

The statement ID and date are the starting point for validation.

---

## `leases`

Important fields:

```text
id
lease_type
effective_from_date
base_cost
expense_stop
```

Used to determine the applicable lease and base allowance.

---

## `lease_increase_caps`

Important fields:

```text
lease_id
type
from_date
perc_increase_rate
```

Used to determine how the lease allowance changes.

The applicable record should be selected based on:

```text
from_date <= statement date
```

using the latest applicable `from_date`.

---

## `lease_operation_cost_definitions`

Important fields:

```text
lease_id
oper_cost_definition_intro_includes_values
oper_cost_exclusion_intro_includes_values
```

Used to determine whether the expense category is allowed or excluded.

---

## `statement_expenses`

Important fields:

```text
statement_id
landlord_expense_category
current_amount
```

Each expense line is validated individually.

---

## `validation_runs`

The new field:

```text
statement_id
```

identifies which statement was validated.

Example:

```text
validation_run
    audit_id = 807
    statement_id = 566
```

---

## `validation_findings`

Important fields:

```text
statement_id
matched_lease_id
matched_lease_type
status
estimated_exposure
category
```

Example:

```text
statement_id = 566
matched_lease_id = 500
matched_lease_type = Original Lease
status = Allowed
estimated_exposure = 0
```

Or:

```text
statement_id = 575
matched_lease_id = 510
matched_lease_type = Lease Amendment
status = Cap Exceeded
estimated_exposure = 17000
```

---

# 23. Final Business Rule

The validation can be summarized as:

```text
                    SELECTED STATEMENT
                           |
                           v
                    STATEMENT DATE
                           |
                           v
                  ACTIVE LEASE VERSION
                  /                 \
          Original Lease       Amendment
                  \                 /
                   v               v
                LEASE RULE BOOK
                       |
                       v
              IS EXPENSE EXCLUDED?
                  /           \
                YES            NO
                 |              |
                 v              v
             EXCLUDED      IS EXPENSE INCLUDED?
             🔴               /       \
                            NO         YES
                            |           |
                            v           v
                        EXCLUDED    FIND CAP
                        🔴              |
                                       v
                              CALCULATE ALLOWED CAP
                                       |
                              /----------------\
                              |                |
                         Amount <= Cap    Amount > Cap
                              |                |
                              v                v
                          ALLOWED        CAP EXCEEDED
                            🟢                 🟠
```

## Most Important Principle

> **Lease/Amendment determines which rules apply. Operational Cost Definitions determine whether an expense is allowed. Increase Cap determines how much is allowed. The statement expense is then compared against that calculated amount.**

---

# 24. Test Data Requirements

Factories/seeders should cover:

### Statements

- 5 test statements.

### Expense Items

- 10+ test expense items with different categories and amounts.

### Lease Versions

- Original Lease.
- Lease Amendment.
- Different effective dates.

### Increase Cap Types

- No.
- % Increase.
- Index.
- Cost/Size.
- Fixed Whole.

### Validation Results

At minimum test:

```text
Allowed
Excluded
Cap Exceeded
```

Also test:

```text
Original Lease selected
Lease Amendment selected
Historical Increase Cap selected
Excluded expense below cap
Allowed expense above cap
Allowed expense below cap
```

---

# 25. Implementation Notes

1. Reuse existing Lease Create/Edit calculation logic wherever possible.
2. Do not duplicate Index, Cost/Size, or Increase Cap business rules.
3. Use statement date when selecting lease and Increase Cap configurations.
4. Do not apply cap calculations to explicitly excluded expenses.
5. Treat `oper_cost_definition_intro_includes_values` as a whitelist if that is the existing business rule.
6. Store the exact matched lease in `validation_findings.matched_lease_id`.
7. Store whether the matched lease was Original Lease or Amendment in `matched_lease_type`.
8. Store the selected statement in `validation_runs.statement_id` and `validation_findings.statement_id`.
9. When a different statement is selected, recalculate validation using that statement's date and applicable lease/cap.
10. Keep validation calculation in a reusable service/rule layer rather than placing the complete calculation inside a controller.
