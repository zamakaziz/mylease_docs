# Generated Commit Messages Log

This file logs proposed commit messages for backend and frontend changes after each completed implementation.
> **Note**: These messages are generated for reference and review. Commits are not executed automatically.

## [2026-10-05] Document Viewer In-Page HTML Search & Highlighting

### Backend (`backend/`)
```text
feat(batch): add endpoint to stream HTML document content for review viewer

- Add getHtmlContent method in BatchFileReviewController to stream raw HTML content from storage disk
- Register GET /api/batches/file/{batch_document}/html-content under sanctum auth route group
- Support resolution from batch_files.html_file_path and fallback to standard batch storage path
```

### Frontend (`frontend/`)
```text
feat(batches): add interactive in-page search toolbar and highlight navigation for HTML viewer

- Add search input toolbar with debounce, clear button, match counter badge, and next/prev controls in lease review viewer
- Render HTML content via iframe srcdoc to ensure same-origin access for DOM traversal and highlighting
- Implement TreeWalker-based text node highlighting with search-highlight and search-highlight.active styles
- Add keyboard navigation support: Enter for next match, Shift+Enter for previous match, Esc to clear, and Ctrl+F to focus search bar
- Add smooth scroll navigation to active matches and proper DOM restoration upon clearing search
```

---

## [2026-10-05] Chunk Upload Local MinIO Storage Configuration Fix

### Backend (`backend/`)
```text
fix(storage): configure batch disk to use MinIO for local development

- Set BATCH_FILESYSTEM_DISK=minio in backend .env to resolve AWS EC2 metadata timeout
- Initialize myleaseaudit bucket in local MinIO container
- Restart Docker services to pick up updated storage configuration
```

### Frontend (`frontend/`)
```text
chore: no frontend changes required for storage disk configuration
```

---

## [2026-10-05] Validation Version Dropdown Visibility & Results Synchronization

### Backend (`backend/`)
```text
fix(validation): return all statement runs in listRuns and provide statement fallback for consolidated findings

- Return all available validation runs for the specified statement in ValidationController@listRuns
- Compute statement-level fallback findings count for previous runs consolidated during re-validation
- Add graceful statement fallback in ValidationController@index and ValidationController@summary when validation_run_id findings were consolidated into statement
- Decouple validation_run_id and statement_id in findings query to avoid conflicting AND conditions
- Resolve latestRun accurately based on requested validation_run_id in summary
```

### Frontend (`frontend/`)
```text
fix(validation): show all statement versions in dropdown on visit and sync recorded results across selections

- Invoke fetchValidationRuns in fetchAuditStatementsList on initial page load and tab switch
- Ensure all available versions for the active statement are returned and displayed in the dropdown
- Add chronological version labeling (e.g. v2 (Run #381) - 05-Oct-2026 [Completed]) in getValidationRunLabel
- Reset selectedValidationRunId and re-fetch validation runs in onStatementSelected when switching statements
- Add onValidationRunSelected handler to synchronize selectedAuditStatementId, confirmation status, summary, and findings
- Expand dropdown width and placeholder to Select Version for optimal presentation
- Update currentRunId computed property to prioritize selectedValidationRunId for workflow stepper
- Move Statement Version dropdown and Run Validation button immediately to the right of Statement dropdown
```

---

## [2026-10-05] Documents Table Sticky Actions Column

### Backend (`backend/`)
```text
chore: no backend changes required for documents table sticky actions column
```

### Frontend (`frontend/`)
```text
feat(documents): make Actions column sticky on right in Documents and Sub-Documents tables

- Add .doc-actions-col class to Actions th, filter td, and body td elements with position: sticky and right: 0
- Configure th.doc-actions-col with z-index: 3, #f4f5fc background, border-left, and elevation box-shadow
- Configure filter row td.doc-actions-col with z-index: 3 and solid white background
- Configure body td.doc-actions-col with z-index: 2, solid white background, flex-centered iconslist, and hover state
- Set 210px width on sticky actions column to fit all action icons without wrapping
- Apply .doc-actions-col across auditing.vue (Documents & Sub-Documents) and document_item_details.vue
- Add global sticky CSS rules to static/css/styles.css
```

---

## [2026-10-05] CAM Expenses Validation Results Sticky Actions Column

### Backend (`backend/`)
```text
chore: no backend changes required for validation results sticky actions column
```

### Frontend (`frontend/`)
```text
feat(validation): make Actions column sticky in CAM Expenses Validation Results table

- Add .vld-actions-col class to Actions th and td elements with position: sticky and right: 0
- Configure th.vld-actions-col with z-index: 3, #fafafa background, and border/box-shadow dividers
- Configure td.vld-actions-col with z-index: 2, white background, and synchronized hover and active row highlight colors
- Set table min-width to 880px to provide comfortable column spacing during horizontal scrolling
```

---

## [2026-10-01] Documents Table Right Scroller & Dual-Scrollbar Visibility Fix

### Backend (`backend/`)
```text
chore: no backend changes required for documents table right scroller and dual scrollbars
```

### Frontend (`frontend/`)
```text
fix(auditing): force right vertical scroller on 1-item lists and ensure horizontal scroller clearance

- Wrap documents table inside .doc-table-scroll-content with min-height: calc(100% + 2px) to ensure Chromium always paints right vertical scrollbar thumb even on 1-item lists (e.g. audit 801)
- Adjust container height to calc(100vh - 430px) with margin-bottom: 50px so horizontal bottom scrollbar sits safely above fixed Powered by : QLoop footer
- Style custom high-contrast 12px scrollbars with #edf0f5 track, #dce1eb border, and #a4abb8 thumb (min 40px draggable thumb)
- Set min-width: 1850px and width: max-content on .doc-table-scroll-content to allow natural column layout and smooth horizontal scrolling right to Request Date, Reviewed, and Actions
- Sync styles across auditing.vue and styles.css for consistent table scrolling behavior
```

---

## [2026-10-01] Other Open Years Sidebar Full Height & Scrollbar Removal

### Backend (`backend/`)
```text
chore: no backend changes required for sidebar Other Open Years layout
```

### Frontend (`frontend/`)
```text
fix(auditing): remove scrollbar and expand Other Open Years sidebar list to full height and width

- Remove hardcoded calc(100vh - 587px) and overflow: auto on .other-aud in styles.css and auditing.vue
- Set min-height: calc(100vh - 126px) and height: auto on .section-left.leftbar to allow natural full height
- Set width: 100% on .other-aud and list items to prevent text wrapping caused by scrollbar width
- Update year link href to dynamically preserve active tab context (e.g. validation, documents)
```

---

## [2026-10-01] Non-CAM Validation 2-Column Full-Width Grid & Typography Polish

### Backend (`backend/`)
```text
chore: no backend changes required for Non-CAM validation UI layout
```

### Frontend (`frontend/`)
```text
feat(validation): convert Non-CAM obligations to 2-column full-width layout with larger typography

- Replace 3-column col-md-4 flex structure with responsive 2-column full-width CSS grid (.non-cam-grid)
- Increase card padding to 24px and add hover depth shadow transition
- Elevate typography: card title to 16px bold, status badge to 12px pill, metrics to 13.5px-15.5px, and obligation explanation text to 13px
- Enlarge 'Audit & Manage Details' action button with 13.5px text and 9px vertical padding
- Keep automatic matched lease callout visible on Non-CAM validation sub-tab
```

---

## [2026-10-01] Approval Form Audit & Year Isolation & Notification Workflow

### Backend (`backend/`)
```text
feat(approval): isolate approval form preview, document scoping, and add status endpoint

- Fix AuditDocument::scopeVisibleForAudit to strictly scope Common and Lease/Amendment documents by location_id, eliminating cross-property document leakage
- Restrict extractInformationReviewed and extractConcessions in ApprovalRequestSummaryService to active audit location and selected year(s)
- Add GET /api/audits/{auditId}/approval-form-status endpoint to verify form generation status per audit ID and year
- Cache preview generation status in approval_form_status_{auditId}_{yearKey} and persist preview PDF
- Store and filter audit_year in ApprovalController store and index methods
- Verify approve/reject actions dispatch ApprovalStatusMail and AuditWindowNotifications with real-time DashboardEvent
- Add test_approval_form_status_isolation_by_audit_and_year in ApprovalPdfAndValidationTest (all 24 tests, 113 assertions pass)
```

### Frontend (`frontend/`)
```text
feat(approval): enforce audit and year isolation for approval form in creation drawer

- Conditionally display 'Download Approval Form' in New Approval Request drawer only when generated for current audit and year
- Display 'Generate Approval Form ({year})' button when form has not been generated for current audit/year
- Add approvalFormStatusMap reactive cache and sync with backend status endpoint and localStorage
- Add $route.query.id watcher and update beforeRouteUpdate in auditing.vue to reload audit data when switching audit IDs
- Update availableYearsOptions in ApprovalsTab.vue to prioritize and isolate active audit year
- Automatically reset approval request form state when auditId changes
```
