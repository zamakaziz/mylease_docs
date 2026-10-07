# Implementation Documentation: Lease Concession Route & Auth Activity Logging Fix

**Date:** 2026-10-06  
**Context:** Creating Concessions in Lease Drawer (`http://192.168.0.2:3000/auditing?tab=validation&id=801`)  
**Status:** Completed & Tested

---

## 1. Problem Description

When attempting to create a new concession from the Lease modal, the client encountered the following HTTP 405 error:
```json
{
    "message": "The POST method is not supported for this route. Supported methods: GET, HEAD.",
    "exception": "Symfony\\Component\\HttpKernel\\Exception\\MethodNotAllowedHttpException",
    "file": "/app/vendor/laravel/framework/src/Illuminate/Routing/AbstractRouteCollection.php",
    "line": 117
}
```

---

## 2. Root Cause Analysis

1. **Cached Route Table**:
   - `backend/routes/api.php` previously defined only `Route::get('leases/{lease_id}/concessions', ...)` for the nested lease route.
   - When `Route::post('leases/{lease_id}/concessions', ...)` was newly added, Laravel's compiled route cache (`bootstrap/cache/routes-v7.php`) in the Docker container had not been invalidated (`php artisan route:clear`), causing Laravel's route collection to only recognize `GET` and `HEAD` for that URL pattern.
2. **Unauthenticated Activity Logging Null Pointer**:
   - In `LeaseController@createLeaseConcession`, `updateLeaseConcession`, and `deleteLeaseConcession`, activity logs directly referenced `Auth::user()->id`.
   - If an API token session or unauthenticated request executed, accessing `->id` on null caused `Attempt to read property "id" on null`.

---

## 3. Implementation Details

### Backend Changes (`backend/`)
1. **Route Cache Clearance**:
   - Executed `php artisan route:clear` in the container to reload dynamic routes from `routes/api.php`.
   - Confirmed both `POST api/leases/{lease_id}/concessions` and `POST api/lease-concessions` are active.
2. **Guarded Activity Log User ID**:
   - In [`LeaseController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/LeaseController.php#L1924), updated `createLeaseConcession`, `updateLeaseConcession`, and `deleteLeaseConcession`:
     ```php
     $activity->user_id = Auth::id() ?? ($lease->user_id ?? 1);
     ```
3. **Route Parameter Validation in Request**:
   - In [`CreateLeaseConcessionRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Lease/CreateLeaseConcessionRequest.php#L14-L19), added `prepareForValidation` to merge `$this->route('lease_id')` into `lease_id`.
4. **Feature Test**:
   - Added `test_create_concession_via_nested_lease_route` to [`LeaseConcessionsTest.php`](file:///home/c864/Projects/mylease/backend/tests/Feature/LeaseConcessionsTest.php) verifying `POST /api/leases/{lease_id}/concessions` returns HTTP 201 with created record and database entry.

### Frontend Changes (`frontend/`)
1. **Explicit `lease_id` in Payload**:
   - In [`Concessions.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/Components/Concessions.vue#L512), added `lease_id: this.currentLeaseId` directly to the request body payload.
2. **Extended `currentLeaseId` Resolution**:
   - Added `this.view_id` fallback in `currentLeaseId` computed property so concessions are also resolved when viewing in read/inspect mode.

---

## 4. Test Verification & Commands

### Test Commands:
```bash
docker compose exec app php artisan route:clear
docker compose exec app php artisan test --filter=LeaseConcessionsTest
docker compose exec app php artisan test --filter=NonCamConcessionIntegrationTest
```

### Test Results:
- `LeaseConcessionsTest`: **13 passed** (including nested route test).
- `NonCamConcessionIntegrationTest`: **9 passed** (all concession integration tests).

---

## 5. Files Changed

| Component | File Path | Summary of Changes |
| :--- | :--- | :--- |
| **Backend** | [`app/Http/Controllers/API/LeaseController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/LeaseController.php) | Guarded `user_id` resolution in concession activity logs |
| **Backend** | [`app/Http/Requests/Lease/CreateLeaseConcessionRequest.php`](file:///home/c864/Projects/mylease/backend/app/Http/Requests/Lease/CreateLeaseConcessionRequest.php) | Merged `lease_id` from route parameter in `prepareForValidation` |
| **Backend** | [`routes/api.php`](file:///home/c864/Projects/mylease/backend/routes/api.php) | Registered `POST /api/leases/{lease_id}/concessions` route |
| **Backend** | [`tests/Feature/LeaseConcessionsTest.php`](file:///home/c864/Projects/mylease/backend/tests/Feature/LeaseConcessionsTest.php) | Added feature test `test_create_concession_via_nested_lease_route` |
| **Frontend** | [`components/Lease/Components/Concessions.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/Components/Concessions.vue) | Explicit `lease_id` in payload and `view_id` fallback in `currentLeaseId` |
| **Docs** | [`docs/commit_messages.md`](file:///home/c864/Projects/mylease/docs/commit_messages.md) | Logged proposed backend and frontend commit messages |
