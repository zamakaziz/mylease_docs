# IMPLEMENTATION PROMPT — INTEGRATE LEASE FINANCIAL TERMS WITH CONCESSIONS

## Objective

Implement the Financial Terms → Concession integration in the Lease page.

Lease page:

http://192.168.0.2:3000/batches/5/lease/15

On the left side of the page, there is a list of Entities.

Under:

Financial Terms

there are financial/concession-related fields.

The requirement is:

When the user enters/updates the Financial Terms information and clicks Save, the system must create or update the corresponding Concession record under the SAME lease in the existing Auditing → Documents page.

Existing Auditing page:

http://192.168.0.2:3000/auditing?tab=documents&id=799

The concession must be created under the particular lease associated with the Financial Terms form.

IMPORTANT:

Do NOT create a new Concession module.

Do NOT create a duplicate concession system.

Reuse the existing Concession implementation that already exists in the application.


==================================================
1. EXISTING LEASE PAGE
==================================================

Lease page:

/batches/5/lease/15

The left side contains:

Entities

Under:

Financial Terms

Implement/maintain the following fields.

--------------------------------------------------
Security Deposit
--------------------------------------------------

Security Deposit should first have a Yes/No value.

If:

Security Deposit = YES

then show/enable:

Security Deposit Description
Security Deposit Amount

The resulting concession name/type should be:

Security Deposit


--------------------------------------------------
Rent Concession
--------------------------------------------------

Fields:

Rent Concession Description
Rent Concession Value
Rent Concession Amount

The concession name/type should be:

Rent Concession


--------------------------------------------------
Allowance
--------------------------------------------------

Fields:

Allowance Description
Allowance Value
Allowance Amount

The concession name/type should be:

Allowance


--------------------------------------------------
Abatement
--------------------------------------------------

Fields:

Abatement Description
Abatement Value
Abatement Amount

The concession name/type should be:

Abatement


--------------------------------------------------
Rent Credit
--------------------------------------------------

Fields:

Rent Credit Description
Rent Credit Value
Rent Credit Amount

The concession name/type should be:

Rent Credit


--------------------------------------------------
Rent Abatement
--------------------------------------------------

Fields:

Rent Abatement Description
Rent Abatement Value
Rent Abatement Amount

The concession name/type should be:

Rent Abatement


--------------------------------------------------
Tenant Improvement Allowance
--------------------------------------------------

Fields:

Tenant Improvement Allowance Description
Tenant Improvement Allowance Value
Tenant Improvement Allowance Amount

The concession name/type should be:

Tenant Improvement Allowance


--------------------------------------------------
Operating Expense Abatement
--------------------------------------------------

Fields:

Operating Expense Abatement Description
Operating Expense Abatement Value
Operating Expense Abatement Amount

The concession name/type should be:

Operating Expense Abatement


==================================================
2. IMPORTANT — VALUE FIELD
==================================================

The "Value" field should be treated according to the existing application's current field behavior.

Before implementation, inspect how the existing Financial Terms fields represent Value.

Determine whether Value means:

- Yes / No
- Exists / Does Not Exist
- Boolean
- Text value
- Extracted value

Do NOT change the existing semantic meaning without inspecting the current implementation.

For concession creation, the key rule is:

If the concession Value indicates that the concession exists/applicable:

→ create/update the corresponding Concession.

If the concession Value indicates that it does not exist/not applicable:

→ do not create a new Concession.

If an existing concession was previously created and the user changes Value to NO:

→ determine the existing application behavior and safely deactivate/remove/update the existing concession rather than leaving stale concession data.


==================================================
3. CONCESSION MAPPING
==================================================

The Financial Terms fields must map to the existing Concession types/names.

Use the following exact mapping:

| Financial Terms | Concession Type/Name |
|---|---|
| Security Deposit | Security Deposit |
| Rent Concession | Rent Concession |
| Allowance | Allowance |
| Abatement | Abatement |
| Rent Credit | Rent Credit |
| Rent Abatement | Rent Abatement |
| Tenant Improvement Allowance | Tenant Improvement Allowance |
| Operating Expense Abatement | Operating Expense Abatement |


Do not create alternative names such as:

"Rent Concessions"
"TI Allowance"
"OpEx Abatement"

unless the existing Concession system already uses those exact values.

First inspect the existing Concession type/name implementation and reuse the existing values.


==================================================
4. SAVE WORKFLOW
==================================================

When the user clicks:

Save

on the Financial Terms form:

the system must save the Financial Terms data first.

Then synchronize the applicable Concession records.

Expected flow:

User opens:

Lease /15

        ↓

Financial Terms

        ↓

User enters:

Security Deposit = YES
Description = Security deposit required under lease
Amount = $25,000

        ↓

Click Save

        ↓

Save Financial Terms

        ↓

Identify applicable concession

        ↓

Create/Update:

Security Deposit

        ↓

Associate it with Lease ID 15

        ↓

Concession becomes visible in the existing Auditing → Documents page.


==================================================
5. EXISTING AUDITING PAGE
==================================================

Existing page:

http://192.168.0.2:3000/auditing?tab=documents&id=799

The implementation must locate the existing lease associated with:

batch/document/audit ID = 799

and the Financial Terms lease:

Lease ID = 15

Do NOT assume that:

Document ID = Lease ID.

Inspect the existing relationships.

Determine:

Audit/Document
    ↓
Batch
    ↓
Lease
    ↓
Concessions

The concession must be associated with the correct Lease record.

Do not attach the concession to the wrong lease/document/batch.


==================================================
6. CREATE CONCESSION
==================================================

When a Financial Terms field indicates that a concession exists, create the concession using the EXISTING Concession implementation.

Example:

Financial Terms:

Security Deposit:
Value = YES

Description:
"Security deposit required by original lease"

Amount:
25000


After Save:

Existing Concession system should contain:

Name/Type:
Security Deposit

Description:
Security deposit required by original lease

Amount:
25000

Lease:
Lease ID 15


The same applies to every supported concession type.


==================================================
7. DO NOT CREATE DUPLICATE CONCESSIONS
==================================================

This is extremely important.

If the user clicks Save multiple times, the system must NOT create duplicate Concession records.

Example:

First Save:

Security Deposit
$25,000

creates:

Concession ID 100


User clicks Save again.

DO NOT create:

Concession ID 101


Instead:

Update Concession ID 100.


Use a stable relationship/key such as:

Lease ID
+
Concession Type

to determine whether the corresponding concession already exists.

Before implementing, inspect how the existing Concession module identifies records.

Reuse its existing unique identifiers/relationships where possible.


==================================================
8. UPDATE EXISTING CONCESSION
==================================================

If a concession already exists for the Lease:

Update it instead of creating another record.

Example:

Existing:

Security Deposit
Description:
Old description

Amount:
20,000


User changes Financial Terms:

Description:
Updated description

Amount:
25,000


Click Save.

Expected:

Security Deposit
Description:
Updated description

Amount:
25,000


Do NOT create another Security Deposit record.


==================================================
9. VALUE = NO BEHAVIOR
==================================================

If:

Security Deposit = NO

then:

Security Deposit Description
and
Security Deposit Amount

should not create a Security Deposit concession.

If a Security Deposit concession already exists from a previous save, handle it according to the existing application's deletion/deactivation convention.

Preferred behavior:

- Remove/deactivate the concession if it is no longer applicable
- Do not leave stale data that appears to be active

Do not physically delete records if the existing Concession architecture uses soft deletion, history, or audit tracking.

Follow existing project conventions.


==================================================
10. DESCRIPTION FIELD
==================================================

Description should be saved exactly as entered by the user.

Example:

Description:

"Tenant receives rent credit for first two months."


The corresponding Concession record should contain the same description.

Do not truncate the description.

Do not replace it with the concession type.

Do not generate artificial descriptions unless the existing application requires a fallback.


==================================================
11. AMOUNT FIELD — VALIDATION
==================================================

The Amount field must be properly validated.

This is a critical requirement.

For every concession type:

Amount must be a valid monetary value.

Allowed:

100
100.00
1000.50
25000
25000.75


Not allowed:

abc
$25,000
25,00
-100
0
empty
spaces
special characters


unless the existing application's monetary field conventions explicitly allow them.


==================================================
12. AMOUNT MUST BE NUMERIC
==================================================

The amount must contain only a valid numeric monetary value.

Frontend validation:

- Input should use an appropriate numeric/decimal input.
- Prevent invalid characters where possible.
- Display a clear validation message.
- Do not rely only on frontend validation.

Backend validation is mandatory.


==================================================
13. AMOUNT MUST BE POSITIVE
==================================================

Amount must be greater than zero when the concession Value indicates that the concession exists.

Valid:

0.01
1
100
1000.50


Invalid:

0
-1
-100
-0.50


Validation message example:

"Amount must be greater than 0."


==================================================
14. DECIMAL PRECISION
==================================================

Use the existing application's monetary precision convention.

Prefer:

DECIMAL(15,2)

or the project's existing equivalent.

Do NOT use floating-point storage for financial amounts if the current architecture uses DECIMAL.

Amount examples:

100.00
1000.50
25000.00


Avoid:

1000.555

unless the existing financial system explicitly supports more than 2 decimal places.


==================================================
15. REQUIRED AMOUNT WHEN VALUE = YES
==================================================

If:

Value = YES

then:

Amount is required.

Example:

Tenant Improvement Allowance
Value: YES
Amount: EMPTY

must fail validation.

Message:

"Amount is required when Tenant Improvement Allowance is enabled."


The message should use the appropriate concession name dynamically.

Examples:

"Security Deposit amount is required."

"Rent Credit amount is required."

"Operating Expense Abatement amount is required."


==================================================
16. DESCRIPTION VALIDATION
==================================================

Inspect the existing Financial Terms validation rules.

If Description is required when Value = YES, enforce it.

If Description is optional in the existing system, do not make it mandatory without requirement.

At minimum:

- Trim whitespace
- Do not accept a description containing only spaces
- Respect existing maximum length
- Preserve the entered description


==================================================
17. CONDITIONAL VALIDATION
==================================================

Each concession should follow:

Value = NO

→ Amount is not required

→ Description is not required unless existing rules require it

→ No active concession should be created


Value = YES

→ Description follows existing required/optional rules

→ Amount is required

→ Amount must be numeric

→ Amount must be > 0

→ Save/update concession


==================================================
18. EXAMPLE — SECURITY DEPOSIT
==================================================

Input:

Security Deposit:
YES

Description:
"Security deposit required under original lease."

Amount:
25000


Click Save.

Expected:

Financial Terms saved.

Concession created/updated:

Type:
Security Deposit

Description:
Security deposit required under original lease.

Amount:
25000.00

Lease:
15


==================================================
19. EXAMPLE — RENT CREDIT
==================================================

Input:

Rent Credit:
YES

Description:
"Tenant receives two months rent credit."

Amount:
10000


Click Save.

Expected:

Rent Credit concession:

Type:
Rent Credit

Description:
Tenant receives two months rent credit.

Amount:
10000.00

Lease:
15


==================================================
20. EXAMPLE — TENANT IMPROVEMENT ALLOWANCE
==================================================

Input:

Tenant Improvement Allowance:
YES

Description:
"TI allowance provided under lease."

Amount:
75000


Expected:

Tenant Improvement Allowance concession:

Type:
Tenant Improvement Allowance

Description:
TI allowance provided under lease.

Amount:
75000.00

Lease:
15


==================================================
21. MULTIPLE CONCESSIONS
==================================================

The Lease can have multiple applicable concessions.

Example:

Security Deposit:
YES
Amount:
25000

Rent Credit:
YES
Amount:
10000

Rent Abatement:
YES
Amount:
15000

Tenant Improvement Allowance:
YES
Amount:
75000


After Save, the existing Concession listing should contain:

Security Deposit          $25,000.00
Rent Credit               $10,000.00
Rent Abatement            $15,000.00
Tenant Improvement        $75,000.00


Each record must belong to the same Lease.


==================================================
22. DO NOT COMBINE CONCESSIONS
==================================================

Do NOT create one combined record:

Concessions
Total Amount:
125000

Instead, create individual records:

Security Deposit
$25,000

Rent Credit
$10,000

Rent Abatement
$15,000

Tenant Improvement Allowance
$75,000


Each concession must remain independently identifiable.


==================================================
23. EXISTING CONCESSION LISTING
==================================================

The created/updated records must appear in the existing Concession listing under the particular Lease.

Do not create a second listing.

Do not create a separate Financial Terms concession listing.

The source of truth should be the existing Concession records.


==================================================
24. LEASE ASSOCIATION
==================================================

Every created/updated concession MUST be associated with:

Lease ID = 15

for this specific request.

However, do NOT hard-code:

lease_id = 15

in production code.

The implementation must dynamically obtain the current Lease ID from the Lease page/context.

For the current URL:

/batches/5/lease/15

the current Lease ID is:

15

But production implementation must work for:

/batches/5/lease/16

/leases/20

etc.


==================================================
25. AUDITING DOCUMENT ASSOCIATION
==================================================

The Auditing page:

/auditing?tab=documents&id=799

must display the concession under the correct Lease.

Do not hard-code:

document_id = 799

The implementation must determine the correct relationship between:

Audit Document ID
Batch
Lease
Concession


Expected conceptual relationship:

Audit Document
      ↓
Batch
      ↓
Lease
      ↓
Concession


Use the existing database relationships.


==================================================
26. SAVE TRANSACTION
==================================================

The Financial Terms save and Concession synchronization should be handled safely.

Preferred flow:

BEGIN TRANSACTION

1. Validate Financial Terms
2. Save Financial Terms
3. Synchronize applicable Concessions
4. Create/update/remove applicable concession records
5. COMMIT

If any operation fails:

ROLLBACK

This prevents a situation where:

Financial Terms are saved

but

Concession synchronization fails.


==================================================
27. PARTIAL FAILURE
==================================================

Do not allow inconsistent data.

Example:

Financial Terms save succeeds.

Security Deposit concession succeeds.

Rent Credit concession fails.

The system must not leave the application in an unclear partially saved state if the architecture supports transactional synchronization.

Use a database transaction where appropriate.


==================================================
28. FRONTEND VALIDATION
==================================================

Implement proper frontend validation.

For each applicable concession:

If Value = YES:

Amount:
Required

Amount:
Numeric

Amount:
Positive

Amount:
Valid decimal precision


Example error:

Security Deposit Amount:
"Amount must be greater than 0."


The Save button should not submit invalid data.


==================================================
29. BACKEND VALIDATION
==================================================

Frontend validation is NOT sufficient.

Backend must validate every submitted concession.

Example conceptual rules:

security_deposit_value = yes
→ security_deposit_amount required|numeric|gt:0

rent_credit_value = yes
→ rent_credit_amount required|numeric|gt:0

tenant_improvement_allowance_value = yes
→ tenant_improvement_allowance_amount required|numeric|gt:0

operating_expense_abatement_value = yes
→ operating_expense_abatement_amount required|numeric|gt:0


Use the project's existing validation framework and conventions.


==================================================
30. SECURITY / AUTHORIZATION
==================================================

Use the existing Lease permissions.

The user must not be able to create/update Concessions for a Lease they are not authorized to modify.

Do not bypass existing authorization by directly exposing a new endpoint without permission checks.


==================================================
31. AUDIT / HISTORY
==================================================

Inspect whether the existing Concession module has:

- Audit history
- Created by
- Updated by
- Created at
- Updated at
- Soft deletion
- Version history

Reuse the existing behavior.

Do not bypass the existing audit/history mechanism.


==================================================
32. API DESIGN
==================================================

Inspect the existing Financial Terms save endpoint.

Prefer extending the existing save workflow rather than creating unnecessary endpoints.

Potential flow:

POST/PUT existing Financial Terms endpoint

    ↓

Validate

    ↓

Save Financial Terms

    ↓

Synchronize Concessions


If the existing Concession module already provides a service such as:

ConcessionService

or equivalent,

reuse it.

Do not duplicate Concession creation logic inside the controller.


==================================================
33. SERVICE LAYER
==================================================

If the project uses service/repository architecture, create a dedicated synchronization method such as:

syncLeaseConcessions()

or use the existing equivalent.

Conceptual responsibility:

syncLeaseConcessions(lease, financialTermsData)

The method should:

1. Identify applicable concession types.
2. Validate applicable data.
3. Find existing concession.
4. Create if missing.
5. Update if existing.
6. Remove/deactivate if Value = NO.
7. Preserve audit/history.
8. Avoid duplicates.


==================================================
34. CONCESSION SYNC MATRIX
==================================================

Implement the following:

| Financial Term | Value | Description | Amount | Concession |
|---|---|---|---|---|
| Security Deposit | Yes/No | Description | Amount | Security Deposit |
| Rent Concession | Yes/No | Description | Amount | Rent Concession |
| Allowance | Yes/No | Description | Amount | Allowance |
| Abatement | Yes/No | Description | Amount | Abatement |
| Rent Credit | Yes/No | Description | Amount | Rent Credit |
| Rent Abatement | Yes/No | Description | Amount | Rent Abatement |
| Tenant Improvement Allowance | Yes/No | Description | Amount | Tenant Improvement Allowance |
| Operating Expense Abatement | Yes/No | Description | Amount | Operating Expense Abatement |


==================================================
35. EXISTING DATA
==================================================

Before implementing, inspect existing Financial Terms data.

There may already be records for:

- Security Deposit
- Rent Concession
- Allowance
- Abatement
- Rent Credit
- Rent Abatement
- Tenant Improvement Allowance
- Operating Expense Abatement

Do NOT overwrite existing data blindly.

Determine whether existing records are:

- Extracted values
- User-entered values
- Existing concession records
- Historical values

Then synchronize carefully.


==================================================
36. EXISTING CONCESSION RECORDS
==================================================

Before creating a new record, search for an existing concession using the current Lease.

Example conceptual query:

Concession
WHERE lease_id = currentLeaseId
AND type = currentConcessionType
AND active = true


Use the existing Concession model's actual fields.

Do not assume column names.


==================================================
37. DUPLICATE PREVENTION
==================================================

The following scenario must be tested:

Save #1:

Rent Credit
$10,000


Save #2:

Rent Credit
$10,000


Expected:

ONE Rent Credit record.

Not:

Two Rent Credit records.


Similarly:

Save #1:
$10,000

Save #2:
$15,000

Expected:

ONE Rent Credit record with:

$15,000


==================================================
38. AMOUNT CHANGE
==================================================

Test:

Existing:

Tenant Improvement Allowance
$75,000


User changes:

$80,000


Click Save.

Expected:

Existing concession is updated to:

$80,000

No duplicate record is created.


==================================================
39. VALUE CHANGE FROM YES TO NO
==================================================

Test:

Existing:

Rent Credit
Value = YES
Amount = $10,000


User changes:

Rent Credit
Value = NO


Click Save.

Expected:

Rent Credit should no longer be treated as an active concession.

Follow existing soft-delete/deactivation convention.

Do not leave it appearing as an active concession.


==================================================
40. INVALID AMOUNT TESTS
==================================================

The following must fail:

Empty:

""


Zero:

0


Negative:

-100


Text:

abc


Invalid numeric:

10abc


Invalid currency formatting:

$10,000


Whitespace:

"   "


If the frontend accepts formatted currency input, normalize it before backend validation/storage according to the application's existing monetary input convention.

The stored database value must be a proper numeric decimal.


==================================================
41. VALID AMOUNT TESTS
==================================================

The following should succeed:

1

10

100

1000

1000.50

25000.00

75000.25


The system should normalize the stored value according to the existing monetary precision.


==================================================
42. AMOUNT MAXIMUM
==================================================

Inspect existing financial amount validation in the application.

Use the project's existing maximum monetary value if one exists.

If no maximum exists, do not arbitrarily introduce an extremely restrictive limit.

However, protect against:

- Overflow
- Invalid decimal values
- Database precision errors

Use the database's DECIMAL precision consistently.


==================================================
43. UI ERROR HANDLING
==================================================

Validation errors should be shown next to the relevant field.

Example:

Tenant Improvement Allowance Amount
[________________]

Error:

"Tenant Improvement Allowance amount must be greater than 0."


Do not show only a generic:

"Something went wrong."


The user should know exactly which field is invalid.


==================================================
44. SUCCESS MESSAGE
==================================================

After successful Save:

Show the existing application's standard success message.

Example:

"Financial Terms saved successfully."

Optionally:

"Financial Terms and Concessions updated successfully."

Use the existing notification/toast pattern.


==================================================
45. AUDITING PAGE VERIFICATION
==================================================

After Save, verify the existing Auditing page:

/auditing?tab=documents&id=799

under the relevant Lease.

Expected:

The newly created/updated concession appears in the existing Concession listing.

For example:

Security Deposit
Description:
Security deposit required under lease.

Amount:
$25,000.00


The user should not need to manually create the concession again.


==================================================
46. DO NOT HARD-CODE URL IDs
==================================================

Do NOT hard-code:

batch_id = 5
lease_id = 15
document_id = 799


These URLs are examples/current test context.

Production implementation must dynamically determine:

Current Batch
Current Lease
Current Audit/Document


based on the existing route parameters and relationships.


==================================================
47. BACKWARD COMPATIBILITY
==================================================

Existing Lease Financial Terms functionality must continue working.

Existing Concession functionality must continue working.

Existing Auditing → Documents functionality must continue working.

Existing Lease pages must continue working.

Do not break existing:

- Lease extraction
- Financial Terms
- Concession listing
- Concession editing
- Audit documents
- Lease matching
- Validation
- Non-CAM
- CAM


==================================================
48. REQUIRED PRE-IMPLEMENTATION ANALYSIS
==================================================

Before modifying code, inspect the existing codebase and report:

### Lease

1. Lease route:
2. Lease page component:
3. Financial Terms component:
4. Financial Terms save API:
5. Financial Terms database fields:

### Concessions

6. Concession model:
7. Concession table:
8. Concession type/name field:
9. Concession description field:
10. Concession amount field:
11. Lease relationship:
12. Existing create/update logic:
13. Existing duplicate prevention:

### Auditing

14. Auditing page component:
15. Documents tab component:
16. Audit/document model:
17. Audit → Lease relationship:
18. Existing Concession listing location:

### Validation

19. Existing amount validation:
20. Existing monetary precision:
21. Existing frontend validation:
22. Existing backend validation:

### Authorization

23. Lease update permission:
24. Concession create/update permission:

Then provide the proposed implementation files before changing them.


==================================================
49. IMPLEMENTATION ORDER
==================================================

Follow this implementation order:

STEP 1
Inspect Lease → Financial Terms.

STEP 2
Inspect the existing Financial Terms save workflow.

STEP 3
Inspect existing Concession model/table.

STEP 4
Inspect existing Concession create/update workflow.

STEP 5
Inspect Auditing → Documents → Lease → Concession relationship.

STEP 6
Identify exact concession type/name values.

STEP 7
Implement/confirm amount validation.

STEP 8
Implement conditional validation based on Value.

STEP 9
Implement Financial Terms → Concession synchronization.

STEP 10
Implement create behavior.

STEP 11
Implement update behavior.

STEP 12
Implement Value = NO behavior.

STEP 13
Prevent duplicate concessions.

STEP 14
Preserve audit/history.

STEP 15
Verify Lease association.

STEP 16
Verify Auditing Documents association.

STEP 17
Add frontend validation.

STEP 18
Add backend validation.

STEP 19
Add automated tests.

STEP 20
Test the complete Save → Concession Listing flow.


==================================================
50. ACCEPTANCE CRITERIA
==================================================

The implementation is complete only when:

[ ] Financial Terms form is available under the existing Lease page.

[ ] Security Deposit has conditional Description and Amount fields.

[ ] Rent Concession has Description, Value and Amount.

[ ] Allowance has Description, Value and Amount.

[ ] Abatement has Description, Value and Amount.

[ ] Rent Credit has Description, Value and Amount.

[ ] Rent Abatement has Description, Value and Amount.

[ ] Tenant Improvement Allowance has Description, Value and Amount.

[ ] Operating Expense Abatement has Description, Value and Amount.

[ ] Value controls whether the concession is applicable.

[ ] Value = YES requires a valid Amount.

[ ] Amount must be numeric.

[ ] Amount must be greater than zero.

[ ] Invalid amounts cannot be saved.

[ ] Backend validates Amount independently.

[ ] Monetary precision follows the existing application.

[ ] Description is persisted correctly.

[ ] Clicking Save synchronizes applicable Concessions.

[ ] Existing Concession records are updated instead of duplicated.

[ ] Repeated Save does not create duplicate concessions.

[ ] Value = NO does not create an active concession.

[ ] Existing concession is deactivated/removed according to existing project conventions when Value changes from YES to NO.

[ ] Each concession is associated with the correct Lease.

[ ] Current Lease ID is determined dynamically.

[ ] Batch ID is not hard-coded.

[ ] Audit/Document ID is not hard-coded.

[ ] Created concessions appear under the correct Lease in Auditing → Documents.

[ ] Existing Concession listing is reused.

[ ] Existing Concession architecture is reused.

[ ] Existing source/audit/history behavior is preserved.

[ ] Save uses a transaction where appropriate.

[ ] Existing Financial Terms functionality continues to work.

[ ] Existing Concession functionality continues to work.

[ ] Existing Auditing functionality continues to work.

[ ] Existing CAM/Non-CAM functionality is not affected.

[ ] Automated tests pass.


==================================================
51. FINAL IMPORTANT INSTRUCTION
==================================================

Before implementing anything:

DO NOT ASSUME THE DATABASE STRUCTURE.

DO NOT ASSUME THE CONCESSION TYPE FIELD NAME.

DO NOT ASSUME THE AUDIT/DOCUMENT/LEASE RELATIONSHIP.

DO NOT ASSUME THE VALUE FIELD TYPE.

DO NOT ASSUME THE AMOUNT FIELD TYPE.

DO NOT ASSUME HOW EXISTING CONCESSIONS ARE CREATED.

Inspect the existing codebase first.

The primary goal is:

Financial Terms
      ↓
Save
      ↓
Validate
      ↓
Synchronize Concessions
      ↓
Existing Concession Record
      ↓
Correct Lease
      ↓
Existing Auditing → Documents → Lease
      ↓
Concession Listing


Use the existing architecture instead of creating duplicate functionality.

Most importantly, the implementation must guarantee:

1. Correct Lease association
2. Correct Concession type/name
3. No duplicate Concessions
4. Correct create/update behavior
5. Correct Value = NO behavior
6. Proper Amount validation
7. Proper monetary precision
8. Backend validation
9. Transaction-safe saving
10. Correct display in the existing Auditing → Documents Concession listing.