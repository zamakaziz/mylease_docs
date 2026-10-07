# IMPLEMENTATION PROMPT — INTEGRATE LEASE CONCESSIONS WITH EXISTING NON-CAM VALIDATION

## Objective

The Lease → Concessions tab has already been implemented.

The next task is to integrate the newly created Concession records with the existing **Non-CAM Validation** module.

IMPORTANT:

The Non-CAM Validation UI and its existing Obligation / Payment data structure are ALREADY implemented.

Do NOT create a new Non-CAM validation UI.

Do NOT create a second obligation/payment system.

Do NOT duplicate concession data inside Validation.

Instead, use the existing Lease → Concessions records as the contractual/source input for the applicable Non-CAM validation sections and connect them to the existing obligation/payment and validation calculation flow.

The final architecture should be:

Lease
  ↓
Concessions
  ↓
Existing Non-CAM Validation
  ↓
Existing Obligation / Payment Data
  ↓
Existing Validation Calculation
  ↓
Existing Validation Result / Status


==================================================
1. CURRENT NON-CAM UI
==================================================

The current Non-CAM Validation UI already contains cards such as:

1. Tenant Improvement Allowance
2. Security Deposit
3. Base Rent Schedule
4. Expense Abatement
5. Rent Escalation
6. Moving / Signage Allowance

The existing UI already displays values such as:

Tenant Improvement Allowance:

Expected Payments:       $75,000.00
Confirmed Payments:      $50,000.00
Unconfirmed Balance:     $25,000.00

Security Deposit:

Required Deposit:        $25,000.00
Confirmed / Held:        $20,000.00
Unconfirmed Balance:      $5,000.00

Expense Abatement:

Condition:               Initial Construction Period
Expected Credit:          $5,000.00
Applied Credit:           $5,000.00

The existing cards also contain:

[ Audit & Manage Details ]

These existing UI components and workflows must be preserved.

The values shown in the UI must no longer rely on static/mock values when corresponding Lease Concession data exists.


==================================================
2. IMPORTANT EXISTING ARCHITECTURE
==================================================

The existing Non-CAM Validation already has:

- Obligation data
- Payment data
- Validation calculations
- Validation statuses
- Audit & Manage Details
- Existing UI cards
- Existing validation workflow

Reuse these existing structures.

Before implementing anything, inspect:

- Non-CAM frontend component
- Non-CAM backend/controller/service
- Existing obligation model/table
- Existing payment model/table
- Existing validation result model/table
- Existing validation calculation/service
- Existing Audit & Manage Details implementation
- Existing lease matching logic
- Existing statement/payment evidence logic
- Existing source/reference handling
- Existing concession model/table
- Existing Lease → Concessions implementation

Do not create duplicate tables or services if equivalent functionality already exists.


==================================================
3. SOURCE OF CONTRACTUAL DATA
==================================================

The newly implemented:

Lease → Concessions

must become the source of contractual concession information.

The Concession record may contain:

- Concession Type
- Lease
- Premises
- Amount
- Description/details
- Source/document reference
- Other fields already implemented in the Concessions module

Use the existing Concession model/schema.

Do NOT recreate these fields inside Non-CAM.

For example:

Lease → Concessions

Tenant Improvement Allowance
Amount: $75,000
Premises: Suite 101

should be available to Non-CAM Validation as the contractual obligation.

The Non-CAM validation layer should then combine this contractual amount with the existing obligation/payment/evidence data.


==================================================
4. REQUIRED CONCESSION TYPES
==================================================

The Lease Concessions module supports these types:

1. Security Deposit
2. Concessions
3. Rent Concessions
4. Allowance
5. Abatement Concessions
6. Rent Credit
7. Rent Abatement
8. Tenant Improvement Allowance
9. Operating Expense Abatement

Do NOT change these types.

Do NOT create duplicate type definitions if the Concessions module already has them.

Reuse the existing Concession type values/enums/mappings.


==================================================
5. CONCESSION → NON-CAM MAPPING
==================================================

Implement a clear mapping between Concession Types and the existing Non-CAM validation sections.

At minimum, the following mappings should be supported:

--------------------------------------------------
Tenant Improvement Allowance
--------------------------------------------------

Concession Type:

Tenant Improvement Allowance

Existing Non-CAM section:

Tenant Improvement Allowance

Use the Concession record's contractual amount as the contractual/expected obligation.

Example:

Concessions:

Tenant Improvement Allowance
Contract Amount: $75,000

Existing Non-CAM:

Expected Payments: $75,000

Then use the existing payment/evidence records to determine:

Confirmed Payments
Unconfirmed Balance

Example:

Contract Amount:      $75,000
Confirmed Payments:   $50,000
Unconfirmed Balance:  $25,000


--------------------------------------------------
Security Deposit
--------------------------------------------------

Concession Type:

Security Deposit

Existing Non-CAM section:

Security Deposit

Use the existing Concession record as the source for the required contractual deposit amount where appropriate.

Example:

Concession:

Security Deposit
Amount: $25,000

Existing Non-CAM:

Required Deposit: $25,000

Then use the existing payment/held/returned information to calculate:

Confirmed / Held
Unconfirmed Balance

Do not change the existing Security Deposit business rules.

IMPORTANT:

Security Deposit is treated differently from normal concessions in the client discussion.

Therefore, do not automatically include Security Deposit in a generic "Total Concession Value" calculation unless the existing business logic explicitly requires it.


--------------------------------------------------
Operating Expense Abatement
--------------------------------------------------

Concession Type:

Operating Expense Abatement

Existing Non-CAM section:

Expense Abatement

Use the Concession record to populate the contractual/expected abatement amount.

Example:

Concession:

Operating Expense Abatement
Expected Amount: $5,000
Condition/Period: Initial Construction Period

Existing Non-CAM:

Condition:
Initial Construction Period

Expected Credit:
$5,000

Then compare this against the existing statement/payment/credit data:

Expected Credit
vs
Applied Credit

Use the existing validation calculation.


--------------------------------------------------
Abatement Concessions
--------------------------------------------------

Concession Type:

Abatement Concessions

Determine whether the existing Non-CAM Expense Abatement validation supports this type.

If the existing validation business logic treats it as an expense abatement, map it to the existing Expense Abatement validation.

Do NOT create another Abatement Validation card if the existing Expense Abatement validation already handles the same business rule.

If the existing system distinguishes the two types, preserve that distinction.


--------------------------------------------------
Allowance
--------------------------------------------------

Concession Type:

Allowance

Determine whether the existing Non-CAM validation has an applicable allowance validation.

For example, an existing Moving / Signage Allowance validation may already represent a specific allowance obligation.

Do not automatically map every "Allowance" record to Moving / Signage Allowance.

Inspect the existing business logic and mapping first.

If there is no applicable validation rule, the Concession record should remain available in the Lease → Concessions tab without creating a false Non-CAM result.


--------------------------------------------------
Rent Concessions
--------------------------------------------------

Concession Type:

Rent Concessions

Inspect the existing Base Rent / Rent Schedule validation.

Determine whether Rent Concessions are already represented in the existing rent validation calculation.

Do NOT create a new validation card unless the existing requirements explicitly require one.

If Rent Concessions are applicable to an existing rent validation rule, integrate them through the existing calculation architecture.


--------------------------------------------------
Rent Credit
--------------------------------------------------

Concession Type:

Rent Credit

Inspect existing Base Rent / rent validation functionality.

Determine whether Rent Credit is already represented in existing rent calculations or payment evidence.

Do not create a duplicate validation workflow.

If no existing validation rule supports Rent Credit, do not invent one.


--------------------------------------------------
Rent Abatement
--------------------------------------------------

Concession Type:

Rent Abatement

Inspect existing Base Rent / Rent Schedule validation.

Determine whether Rent Abatement should affect the existing rent calculation.

Reuse existing rent calculation infrastructure if applicable.

Do not create duplicate rent validation logic.


--------------------------------------------------
Concessions
--------------------------------------------------

Concession Type:

Concessions

This is the generic concession category.

Do not automatically force this into Tenant Improvement Allowance, Expense Abatement, or another specific Non-CAM validation section.

Inspect the existing business rules and determine whether a specific validation rule exists.

If no validation rule exists, keep the record available in the Lease → Concessions tab and do not generate a misleading Non-CAM validation result.


==================================================
6. DO NOT CREATE STATIC VALUES
==================================================

The current Non-CAM screenshot contains example values such as:

$75,000
$50,000
$25,000
$20,000
$5,000

These must NOT remain hard-coded for the integrated implementation.

For the selected lease, values must come from:

Lease
→ Concessions
→ Existing Obligation/Payment data
→ Existing Validation calculation

For example:

DO NOT:

expectedPayments = 75000

confirmedPayments = 50000

unconfirmedBalance = 25000


Instead:

expectedPayments = applicableConcession.amount

confirmedPayments = existingConfirmedPayments

unconfirmedBalance =
    expectedPayments - confirmedPayments


Use the existing calculation/service if one already exists.


==================================================
7. DO NOT DUPLICATE OBLIGATION DATA
==================================================

This is extremely important.

The Concessions tab should contain the contractual concession information.

The existing Non-CAM Obligation/Payment system should continue to contain:

- Obligations
- Payments
- Evidence
- Confirmed amounts
- Unconfirmed amounts
- Auditor adjustments
- Validation state

Do NOT create:

concession_obligations

concession_payments

concession_validation_results

if equivalent existing structures already exist.

Instead, connect the existing systems through relationships/mapping.


==================================================
8. DATA FLOW
==================================================

Implement the following data flow:

Step 1:

User creates a concession in:

Lease → Concessions

Example:

Type:
Tenant Improvement Allowance

Amount:
$75,000

Premises:
Suite 101


Step 2:

User opens:

Validation → Non-CAM


Step 3:

System identifies the selected/matched Lease.


Step 4:

System retrieves applicable Concession records for that Lease.


Step 5:

System maps applicable Concession records to existing Non-CAM validation categories.


Step 6:

Existing Non-CAM obligation/payment data is loaded.


Step 7:

Existing validation calculation compares:

Contractual Obligation
        VS
Confirmed Payment / Applied Credit / Held Amount


Step 8:

Existing Non-CAM UI displays the calculated values.


Step 9:

Existing validation status is calculated using the current validation rules.


==================================================
9. EXAMPLE — TENANT IMPROVEMENT ALLOWANCE
==================================================

Lease → Concessions:

Type:
Tenant Improvement Allowance

Amount:
$75,000

Premises:
Suite 101


Existing payment records:

Payment 1:
$50,000
Status: Confirmed


Non-CAM should display:

Tenant Improvement Allowance

Expected Payments:
$75,000

Confirmed Payments:
$50,000

Unconfirmed Balance:
$25,000

Status:
Review Required


The calculation must be dynamic.

Do not hard-code these values.


==================================================
10. EXAMPLE — SECURITY DEPOSIT
==================================================

Lease → Concessions:

Type:
Security Deposit

Amount:
$25,000


Existing payment/held information:

Confirmed / Held:
$20,000


Non-CAM should display:

Required Deposit:
$25,000

Confirmed / Held:
$20,000

Unconfirmed Balance:
$5,000

Status:
Review Required


Use the existing Security Deposit calculation.

Do not create a second Security Deposit calculation.


==================================================
11. EXAMPLE — EXPENSE ABATEMENT
==================================================

Lease → Concessions:

Type:
Operating Expense Abatement

Amount:
$5,000

Condition:
Initial Construction Period


Existing statement/payment information:

Applied Credit:
$5,000


Non-CAM should display:

Expense Abatement

Condition:
Initial Construction Period

Expected Credit:
$5,000

Applied Credit:
$5,000

Status:
Applied / Allowed


Again, use the existing validation logic.


==================================================
12. EXISTING AUDIT & MANAGE DETAILS
==================================================

The current Non-CAM cards already contain:

[ Audit & Manage Details ]

Preserve this functionality.

When the user opens Audit & Manage Details for a concession-driven validation:

Show the existing detailed validation workflow.

Where appropriate, include:

- Contractual obligation
- Source concession
- Premises
- Expected amount
- Payment records
- Confirmed amount
- Unconfirmed amount
- Evidence
- Source document
- Validation calculation
- Auditor adjustments
- Final validation status

Do not create a second detail workflow.


==================================================
13. SOURCE / TRACEABILITY
==================================================

The validation result should be traceable back to the original Concession record.

Example:

Validation Result
      ↓
Tenant Improvement Allowance
      ↓
Lease Concession
      ↓
Concession ID
      ↓
Premises
      ↓
Source Document

Where the existing architecture supports it, store/reference the concession ID in the validation context/result.

Do not duplicate the entire concession record.

This allows an auditor to understand:

"Why is this $75,000 obligation being tested?"

Answer:

"It came from the Lease → Concessions → Tenant Improvement Allowance record."


==================================================
14. PREMISES MATCHING
==================================================

Concession records may be associated with a Premises.

The validation system must respect the premises relationship.

Example:

Lease:

ABC Lease

Premises:

Suite 101
Suite 102


Concession:

Tenant Improvement Allowance
Premises: Suite 101
Amount: $75,000


The validation calculation must not accidentally apply this concession to Suite 102.

Use the existing Lease → Premises relationship.

Do not duplicate premises data.


==================================================
15. LEASE MATCHING
==================================================

The current Non-CAM screen already shows:

Matched Lease:
Effective:
Why:

and indicates:

"Lease matching is automatic and read-only."

Preserve the existing lease matching behavior.

The Concession integration must operate against the already matched Lease.

Do NOT introduce a second manual lease selection mechanism.

The flow should be:

Automatic Lease Matching
        ↓
Matched Lease
        ↓
Load Concessions
        ↓
Load Existing Non-CAM Data
        ↓
Validate


==================================================
16. VALIDATION STATUS
==================================================

Do not create a new status system.

Reuse the existing Non-CAM validation statuses.

For example:

- Review Required
- Applied
- Allowed
- Variance Found
- Needs Review
- Other existing statuses

The status must be calculated using the existing validation rules.

Example:

Contractual obligation:
$75,000

Confirmed:
$75,000

Unconfirmed:
$0

Result:
No Issue / Allowed

If:

Contractual obligation:
$75,000

Confirmed:
$50,000

Unconfirmed:
$25,000

Result:
Review Required


==================================================
17. VALIDATION RESULT INTEGRATION
==================================================

The existing Validation Results panel/list must continue to work.

When a concession-driven validation produces a result, use the existing Validation Result architecture.

Do not create a separate:

"Concession Validation Results"

system.

Instead, concession validation results should appear in the existing Non-CAM Validation / Validation Results workflow using the existing categories/statuses.


==================================================
18. MULTIPLE CONCESSIONS
==================================================

A Lease can have multiple concession records.

Example:

Lease:

Concession 1:
Tenant Improvement Allowance
$75,000

Concession 2:
Operating Expense Abatement
$5,000

Concession 3:
Rent Credit
$10,000

Concession 4:
Rent Abatement
$15,000


The system must retrieve all applicable records.

However:

DO NOT blindly sum all concession records into one Non-CAM obligation.

Each concession must be evaluated according to its type and applicable validation rule.


==================================================
19. NO DOUBLE COUNTING
==================================================

Avoid double-counting when the same financial obligation appears in:

- Concessions
- Existing Lease fields
- Existing Obligation table
- Existing Payment table
- Existing Validation data

Before changing calculations, determine the existing source of truth.

For example:

If Tenant Improvement Allowance already exists in an obligation table and the new Concessions tab contains the same obligation, establish a clear relationship between them.

Do not add:

$75,000 from Concessions
+
$75,000 from Obligation

and incorrectly produce:

$150,000.


==================================================
20. EXISTING OBLIGATION TABLE
==================================================

Inspect the existing Obligation table and determine:

- How obligations are created
- How obligations are associated with Lease
- How obligation types are stored
- How amounts are stored
- How dates/periods are stored
- How premises are stored
- How source documents are stored
- How validation uses obligations

Then determine whether the Concession record should:

A. Directly serve as the obligation source

OR

B. Create/update an existing obligation record

OR

C. Be linked to an existing obligation

Use whichever architecture already exists.

Do NOT create a parallel obligation table.


==================================================
21. EXISTING PAYMENT TABLE
==================================================

Inspect the existing Payment structure.

Determine how the system currently stores:

- Payment amount
- Payment date
- Payment status
- Payment evidence
- Payment document
- Payment type
- Lease relationship
- Obligation relationship

Use the existing payment records when calculating:

Confirmed Payments
Applied Credit
Held Amount
Unconfirmed Balance

Do NOT create concession-specific payment records if existing payment infrastructure already handles them.


==================================================
22. VALIDATION CALCULATION
==================================================

Reuse existing calculation services wherever possible.

The general pattern should be:

Contractual Amount
        -
Confirmed / Applied / Held Amount
        =
Outstanding / Unconfirmed Amount


But do NOT blindly apply this formula to every concession type.

Different Non-CAM validations already have different business rules.

For example:

Tenant Improvement Allowance:

Contract Amount
-
Confirmed Payments
=
Unconfirmed Balance


Security Deposit:

Required Deposit
-
Confirmed / Held
=
Unconfirmed Balance


Expense Abatement:

Expected Credit
vs
Applied Credit
=
Variance


Use the existing rule for each validation category.


==================================================
23. WHAT SHOULD HAPPEN WHEN NO CONCESSION EXISTS
==================================================

If the Lease has no applicable concession record:

Do not display fake values.

Do not display:

$0
$0
$0

unless the existing Non-CAM business logic explicitly requires zero values.

Instead, follow the existing Non-CAM behavior for missing obligations.

For example:

- Not Applicable
- No Contractual Obligation
- No Data
- Not Found

Use the existing UI/status convention.


==================================================
24. BACKWARD COMPATIBILITY
==================================================

Existing Non-CAM functionality must continue to work for leases that were created before the new Concessions tab existed.

Existing leases may have:

- Existing obligations
- Existing payments
- Existing validation results
- Existing concession_value
- No Concession records

The integration must not break those leases.

If a concession record does not exist, the existing Non-CAM workflow should continue according to the current behavior.


==================================================
25. EXISTING CONCESSION VALUE FIELD
==================================================

There may be an existing Lease field:

Concession Value

Do not automatically replace or remove it.

Inspect how it is currently used.

Determine whether:

Concession Value

and

Lease → Concessions

represent the same data or different historical/extracted data.

Avoid double-counting.

The new Concession records should be treated as the detailed source when applicable, while preserving backward compatibility with existing data.


==================================================
26. DATABASE REQUIREMENTS
==================================================

Do NOT create a new database structure unless required.

First inspect:

- Existing concession table
- Existing obligation table
- Existing payment table
- Existing validation result table
- Existing lease tables
- Existing premises tables

Prefer relationships over duplicated data.

If a relationship is required, follow the project's existing conventions.

Potential relationship:

Validation / Obligation
        ↓
Concession ID

But only implement this if the existing architecture requires persistent traceability.

Do not blindly add this field.


==================================================
27. API / BACKEND
==================================================

Reuse the existing backend architecture.

Inspect and update the appropriate:

- Controllers
- Services
- Repositories
- Models
- Resources/Transformers
- Validation classes
- Queries
- Calculation services

The Non-CAM endpoint should retrieve the applicable Concession data for the matched Lease.

Avoid adding a separate:

GET /concession-validation

if the existing Non-CAM API can be extended cleanly.

Follow existing API conventions.


==================================================
28. FRONTEND
==================================================

Keep the existing Non-CAM UI design exactly as much as possible.

Do not redesign the cards.

Existing card:

Tenant Improvement Allowance

Expected Payments
Confirmed Payments
Unconfirmed Balance
Description
Audit & Manage Details


should remain structurally the same.

Only replace static/mock values with dynamic values from:

Concessions
+
Existing Obligation
+
Existing Payment
+
Existing Validation logic.


==================================================
29. NON-CAM CARDS THAT MUST BE REVIEWED
==================================================

Review the following existing cards against the new Concessions data:

1. Tenant Improvement Allowance
2. Security Deposit
3. Base Rent Schedule
4. Expense Abatement
5. Rent Escalation
6. Moving / Signage Allowance

Determine for each:

- Does a Concession type feed this card?
- Which Concession type?
- Does an existing obligation already exist?
- Does payment data already exist?
- Does the card already have calculation logic?
- Does the card need only data integration?
- Does the card require no changes?

Do not modify a card simply because it exists.

Only integrate where there is a valid business/data relationship.


==================================================
30. CONCESSION TYPES WITHOUT AN EXISTING NON-CAM CARD
==================================================

The following types may not have a dedicated Non-CAM card in the current UI:

- Concessions
- Rent Concessions
- Rent Credit
- Rent Abatement
- Abatement Concessions
- Allowance

Do NOT automatically create new cards for these types.

First inspect the requirements and existing validation rules.

If there is no corresponding validation rule, keep them available in Lease → Concessions without generating a misleading validation result.

If the existing system already handles them through:

- Base Rent
- Rent Escalation
- Expense Abatement
- Another existing validation category

integrate them through that existing category.


==================================================
31. TEST DATA
==================================================

Do not use the screenshot's static values as hard-coded production values.

For testing, create realistic test records through the existing data creation mechanism.

Example:

Lease:
Test Lease 001

Concession:

Type:
Tenant Improvement Allowance

Amount:
$75,000

Premises:
Suite 101


Existing Payment:

Amount:
$50,000

Status:
Confirmed


Expected Non-CAM result:

Expected Payments:
$75,000

Confirmed Payments:
$50,000

Unconfirmed Balance:
$25,000

Status:
Review Required


Then create:

Operating Expense Abatement:
$5,000

Applied Credit:
$5,000

Expected result:

Expected Credit:
$5,000

Applied Credit:
$5,000

Status:
Applied / Allowed


==================================================
32. TEST CASES
==================================================

Implement tests for at least:

### Test 1 — Tenant Improvement Allowance

Concession:
$75,000

Confirmed:
$50,000

Expected:

Unconfirmed:
$25,000

Status:
Review Required


### Test 2 — Fully Paid Tenant Improvement Allowance

Concession:
$75,000

Confirmed:
$75,000

Expected:

Unconfirmed:
$0

Status:
Allowed / No Issue


### Test 3 — Security Deposit

Required:
$25,000

Held:
$20,000

Expected:

Unconfirmed:
$5,000


### Test 4 — Expense Abatement

Expected:
$5,000

Applied:
$5,000

Expected:

Variance:
$0

Status:
Applied / Allowed


### Test 5 — Missing Concession

Lease has no applicable concession.

Expected:

No fake obligation should be created.


### Test 6 — Multiple Concessions

Lease contains:

Tenant Improvement Allowance
$75,000

Operating Expense Abatement
$5,000

Rent Credit
$10,000

Verify each is handled according to its applicable validation rule.

Do not combine them incorrectly.


### Test 7 — Multiple Premises

Lease contains:

Suite 101
Suite 102

Tenant Improvement Allowance:

Suite 101:
$75,000

Verify Suite 102 does not receive the $75,000 obligation.


### Test 8 — Existing Lease

Existing Lease without Concession records.

Verify existing Non-CAM functionality continues to work.


### Test 9 — No Double Counting

Verify an obligation represented by both:

Concession

and

Existing obligation

is not counted twice.


==================================================
33. IMPLEMENTATION SAFETY
==================================================

Do NOT:

- Create a new Non-CAM UI
- Create a new obligation table
- Create a new payment table
- Create a new validation result system
- Duplicate Concession records
- Hard-code screenshot values
- Hard-code test values into production
- Automatically create validation cards for every concession type
- Automatically sum all concession types
- Automatically include Security Deposit in generic concession totals
- Modify unrelated CAM validation
- Modify existing lease matching logic
- Modify existing payment workflows unnecessarily
- Break existing validation results
- Remove existing obligation/payment functionality


==================================================
34. REQUIRED PRE-IMPLEMENTATION ANALYSIS
==================================================

Before modifying code, inspect the existing codebase and provide:

### Lease Concessions

1. Concession model:
2. Concession table:
3. Concession type implementation:
4. Concession amount field:
5. Premises relationship:
6. Source/document relationship:

### Non-CAM

7. Non-CAM component:
8. Non-CAM API:
9. Non-CAM service:
10. Non-CAM calculation logic:
11. Existing card components:

### Obligation

12. Obligation model:
13. Obligation table:
14. Obligation type:
15. Obligation → Lease relationship:
16. Obligation → Premises relationship:

### Payment

17. Payment model:
18. Payment table:
19. Payment → Obligation relationship:
20. Payment confirmation logic:

### Validation

21. Validation result model/table:
22. Validation calculation service:
23. Validation status logic:
24. Audit & Manage Details implementation:

### Data Flow

25. Current source of Tenant Improvement Allowance:
26. Current source of Security Deposit:
27. Current source of Expense Abatement:
28. Current source of Moving/Signage Allowance:

### Integration Decision

For each Non-CAM card, provide:

| Non-CAM Card | Concession Type | Existing Obligation | Existing Payment | Integration Required |
|---|---|---|---|---|
| Tenant Improvement Allowance | Tenant Improvement Allowance | Yes/No | Yes/No | Yes/No |
| Security Deposit | Security Deposit | Yes/No | Yes/No | Yes/No |
| Base Rent Schedule | Rent-related | Yes/No | Yes/No | Yes/No |
| Expense Abatement | Operating Expense Abatement | Yes/No | Yes/No | Yes/No |
| Rent Escalation | Rent-related | Yes/No | Yes/No | Yes/No |
| Moving / Signage Allowance | Allowance | Yes/No | Yes/No | Yes/No |


==================================================
35. IMPLEMENTATION ORDER
==================================================

Follow this order exactly:

### Step 1

Inspect the already implemented Lease → Concessions feature.

### Step 2

Inspect the existing Non-CAM UI.

### Step 3

Inspect the existing Obligation model/table.

### Step 4

Inspect the existing Payment model/table.

### Step 5

Inspect the existing Non-CAM calculation logic.

### Step 6

Inspect the existing Validation Result structure.

### Step 7

Identify which Non-CAM cards already correspond to Concession types.

### Step 8

Create the Concession → Non-CAM mapping.

### Step 9

Connect Concession records to the existing contractual obligation flow.

### Step 10

Connect existing payment/evidence data.

### Step 11

Update existing Non-CAM calculations to use the real data.

### Step 12

Replace static/mock UI values with dynamic values.

### Step 13

Preserve Audit & Manage Details.

### Step 14

Preserve existing validation statuses.

### Step 15

Ensure source/premises traceability.

### Step 16

Prevent double counting.

### Step 17

Handle missing concession records.

### Step 18

Handle multiple concession records.

### Step 19

Add backend tests.

### Step 20

Add frontend/integration tests.

### Step 21

Run the complete relevant test suite.

### Step 22

Verify existing CAM and Non-CAM functionality remains unchanged.


==================================================
36. FINAL ACCEPTANCE CRITERIA
==================================================

The implementation is complete only when:

[ ] Lease → Concessions already-created records can be consumed by Non-CAM.

[ ] Existing Non-CAM UI remains unchanged.

[ ] Existing obligation table is reused.

[ ] Existing payment table is reused.

[ ] Existing validation calculation is reused.

[ ] Existing Validation Results architecture is reused.

[ ] Tenant Improvement Allowance can use the Concession record as its contractual source.

[ ] Security Deposit can use the Concession record where applicable.

[ ] Operating Expense Abatement can use the Concession record where applicable.

[ ] Applicable Allowance records can integrate with existing allowance validation where supported.

[ ] Rent-related concession types are mapped only where an existing rent validation rule supports them.

[ ] No unsupported concession type automatically creates a misleading validation card.

[ ] Existing payment confirmation is used for confirmed amounts.

[ ] Unconfirmed balances are calculated dynamically.

[ ] Expense Abatement expected/applied amounts are calculated dynamically.

[ ] Premises are respected.

[ ] Source/document traceability is preserved.

[ ] Audit & Manage Details continues to work.

[ ] Validation statuses continue to use the existing status system.

[ ] No duplicate obligation records are created.

[ ] No duplicate payment records are created.

[ ] No double counting occurs.

[ ] No screenshot/mock values remain hard-coded in the integrated production flow.

[ ] Existing leases without Concession records continue to work.

[ ] Existing Non-CAM functionality continues to work.

[ ] Existing CAM functionality is not affected.

[ ] Existing Lease functionality is not affected.

[ ] Tests pass.


==================================================
37. MOST IMPORTANT ARCHITECTURE RULE
==================================================

DO NOT build a new validation system around the Concessions tab.

The existing Non-CAM system is already responsible for:

- Obligation
- Payment
- Evidence
- Calculation
- Validation
- Status
- Audit & Manage Details
- Validation Results

The new Concessions module is the contractual/source layer.

Therefore the desired architecture is:

                LEASE
                  │
                  ▼
             CONCESSIONS
                  │
                  │
                  ▼
        EXISTING OBLIGATION
                  │
                  ▼
         EXISTING PAYMENTS
                  │
                  ▼
        EXISTING VALIDATION
                  │
                  ▼
          NON-CAM UI CARDS
                  │
                  ▼
         VALIDATION RESULTS


Use the existing architecture wherever possible.

The implementation should integrate the new Concession data into the existing Non-CAM workflow rather than creating a parallel workflow.