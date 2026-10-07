# Implementation Documentation: Extracted Data JSON Import into `lease_extracted_data` & Batch Linking

**Date**: 2026-10-07  
**Description**: Ingestion and persistence of document extraction JSON (`extracted_data.json`) into `lease_extracted_data` table, amendment generation, and linking to Batch #5 / BatchDocument #15 (`/batches/5/lease/15`).

---

## 1. Problem Description
The user provided extracted lease fields in [`docs/extracted_data.json`](file:///home/c864/Projects/mylease/docs/extracted_data.json) and requested:
1. Ingesting this extraction data into `lease_extracted_data`.
2. Linking the extracted data to batch review target: `http://192.168.0.2:3000/batches/5/lease/15`.

---

## 2. Architecture & Root Cause Analysis
1. The table `lease_extracted_data` stores extracted fields from documents, including:
   - `file_name`
   - `tracking_id` (derived via delimiter splitting using [`TrackingIdExtractor`](file:///home/c864/Projects/mylease/backend/app/Services/TrackingIdExtractor.php))
   - `file_type` (`lease`)
   - `field_code`
   - `group_no`
   - `value`
   - `page`
   - Bounding boxes (`xmin`, `ymin`, `xmax`, `ymax`)
   - `entity_type`
   - `confidence_score`
   - `review_status` (`Pending` / `Completed`)
   - `is_amended`
   - `batch_id` and `batch_document_id`
2. BatchDocument #15 belongs to Batch #5. Prior to linking, it had 6 placeholder fields.
3. In [`docs/extracted_data.json`](file:///home/c864/Projects/mylease/docs/extracted_data.json):
   - There are 9 extraction groups containing 196 field records.
   - 2 fields (`Premises Share` and `Use`) have `is_amended: true` with corresponding `review_data` amendment entries.
   - The root object includes a `review` payload (`review_status: In_Progress`, `reviewed_by: 482`, `review_started_at: 2026-09-29T13:22:44+00:00`).
4. To link the extracted data directly to Batch #5 and BatchDocument #15, [`ImportExtractedDataCommand`](file:///home/c864/Projects/mylease/backend/app/Console/Commands/ImportExtractedDataCommand.php) was enhanced with `--batch-id` and `--batch-document-id` options, synchronizing `lease_extracted_data`, `lease_extracted_data_amendments`, and `lease_extracted_data_reviews`.

---

## 3. Backend Changes

### 3.1. Created & Enhanced Artisan Command: `extraction:import-json`
- **File**: [`backend/app/Console/Commands/ImportExtractedDataCommand.php`](file:///home/c864/Projects/mylease/backend/app/Console/Commands/ImportExtractedDataCommand.php)
- **Features**:
  - Accepts path to JSON file (`{file?}`).
  - Supports `--batch-id={id}` and `--batch-document-id={id}` to explicitly link extraction data to any batch and batch document.
  - Supports `--force` option to overwrite/re-import existing extractions for the document/batch document.
  - Automatically derives `tracking_id` via [`TrackingIdExtractor`](file:///home/c864/Projects/mylease/backend/app/Services/TrackingIdExtractor.php).
  - Inserts all 196 fields into `lease_extracted_data` with proper foreign keys (`batch_id` and `batch_document_id`).
  - Inserts amendments into `lease_extracted_data_amendments` referencing the newly created field rows and `batch_document_id`.
  - Upserts the document review record in `lease_extracted_data_reviews` (`status: In_Progress`, `reviewed_by: 482`, `review_started_at`).
  - Updates `batch_files.extracted_fields_count` to reflect the 196 imported fields.
  - Runs in a database transaction for atomic persistence.

### 3.2. Automated Testing
- **File**: [`backend/tests/Feature/ImportExtractedDataCommandTest.php`](file:///home/c864/Projects/mylease/backend/tests/Feature/ImportExtractedDataCommandTest.php)
  - `it_imports_extracted_data_json_into_lease_extracted_data`: Verifies file parsing, field attributes, bounding boxes, and amendments.
  - `it_imports_extracted_data_and_links_explicit_batch_and_batch_document`: Verifies explicit `--batch-id` and `--batch-document-id` linking and review status synchronization.

---

## 4. Frontend Changes
- No code changes needed in frontend. The page [`frontend/pages/batches/_batchId/lease/_id.vue`](file:///home/c864/Projects/mylease/frontend/pages/batches/_batchId/lease/_id.vue) queries `/api/batches/file/15/get-lease-extracted-data`, which now returns the 196 fields across the 9 groups, progress (2 amended, 194 pending), and `In_Progress` review status.

---

## 5. Verification & Test Results

### 5.1 Command Execution
```bash
docker exec -e XDG_CONFIG_HOME=/tmp myleaseaudit_app php artisan extraction:import-json /app/docs/extracted_data.json --batch-id=5 --batch-document-id=15 --force
```
Output:
```text
Loading file: /app/docs/extracted_data.json
Document Name: FAREHARBOR.007.O.I.517_Denver_Lease_dd_15 Oct 2022.pdf
Tracking ID: FAREHARBOR.007.O.I.517
Document Type: lease
Target: Batch ID #5, BatchDocument ID #15 ('ABCTech.004.L.I.494_Denver_Lease_dd2_15 Oct 2022.pdf')
Removing 202 existing rows for document/batch-document due to --force flag.
Synchronized review record in lease_extracted_data_reviews (Status: In_Progress).
Successfully inserted 196 fields into lease_extracted_data linked to Batch #5, Document #15.
Successfully inserted 2 amendments into lease_extracted_data_amendments.
```

### 5.2 API Service Verification
Inspected response from `LeaseExtractedDataReviewService->getDocumentDetail(BatchDocument::find(15))`:
- **Document ID**: 15
- **Groups Count**: 9
- **Total Fields**: 196
- **Review Status**: `In_Progress` (reviewed_by: 482)
- **Review Progress**: Total 196, Reviewed 2, Amended 2, Pending 194

### 5.3 PHPUnit Test Suite
```bash
docker exec -e XDG_CONFIG_HOME=/tmp myleaseaudit_app php vendor/bin/phpunit tests/Feature/ImportExtractedDataCommandTest.php
```
Output:
```text
PHPUnit 9.6.34 by Sebastian Bergmann and contributors.

..                                                                  2 / 2 (100%)

Time: 00:00.178, Memory: 32.00 MB

OK (2 tests, 9 assertions)
```

---

## 6. Files Changed

| File | Type | Description |
|---|---|---|
| [`backend/app/Console/Commands/ImportExtractedDataCommand.php`](file:///home/c864/Projects/mylease/backend/app/Console/Commands/ImportExtractedDataCommand.php) | Created | Artisan command `extraction:import-json` with `--batch-id` and `--batch-document-id` linking support |
| [`backend/tests/Feature/ImportExtractedDataCommandTest.php`](file:///home/c864/Projects/mylease/backend/tests/Feature/ImportExtractedDataCommandTest.php) | Created | Feature test verifying JSON import and explicit batch linkage |
| [`backend/docs/extracted_data.json`](file:///home/c864/Projects/mylease/backend/docs/extracted_data.json) | Copied | Mirrored extracted data JSON inside container-accessible docs path |
