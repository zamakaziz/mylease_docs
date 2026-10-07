# Extracted Data Import & Batch Linking Guide

This guide provides instructions and reference commands for importing document extraction JSON payloads into the `lease_extracted_data` table and linking them to batch documents for review.

---

## 1. Quick Reference Commands

### Scenario A: Explicitly Link JSON to a Specific Batch & Document (Most Common)

Use this when you know the target **Batch ID** and **BatchDocument ID** (e.g. from the UI URL `http://<HOST>:3000/batches/<BATCH_ID>/lease/<DOC_ID>`):

#### Run from Host Terminal (via Docker)
```bash
docker exec myleaseaudit_app php artisan extraction:import-json /app/docs/extracted_data.json --batch-id=<BATCH_ID> --batch-document-id=<DOC_ID> --force
```

#### Example (e.g. for `/batches/5/lease/15`)
```bash
docker exec myleaseaudit_app php artisan extraction:import-json /app/docs/extracted_data.json --batch-id=5 --batch-document-id=15 --force
```

#### Run Directly Inside Container Shell
```bash
# If already logged into container via: docker exec -it myleaseaudit_app bash
php artisan extraction:import-json docs/extracted_data.json --batch-id=5 --batch-document-id=15 --force
```

---

### Scenario B: Auto-Link by Document Name / Tracking ID

If the document has already been uploaded/created in the batch system with a matching file name or tracking ID:

```bash
docker exec myleaseaudit_app php artisan extraction:import-json /app/docs/extracted_data.json --force
```

*The command will automatically look up the latest matching `BatchDocument` by `document_name` or `tracking_id`.*

---

### Scenario C: Background Linking (For Earlier or Deferred Imports)

If extraction rows were imported earlier with `NULL` batch IDs, or if you upload the document to a batch later:

```bash
docker exec myleaseaudit_app php artisan extracted-data:link
```

*Note: This command is also executed automatically every minute by the background Laravel scheduler.*

---

## 2. Command Options & Flags

Command signature:
```bash
php artisan extraction:import-json [file] [--batch-id=] [--batch-document-id=] [--force]
```

| Parameter / Option | Required | Default | Description |
|---|---|---|---|
| `file` | No | `docs/extracted_data.json` | Path to the extraction JSON file. |
| `--batch-id=<id>` | No | `null` (auto-detected) | The target `Batch` ID to associate records with. |
| `--batch-document-id=<id>` | No | `null` (auto-detected) | The target `BatchDocument` ID (found in the URL `/batches/:batchId/lease/:docId`). |
| `--force` | No | `false` | Bypasses interactive confirmation and deletes existing extraction rows for the file/document before re-importing. |

---

## 3. What the Import Command Does Automatically

1. **Parses Extraction Payload**:
   - Iterates through all extraction groups and fields.
   - Extracts bounding box coordinates (`xmin`, `ymin`, `xmax`, `ymax`).
   - Normalizes confidence scores, group numbers, page numbers, and entity types.

2. **Resolves Tracking ID**:
   - Uses `TrackingIdExtractor` to parse prefix tracking IDs from the document filename (e.g., `FAREHARBOR.007.O.I.517`).

3. **Stores Field Records**:
   - Inserts field rows into `lease_extracted_data` with proper `batch_id` and `batch_document_id`.

4. **Syncs Amendments**:
   - For fields with `is_amended: true` and `review_data`, inserts records into `lease_extracted_data_amendments` linked to the new field ID and `batch_document_id`.

5. **Syncs Review State**:
   - If a `review` object is provided in the JSON, updates or creates the review record in `lease_extracted_data_reviews` (`review_status: In_Progress`, `reviewed_by`, `review_started_at`).

6. **Updates Document Metadata**:
   - Updates `batch_files.extracted_fields_count` to reflect the total imported fields.

---

## 4. How to Verify After Import

To verify that the data was imported and linked correctly, run:

```bash
docker exec -e XDG_CONFIG_HOME=/tmp myleaseaudit_app php artisan tinker --execute="
\$docId = 15;
\$count = \App\Models\LeaseExtractedData::where('batch_document_id', \$docId)->count();
\$review = \App\Models\LeaseExtractedDataReview::where('batch_document_id', \$docId)->first();
dump('Extracted fields count:', \$count);
dump('Review status:', \$review ? \$review->review_status : 'None');
"
```

Then refresh the frontend review page:
```
http://<FRONTEND_HOST>:3000/batches/<BATCH_ID>/lease/<DOC_ID>
```
The left panel will render all extracted field groups and the right panel will display the corresponding PDF/HTML view.
