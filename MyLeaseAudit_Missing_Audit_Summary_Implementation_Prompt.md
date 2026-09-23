# MyLeaseAudit — Missing Audit Summary PDF Implementation Prompt

## Objective

Enhance the existing MyLeaseAudit Validation → Approval Request PDF workflow. The current PDF contains the basic structure, but comparison with the reference audit summary identified missing or incomplete sections.

Reuse the existing Laravel, Vue, validation, approval, and PDF architecture. Do not rewrite unrelated modules or invent schema names.

## 1. Inspect Before Coding

Inspect and report the exact files for:

- Approval controller and `previewPdf()`
- `ApprovalRequestSummaryService`
- `ApprovalRequestPdfService`
- Blade PDF templates
- Validation calculation services
- Expense statement and lease models
- Findings and observation models
- Concessions, allowances, abatements, additional rent, and deposits data sources
- Information reviewed data source
- Recommendations and request-item data source
- Audit-year and selected-year logic
- PDF library, authorization, storage, and activity logs

Before coding, provide a file-by-file assessment and identify whether each missing item is caused by missing data, incorrect mapping, or a missing Blade section.

## 2. Main Missing or Incomplete Items

Implement or verify the following:

1. Concessions Log
2. Information Reviewed
3. Observations
4. Additional Observations
5. Recommendation / Next Action
6. Detailed Request Items by Year
7. Project Expense Amount mapping
8. Exposure and yearly aggregation
9. Audit-year and selected-year filtering
10. Missing-value handling
11. PDF layout and pagination

## 3. Scope and Filtering

The report must be scoped to the correct:

- `audit_id`
- `selected_years`
- Relevant audit-year/subject-year relationship

Requirements:

- Do not include data from other audits.
- Do not include unselected years.
- Validate selected years on the backend.
- Verify that selected years belong to the current audit.
- Remove duplicate years.
- Test that selecting 2023 does not include 2024 findings.

Use actual project relationships and field names after inspecting the schema.

## 4. Location Summary

Verify and populate:

- Property / Location
- Client
- Tracking ID
- Premises
- Square Footage
- Lease Start Date
- Lease Expiration Date
- Commencement Date
- Property Management
- Lease Currency
- Relevant property details

Do not display `0 SF` when the source value is missing. Distinguish between a legitimate zero and unavailable data.

## 5. Audit Details

Keep existing workflow fields and add/reference these fields when available:

- Subject Years
- Audited Before
- Savings Before
- Audit Right
- Audit Request Restrictions
- Document Section & Page
- Current Stage
- Requested By
- Approver

Do not hardcode Y/N values. Use actual source records and show `N/A` for unavailable values.

## 6. Base Year / Expense Stop

Verify the meaning and mapping of:

- Base Year Expense Stop (Y/N)
- Base Year Expense Stop
- Base Year Amount / Expense Stop

Distinguish missing values from zero, use correct currency formatting, and include relevant notes.

## 7. Exposure & Expense Summary — High Priority

The reference report includes:

- Year
- Project Expense Amount
- Exposure (Subject Years)
- Notes

The generated PDF showed blank Project Expense Amount values and a `$0.00` total while exposure data existed. Investigate the actual source, relationship, mapping, and aggregation before deciding that the calculation is wrong.

Requirements:

- Reuse the same calculation source as the Validation tab.
- Verify Project Expense Amount.
- Verify Exposure.
- Verify yearly and grand totals.
- Verify selected-year filtering.
- Verify currency and decimal handling.
- Verify notes and exceptions.
- Prevent duplicate findings from being double-counted.
- Do not label potential exposure as confirmed savings automatically.

Do not implement separate financial logic inside Blade templates.

## 8. Concessions Log

Add a section similar to the reference report, using actual existing data sources.

Possible subsections:

### Allowances

- Applicable Y/N
- Description
- Amount
- Verification Status
- Lease Reference
- Document Reference
- Notes

### Abatements

- Description
- Amount
- Verification Status
- Effective Date
- Lease Reference
- Notes

### Additional Rent

- Description
- Amount
- Verification Status
- Effective Date
- Lease Reference
- Notes

### Deposits

- Description
- Amount
- Verification Status
- Lease Reference
- Notes

Do not create duplicate tables if the data already exists. Support verified, questionable, pending, and partially verified statuses according to existing values.

Suggested partial:

`resources/views/pdf/approval/sections/concessions-log.blade.php`

## 9. Information Reviewed

Add an Information Reviewed section containing available items such as:

- Lease documents
- Lease amendments
- Expense statements
- Supporting documents
- Prior audit information
- Validation results
- Reconciliation documents

Where available, include:

- Document name/type
- Review status
- Review date
- Section/page
- Source reference
- Reviewer
- Notes

Filter documents to the relevant audit and selected years. Avoid duplicates.

Suggested partial:

`resources/views/pdf/approval/sections/information-reviewed.blade.php`

## 10. Observations and Additional Observations

Keep Validation Findings and Observations separate.

Validation Findings represent issues detected by rules or calculations. Observations represent auditor comments, conclusions, risks, clarifications, and related notes.

Support available fields such as:

- Observation ID
- Title
- Description
- Category
- Severity
- Status
- Financial Impact
- Related Finding
- Lease Reference
- Statement Reference
- Evidence Reference
- Auditor Comments
- Created By / Created At

Also support general or additional observations not linked to one finding.

Requirements:

- Filter by audit and selected years.
- Include linked findings and evidence references.
- Do not duplicate the Discussion module.
- Keep internal-only notes separate where applicable.
- Support long text and safe HTML escaping.

Suggested partial:

`resources/views/pdf/approval/sections/observations.blade.php`

## 11. Recommendation / Next Action

Add a section for:

- Recommendation title
- Description
- Related finding
- Related observation
- Responsible person
- Due date
- Priority
- Status

Examples include requesting clarification, requesting documents, verifying expenses, reviewing lease clauses, confirming concessions, or reconciling statements.

Do not invent unsupported recommendations. Clearly distinguish manually entered recommendations from system-generated suggestions.

Suggested partial:

`resources/views/pdf/approval/sections/recommendations.blade.php`

## 12. Request Items by Year

The reference report includes detailed QC Requests to the Landlord grouped by year. The current PDF contains the heading but not the expected details.

Inspect where request items are stored and verify that the frontend persists them correctly.

Display:

- Year
- Numbered request
- Title
- Description
- Related finding/observation
- Supporting reference

Do not display “No specific request items listed” when valid request items exist. Do not include unrelated years.

Suggested partial:

`resources/views/pdf/approval/sections/request-items.blade.php`

## 13. Summary Service

Extend the existing summary service rather than putting business logic in Blade.

The summary should provide equivalent sections:

```php
[
    'location_summary' => [],
    'audit_details' => [],
    'base_year_expense_stop' => [],
    'expense_summary' => [],
    'concessions' => [],
    'information_reviewed' => [],
    'validation_findings' => [],
    'observations' => [],
    'additional_observations' => [],
    'recommendations' => [],
    'request_items' => [],
]
```

This is a proposed structure only. Use actual project conventions and field names.

## 14. PDF Layout

Use this order where applicable:

1. Header / Request Details
2. Location Summary
3. Audit Details
4. Base Year / Expense Stop
5. Exposure & Expense Summary
6. Concessions Log
7. Information Reviewed
8. Validation Findings
9. Observations
10. Additional Observations
11. Recommendation / Next Action
12. Request Items by Year
13. Footer / Document Metadata

Requirements:

- Reusable Blade partials
- Professional section headings
- Multi-page table support
- Repeated table headers where supported
- Proper page breaks
- Long text support
- Consistent dates and currency
- Safe escaping
- No hardcoded screenshot values
- Appropriate empty-section handling

## 15. Preview vs Final Submission

### Preview

- Validate audit and selected years.
- Verify authorization.
- Load current data.
- Generate a temporary PDF.
- Do not create a final approval snapshot or change approval status.

### Final Submission

- Validate permissions and scope.
- Verify mandatory data.
- Build the final summary.
- Create a snapshot.
- Generate and store the final PDF.
- Store `pdf_path`, generation time, and generating user if supported.
- Update approval status.
- Create an activity log.
- Prevent duplicate submissions.

For submitted requests, use the stored snapshot when appropriate instead of silently rebuilding the report from changed live data.

## 16. Security and Error Handling

Handle:

- Missing audit
- Invalid selected years
- Selected year not belonging to audit
- Incomplete validation
- Missing expense or lease data
- PDF generation failure
- Unauthorized access
- Cross-audit access
- Duplicate submission
- Invalid status transitions

Use backend authorization. Do not rely only on frontend button visibility.

Log technical details server-side and return safe client-facing messages. Do not expose raw exception messages or stack traces.

## 17. Testing

Add tests for:

- Expense summary mapping and aggregation
- Exposure totals
- Currency and decimal handling
- Selected-year filtering
- Concessions
- Information reviewed
- Findings
- Observations
- Recommendations
- Request items by year
- Snapshot creation
- Missing data
- Unauthorized access
- Cross-audit/year isolation
- Duplicate submission
- PDF generation failure
- PDF storage and metadata

Verify that the Validation tab summary and Approval PDF summary match for the same audit and selected-year scope.

## 18. Acceptance Criteria

- [ ] Existing code and schema inspected.
- [ ] Audit and selected-year scope enforced.
- [ ] Location Summary correctly populated.
- [ ] Audit Details completed.
- [ ] Base Year / Expense Stop correctly mapped.
- [ ] Project Expense Amount verified and populated.
- [ ] Exposure and yearly totals verified.
- [ ] Concessions Log added.
- [ ] Information Reviewed added.
- [ ] Validation Findings correctly filtered.
- [ ] Observations and Additional Observations added.
- [ ] Recommendation / Next Action added.
- [ ] Request Items by Year populated.
- [ ] Missing values handled clearly.
- [ ] PDF layout is readable and supports multiple pages.
- [ ] Preview does not create a final approval record.
- [ ] Final submission stores snapshot and PDF reference.
- [ ] Authorization and audit isolation enforced.
- [ ] Duplicate submissions prevented.
- [ ] Activity logs created.
- [ ] Automated tests added and passing.
- [ ] PDF values reconcile with the Validation tab.

## Final Instruction

Start by inspecting the current implementation and list the exact files that need changes. Then implement incrementally.

For each change:

1. Explain the purpose.
2. Identify the file being modified.
3. Reuse existing code.
4. Avoid duplicate calculations.
5. Preserve audit and selected-year filtering.
6. Add or update tests.
7. Report assumptions.
8. Verify the result before claiming completion.

Focus on completing the missing audit summary fields and integrating them into the existing Validation-based Approval PDF workflow.
