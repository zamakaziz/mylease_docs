# Validation UI/UX Implementation Prompt

## Target Page

Implement the changes under the **Validation submenu** of the Auditing page:

`http://192.168.0.2:3000/auditing?tab=validation&id=800`

---

## Objective

Improve the Validation UI/UX based on the client requirement.

The current Validation Results middle section is difficult to use because of horizontal scrolling and nested scrolling.

The new implementation must provide:

1. A clean three-panel comparison workspace in the default view.
2. No horizontal scrolling in Validation Results at supported desktop resolutions.
3. A compact Validation Results summary.
4. An Expand / Full View mode for detailed validation work.
5. Pagination or controlled loading instead of a nested vertical scrollbar.
6. Sticky table headers.
7. Clear visual relationship between:
   - CAM Expense / Statement Item
   - Validation Result
   - Lease Expense Matrix category

---

# 1. Preserve the Existing Three-Panel Layout

The default Validation screen must remain a three-panel workspace:

```text
┌──────────────────┬──────────────────────────┬──────────────────────┐
│                  │                          │                      │
│   CAM Expenses   │    Validation Results    │ Lease Expense Matrix │
│                  │                          │                      │
│     LEFT         │         MIDDLE           │        RIGHT         │
│                  │                          │                      │
└──────────────────┴──────────────────────────┴──────────────────────┘
```

Do NOT remove the existing three-panel comparison workflow.

The auditor should still be able to compare:

**Statement Expense → Validation Result → Lease Treatment**

---

# 2. Fix Validation Results Horizontal Scrolling

The current Validation Results table should NOT require horizontal scrolling at supported desktop resolutions.

Do not simply reduce the font size to solve this.

Instead, redesign the default Validation Results table as a **compact summary view**.

Only display the most important fields required for quick scanning.

Example:

| Expense | Amount | Status | Result |
|---|---:|---|---|
| Electricity | $5,000 | Allowed | Matched |
| Cleaning | $2,500 | Review | Cap Exceeded |
| Security | $1,200 | Excluded | Not Allowed |

The exact columns should be based on the existing application data and business logic.

Avoid adding many columns to the default view.

---

# 3. Detailed Information

Detailed information should NOT be displayed as additional columns in the default three-panel view.

Instead, the auditor should be able to:

1. Select a Validation Result row.
2. View the selected item's details.
3. Use the existing or appropriate **Review & Correct** action.

The goal is:

**Default view = quick scanning**

**Review & Correct = detailed investigation/correction**

Do not overload the middle table with unnecessary columns.

---

# 4. Add Expand / Full View

Add an obvious control to the Validation Results panel:

```text
[ Expand / Full View ]
```

The control should be available in the Validation Results header.

When the auditor clicks **Expand / Full View**:

### Collapse

- CAM Expenses panel
- Lease Expense Matrix panel

### Expand

Validation Results should occupy the primary/full workspace.

Example:

```text
┌──────────────────────────────────────────────────────────────┐
│ Validation Results                         [Collapse View]  │
├──────────────────────────────────────────────────────────────┤
│ Search | Filters | Sort | Validation Actions                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Detailed Validation Results                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

When the auditor clicks **Collapse View**, restore the normal three-panel layout.

---

# 5. Full View Features

The expanded Validation Results view should provide additional functionality that does not fit comfortably in the compact three-panel layout.

Include:

### Search

Allow searching Validation Results.

Example:

```text
[ Search validation results... ]
```

Search should work against relevant fields such as:

- Expense name
- Description
- Category
- Lease information
- Validation status
- Other existing searchable fields

Use the existing backend/API where possible.

---

### Filtering

Provide filters appropriate to the existing validation data.

At minimum, consider:

- Validation Status
- Lease Treatment / Category
- Matched Lease Type
- Review Required
- Allowed / Excluded / Cap Exceeded

Do not create fake filters if the underlying data does not support them.

Use the existing business logic/data structures.

---

### Sorting

Allow sorting on useful columns such as:

- Expense
- Amount
- Validation Status
- Category
- Date
- Other relevant existing fields

Sorting should work correctly with pagination/server-side loading if applicable.

---

### Validation Actions

Keep the existing validation actions available in Full View.

Do not duplicate or create conflicting validation workflows.

Reuse existing actions/components/business logic wherever possible.

---

# 6. Replace Nested Vertical Scrollbar

The Validation Results section currently has its own nested vertical scrollbar.

Remove the dependency on a small internal/nested scrollbar.

Use:

### Preferred

Pagination.

Example:

```text
Showing 1–10 of 58

[Previous] [1] [2] [3] [4] [5] [Next]
```

The page size should be configurable if the existing application supports this.

OR use another controlled loading mechanism if pagination is already implemented elsewhere in the application.

Do NOT create an unnecessarily tall nested scrolling table.

---

# 7. Sticky Table Header

The Validation Results table header must remain visible while the table content is being viewed.

Example:

```text
┌─────────────────────────────────────────────────────┐
│ Expense | Amount | Status | Result | Category      │ ← STICKY
├─────────────────────────────────────────────────────┤
│ Electricity | $5,000 | Allowed | Matched | Utility │
│ Cleaning    | $2,500 | Review  | Cap     | CAM     │
│ Security    | $1,200 | Excluded| Not Allowed       │
└─────────────────────────────────────────────────────┘
```

The header should remain visible without interfering with the existing page header/navigation.

---

# 8. Statement Expense → Validation Result → Lease Treatment Relationship

This is a critical requirement.

The auditor must always be able to understand the relationship:

```text
Statement Item
      ↓
Validation Result
      ↓
Lease Treatment
```

When the auditor selects a Statement/CAM Expense from the left panel:

### Highlight

1. The selected Statement Expense.
2. Its corresponding Validation Result.
3. Its mapped Lease Expense Matrix category, when available.

Example:

```text
CAM Expenses
────────────────────
Electricity $5,000
     ↑ SELECTED

        ↓

Validation Results
────────────────────
Electricity $5,000
     ↑ HIGHLIGHTED

        ↓

Lease Expense Matrix
────────────────────
Utilities
     ↑ HIGHLIGHTED
```

The highlighting must be visually clear but should remain professional and consistent with the existing UI design.

---

# 9. Reverse Selection

Where technically supported, also maintain the relationship in the opposite direction.

If the auditor selects a Validation Result:

```text
Validation Result
        ↓
CAM Expense
        ↓
Lease Expense Matrix
```

Highlight the corresponding records in the other panels.

The same should happen when selecting a mapped Lease Expense Matrix category where a corresponding validation result exists.

Do not break existing selection behavior.

---

# 10. Selected Row State

Create a clear selected state for rows.

For example:

```text
Normal row
────────────────────────

Selected row
════════════════════════
Electricity   $5,000
════════════════════════
```

The selected state should be visually different from:

- Hover state
- Validation status colors
- Error/review colors

Do not use the same color for row selection and validation status.

---

# 11. Validation Status Must Remain Clear

Do not remove or weaken the existing validation status indicators.

Existing statuses such as:

- Allowed
- Excluded
- Review Required
- Cap Exceeded
- Other existing statuses

must continue to be clearly visible.

Follow the application's existing status colors and conventions wherever possible.

---

# 12. Responsive Desktop Behavior

The primary requirement is supported desktop resolutions.

Ensure the three-panel layout uses the available viewport width efficiently.

Do NOT solve the problem by introducing horizontal scrolling.

The default view should prioritize:

```text
CAM Expenses
      +
Validation Results
      +
Lease Expense Matrix
```

with the Validation Results table remaining compact.

For smaller widths where the three-panel layout genuinely cannot fit, follow the application's existing responsive behavior rather than forcing excessive compression.

---

# 13. Reuse Existing Components and APIs

Before implementing new components:

1. Inspect the existing Validation page.
2. Identify the existing:
   - Validation Results component
   - CAM Expenses component
   - Lease Expense Matrix component
   - API endpoints
   - Validation data models
   - Row selection logic
   - Review & Correct functionality
   - Filtering/sorting functionality
   - Pagination functionality
3. Reuse existing functionality wherever possible.

Do NOT duplicate existing business logic.

Do NOT create hardcoded validation results.

Do NOT modify validation calculation/business rules unless required for the UI behavior.

This task is primarily a **UI/UX and interaction improvement**.

---

# 14. Important Existing Functionality

Do not break any existing Validation functionality, including:

- Running validation
- Selecting a statement
- Viewing validation results
- Saving validation results
- Review & Correct
- Validation status
- Lease matching
- Lease Expense Matrix mapping
- Existing validation actions
- Existing filters/actions
- Existing API integrations

All current business rules must continue to work.

---

# 15. Component Behavior

Recommended structure:

```text
Validation Workspace
│
├── CAM Expenses Panel
│
├── Validation Results Panel
│   ├── Compact Summary View
│   ├── Expand / Full View
│   ├── Search
│   ├── Filters
│   ├── Sorting
│   ├── Validation Actions
│   ├── Sticky Header
│   └── Pagination
│
└── Lease Expense Matrix Panel
```

Expanded mode:

```text
Validation Workspace
│
└── Validation Results Full View
    ├── Search
    ├── Filters
    ├── Sorting
    ├── Actions
    ├── Detailed Columns
    ├── Sticky Header
    └── Pagination
```

---

# 16. Do Not Use Horizontal Scrolling as the Solution

Do NOT implement:

```text
Validation Results
──────────────────────────────────────────────→
                         horizontal scrollbar
```

as the solution.

Instead:

### Default

Show fewer important columns.

### Expanded

Use the full available workspace and show additional columns.

This is the main UX requirement.

---

# 17. Acceptance Criteria

The implementation is complete only when all of the following are satisfied:

### Default View

- [ ] Validation remains a three-panel workspace.
- [ ] CAM Expenses remains on the left.
- [ ] Validation Results remains in the middle.
- [ ] Lease Expense Matrix remains on the right.
- [ ] Validation Results is compact.
- [ ] No horizontal scrolling is required at supported desktop resolutions.
- [ ] Important validation information is immediately visible.
- [ ] Detailed information is accessed through row selection / Review & Correct.

### Full View

- [ ] Expand / Full View button is available.
- [ ] Clicking it collapses the left and right comparison panels.
- [ ] Validation Results uses the full workspace.
- [ ] Additional columns are available.
- [ ] Search is available.
- [ ] Filtering is available.
- [ ] Sorting is available.
- [ ] Validation actions remain available.
- [ ] User can return to the normal three-panel layout.

### Table UX

- [ ] Nested vertical scrollbar is removed/reduced.
- [ ] Pagination or controlled loading is implemented.
- [ ] Table header is sticky.
- [ ] Table remains usable with the available viewport.

### Relationship Mapping

- [ ] Selecting a CAM/Statement expense highlights its Validation Result.
- [ ] Selecting a CAM/Statement expense highlights its Lease Expense Matrix mapping when available.
- [ ] Selecting a Validation Result highlights the corresponding source expense.
- [ ] Selecting a Validation Result highlights the corresponding Lease Expense Matrix category when available.
- [ ] The relationship remains visually clear:

  **Statement Item → Validation Result → Lease Treatment**

### Existing Functionality

- [ ] Existing validation business logic is unchanged.
- [ ] Existing APIs are reused where possible.
- [ ] Existing validation actions continue working.
- [ ] Review & Correct continues working.
- [ ] No hardcoded data is introduced.
- [ ] No existing Validation functionality is broken.

---

# 18. Final Implementation Check

After implementation, test the page:

`http://192.168.0.2:3000/auditing?tab=validation&id=800`

Test at supported desktop resolutions.

Verify:

1. Default three-panel layout.
2. No unwanted horizontal scrollbar.
3. Compact Validation Results.
4. Row selection highlighting.
5. Statement → Validation → Lease mapping.
6. Expand / Full View.
7. Collapse back to three-panel view.
8. Search.
9. Filters.
10. Sorting.
11. Pagination.
12. Sticky header.
13. Review & Correct.
14. Existing validation actions.
15. No regression in existing functionality.

The final result should feel like a professional audit/validation workspace:

**Default mode = compare and scan quickly**

**Full View = investigate, filter, review and correct in detail**