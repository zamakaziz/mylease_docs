# Implementation Documentation: Lease Concessions Tab (Tab #6)

**Date**: 2026-10-06  
**Module**: Lease Module (Backend & Frontend)  
**Specification**: [`docs/2026-10-06_lease_concessions_implementation_prompt`](file:///home/c864/Projects/mylease/docs/2026-10-06_lease_concessions_implementation_prompt)

---

## 1. Overview & Problem Description

Previously, lease concessions were stored either as an ad-hoc single dollar figure (`total_concessions`) or partially extracted from lease documents without dedicated database records, detailed categorization, premises-level attribution, or document source traceability. Users could not record multiple distinct concession items per lease (such as rent credits, free rent periods, tenant improvement allowances, or operating expense abatements), nor could they inspect or edit individual concession records.

The objective was to implement a comprehensive **Concessions** tab in the Lease module as **Lease Tab #6** (following Basic Info #1, General Data #2, Premises Info #3, Operation Costs Info #4, and Cost Info #5) while preserving all existing tabs, workflows, and backward compatibility.

---

## 2. Requirements & Business Rules

1. **Tab Structure**:
   - Implemented as Lease Tab #6 across both the edit drawer ([`Form.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/Form.vue)) and the view drawer ([`LeaseDetails.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/LeaseDetails.vue)).
   - Preserves existing tabs 1 through 5 without regressions.
   - Fixes tab badge numbers (1 to 6) in the drawer navigation.

2. **Required Concession Types**:
   Strictly supports the 9 required concession types defined in the specification:
   1. `Security Deposit`
   2. `Concessions`
   3. `Rent Concessions`
   4. `Allowance`
   5. `Abatement Concessions`
   6. `Rent Credit`
   7. `Rent Abatement`
   8. `Tenant Improvement Allowance`
   9. `Operating Expense Abatement`

3. **Dynamic Multi-Record Support**:
   - Leases support 0, 1, 2, or many concession records dynamically.
   - Normalized table structure with foreign keys to `leases` and optional foreign key to `lease_premises`.

4. **Total Calculation Rules**:
   - `Total Concession Value`: Sums all concession amounts **excluding** `Security Deposit`.
   - `Security Deposit`: Selectable as a concession type and tracked separately in its own total, without inflating `Total Concession Value`.
   - `total_concessions` on the `leases` table is automatically synchronized with the non-deposit total for backward compatibility with downstream reports.

5. **Document Source Traceability**:
   - Uses the existing `document_sources` polymorphic table with `type = 'concession'`.
   - Preserves section, page number, and comment metadata.

6. **Extraction Migration Service**:
   - Integrated into [`LeaseExtractedDataMigrationService`](file:///home/c864/Projects/mylease/backend/app/Services/LeaseExtractedDataMigrationService.php) to automatically map extracted fields (e.g. `security_deposit_amount`, `rent_concessions_amount`, `allowance_amount`, etc.) into structured `LeaseConcession` records upon document extraction.

---

## 3. Backend Changes

### 3.1 Migration
- Created [`2026_10_06_000001_create_lease_concessions_table.php`](file:///home/c864/Projects/mylease/backend/database/migrations/2026_10_06_000001_create_lease_concessions_table.php):
  - Table: `lease_concessions`
  - Columns:
    - `id`: unsignedBigInteger primary key
    - `lease_id`: foreign key to `leases(id)` with `onDelete('cascade')`
    - `premise_id`: foreign key to `lease_premises(id)` with `onDelete('set null')`, nullable
    - `type`: string(100)
    - `amount`: decimal(15, 2) default 0.00
    - `description`: text nullable
    - `deleted_at`: soft deletes
    - `created_at`, `updated_at`: timestamps
  - Migrated on both primary database (`myleaseauditdb`) and test database (`myleaseaudit_testing`).

### 3.2 Eloquent Models
- Created [`backend/app/Models/LeaseConcession.php`](file:///home/c864/Projects/mylease/backend/app/Models/LeaseConcession.php):
  - Constants for all 9 concession types.
  - Relationships:
    - `lease()`: `belongsTo(Lease::class, 'lease_id')`
    - `premise()`: `belongsTo(LeasePremises::class, 'premise_id')`
    - `source()`: `hasOne(DocumentSource::class, 'type_id')->where('type', 'concession')`
  - Uses `SoftDeletes`.
- Updated [`backend/app/Models/Lease.php`](file:///home/c864/Projects/mylease/backend/app/Models/Lease.php):
  - Added `leaseConcessions()` relationship: `hasMany(LeaseConcession::class, 'lease_id')`.
  - Added null-safe coalescing in `addSource()` for `annotation`, `section`, `page_no`, and `comment` to prevent PHP 8.1 undefined key notices.

### 3.3 Controller & API Endpoints
- Updated [`backend/app/Http/Controllers/API/LeaseController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/LeaseController.php):
  - Eager-loaded `leaseConcessions.source` and `leaseConcessions.premise.property` in `getLease()`.
  - Concession endpoints refactored to use dedicated Form Request classes for validation:
    - `getLeaseConcessions(GetLeaseConcessionsRequest $request, $leaseId)`: retrieves concessions for a lease and calculates `total_concession_value` (excluding security deposits) and `security_deposit_value`.
    - `createLeaseConcession(CreateLeaseConcessionRequest $request)`: creates an individual concession with strict validation of the 9 types and verification that the premise belongs to the lease.
    - `updateLeaseConcession(UpdateLeaseConcessionRequest $request, $id)`: updates concession and syncs document source.
    - `deleteLeaseConcession(DeleteLeaseConcessionRequest $request, $id)`: soft-deletes the concession and recalculates `total_concessions`.
  - Added `addConcessionDetails($concessionCart, $action, $lease_id)`: integrated into `addLease()` to synchronize concession cart contents during lease create/update transactions.
  - Guarded `addLeasePartiesDetails`, `addLeaseTermDetails`, and `addLegalTermDetails` against PHP 8.1 undefined key warnings on empty/partial payloads.
- Created dedicated Form Request classes in `App\Http\Requests\Lease`:
  - [`BaseLeaseConcessionRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Lease/BaseLeaseConcessionRequest.php): Abstract base with `authorize()` and standardized 422 JSON response.
  - [`GetLeaseConcessionsRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Lease/GetLeaseConcessionsRequest.php): Validates lease ID presence and existence in `leases` table.
  - [`CreateLeaseConcessionRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Lease/CreateLeaseConcessionRequest.php): Validates `lease_id`, 9 concession `type`s, non-negative `amount`, optional `premise_id` (ensuring premise belongs to the lease), and `source` metadata.
  - [`UpdateLeaseConcessionRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Lease/UpdateLeaseConcessionRequest.php): Validates concession ID, types, amounts, and premises association.
  - [`DeleteLeaseConcessionRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Lease/DeleteLeaseConcessionRequest.php): Validates concession ID existence.
- Updated [`backend/routes/api.php`](file:///home/c864/Projects/mylease/backend/routes/api.php):
  - `GET /api/leases/{lease_id}/concessions` -> `LeaseController@getLeaseConcessions`
  - `POST /api/lease-concessions` -> `LeaseController@createLeaseConcession`
  - `POST /api/lease-concessions/{id}` -> `LeaseController@updateLeaseConcession`
  - `DELETE /api/lease-concessions/{id}` -> `LeaseController@deleteLeaseConcession`

### 3.4 Extraction Migration Service
- Updated [`backend/app/Services/LeaseExtractedDataMigrationService.php`](file:///home/c864/Projects/mylease/backend/app/Services/LeaseExtractedDataMigrationService.php):
  - Added `createLeaseConcessions(Lease $lease, array $primaryData, BatchDocument $file)` method.
  - Maps extracted financial items (`security_deposit_amount`, `rent_concessions_amount`, `allowance_amount`, `rent_credit_amount`, `tenant_improvement_allowance_amount`, `operating_expense_abatement_amount`, etc.) to `LeaseConcession` records and attaches `DocumentSource` with page number and confidence metadata.

---

## 4. Frontend Changes

### 4.1 New Components
- Created [`frontend/components/Lease/Components/Concessions.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/Components/Concessions.vue):
  - Tab #6 in the Lease Add/Edit drawer ([`Form.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/Form.vue)).
  - Summary cards displaying **Total Concession Value** (excluding Security Deposit), **Security Deposit**, and item count.
  - Concessions table with `#`, Type badge, Premises name, Amount formatted with currency mask, Description, Source metadata, and Actions (Edit/Delete).
  - Empty state with styled card and `+ Add Concession` CTA button when no concessions exist.
  - Add / Edit Dialog using standard Element UI dialog and form components with real-time validation.
  - Delete flow using Element UI `$confirm` with immediate deletion in DB and cart synchronization.
  - Bottom navigation bar with Back (switches to Tab 5 Cost Info) and Save/Update buttons.
- Created [`frontend/components/Lease/DetailComponents/Concessions.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/DetailComponents/Concessions.vue):
  - Tab #6 in the Lease Details view drawer ([`LeaseDetails.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/LeaseDetails.vue)).
  - Read-only table and summary metrics for viewing persisted concessions.

### 4.2 Integration into Existing Drawers
- Updated [`frontend/components/Lease/Form.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/Form.vue):
  - Added `<el-tab-pane label="Concessions" name="Concessions">` with count badge `6`.
  - Registered `Concessions` component.
  - Declared `concessionCart: []` in `data()`.
  - Loaded concessions into `concessionCart` in `editLeasePopup(id)` from `response.data.lease.lease_concessions`.
  - Included `concessionCart` in the payload passed to `/api/add-lease`.
  - Updated `handleClick` to permit navigation into and out of the Concessions tab.
  - Reset `concessionCart` on form close / submit success.
- Updated [`frontend/components/Lease/LeaseDetails.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/LeaseDetails.vue):
  - Fixed tab numbering badges: Tab 3 Premises Info (was 2 -> 3), Tab 4 Operation Costs Info (was 3 -> 4), Tab 5 Cost Info (was 4 -> 5).
  - Added Tab #6 `<el-tab-pane label="Concessions" name="Concessions">` with count badge `6`.
  - Registered `DetailComponents/Concessions.vue`.
  - Loaded `concessionCart` in `editLeasePopup(id)`.

---

## 5. Verification & Test Results

### 5.1 Automated Tests
All 8 test cases in [`backend/tests/Feature/LeaseConcessionsTest.php`](file:///home/c864/Projects/mylease/backend/tests/Feature/LeaseConcessionsTest.php) pass:
```bash
docker exec myleaseaudit_app php artisan test --filter=LeaseConcessionsTest
```
**Results**:
- `✓ lease without concessions returns empty and zero totals`
- `✓ single concession can be created and retrieved`
- `✓ multiple concessions and security deposit total calculation`
- `✓ concession can be updated`
- `✓ concession can be deleted without affecting other concessions or lease`
- `✓ unsupported concession type is rejected`
- `✓ premise from another lease is rejected`
- `✓ add lease with concession cart persists concessions`

### 5.2 Frontend Compilation
Nuxt dev server hot-reload compiled successfully with 0 errors:
```text
[webpackbar] ℹ Compiling Client
[webpackbar] ✔ Client: Compiled successfully
```

---

## 6. Files Changed Table

| File | Type | Description |
|---|---|---|
| [`backend/database/migrations/2026_10_06_000001_create_lease_concessions_table.php`](file:///home/c864/Projects/mylease/backend/database/migrations/2026_10_06_000001_create_lease_concessions_table.php) | Created | Database migration for `lease_concessions` table with FKs and soft deletes |
| [`backend/app/Models/LeaseConcession.php`](file:///home/c864/Projects/mylease/backend/app/Models/LeaseConcession.php) | Created | Eloquent model for lease concessions with relationships and type constants |
| [`backend/app/Models/Lease.php`](file:///home/c864/Projects/mylease/backend/app/Models/Lease.php) | Modified | Added `leaseConcessions()` relationship and safe null handling in `addSource()` |
| [`backend/app/Http/Controllers/API/LeaseController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/LeaseController.php) | Modified | Added concession CRUD endpoints, cart synchronization, and eager loading |
| [`backend/app/Services/LeaseExtractedDataMigrationService.php`](file:///home/c864/Projects/mylease/backend/app/Services/LeaseExtractedDataMigrationService.php) | Modified | Added extraction mapping for 9 concession types to `LeaseConcession` |
| [`backend/routes/api.php`](file:///home/c864/Projects/mylease/backend/routes/api.php) | Modified | Registered RESTful API routes for lease concessions |
| [`backend/app/Http/Requests/Lease/BaseLeaseConcessionRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Lease/BaseLeaseConcessionRequest.php) | Created | Base FormRequest handling authorization and standardized 422 JSON validation responses |
| [`backend/app/Http/Requests/Lease/GetLeaseConcessionsRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Lease/GetLeaseConcessionsRequest.php) | Created | FormRequest validating lease ID parameter when listing concessions |
| [`backend/app/Http/Requests/Lease/CreateLeaseConcessionRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Lease/CreateLeaseConcessionRequest.php) | Created | FormRequest validating concession creation (types, amounts, premise ownership) |
| [`backend/app/Http/Requests/Lease/UpdateLeaseConcessionRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Lease/UpdateLeaseConcessionRequest.php) | Created | FormRequest validating concession updates |
| [`backend/app/Http/Requests/Lease/DeleteLeaseConcessionRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Lease/DeleteLeaseConcessionRequest.php) | Created | FormRequest validating concession deletion |
| [`frontend/components/Lease/Components/Concessions.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/Components/Concessions.vue) | Created | Concessions tab (Tab #6) for Lease Add/Edit drawer |
| [`frontend/components/Lease/DetailComponents/Concessions.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/DetailComponents/Concessions.vue) | Created | Concessions tab (Tab #6) for Lease Details view drawer |
| [`frontend/components/Lease/Form.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/Form.vue) | Modified | Integrated Concessions tab, wired `concessionCart` in form lifecycle; resolved General Data tab switching and lock status navigation in `handleClick` |
| [`frontend/components/Lease/LeaseDetails.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/LeaseDetails.vue) | Modified | Fixed badge numbers (1-5) and integrated Tab #6 Concessions view |
| [`frontend/components/Lease/Components/CostInfo.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/Components/CostInfo.vue) | Modified | Added `Next` button navigating to Tab #6 Concessions; removed `Update` and `Save` buttons to align with wizard flow |
| [`frontend/components/Lease/DetailComponents/CostInfo.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/DetailComponents/CostInfo.vue) | Modified | Added `Next` button navigating to Tab #6 Concessions in view drawer |
| [`frontend/components/Lease/Components/GeneralData.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/Components/GeneralData.vue) | Modified | Initialized `lockStatusGeneralData` to true for existing leases on mount; ordered event emissions in `next()` to unlock navigation |
| [`frontend/components/Lease/DetailComponents/GeneralData.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/DetailComponents/GeneralData.vue) | Modified | Set `lockStatusGeneralData` to true on mount for read-only viewing |

