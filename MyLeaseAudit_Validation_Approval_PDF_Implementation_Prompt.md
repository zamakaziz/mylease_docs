# MyLeaseAudit — Validation-Based Approval PDF Implementation Prompt

## Role

You are a senior Laravel and Vue.js engineer working on the existing **MyLeaseAudit** application.

Implement a feature that generates a professional **Audit Validation Approval Request PDF** using the selected audit, audit year, validation results, expense calculations, findings, observations, and approval request details.

Before making changes:

1. Inspect the existing project structure.
2. Review current Laravel models, migrations, controllers, services, routes, policies, and Vue components.
3. Identify existing approval request functionality.
4. Identify existing Validation tab functionality and calculation logic.
5. Reuse existing code and database structures wherever possible.
6. Do not create duplicate tables, services, calculations, or API endpoints without checking the current implementation first.

---

# 1. Business Requirement

Under the Audit section, users can create a **New Approval Request**.

When a request is created, the system must prepare a PDF report based on the selected audit and relevant validation results.

The PDF should follow the structure and visual style of the attached approval request example. It should contain dynamic data from the application rather than hardcoded values.

The report should help an approver understand:

- Which audit and audit year are being reviewed
- Which property/location and lease are involved
- What expense amounts were identified
- What validation issues were found
- What financial exposure or potential differences were calculated
- What observations and evidence are available
- What actions or decisions are requested

The PDF must be generated using backend data and must not perform independent calculations inside the Blade template.

---

# 2. Reference PDF Sections

Use the attached approval request screenshot as the design reference.

The PDF should support the following sections:

1. Header and approval request information
2. Location Summary
3. Audit Details
4. Base Year / Expense Stop details
5. Exposure & Expense Summary
6. Concessions Log
7. Information Reviewed
8. Observations
9. Additional Observations
10. Recommendation / Next Action
11. Request Items by Year
12. Approval decision information
13. Footer and document metadata

The implementation may adjust the layout if necessary for readability, page breaks, and available data. Do not invent fields that are not available in the existing system.

---

# 3. Expected Workflow

```text
User opens Audit
        ↓
User selects Audit Year / Subject Years
        ↓
User opens New Approval Request
        ↓
System loads audit and validation data
        ↓
System validates data readiness and permissions
        ↓
System builds approval summary
        ↓
User previews or reviews the summary
        ↓
User submits approval request
        ↓
System creates an approval snapshot
        ↓
System generates PDF
        ↓
System stores PDF reference
        ↓
Approval workflow continues
```

Separate these actions where appropriate:

- Preview approval summary/PDF
- Create draft approval request
- Submit approval request
- Generate final submitted PDF
- View existing generated PDF

---

# 4. Data Source Rules

The PDF must use the existing application data.

Before implementation, identify the actual names and relationships for:

```text
Audits
Audit Years
Locations / Properties
Clients
Leases
Lease Amendments
Expense Statements
Expense Statement Items
Validation Runs
Validation Findings
Observations
Evidence/Documents
Approval Requests
Activity Logs
```

These names are examples only. Use the actual project schema.

Do not assume that these tables already exist with these exact names.

The report must be scoped correctly using:

```text
audit_id
audit_year_id
```

If the approval request supports multiple subject years, explicitly preserve the selected subject-year scope.

Do not accidentally include data from unrelated audits or audit years.

---

# 5. Validation Expense Summary

Create or reuse a dedicated service for preparing the expense summary.

Suggested service:

```text
app/Services/Validation/ValidationExpenseSummaryService.php
```

Use the existing Validation calculation logic as the source of truth.

Do not implement a separate calculation algorithm only for the PDF.

The summary may include, depending on the existing schema:

- Project Expense Amount
- Allowed / Validated Expense Amount
- Exposure Amount
- Excluded Expense Amount
- Potential Difference
- Disputed Amount
- Confirmed Amount
- Notes
- Expense category totals
- Yearly totals

The exact field definitions must be confirmed from the existing business logic.

Important:

- Do not label a potential difference as confirmed savings unless the existing business process confirms it.
- Do not assume that every validation finding represents recoverable money.
- Keep financial terminology consistent with the current application.
- Respect currency and number formatting.
- Avoid floating-point calculation errors for monetary values; use appropriate decimal handling.

Expected internal structure:

```php
[
    'audit_year_id' => 2025,
    'currency' => 'USD',
    'project_expense_amount' => 0,
    'allowed_expense_amount' => 0,
    'exposure_amount' => 0,
    'potential_difference' => 0,
    'disputed_amount' => 0,
    'items' => [
        [
            'category' => '',
            'statement_amount' => 0,
            'allowed_amount' => 0,
            'difference' => 0,
            'notes' => '',
        ],
    ],
]
```

Use the actual field names and calculation definitions from the application.

---

# 6. Validation Findings

Load validation findings belonging to the relevant audit and audit year.

Possible information:

- Validation Finding ID
- Category
- Issue Type
- Severity
- Confidence
- Summary
- Explanation
- Lease Clause Reference
- Statement Line Reference
- Estimated Exposure
- Checklist Impact
- Stage Impact
- Status
- Source Document
- Linked Observation

The PDF should include a concise summary table and detailed finding information when required.

Possible summary columns:

```text
Finding ID
Issue
Category
Severity
Confidence
Exposure
Status
```

Do not include irrelevant findings.

Use the existing approval request business rules to determine whether the PDF includes:

- All findings
- Only selected findings
- Only reviewed findings
- Only findings with financial exposure
- Findings with specific statuses

If the existing requirement is unclear, implement a configurable approach and document the assumption.

---

# 7. Observations and Evidence

The report should support existing observations related to validation findings.

When an observation is linked to a validation finding, include relevant information such as:

- Observation title
- Description
- Severity
- Financial impact
- Lease reference
- Statement reference
- Evidence reference
- Auditor comments
- Status

Do not duplicate large files inside the PDF.

Use readable evidence references, document names, page numbers, or links according to the current application design.

If the system already has a Discussion or Notes feature linked to findings, preserve the integration point without rebuilding the entire discussion system.

---

# 8. Approval Request Snapshot

When an approval request is submitted, preserve the data used to generate the report.

Recommended approach:

```text
Approval Request
       ↓
Approval Snapshot
       ├── Audit Details
       ├── Location Summary
       ├── Selected Subject Years
       ├── Expense Summary
       ├── Validation Findings
       ├── Observations
       ├── Recommendations
       └── Request Items
```

The snapshot can use JSON or normalized snapshot tables depending on the existing architecture.

For the MVP, a JSON snapshot may be acceptable if it meets the project's auditability and reporting requirements.

The snapshot must preserve:

- Audit and audit-year scope
- Data values used in the request
- Selected findings
- Selected observations
- Summary totals
- User who created/submitted the request
- Timestamp
- Relevant rule/calculation version if available

When viewing an already-submitted approval request, load the snapshot rather than silently rebuilding the report from changed live data.

If regeneration is supported, make it an explicit action and log it.

---

# 9. Suggested Services

Inspect the current codebase before creating these classes.

Potential service structure:

```text
app/Services/Approval/ApprovalRequestSummaryService.php
app/Services/Approval/ApprovalRequestPdfService.php
app/Services/Validation/ValidationExpenseSummaryService.php
```

## ApprovalRequestSummaryService

Responsibilities:

1. Load audit and audit-year details.
2. Load location and lease details.
3. Load relevant expense data.
4. Load validation summary.
5. Load validation findings.
6. Load observations and evidence references.
7. Build recommendations and request items.
8. Return a structured report data object/array.

## ApprovalRequestPdfService

Responsibilities:

1. Receive an approval request or report data object.
2. Load the appropriate snapshot.
3. Render the Blade view.
4. Generate the PDF using the existing configured PDF library.
5. Store the generated file.
6. Return the stored file reference.
7. Handle errors safely.
8. Log PDF generation events.

Do not put business calculations inside Blade templates.

---

# 10. Blade PDF Structure

Use reusable Blade partials.

Suggested structure:

```text
resources/views/pdf/approval/
    approval-request.blade.php
    sections/
        header.blade.php
        location-summary.blade.php
        audit-details.blade.php
        base-year-expense-stop.blade.php
        expense-summary.blade.php
        concessions-log.blade.php
        information-reviewed.blade.php
        validation-findings.blade.php
        observations.blade.php
        recommendations.blade.php
        request-items.blade.php
        footer.blade.php
```

The exact structure may be adapted to the current project.

Requirements:

- Professional, readable styling
- Consistent typography
- Table headers repeated on new pages where supported
- Avoid rows splitting awkwardly
- Use clear section headings
- Support long finding descriptions
- Handle missing values gracefully
- Use page breaks where appropriate
- Display currency consistently
- Do not display empty sections unless required
- Do not hardcode example values from the screenshot

---

# 11. API Requirements

Inspect and reuse existing approval routes.

Suggested endpoint patterns:

```http
GET /audits/{auditId}/years/{auditYearId}/approval-summary
POST /audits/{auditId}/years/{auditYearId}/approval-requests
GET /approval-requests/{approvalRequestId}
GET /approval-requests/{approvalRequestId}/pdf
POST /approval-requests/{approvalRequestId}/submit
POST /approval-requests/{approvalRequestId}/decision
```

These are proposed patterns. Match the existing route naming and API conventions.

## API behavior

### Preview Summary

- Validate audit and audit-year relationship.
- Check user permissions.
- Verify data availability.
- Return structured summary data.
- Do not create a final approval request.

### Create Approval Request

- Validate request input.
- Verify permissions.
- Verify selected audit and audit-year scope.
- Load required data.
- Build snapshot.
- Create draft request.
- Return request details.

### Submit Approval Request

- Validate current request status.
- Check mandatory data.
- Build or confirm snapshot.
- Generate and store PDF.
- Change status to Pending Approval.
- Create activity log.
- Return the submitted request.

### View PDF

- Verify access permissions.
- Return the stored PDF.
- Do not unexpectedly regenerate it.

---

# 12. Vue.js Requirements

Integrate with the existing Vue approval request UI.

The New Approval Request modal should:

1. Display the relevant audit and audit-year information.
2. Allow selection of subject years or findings if supported.
3. Display a summary before submission.
4. Show loading states.
5. Display validation errors.
6. Prevent duplicate submissions.
7. Allow the user to preview the PDF if supported.
8. Submit the request through the existing API conventions.
9. Display success/error notifications using the existing notification system.
10. Refresh the approval request listing after successful creation/submission.

Do not introduce a new UI framework or replace existing components without a clear reason.

Follow the current project styling and component patterns.

---

# 13. Permissions and Security

Enforce permissions on the backend.

Do not rely only on hiding frontend buttons.

Verify:

- User can access the audit.
- User can access the audit year.
- User can view validation data.
- User can create an approval request.
- User can submit an approval request.
- User can view the generated PDF.
- User can approve or reject based on configured roles.

Protect against:

- Cross-audit data access
- Cross-year data access
- Unauthorized PDF access
- Duplicate submission
- Invalid approval status transitions
- Manipulation of financial totals from frontend input

All important financial values must be calculated or verified server-side.

---

# 14. Activity Logging

Log important actions, including:

```text
Approval summary viewed
Approval request created
Approval request submitted
Approval PDF generated
Approval PDF regenerated
Approval PDF viewed
Approval request approved
Approval request rejected
```

Activity details should include where available:

```text
User
Timestamp
Action
Audit ID
Audit Year ID
Approval Request ID
Previous Status
New Status
```

Use the existing activity log implementation if available.

---

# 15. Error Handling

Handle the following cases:

## Missing Audit Year

```text
The audit year is required.
```

## Validation Not Completed

```text
Validation results are not ready.
Please complete the required validation process first.
```

## Missing Extraction Data

```text
Required extraction or review data is unavailable.
```

## Missing Expense Data

```text
Required expense statement data is unavailable.
```

## PDF Generation Failure

```text
The approval request was not completed because the PDF could not be generated.
```

Do not mark a request as successfully submitted if the required PDF generation fails, unless the existing workflow explicitly supports asynchronous generation.

Use transactions where appropriate. Ensure failures do not leave inconsistent approval request states.

---

# 16. Duplicate and Regeneration Handling

Prevent users from accidentally creating duplicate approval requests by repeatedly clicking the submit button.

Implement:

- Frontend loading/disabled state
- Backend validation
- Appropriate status checks
- Idempotency or duplicate detection where appropriate

When regenerating a PDF:

- Make it an explicit action.
- Preserve the previous file reference if required.
- Record who regenerated it and when.
- Do not silently alter an already-approved document.

---

# 17. Testing Requirements

## Unit Tests

Test:

- Expense summary calculations
- Yearly aggregation
- Currency/decimal calculations
- Validation finding aggregation
- Snapshot creation
- Empty/missing data handling
- Duplicate prevention

## Feature/API Tests

Test:

- Preview summary
- Create approval request
- Submit approval request
- View PDF
- Unauthorized access
- Cross-audit access prevention
- Cross-audit-year access prevention
- Invalid status transitions
- PDF generation failure

## Audit Year Tests

Example:

```text
Audit
 ├── 2023 → 10 findings
 └── 2024 → 5 findings
```

Selecting 2023 must not include 2024 findings.

## PDF Tests

Verify:

- Header data
- Location summary
- Audit details
- Expense summary totals
- Validation findings
- Observations
- Request items
- Page breaks
- Long text
- Missing optional values
- Currency formatting
- Stored PDF reference

## Consistency Test

Compare:

```text
Validation Tab Summary
        vs
Approval PDF Summary
```

The values must match for the same scope and snapshot.

---

# 18. Implementation Constraints

Follow these rules:

1. Inspect before modifying.
2. Reuse existing models, services, routes, and components.
3. Do not duplicate validation calculations.
4. Do not hardcode screenshot data.
5. Do not assume table names without checking migrations.
6. Do not change unrelated modules.
7. Keep changes modular and testable.
8. Follow existing coding standards.
9. Add migrations only when genuinely required.
10. Preserve backward compatibility.
11. Do not expose unauthorized audit information.
12. Do not treat potential exposure as confirmed savings automatically.
13. Use backend authorization.
14. Keep PDF generation separate from business logic.
15. Preserve submitted report data through a snapshot.

---

# 19. Expected Deliverables

Provide the implementation in small, reviewable steps.

Expected deliverables:

```text
1. Existing architecture/schema assessment
2. Database changes, only if required
3. Summary service
4. Expense aggregation logic
5. Approval snapshot implementation
6. PDF service
7. Blade PDF template
8. API endpoints/controllers
9. Vue integration
10. Permission updates
11. Activity logging
12. Automated tests
13. Documentation
```

Before coding, report:

- Relevant existing files
- Existing models and relationships
- Existing validation calculation location
- Existing approval request implementation
- Existing PDF library
- Required database changes
- Potential risks or unclear requirements

Do not immediately rewrite large sections of the application.

---

# 20. Recommended Development Order

Implement in this order:

## Phase 1 — Discovery

- Inspect existing schema.
- Inspect validation module.
- Inspect approval module.
- Inspect PDF generation setup.
- Inspect authorization and activity logging.

## Phase 2 — Summary

- Build/reuse the expense summary service.
- Confirm calculations with existing Validation tab.
- Add automated tests.

## Phase 3 — Snapshot

- Define snapshot structure.
- Store audit-year scope.
- Store summary and selected findings.
- Add tests.

## Phase 4 — PDF

- Build the PDF data contract.
- Implement the Blade sections.
- Generate a preview.
- Verify layout and totals.

## Phase 5 — Approval Integration

- Connect create request.
- Connect submit request.
- Store PDF reference.
- Connect existing approval decision workflow.

## Phase 6 — Quality and Security

- Add authorization tests.
- Add audit-year isolation tests.
- Add activity logs.
- Add duplicate prevention.
- Test PDF generation failures.

---

# 21. Acceptance Criteria

The feature is complete when:

- [ ] Existing approval request functionality is understood and reused.
- [ ] Audit and audit-year scope is correctly enforced.
- [ ] Validation data is loaded from the existing source of truth.
- [ ] Expense summary uses the same calculation logic as the Validation tab.
- [ ] The PDF contains dynamic audit and location details.
- [ ] The PDF contains yearly expense summary data.
- [ ] The PDF contains validation findings.
- [ ] The PDF contains relevant observations and evidence references.
- [ ] The PDF contains recommendations and request items.
- [ ] The request snapshot is stored at submission.
- [ ] The generated PDF is stored and linked to the approval request.
- [ ] Existing approval workflow is integrated.
- [ ] Approve/reject permissions are enforced.
- [ ] Activity logs are created.
- [ ] Duplicate submissions are prevented.
- [ ] Cross-audit and cross-year access is prevented.
- [ ] Missing data is handled clearly.
- [ ] PDF totals match the Validation tab.
- [ ] Automated tests are added and passing.

---

# 22. Final Instruction to the Implementer

Start by inspecting the existing MyLeaseAudit codebase and provide a concise implementation assessment.

Then implement the feature incrementally.

For every change:

1. Explain which files will be changed.
2. Explain why the change is required.
3. Reuse existing code whenever possible.
4. Keep calculations in services, not templates.
5. Verify audit and audit-year filtering.
6. Add or update tests.
7. Report any assumptions clearly.
8. Do not claim completion without verifying the implementation.

The final result should be a maintainable, secure, auditable, and professional Validation-based Approval Request PDF workflow integrated into the existing MyLeaseAudit Laravel and Vue application.
