# MyLeaseAudit — Approval PDF Changes Prompt

## Objective

Update the Approval Request PDF based on the latest review. Preserve the expected validation category **Lease-CAM Conflict**, and correct or verify request ID, preview status, data mapping, and consistency between findings, recommendations, and request items.

Reuse the existing Laravel, Vue, validation, approval, summary-service, and PDF architecture. Do not rewrite unrelated modules or invent database fields.

## 1. Validation Findings Category

The expected category is:

```text
Lease-CAM Conflict
```

Requirements:

- Preserve the category from the validation record.
- Verify category mapping from the database to the summary service, Validation tab, and PDF.
- Do not replace the category with `CAM`, `Lease Conflict`, `Overcharge`, or `Cap Violation`.
- Do not derive the category only from the finding title or status.
- Keep category and status separate.
- `Lease-CAM Conflict` is the category.
- `Cap Exceeded` is the status.
- Keep the category consistent in:
  - Validation tab
  - Approval PDF
  - Recommendation / Next Action
  - Request Items by Year
  - Activity logs, where applicable

Example:

```text
Category: Lease-CAM Conflict
Issue: TOTAL TAXES exceeds Original Lease cap ($15,000)
Severity: High
Exposure: $2,286,679.00
Status: Cap Exceeded
```

## 2. Request ID and Preview Status

The current PDF displays:

```text
Request ID: PREVIEW
Status: DRAFT
```

This is acceptable for a temporary preview, provided that `PREVIEW` is not saved as a permanent request ID.

Expected behavior:

| State | Request ID | Status |
|---|---|---|
| Temporary preview | PREVIEW | DRAFT |
| Saved draft | Actual request number | DRAFT |
| Submitted request | Actual request number | Current workflow status |

Requirements:

- Preview must not create an unintended final approval request.
- Do not save `PREVIEW` as a permanent request ID.
- Generate the real request ID when the approval request is created or saved.
- Use the actual saved approval status for draft/submitted requests.
- Keep the tracking ID, audit ID, approval primary key, and request ID separate.
- Verify whether the real request number should be generated before saving or during final submission according to existing business rules.

## 3. Header Verification

Verify:

- Approval request title
- Tracking ID
- Request ID
- Status
- Generated date/time
- Confidentiality footer

Use `PREVIEW` only for temporary preview output. Use the actual request ID for saved and submitted records. Use the correct timezone and date format.

## 4. Location Summary

Verify the mapping for:

- Property / Location
- Client
- Tracking ID
- Square Footage
- Premises Details
- Commencement Date
- Expiration Date
- Property Management
- Lease Currency

Requirements:

- Inspect the actual relationships.
- Determine whether values are missing in the database or lost during summary mapping.
- Do not add fake or hardcoded values.
- Distinguish a valid zero from a missing value.
- Show `N/A` only when the source data is unavailable.

## 5. Audit Details

Verify:

- Subject Years
- Current Stage
- Target Stage
- Audit Started Date
- Audited Before
- Requested By
- Approver
- Savings Before
- Audit Right

Map each value from the correct source. Do not hardcode Y/N values. Ensure current stage and target stage are not confused.

## 6. Base Year / Expense Stop

Verify:

- Base Year / Expense Stop (Y/N)
- Base Year / Expense Stop
- Base Year Amount / Expense Stop

Confirm the meaning of each field. Distinguish applicability from amount, and zero from missing. Apply correct currency formatting.

## 7. Exposure & Expense Summary

The report contains:

```text
Year
Project Expense Amount
Exposure (Subject Years)
Notes
```

The Project Expense Amount may be blank while exposure is populated.

Required investigation:

- Identify the authoritative calculation used by the Validation tab.
- Reuse the same calculation source for the PDF.
- Verify project expense amount mapping.
- Verify exposure calculation.
- Verify yearly and grand totals.
- Verify selected-year filtering.
- Prevent duplicate findings from being counted twice.
- Verify currency and decimal formatting.
- Verify notes and exceptions.

Do not put independent financial calculations inside the Blade template. Do not automatically treat exposure as confirmed savings.

## 8. Recommendation / Next Action

Verify:

- Action item / recommendation
- Description
- Related finding reference
- Priority
- Status
- Estimated exposure
- Number of related findings

Requirements:

- Preserve `Lease-CAM Conflict` as the related finding category.
- Do not mark a grouped recommendation as `Excluded` when related findings have different statuses.
- Show the number of grouped findings accurately.
- Ensure estimated exposure is calculated from the intended related findings.
- Prevent duplicate findings in grouped totals.

## 9. Request Items by Year

Verify that request items are generated from the correct validation findings.

Each item should include:

- Year
- Request number
- Request description
- Related finding ID
- Related finding category
- Related issue
- Supporting reference

Requirements:

- Preserve `Lease-CAM Conflict` where applicable.
- Filter by audit and selected years.
- Prevent unintended duplicate requests.
- Ensure every request points to the correct finding.
- Verify that the request count matches the intended findings.
- Support long descriptions in the PDF.

## 10. Information Reviewed

Verify:

- Document name
- Document type and subtype
- Year
- Status
- Review date
- Source / Notes

Include only documents related to the audit. Confirm whether `Common` documents should appear for every selected year. Avoid duplicate entries.

## 11. Concessions and Observations

Verify handling of:

- Allowances
- Abatements
- Additional rent
- Deposits
- Observation title and description
- Severity and status
- Financial impact
- Related finding
- Evidence reference
- Auditor comments

Do not create fake records when no data exists. Handle empty states correctly. Keep validation findings separate from observations. Exclude placeholder text from production PDFs.

## 12. Audit and Selected-Year Scope

All sections must be filtered by:

```text
audit_id
selected_years
```

Requirements:

- Validate selected years on the backend.
- Confirm selected years belong to the audit.
- Prevent cross-audit and cross-year data leakage.
- Do not silently include all years when specific years are selected.
- Remove duplicate selected years.
- Test one year and multiple years.

## 13. PDF Layout

Requirements:

- Keep consistent section headings.
- Support multi-page tables.
- Preserve long issue descriptions.
- Use consistent dates and currency.
- Escape dynamic HTML safely.
- Avoid orphaned section headings.
- Group request items by year.
- Keep the PDF suitable for approval review.

## 14. Security and Error Handling

Handle:

- Missing audit
- Invalid selected years
- Selected year not belonging to the audit
- Unauthorized access
- Missing lease or expense data
- PDF generation failure
- Duplicate submission
- Invalid workflow transitions

Use backend authorization. Log technical details server-side. Do not expose raw exception messages or stack traces.

## 15. Testing Requirements

Add or update tests for:

- `Lease-CAM Conflict` category mapping
- Category and status remaining separate
- Preview displaying `PREVIEW`
- Saved draft displaying the real request ID
- Submitted request displaying the real request ID
- `PREVIEW` never being stored permanently
- Location and audit detail mapping
- Expense summary and exposure reconciliation
- Selected-year filtering
- Recommendation status consistency
- Request item-to-finding relationships
- Cross-audit and cross-year isolation
- Unauthorized access
- Duplicate submission prevention
- PDF generation and multi-page rendering

Compare the Validation tab and Approval PDF for the same audit and selected-year scope.

## 16. Implementation Sequence

1. Inspect the current controller, summary service, PDF service, Blade templates, models, and relationships.
2. Trace the finding category from the database to the Validation tab and PDF.
3. Ensure `Lease-CAM Conflict` is preserved.
4. Separate preview request ID/status from saved request ID/status.
5. Verify location, audit, expense, findings, observations, recommendations, and request-item mapping.
6. Add or update tests.
7. Generate and inspect the PDF for one year and multiple years.
8. Verify that preview does not create an unintended final approval record.

## Acceptance Criteria

- [ ] Validation category displays `Lease-CAM Conflict` when applicable.
- [ ] Category and status are separate.
- [ ] Validation tab and PDF show consistent categories.
- [ ] Preview displays `Request ID: PREVIEW` only for temporary output.
- [ ] `PREVIEW` is never stored as a permanent request ID.
- [ ] Saved and submitted requests use the actual request ID.
- [ ] Location and audit fields are correctly mapped or safely shown as `N/A`.
- [ ] Expense and exposure values are verified against the Validation tab.
- [ ] Recommendation status matches its related findings.
- [ ] Request items are linked to the correct findings and years.
- [ ] Audit and selected-year filtering is enforced.
- [ ] Authorization and audit isolation are enforced.
- [ ] Tests are added or updated.
- [ ] PDF output is verified before completion is reported.

## Final Instruction

Start by inspecting the existing implementation and list the exact files requiring changes. Explain the root cause before modifying code. Reuse existing business logic, preserve `Lease-CAM Conflict`, keep preview and final request IDs separate, maintain audit/year filtering, and verify the generated PDF before claiming completion.
