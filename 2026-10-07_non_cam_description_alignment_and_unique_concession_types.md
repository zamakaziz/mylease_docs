# Non-CAM Description Alignment, Concession Description Synchronization & Unique Concession Type Restriction

**Date**: 2026-10-07  
**Status**: Implemented & Verified  

---

## 1. Problem Description

1. **Broken Alignment & Mismatched Descriptions in Non-CAM Concession Cards**:
   On the Audit Validation page (`/auditing?tab=validation&id=801`) under the **Non-CAM** submenu:
   - For **Expense Abatement** (and other multi-line conditions), the label `Condition:` was vertically centered midway between the two wrapped lines of the condition sentence (`Tenant's obligation to pay Base Rent and Operating Expenses...`), creating an overlapping, squeezed, and broken visual layout.
   - For **Security Deposit**, the card description was showing the stale string `"security deposite"` instead of the actual contractual description from the lease concession.
   - For **Rent Abatement**, the card was showing the title `"Base Rent Schedule"` and hardcoded description `"Rent concessions applied from lease terms."` instead of displaying the actual concession title (`Rent Abatement`) and contractual description.
   - In the audit drawer for rent concessions without a schedule array, an empty table with 0 rows was rendered instead of concession terms.

2. **Doubt Clarification: Rent Abatement vs. Base Rent Schedule**:
   - **Are Rent Abatement and Base Rent Schedule the same?**
     **No.**
     - **Base Rent Schedule** is the ongoing recurring monthly/annual rental obligation scheduled over the lease term (e.g., $10,000/month). It represents the contract rent timetable.
     - **Rent Abatement** is a **concession / relief** granted by the landlord (e.g., free rent for the first 9 months).
     - Previously, the backend service grouped `Rent Abatement` under `obligation_type = 'rent'` with the hardcoded title `'Base Rent Schedule'` and hardcoded text `'Rent concessions applied from lease terms.'`. This caused confusion by labeling a Rent Abatement concession as a Base Rent Schedule.

3. **Controller Import Refactoring in LeaseController**:
   - In [`LeaseController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/LeaseController.php), `BaseLeaseConcessionRequest` was called with its fully-qualified namespace inline (`\App\Http\Requests\Lease\BaseLeaseConcessionRequest::getTypeAliases`). It is now cleanly imported with `use App\Http\Requests\Lease\BaseLeaseConcessionRequest;` at the top and referenced directly.

4. **Duplicate Concession Type Restriction**:
   - In the Lease Concessions management tab (`Concessions.vue`), the system now strictly enforces uniqueness per concession type (including aliases like `'Rent Concession'` / `'Rent Concessions'` and `'Abatement'` / `'Abatement Concessions'`).
   - Already created types are removed from the dropdown when adding new concessions.
   - When editing an existing concession, its own type remains selectable.

---

## 2. Root Cause Analysis

1. **Stale/Placeholder Reason in `NonPesObligation`**:
   - In [`NonCamConcessionService.php`](file:///home/c864/Projects/mylease/backend/app/Services/Validation/NonCamConcessionService.php), `$ob->reason = $ob->reason ?: ($primary->description ?: ...)` prevented updating existing obligations when `$ob->reason` already had an old value (e.g. `'security deposite'`).
   - For rent obligations, `$ob->reason = $ob->reason ?: 'Rent concessions applied from lease terms.'` hardcoded the string and completely ignored `$primary->description`.
   - Obligation titles were hardcoded (`'Base Rent Schedule'`) rather than using `$primary->type` (e.g. `'Rent Abatement'`).

2. **Non-CAM Card Alignment**:
   - In `auditing.vue`, `.non-cam-metric-row` had `align-items: center`. For multiline text, `Condition:` became vertically centered midway, causing visual collision.

---

## 3. Backend Changes

1. **LeaseController Import**:
   - Added `use App\Http\Requests\Lease\BaseLeaseConcessionRequest;` to [`LeaseController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/LeaseController.php).
   - Replaced inline `\App\Http\Requests\Lease\BaseLeaseConcessionRequest::getTypeAliases` with `BaseLeaseConcessionRequest::getTypeAliases`.

2. **Synchronize Real Concession Descriptions & Titles ([`NonCamConcessionService.php`](file:///home/c864/Projects/mylease/backend/app/Services/Validation/NonCamConcessionService.php))**:
   - **Security Deposit**:
     ```php
     $ob->title = $primary->type ?: 'Security Deposit';
     $ob->reason = !empty($primary->description) ? $primary->description : 'Contractual deposit sourced from Lease Concessions: Security Deposit.';
     ```
   - **Rent Abatement**:
     ```php
     $ob->title = $primary->type ?: 'Rent Abatement';
     $cond = !empty($primary->description) ? $primary->description : 'Rent concessions applied from lease terms.';
     $ob->conditions = $cond;
     $ob->reason = !empty($primary->description) ? $primary->description : 'Rent concessions applied from lease terms.';
     ```
   - **Expense Abatement**:
     ```php
     $ob->title = $primary->type ?: 'Expense Abatement';
     $cond = !empty($primary->description) ? $primary->description : 'Initial Construction Period';
     $ob->conditions = $cond;
     $ob->reason = !empty($primary->description) ? $primary->description : ('Contractual credit sourced from Lease Concessions: ' . $primary->type . '.');
     ```
   - **Tenant Improvement**:
     ```php
     $ob->title = $primary->type ?: 'Tenant Improvement Allowance';
     $ob->reason = !empty($primary->description) ? $primary->description : 'Contractual obligation sourced from Lease Concessions: Tenant Improvement Allowance.';
     ```
   - **Moving / Signage Allowance**:
     ```php
     $ob->title = $primary->type ?: 'Moving / Signage Allowance';
     $ob->reason = !empty($primary->description) ? $primary->description : 'Contractual allowance sourced from Lease Concessions: Allowance.';
     ```

3. **Concession Type Uniqueness**:
   - Added alias helper in [`BaseLeaseConcessionRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Lease/BaseLeaseConcessionRequest.php).
   - Validated unique types in [`CreateLeaseConcessionRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Lease/CreateLeaseConcessionRequest.php) (422 response).
   - Validated non-colliding types in [`UpdateLeaseConcessionRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Lease/UpdateLeaseConcessionRequest.php).

---

## 4. Frontend Changes

1. **Prioritize Real Concession Description ([`auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue))**:
   - In `fetchNonPesObligations`, resolved `reason` by checking `item.concession.description` or `item.concessions[0].description` before falling back to `item.reason`.
   - In `nonCamValidationList`:
     - Handled `Rent Abatement` titled cards dynamically: sets metric labels (`Abatement Value`, `Applied Status`) and displays the actual concession description.
     - Formatted `.non-cam-condition-row` with `align-items: flex-start; gap: 10px;` and `word-break: break-word;`.
     - Formatted `.non-cam-info` as a structured description card with an icon and accent border.
   - In Non-CAM drawer:
     - Rendered contract concession summary card when `schedule` is empty instead of an empty table.
     - Pinned Condition label to top-left with `align-items: flex-start`.

2. **Concession Creation Modal ([`Concessions.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/Components/Concessions.vue))**:
   - Filtered `concessionTypes` via `availableConcessionTypes` computed property.
   - Retained edited item's type when in `'edit'` mode.
   - Disabled "Add Concession" button when all types are used and guarded `openAddDialog()`.
   - Added client-side duplicate check in `saveConcession()`.

---

## 5. Test Results & Verification Commands

### Backend PHPUnit Tests
```bash
docker exec -e XDG_CONFIG_HOME=/tmp myleaseaudit_app php vendor/bin/phpunit tests/Feature/NonCamConcessionIntegrationTest.php
```
**Output**: `OK (9 tests, 45 assertions)`

```bash
docker exec -e XDG_CONFIG_HOME=/tmp myleaseaudit_app php vendor/bin/phpunit tests/Feature/LeaseConcessionsTest.php
```
**Output**: `OK (17 tests, 47 assertions)`

```bash
docker exec -e XDG_CONFIG_HOME=/tmp myleaseaudit_app php vendor/bin/phpunit tests/Feature/BatchLeaseConcessionSyncTest.php
```
**Output**: `OK (16 tests, 53 assertions)`

### Live Audit 801 Sync Verification
Executed `syncObligationsFromLease` for Audit 801:
- `Obligation ID: 1` -> Title: `Security Deposit`, Reason: `If any portion of the Security Deposit is so used or applied...`
- `Obligation ID: 2` -> Title: `Rent Abatement`, Reason: `Tenant's obligation to pay Base Rent and Operating Expenses...`
- `Obligation ID: 4` -> Title: `Operating Expense Abatement`, Reason: `Tenant's obligation to pay Base Rent and Operating Expenses...`

### Frontend Build
Nuxt compiler verified:
```text
✔ Client: Compiled successfully in 5.12s
```

---

## 6. Files Changed

| File | Description |
| --- | --- |
| [`backend/app/Http/Controllers/API/LeaseController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/LeaseController.php) | Added `use BaseLeaseConcessionRequest;` import and cleaned up call |
| [`backend/app/Services/Validation/NonCamConcessionService.php`](file:///home/c864/Projects/mylease/backend/app/Services/Validation/NonCamConcessionService.php) | Synchronized actual concession titles & descriptions instead of stale fallback text |
| [`backend/app/Http/Requests/Lease/BaseLeaseConcessionRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Lease/BaseLeaseConcessionRequest.php) | Added alias mapping helper |
| [`backend/app/Http/Requests/Lease/CreateLeaseConcessionRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Lease/CreateLeaseConcessionRequest.php) | Duplicate concession type validation rejecting existing types |
| [`backend/app/Http/Requests/Lease/UpdateLeaseConcessionRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Lease/UpdateLeaseConcessionRequest.php) | Collision validation for updates |
| [`backend/tests/Feature/LeaseConcessionsTest.php`](file:///home/c864/Projects/mylease/backend/tests/Feature/LeaseConcessionsTest.php) | 4 automated feature test cases for uniqueness & aliases |
| [`frontend/components/Lease/Components/Concessions.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/Components/Concessions.vue) | Filtered type dropdown and guarded against duplicate concessions |
| [`frontend/pages/auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue) | Prioritized real concession description, formatted Rent Abatement card, fixed alignment |
