# Chunk Upload AWS Instance Profile Metadata Timeout Fix

## 1. Problem Description
When uploading file chunks to `http://127.0.0.1:8000/api/files/upload/chunk` or `http://127.0.0.1:8000/api/batches/{id}/upload/chunk`, the upload failed with HTTP 500 error:
```json
{
    "success": false,
    "message": "Failed to upload chunk",
    "data": {
        "error": "Error retrieving credentials from the instance profile metadata service. (cURL error 28: Connection timed out after 1001 milliseconds (see https://curl.haxx.se/libcurl/c/libcurl-errors.html) for http://169.254.169.254/latest/meta-data/iam/security-credentials/)"
    }
}
```

## 2. Root Cause Analysis
1. In `FileUploadController@uploadChunk` and `BatchUploadController@uploadChunk`, chunk data is saved to `config('filesystems.batch_disk', config('filesystems.default'))`.
2. `config('filesystems.batch_disk')` defaulted to `'qloop'`, which uses AWS S3 driver credentials (`QLOOP_AWS_ACCESS_KEY_ID`, `QLOOP_AWS_SECRET_ACCESS_KEY`).
3. In local Docker development, `QLOOP_AWS_ACCESS_KEY_ID` was empty/unset. When AWS SDK detects empty credentials, it attempts to fetch IAM credentials from EC2 metadata service (`http://169.254.169.254`). On local machines/Docker, this endpoint times out after 1000ms.
4. While `FILESYSTEM_DISK=minio` was configured in `.env`, `BATCH_FILESYSTEM_DISK` was omitted. Additionally, the `myleaseaudit` bucket had not yet been created in the MinIO container.

## 3. Backend Changes
- **Environment Configuration**: Added `BATCH_FILESYSTEM_DISK=minio` to [`backend/.env`](file:///home/c864/Projects/mylease/backend/.env) to align batch storage with local MinIO storage.
- **MinIO Storage Initialization**: Created the `myleaseaudit` bucket inside the `myleaseaudit_minio` container (`mc mb local/myleaseaudit`).
- **Container Lifecycle**: Restarted all backend containers (`docker compose restart`) to refresh environment variables and storage configurations across PHP-FPM, Horizon, and Nginx.

## 4. Frontend Changes
- No frontend changes required.

## 5. Verification & Test Results
- Verified `myleaseaudit` bucket is persisted in MinIO (`mc ls local` -> `0B myleaseaudit/`).
- Verified `Storage::disk(config('filesystems.batch_disk'))->put(...)` successfully writes chunks to MinIO (`bool(true)`).
- Verified `myleaseaudit_horizon` status is running.
- Verified batch name availability check endpoint returns HTTP 200 OK.

## 6. Files Changed Table
| File | Description |
| --- | --- |
| [`backend/.env`](file:///home/c864/Projects/mylease/backend/.env) | Added `BATCH_FILESYSTEM_DISK=minio` |
