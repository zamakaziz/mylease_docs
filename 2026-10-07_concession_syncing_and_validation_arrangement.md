# Concession Syncing and Validation Arrangement Implementation

## 1. Problem Description & Overview
Under the Lease extraction review form ([`/batches/5/lease/15`](http://192.168.0.2:3000/batches/5/lease/15)), the user required arranging concession validation and syncing into the designated business rules:
- **`Security Deposit`**: If `Yes`, require valid numeric amount > 0 (**validate-only**; does not create a `lease_concessions` record).
- **`Concessions`**: If `Yes`, require valid numeric amount > 0 (**validate-only**; does not create a `lease_concessions` record).
- **`Rent Concession`**: If `Yes`, validate amount > 0 and save/sync to `lease_concessions` table.
- **`Allowance`**: If `Yes`, validate amount > 0 and save/sync to `lease_concessions` table.
- **`Abatement`**: If `Yes`, validate amount > 0 and save/sync to `lease_concessions` table.
- **`Rent Credit`**: If `Yes`, validate amount > 0 and save/sync to `lease_concessions` table.
- **`Rent Abatement`**: If `Yes`, validate amount > 0 and save/sync to `lease_concessions` table.
- **`Tenant Improvement Allowance`**: If `Yes`, validate amount > 0 and save/sync to `lease_concessions` table.
- **`Operating Expense Abatement`**: If `Yes`, validate amount > 0 and save/sync to `lease_concessions` table.
- If any type's value is not `Yes` (or changed to `No`): Amount is not required; Description and Amount remain disabled; and for synced concession types, any existing linked concession is deactivated / soft-deleted.

---

## 2. Root Cause Analysis
- Previously, `Security Deposit` was treated both in validation and in concession creation. However, business requirements dictate that `Security Deposit` is tracked separately from concession allowances and must not create rows in the `lease_concessions` table (nor should the generic header `Concessions`).
- The definitions and list order across frontend (`concessionTypesList`) and backend (`SyncLeaseConcessionsRequest`, `LeaseExtractedDataReviewService`, `LeaseExtractedDataMigrationService`) needed to be arranged consistently in the exact sequence requested:
  1. Security Deposit
  2. Concessions
  3. Rent Concession
  4. Allowance
  5. Abatement
  6. Rent Credit
  7. Rent Abatement
  8. Tenant Improvement Allowance
  9. Operating Expense Abatement

---

## 3. Backend Changes

### 1. `backend/app/Http/Requests/Batch/SyncLeaseConcessionsRequest.php`
- Reordered `$definitions` so that `Concessions` follows immediately after `Security Deposit`.
- All 9 items enforce cross-field semantic validation when their value is `Yes` (or `'yes'`, `'y'`, `'true'`, `'1'`), requiring amount to be numeric and > 0.

### 2. `backend/app/Services/LeaseExtractedDataReviewService.php`
- Reordered `$definitions` in `syncLeaseConcessions()` with an explicit `'sync'` flag:
  - `Security Deposit`: `'sync' => false` (validate-only)
  - `Concessions`: `'sync' => false` (validate-only)
  - `Rent Concession`: `'sync' => true` (validate and save)
  - `Allowance`: `'sync' => true` (validate and save)
  - `Abatement`: `'sync' => true` (validate and save)
  - `Rent Credit`: `'sync' => true` (validate and save)
  - `Rent Abatement`: `'sync' => true` (validate and save)
  - `Tenant Improvement Allowance`: `'sync' => true` (validate and save)
  - `Operating Expense Abatement`: `'sync' => true` (validate and save)
- When `'sync' => false`, validation runs when `isYes`, but skips inserting/updating rows into `lease_concessions`.
- When `'sync' => true` and value is `No`, soft-deletes the active concession for that lease.

### 3. `backend/app/Services/LeaseExtractedDataMigrationService.php`
- Excluded `TYPE_SECURITY_DEPOSIT` and `TYPE_CONCESSIONS` from `createLeaseConcessions` during review completion migration, ensuring only legitimate concession types sync to `lease_concessions`.

### 4. `backend/tests/Feature/BatchLeaseConcessionSyncTest.php`
- Updated test suites to verify:
  - `Security Deposit` validates when `Yes` (fails if empty/zero) but does not create a row in `lease_concessions`.
  - `Concessions` validates when `Yes` (fails if empty/zero) but does not create a row in `lease_concessions`.
  - All concession types (`Rent Concession`, `Allowance`, `Abatement`, `Rent Credit`, `Rent Abatement`, `Tenant Improvement Allowance`, `Operating Expense Abatement`) validate and sync properly to `lease_concessions`.
  - Soft-deleting on `No` and restoring on `Yes` works seamlessly.

---

## 4. Frontend Changes

### `frontend/pages/batches/_batchId/lease/_id.vue`
- Updated `concessionTypesList` array order in `data()`:
  1. `'Security Deposit'`
  2. `'Concessions'`
  3. `'Rent Concession'`
  4. `'Allowance'`
  5. `'Abatement'`
  6. `'Rent Credit'`
  7. `'Rent Abatement'`
  8. `'Tenant Improvement Allowance'`
  9. `'Operating Expense Abatement'`
- `validateFinancialTerms()` iterates in this exact sequence, highlighting errors on amount fields when value is `Yes` and amount <= 0.
- `isConcessionDisabled` and `onConcessionValueChange` properly disable and clear errors when value is not `Yes`.

---

## 5. Test Results & Commands

### Backend PHPUnit Tests
Ran via Docker app container:
```bash
docker exec -e XDG_CONFIG_HOME=/tmp myleaseaudit_app php vendor/bin/phpunit tests/Feature/BatchLeaseConcessionSyncTest.php
# Result: OK (18 tests, 59 assertions)

docker exec -e XDG_CONFIG_HOME=/tmp myleaseaudit_app php vendor/bin/phpunit tests/Feature/LeaseConcessionsTest.php
# Result: OK (17 tests, 47 assertions)

docker exec -e XDG_CONFIG_HOME=/tmp myleaseaudit_app php vendor/bin/phpunit tests/Feature/NonCamConcessionIntegrationTest.php
# Result: OK (9 tests, 45 assertions)
```

### Frontend Build Verification
Nuxt HMR output:
```
✔ Client: Compiled successfully in 1.18s
```

---

## 6. Files Changed Table

| File | Description |
|---|---|
| [`backend/app/Http/Requests/Batch/SyncLeaseConcessionsRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Batch/SyncLeaseConcessionsRequest.php) | Reordered definition list to arrange Concessions after Security Deposit for cross-field validation. |
| [`backend/app/Services/LeaseExtractedDataReviewService.php`](file:///home/c864/Projects/mylease/backend/app/Services/LeaseExtractedDataReviewService.php) | Configured validate-only flag for Security Deposit & Concessions, and validate+sync for 7 concession types. |
| [`backend/app/Services/LeaseExtractedDataMigrationService.php`](file:///home/c864/Projects/mylease/backend/app/Services/LeaseExtractedDataMigrationService.php) | Excluded Security Deposit and Concessions from creating lease_concessions records on completion migration. |
| [`backend/tests/Feature/BatchLeaseConcessionSyncTest.php`](file:///home/c864/Projects/mylease/backend/tests/Feature/BatchLeaseConcessionSyncTest.php) | Added 18 comprehensive tests covering validate-only terms and validate+save concession syncing. |
| [`frontend/pages/batches/_batchId/lease/_id.vue`](file:///home/c864/Projects/mylease/frontend/pages/batches/_batchId/lease/_id.vue) | Arranged `concessionTypesList` order matching the exact requested layout. |
