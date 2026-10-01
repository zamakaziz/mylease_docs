# Generated Commit Messages Log

This file logs proposed commit messages for backend and frontend changes after each completed implementation.
> **Note**: These messages are generated for reference and review. Commits are not executed automatically.

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
