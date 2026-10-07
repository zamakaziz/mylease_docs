# Implementation Documentation: Integrate Lease Financial Terms with Concessions

**Date:** 2026-10-07  
**Task:** Integrate Financial Terms in Lease Review (`/batches/5/lease/15`) with Concessions System (`/auditing?tab=documents&id=799`)  
**Specification Reference:** [`docs/2026-10-07_btach_pdf_concession_data_save.md`](file:///home/c864/Projects/mylease/docs/2026-10-07_btach_pdf_concession_data_save.md)

---

## 1. Problem Description & Requirements

Auditors review extracted lease terms on the batch review interface ([`/batches/5/lease/15`](file:///home/c864/Projects/mylease/frontend/pages/batches/_batchId/lease/_id.vue)). Under **Financial Terms**, various concessions exist (e.g., Security Deposit, Rent Concession, Allowance, Abatement, Rent Credit, Rent Abatement, Tenant Improvement Allowance, Operating Expense Abatement).

Previously:
- Saving changes on the lease review page saved review amendments to `lease_extracted_data_amendments`, but did not synchronize or update `LeaseConcession` records under the corresponding `Lease` in real time.
- Concessions were only partially created when the entire review was approved and migrated, meaning intermediate saves left the Auditing → Documents → Lease Concessions tab out of sync.
- There was no client-side or backend validation requiring a positive numeric amount when a concession Value was marked as `YES`.
- Switching a concession Value to `NO` did not deactivate or soft-delete existing concessions, leaving stale data.
- The UI allowed freeform text in the concession Value field without conditional enabling of Description and Amount.

---

## 2. Root Cause Analysis

1. **Decoupled Review and Concession Layers**: `BatchFileReviewController::saveReview` only called `LeaseExtractedDataReviewService::saveReview`, which saved auditor amendments into `lease_extracted_data_amendments` and recorded activity logs, but never touched `LeaseConcession` models.
2. **Missing Lease Dynamic Resolution**: In `/batches/5/lease/15`, `15` is the `BatchDocument` ID (`batch_documents.id`), while the corresponding lease is `Lease #497` (linked via `location_id = 494` and `tracking_id = 'ABCTech.004.L.I.494'`). The system lacked a robust multi-strategy dynamic resolver to locate the proper `Lease` model from a `BatchDocument` without hardcoding IDs.
3. **Missing Concession Validation**: `saveReview` lacked field-level semantic validation ensuring that if a concession is enabled (`Value = YES`), its Amount is non-empty, numeric, and strictly positive (`> 0`).
4. **No Soft-Deletion Sync on Disabling**: When an auditor toggled a concession Value from `YES` to `NO`, the existing concession record in `lease_concessions` remained active.
5. **No Recalculation of `total_concessions`**: The summary card and `leases.total_concessions` attribute were not updated after field reviews.

---

## 3. Backend Implementation Changes

### 3.1 Model Support (`LeaseConcession.php`)
- Added singular aliases `TYPE_RENT_CONCESSION = 'Rent Concession'` and `TYPE_ABATEMENT = 'Abatement'` to [`App\Models\LeaseConcession`](file:///home/c864/Projects/mylease/backend/app/Models/LeaseConcession.php).
- Updated `TYPES` array to accept both singular and plural forms, ensuring backward compatibility with existing databases and requests.

### 3.2 Dynamic Lease Resolution & Concession Sync (`LeaseExtractedDataReviewService.php`)
- **`resolveLeaseForBatchDocument(BatchDocument $file): ?Lease`**:
  Dynamically resolves the target Lease without hardcoding IDs using a 5-tier fallback:
  1. Direct `batch_document_id` foreign key on `Lease`.
  2. Via `AuditDocument::where('batch_document_id', $file->id)->whereNotNull('lease_id')->first()->lease`.
  3. Via `location_id` (`AuditDocument` or `Lease::where('location_id', $file->location_id)->latest('id')->first()`).
  4. Via `tracking_id` (`Lease::where('tracking_id', $file->tracking_id)->latest('id')->first()`).
  5. Direct match fallback: `Lease::find($file->id)`.
- **`syncLeaseConcessions(BatchDocument $file, array $submittedFields, int $userId): array`**:
  Executed within the DB transaction of `saveReview()` for lease documents:
  - Defines configuration matrix for all 9 concession types:
    - `Security Deposit`
    - `Rent Concession` (matching `'Rent Concession'` and `'Rent Concessions'`)
    - `Allowance`
    - `Abatement` (matching `'Abatement'` and `'Abatement Concessions'`)
    - `Rent Credit`
    - `Rent Abatement`
    - `Tenant Improvement Allowance`
    - `Operating Expense Abatement`
    - `Concessions`
  - Detects whether any of the concession's 3 fields (`Value`, `Description`, `Amount`) were touched in the save request.
  - Resolves effective values taking into account active amendments.
  - When `Value = YES`:
    - Validates that `Amount` is non-empty, numeric, and `> 0`. Throws `ValidationException` with clear field-level messages (`"{Type} amount is required and must be greater than 0."`).
    - Strips currency symbols (`$`, `,`) and normalizes to standard `DECIMAL(15,2)`.
    - Queries `LeaseConcession::withTrashed()->where('lease_id', $lease->id)->whereIn('type', $matchTypes)->first()`.
    - If found and soft-deleted, restores and updates; if found and active, updates; if missing, creates new record.
    - Preserves/updates `DocumentSource` with bounding box annotations and page numbers for audit traceability.
  - When `Value = NO`:
    - Soft-deletes existing active concession record for that type under the lease, preventing stale data.
  - Recalculates `$lease->total_concessions` (sum of active concessions excluding Security Deposit) and persists to `leases` table.

### 3.3 Controller Handling (`BatchFileReviewController.php`)
- In `saveReview()`, catches `ValidationException` before general exceptions and returns HTTP 422 with the exact validation errors and message.

### 3.4 Relationship Optimization (`BatchDocument.php`)
- Updated `extractedData()` relation to eager-load `amendments` by default (`hasMany(LeaseExtractedData::class, 'batch_document_id')->with('amendments')`).

---

## 4. Frontend Implementation Changes

### 4.1 Lease Review Page ([`frontend/pages/batches/_batchId/lease/_id.vue`](file:///home/c864/Projects/mylease/frontend/pages/batches/_batchId/lease/_id.vue))
- **Value Field Selection**:
  Rendered as `<el-select>` with options `"Yes"` and `"No"` for all concession types under Financial Terms, allowing quick toggling.
- **Conditional Enabling**:
  `isConcessionDisabled(entity, section)` ensures that Description and Amount fields for each concession type are enabled only when the concession Value is `"Yes"`. When `"No"` or unselected, fields are visually disabled (`background: #f4f5f8`, `cursor: not-allowed`) with informative placeholder (`Disabled (Requires Yes above)`).
- **Client-Side Validation**:
  `validateFinancialTerms()` inspects all concession types with `Value = YES`. If Amount is empty, zero, negative, or non-numeric:
  - Highlights input with `.is-invalid-field` (red border and tint).
  - Displays specific inline error message (`"${type} amount must be greater than 0."`) directly below the input.
  - Displays toast flash message and blocks save execution in both `saveChanges()` and `executeSave()`.
- **Dynamic Error Clearing**:
  Typing in the Amount field or switching Value to `"No"` instantly clears the validation error.
- **Concession Modal Options ([`frontend/components/Lease/Components/Concessions.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/Components/Concessions.vue))**:
  Added `'Rent Concession'` and `'Abatement'` to `concessionTypes` options.

---

## 5. Test Results & Commands

A dedicated test suite [`BatchLeaseConcessionSyncTest.php`](file:///home/c864/Projects/mylease/backend/tests/Feature/BatchLeaseConcessionSyncTest.php) was created and executed inside the Docker container:

```bash
docker exec -e XDG_CONFIG_HOME=/tmp myleaseaudit_app php vendor/bin/phpunit tests/Feature/BatchLeaseConcessionSyncTest.php
```

### Test Output:
```text
PHPUnit 9.6.34 by Sebastian Bergmann and contributors.

.........                                                           9 / 9 (100%)

Time: 00:00.657, Memory: 36.00 MB

OK (9 tests, 40 assertions)
```

### Tests Covered:
1. `test_saving_financial_terms_with_value_yes_creates_concession_under_correct_lease`: Verifies `LeaseConcession` creation under correct Lease ID.
2. `test_multiple_saves_update_existing_concession_without_duplicates`: Verifies idempotency and duplicate prevention.
3. `test_setting_value_to_no_soft_deletes_concession`: Verifies soft-deletion of existing concessions when toggled to NO.
4. `test_value_yes_requires_valid_positive_numeric_amount`: Verifies 422 validation failure on empty, 0, negative, and text amounts.
5. `test_currency_formatted_amount_is_normalized_and_saved`: Verifies `$75,000.50` normalizes to `75000.50`.
6. `test_total_concessions_recalculated_on_lease_excluding_security_deposit`: Verifies Security Deposit is excluded from `total_concessions`.
7. `test_all_concession_types_sync_correctly`: Verifies all 8 concession types sync accurately.
8. `test_value_no_to_yes_restores_soft_deleted_concession`: Verifies restoration of soft-deleted records when re-enabled.
9. `test_untouched_non_concession_fields_do_not_trigger_concession_validation`: Verifies unedited fields do not trigger false validation errors.

### Existing Regression Suites:
```bash
docker exec -e XDG_CONFIG_HOME=/tmp myleaseaudit_app php vendor/bin/phpunit tests/Feature/LeaseConcessionsTest.php tests/Feature/NonCamConcessionIntegrationTest.php tests/Feature/BatchFileReviewTest.php
```
**Result**: `OK (13 tests, 40 assertions)` - 100% passed with zero regressions.

---

## 6. Files Changed Table

| File | Type | Description |
|---|---|---|
| [`backend/app/Models/LeaseConcession.php`](file:///home/c864/Projects/mylease/backend/app/Models/LeaseConcession.php) | Backend Model | Added `TYPE_RENT_CONCESSION` and `TYPE_ABATEMENT` constants and added to `TYPES`. |
| [`backend/app/Models/BatchDocument.php`](file:///home/c864/Projects/mylease/backend/app/Models/BatchDocument.php) | Backend Model | Eager-load `amendments` on `extractedData` relation. |
| [`backend/app/Services/LeaseExtractedDataReviewService.php`](file:///home/c864/Projects/mylease/backend/app/Services/LeaseExtractedDataReviewService.php) | Backend Service | Implemented `resolveLeaseForBatchDocument()` and `syncLeaseConcessions()`; hooked into `saveReview()` inside DB transaction. |
| [`backend/app/Http/Controllers/API/BatchFileReviewController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/BatchFileReviewController.php) | Backend Controller | Added specific 422 handling for `ValidationException`. |
| [`backend/tests/Feature/BatchLeaseConcessionSyncTest.php`](file:///home/c864/Projects/mylease/backend/tests/Feature/BatchLeaseConcessionSyncTest.php) | Backend Test | New comprehensive test suite covering all sync and validation rules. |
| [`frontend/pages/batches/_batchId/lease/_id.vue`](file:///home/c864/Projects/mylease/frontend/pages/batches/_batchId/lease/_id.vue) | Frontend Page | Concession Yes/No select, conditional disabling of Description/Amount, client-side amount validation, inline field error messages, and error styling. |
| [`frontend/components/Lease/Components/Concessions.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/Components/Concessions.vue) | Frontend Component | Added `Rent Concession` and `Abatement` options to concessionTypes list. |
| [`docs/commit_messages.md`](file:///home/c864/Projects/mylease/docs/commit_messages.md) | Documentation | Appended proposed commit messages for backend and frontend. |
