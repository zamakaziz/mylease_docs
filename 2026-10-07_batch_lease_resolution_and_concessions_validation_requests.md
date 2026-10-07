# Implementation Documentation: Separate Validation Requests for resolveLeaseForBatchDocument and syncLeaseConcessions

**Date:** 2026-10-07  
**Task:** Create separate FormRequest validation classes for `resolveLeaseForBatchDocument` and `syncLeaseConcessions` actions  
**Related Spec:** [`docs/2026-10-07_btach_pdf_concession_data_save.md`](file:///home/c864/Projects/mylease/docs/2026-10-07_btach_pdf_concession_data_save.md)

---

## 1. Problem Description & Requirements

Following the integration between batch review Financial Terms and the Lease Concessions system, validation and payload handling needed dedicated, reusable FormRequest classes:

1. **`resolveLeaseForBatchDocument`**:
   - Needed a dedicated validation request class ([`ResolveLeaseForBatchDocumentRequest`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Batch/ResolveLeaseForBatchDocumentRequest.php)) to validate `batch_document_id`, ensure existence in `batch_documents`, reject soft-deleted records, enforce company authorization (403 if document belongs to another company), and return standard 422 JSON errors when parameters are invalid.
   - An explicit controller action and route for resolving the associated lease were required.

2. **`syncLeaseConcessions`**:
   - Needed a dedicated validation request class ([`SyncLeaseConcessionsRequest`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Batch/SyncLeaseConcessionsRequest.php)) capable of accepting both:
     - Bare JSON array payloads (e.g. `[ { "id": 101, "action": "amended", "value": "Yes" } ]`)
     - Wrapped object payloads (e.g. `{ "fields": [ { "id": 101, "action": "amended", "value": "Yes" } ] }`)
   - Performs early cross-field semantic validation before executing database updates:
     - If any concession field (`Security Deposit`, `Rent Concession`, `Allowance`, `Abatement`, `Rent Credit`, `Rent Abatement`, `Tenant Improvement Allowance`, `Operating Expense Abatement`, `Concessions`) has effective Value = `YES`, its Amount field is required, numeric, and must be strictly positive (`> 0`).
     - Fails early with HTTP 422 JSON and specific field errors (`"{Concession Type} amount is required and must be greater than 0."`).
   - An explicit controller action and route for synchronizing concessions were required, while also integrating into `saveReview()`.

---

## 2. Root Cause Analysis

1. **Inline / Ad-hoc Validation**: Validation logic was previously split across inline `Validator::make` in `BatchFileReviewController::saveReview` and backend exceptions inside `LeaseExtractedDataReviewService`. There were no standalone FormRequest classes adhering to Laravel standard architecture for these endpoints.
2. **Wildcard Validation on Root Arrays**: Validating bare JSON arrays (`*.id`, `*.action`) in Laravel FormRequests without wrapping them caused merged route parameters (`batch_document_id`) to be evaluated against `*.id` wildcard rules, producing spurious validation failures.
3. **Route Model Binding vs 422 Validation**: Implicit route model binding on `{batch_document}` automatically aborted with HTTP 404 when documents were missing, preventing the FormRequest's `exists:batch_documents,id` rule from delivering structured 422 validation error messages.
4. **Standalone Sync Data Availability**: In standalone concession sync requests, amendments were not yet committed to `lease_extracted_data_amendments`, causing `$getValue` in the review service to read stale database values unless `$submittedFields` were checked directly.

---

## 3. Backend Changes

### 3.1 [`ResolveLeaseForBatchDocumentRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Batch/ResolveLeaseForBatchDocumentRequest.php)
- **`authorize()`**: Validates that the authenticated user belongs to the same company as the document (`$doc->company_id === $user->company_id`). Returns 403 on tenant mismatch.
- **`getBatchDocument()`**: Safely resolves the `BatchDocument` instance from route parameters or input attributes.
- **`prepareForValidation()` / `validationData()`**: Injects the document identifier from route parameters (`{batch_document}`) into validation data.
- **`rules()`**: Enforces `'batch_document_id' => 'required|integer|exists:batch_documents,id'`.
- **`withValidator()`**: Checks if the target `BatchDocument` has been soft-deleted (`trashed()`), returning an error message: `"The batch document has been deleted."`.
- **`failedValidation()`**: Throws `HttpResponseException` returning consistent JSON 422 structure (`{ status: false, status_code: 422, message: ..., errors: ... }`).

### 3.2 [`SyncLeaseConcessionsRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Batch/SyncLeaseConcessionsRequest.php)
- **Flexible Payload Normalization**: In `validationData()`, detects bare JSON arrays (`array_is_list($data)`), single field objects, and wrapped `{ "fields": [...] }` objects, normalizing all to standard `'fields' => [...]` and merging `'batch_document_id'`.
- **`getFields()`**: Provides clean array access to review fields for controllers and services.
- **`rules()`**:
  - `'batch_document_id' => 'required|integer|exists:batch_documents,id'`
  - `'fields' => 'required|array|min:1'`
  - `'fields.*.id' => 'required'`
  - `'fields.*.action' => 'required|string|in:accepted,amended'`
  - `'fields.*.value' => 'nullable|string|max:5000'`
  - `'fields.*.note' => 'nullable|string|max:2000'`
- **`validateConcessionAmounts()`**: Inspects all 9 concession types. When Value is `YES` in submitted data or database, verifies that the Amount is present, numeric, and `> 0`. Adds `$validator->errors()->add($amountField, "{$type} amount is required and must be greater than 0.")`.
- **`failedValidation()`**: Formats validation errors into standard 422 JSON response.

### 3.3 [`BatchDocument.php`](file:///home/c864/Projects/mylease/backend/app/Models/BatchDocument.php)
- Added `getCompanyIdAttribute(): ?int` accessor delegating to `$this->batch?->company_id`, allowing reliable multi-tenant scoping and authorization across all batch document endpoints.

### 3.4 [`LeaseExtractedDataReviewService.php`](file:///home/c864/Projects/mylease/backend/app/Services/LeaseExtractedDataReviewService.php)
- Updated `syncLeaseConcessions()` to evaluate submitted field values (`$submittedMap`) first before falling back to database amendments, allowing standalone concession sync calls to accurately process uncommitted changes.

### 3.5 [`BatchFileReviewController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/BatchFileReviewController.php)
- Updated `saveReview()` to typehint `SyncLeaseConcessionsRequest $request`, utilizing its pre-validation and `$request->getFields()`.
- Added explicit action `resolveLeaseForBatchDocument(ResolveLeaseForBatchDocumentRequest $request, $batch_document = null)`: returns 200 with document ID and lease metadata (id, location_id, tracking_id, batch_document_id, total_concessions).
- Added explicit action `syncLeaseConcessions(SyncLeaseConcessionsRequest $request, $batch_document = null)`: returns 200 with document ID and synchronized concessions array.

### 3.6 [`routes/api.php`](file:///home/c864/Projects/mylease/backend/routes/api.php)
- Added route: `GET batches/file/{batch_document}/resolve-lease` -> `BatchFileReviewController::resolveLeaseForBatchDocument`.
- Added route: `POST batches/file/{batch_document}/sync-concessions` -> `BatchFileReviewController::syncLeaseConcessions`.

---

## 4. Frontend Changes

No frontend changes were required for this task. The existing review UI ([`frontend/pages/batches/_batchId/lease/_id.vue`](file:///home/c864/Projects/mylease/frontend/pages/batches/_batchId/lease/_id.vue)) and concession modal ([`frontend/components/Lease/Components/Concessions.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/Components/Concessions.vue)) remain fully compatible with both the updated `saveReview` endpoint and the new standalone routes.

---

## 5. Test Results & Verification

All tests were executed within the Docker environment (`myleaseaudit_app`):

```bash
docker exec -e XDG_CONFIG_HOME=/tmp myleaseaudit_app php vendor/bin/phpunit tests/Feature/BatchLeaseConcessionSyncTest.php
```

**Results:**
```text
PHPUnit 9.6.34 by Sebastian Bergmann and contributors.

................                                                  16 / 16 (100%)

Time: 00:00.900, Memory: 38.00 MB

OK (16 tests, 53 assertions)
```

### Test Coverage Summary:
- `test_resolve_lease_for_batch_document_succeeds_with_valid_document`: Verifies successful resolution of Lease and attributes.
- `test_resolve_lease_validation_fails_for_non_existent_document`: Verifies HTTP 422 when batch document ID is invalid.
- `test_resolve_lease_authorization_fails_for_another_company_document`: Verifies HTTP 403 when document belongs to another tenant.
- `test_sync_lease_concessions_endpoint_succeeds_with_valid_payload`: Verifies standalone concession sync with bare JSON array.
- `test_sync_lease_concessions_endpoint_supports_wrapped_fields_payload`: Verifies standalone concession sync with wrapped `{ fields: [...] }` object.
- `test_sync_lease_concessions_validation_fails_when_value_yes_and_amount_empty`: Verifies cross-field semantic validation returning HTTP 422 when Amount is missing for Value = YES.
- `test_sync_lease_concessions_validation_fails_for_empty_fields_array`: Verifies HTTP 422 when body is empty.
- 9 existing end-to-end regression tests verifying full DB syncing, restoration of soft-deleted concessions, and recalculation of total concessions.

---

## 6. Files Changed Table

| File | Type | Description |
| --- | --- | --- |
| [`backend/app/Http/Requests/Batch/ResolveLeaseForBatchDocumentRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Batch/ResolveLeaseForBatchDocumentRequest.php) | Created | FormRequest validating batch document existence, tenant company authorization, and soft-delete state |
| [`backend/app/Http/Requests/Batch/SyncLeaseConcessionsRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Batch/SyncLeaseConcessionsRequest.php) | Created | FormRequest normalizing bare/wrapped field arrays and enforcing concession Amount semantic validation |
| [`backend/app/Models/BatchDocument.php`](file:///home/c864/Projects/mylease/backend/app/Models/BatchDocument.php) | Modified | Added `getCompanyIdAttribute` accessor for multi-tenant isolation |
| [`backend/app/Services/LeaseExtractedDataReviewService.php`](file:///home/c864/Projects/mylease/backend/app/Services/LeaseExtractedDataReviewService.php) | Modified | Updated `syncLeaseConcessions()` to evaluate submitted field values directly |
| [`backend/app/Http/Controllers/API/BatchFileReviewController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/BatchFileReviewController.php) | Modified | Integrated FormRequests and added actions `resolveLeaseForBatchDocument` and `syncLeaseConcessions` |
| [`backend/routes/api.php`](file:///home/c864/Projects/mylease/backend/routes/api.php) | Modified | Registered `resolve-lease` and `sync-concessions` routes |
| [`backend/tests/Feature/BatchLeaseConcessionSyncTest.php`](file:///home/c864/Projects/mylease/backend/tests/Feature/BatchLeaseConcessionSyncTest.php) | Modified | Added feature tests for both FormRequests, authorization, and endpoints |
