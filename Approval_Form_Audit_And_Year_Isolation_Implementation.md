# Approval Form Audit and Year Isolation & Notification Implementation

## 1. Overview & Problem Statement

### 1.1 Problem Description
When accessing the Auditing page with the Approvals tab (`/auditing?tab=approvals&id=807`), users experienced leakage of approval forms and audit documents between different audits and years:
1. **Unscoped Approval Form Availability**: If an approval form was generated for `audit_id: 806` and `year: 2024`, the approval creation drawer (`+ New Approval Request`) unconditionally displayed the "Download Approval Form" button regardless of whether the user was viewing Audit `807` or selecting another audit year (e.g. `2025`).
2. **Global Document Leakage in Audit Document Scope**: `AuditDocument::scopeVisibleForAudit` fetched `year = 'Common'` documents globally without filtering by `location_id`, leaking over 1,000 documents from other client properties into the approval form summary for Audit 807.
3. **Information Reviewed Year Contamination**: `ApprovalRequestSummaryService::extractInformationReviewed` queried all audit documents for the location without restricting statements to the active audit's year(s), pulling in historical statements from 2021, 2022, 2023, and 2025.
4. **Vue Router Query Sync**: `auditing.vue` did not watch for changes to `$route.query.id`, leaving `auditData` and `current_stage_years` pointing to the previous audit when switching IDs in the URL.

---

## 2. Key Architecture Fixes

### 2.1 Backend Changes

#### 1. Scope Document Isolation: [`AuditDocument.php`](file:///home/c864/Projects/mylease/backend/app/Models/AuditDocument.php)
- **File**: `backend/app/Models/AuditDocument.php`
- **Fix**: Updated `scopeVisibleForAudit` to ensure that documents with `year = 'Common'` and document types `Lease` or `Amendment` are strictly scoped by the audit's `location_id`.
```php
public function scopeVisibleForAudit($query, Audit $audit, ?array $years = null)
{
    $locationId = $audit->location_id;

    return $query->where(function ($q) use ($audit, $locationId, $years) {
        // Direct audit documents
        $q->where('audit_id', $audit->id);

        // Location documents matching years or Common/Yearless
        if ($locationId) {
            $q->orWhere(function ($locQ) use ($locationId, $years) {
                $locQ->where('location_id', $locationId)
                     ->where(function ($sub) use ($years) {
                         $sub->whereNull('year')
                             ->orWhere('year', '')
                             ->orWhere('year', 'Common');
                         if (!empty($years)) {
                             $sub->orWhereIn('year', $years);
                         }
                     });
            });
        }
    });
}
```

#### 2. Year & Location Scoping: [`ApprovalRequestSummaryService.php`](file:///home/c864/Projects/mylease/backend/app/Services/Approval/ApprovalRequestSummaryService.php)
- **File**: `backend/app/Services/Approval/ApprovalRequestSummaryService.php`
- **Fix**: 
  - `extractInformationReviewed`: Restricted statements and reconciliations to `$audit->id` and `$audit->location_id` matching `$years` (or Common/blank year).
  - `extractConcessions`: Ensured `visibleForAudit` receives `$years` to prevent pulling concession documents from past or future audit years.

#### 3. Approval Form Status Endpoint & Generation Caching: [`ApprovalController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/ApprovalController.php)
- **File**: `backend/app/Http/Controllers/API/ApprovalController.php`
- **Features**:
  - `previewPdf`: Upon generating the approval form preview, it records generation status in Cache and persists the preview PDF under `approval_forms/audit_{$auditId}_year_{$yearKey}_preview.pdf`.
  - `getApprovalFormStatus`: New endpoint `GET /api/audits/{auditId}/approval-form-status?selected_years=...` that checks whether an approval form has been generated for that specific audit ID and selected year(s).
  - `store`: Persists `audit_year` alongside `Approval::create`.
  - `index`: Supports filtering approval requests by `audit_year`.

#### 4. Route Registration: [`api.php`](file:///home/c864/Projects/mylease/backend/routes/api.php)
- **Route**:
```php
Route::get('audits/{auditId}/approval-form-status', [ApprovalController::class, 'getApprovalFormStatus']);
```

---

### 2.2 Frontend Changes

#### 1. Route ID Watcher & Lifecycle Sync: [`auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue)
- **File**: `frontend/pages/auditing.vue`
- **Fix**: Added handling in `beforeRouteUpdate` and a watcher for `'$route.query.id'` so that when navigating between `id=806` and `id=807`, the page immediately updates `this.audit_id` and invokes `this.getAllData()` to reload fresh audit data.

#### 2. Dynamic Form Availability & Year Isolation: [`ApprovalsTab.vue`](file:///home/c864/Projects/mylease/frontend/components/auditing/ApprovalsTab.vue)
- **File**: `frontend/components/auditing/ApprovalsTab.vue`
- **Reactive Status Tracking**:
  - Added `approvalFormStatusMap` in `data()` to map `"${auditId}_${currentFormYearKey}"` to generation boolean.
  - Added computed property `currentFormYearKey` that determines the selected year or falls back to `auditData.audit_year`.
  - Added computed property `isApprovalFormGeneratedForCurrentAuditAndYear`.
- **Drawer Button Logic**:
  - Replaced unconditional download button with conditional rendering:
    - **When Generated**: Displays `<i class="el-icon-download mr-1"></i>Download Approval Form`.
    - **When Not Generated**: Displays `<i class="el-icon-document mr-1"></i>Generate Approval Form ({{ currentFormYearKey }})`.
- **Audit ID & Year Watchers**:
  - Watches `auditId`: When switching audits, resets the form (`resetNewApprovalForm`) and queries `checkApprovalFormStatus()`.
  - Watches `newApprovalForm.selected_years`: When changing years, re-queries `checkApprovalFormStatus()` so the download button only displays if that year was generated.
- **Form Generation & Download**:
  - `generateApprovalForm()`: Generates the preview, marks status as generated locally and on the backend, and opens preview in a new tab.
  - `downloadApprovalForm()`: Directly downloads `Approval_Form_Audit_{auditId}_{yearKey}.pdf`.

---

## 3. Approve / Reject Notifications Flow

When an approver reviews an approval request:
1. **Decision Endpoint**: `POST /api/approvals/{id}/approve` or `POST /api/approvals/{id}/reject`.
2. **Email Delivery**: An email is dispatched via `ApprovalStatusMail` to the requester's email address detailing the audit name, location, stage change, decision status, and any comments/rejection reason.
3. **In-App Bell Notification**: An in-app notification record is created in `AuditWindowNotifications` for the requester:
   - `type`: `'approval_status'`
   - `message`: `"Your approval request for {AuditName} has been approved/rejected."`
   - Real-time broadcast triggered via `DashboardEvent` so the bell badge updates immediately.

---

## 4. Verification & Testing

### 4.1 Automated Tests Passing
All PHPUnit tests passed in Docker container (`myleaseaudit_app`):

```bash
docker exec myleaseaudit_app vendor/bin/phpunit tests/Feature/ApprovalModuleTest.php
# 13 tests, 50 assertions - OK (100%)

docker exec myleaseaudit_app vendor/bin/phpunit tests/Feature/ApprovalPdfAndValidationTest.php
# 11 tests, 63 assertions - OK (100%)
```

Key test cases verified:
- `test_get_eligible_approvers`: Verifies tenant isolation and eligible approver listing.
- `test_approval_request_lifecycle`: Verifies store, update, approve, and reject workflows.
- `test_approval_status_notification`: Verifies email and bell notification generation on approve/reject.
- `test_approval_form_status_isolation_by_audit_and_year`: Verifies that generating an approval form for one audit and year does not mark it generated for another audit or another year.
- `test_pdf_preview_year_validation`: Verifies that approval form previews reject years that do not belong to the audit.
- `test_bulk_delete_approval_requests`: Verifies bulk delete operations.

### 4.2 Frontend Hot-Reload
Nuxt build in `mylease_frontend` compiled with zero syntax or bundling errors:
```
✔ Client: Compiled successfully
```
