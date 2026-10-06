# Validation Statement Version / Run Dropdown Visibility & Results Synchronization

**Date**: 2026-10-05  
**Audit Reference**: `/auditing?tab=validation&id=806`

---

## 1. Problem Description

On the Audit Validation page (`/auditing?tab=validation&id=806`), two related defects were identified:

1. **Version / Run Dropdown Hidden on Initial Page Visit**:
   Under the Validation submenu header, the run/version dropdown (`selectedValidationRunId`) only appeared after clicking the **Run Validation** button. When first visiting the page or switching to the Validation tab, the dropdown remained hidden even when validation runs and findings already existed in the database for the audit and statement.
2. **Recorded Results Not Showing on Selection / Blank State**:
   - When selecting a run/version from the dropdown, the results panel (Panel 2 Validation Results and Panel 1 CAM Expenses) would frequently display an empty state ("No matching validation results found").
   - When switching between statements in the Statement dropdown, the previously selected run ID was not reset or synchronized, causing conflicting `WHERE validation_run_id = [old] AND statement_id = [new]` queries in the backend that returned 0 findings.
   - Re-running validation updated `validation_run_id` on findings in place, leaving older run records with 0 direct findings; selecting those older runs would return 0 findings instead of resolving the statement's recorded findings.

---

## 2. Root Cause Analysis

### Bug 1: Dropdown Visibility
- In [`frontend/pages/auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue), `fetchValidationRuns()` was only invoked inside `triggerValidationRun()` and `confirmValidationRun()`.
- During initial page load (`tabRedirect('validation')` -> `fetchAuditStatementsList()`), `fetchValidationRuns()` was never called.
- As a result, `validationRunsList` remained empty (`[]`), causing `<el-select v-if="validationRunsList.length > 0">` to be hidden until the user manually clicked "Run Validation".

### Bug 2: Empty Results on Dropdown Selection & Statement Switch
- **Statement Switch Mismatch**: When the user switched statements via `onStatementSelected(statementId)`, `this.selectedValidationRunId` was not reset or updated. `fetchValidationFindings()` sent the old statement's run ID together with the new statement's ID. In [`ValidationController::index`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/ValidationController.php), the query enforced `where('validation_run_id', $runId)->where('statement_id', $statementId)`, resulting in 0 matches.
- **Run Selection Out of Sync**: The run dropdown's `@change` handler only called `fetchValidationSummary()` and `fetchValidationFindings()`. It did not synchronize `selectedAuditStatementId` with the run's `statement_id`, nor did it trigger `fetchStatementData()` to update Panel 1.
- **Consolidated Findings**: In [`ValidationEngine::executeValidation`](file:///home/c864/Projects/mylease/backend/app/Services/Validation/ValidationEngine.php), findings are updated in place with the latest `validation_run_id` to preserve user overrides, notes, and observation links. Older run records therefore had 0 findings pointing directly to them, causing empty results when selected.

---

## 3. Backend Changes

**File**: [`backend/app/Http/Controllers/API/ValidationController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/ValidationController.php)

1. **`listRuns`**:
   - Added `->withCount('findings')` and preserved **all available runs/versions** for the specified statement (`where('statement_id', $statementId)`) without filtering any out.
   - For previous runs whose findings were consolidated or updated in-place during subsequent validation runs, computed statement-level fallback finding counts (`ValidationFinding::where('statement_id', $run->statement_id)->count()`) so each version accurately reflects the statement findings count.
2. **`summary`**:
   - Added fallback resolution: if a specific `validation_run_id` has no direct findings (e.g. consolidated into statement), it queries the run's `statement_id`.
   - Updated `latestRun` resolution to match the requested `validation_run_id` if provided.
3. **`index`**:
   - Updated filtering logic so that `validation_run_id` and `statement_id` do not execute conflicting `AND` constraints.
   - If findings for the requested `validation_run_id` exist, they are filtered directly. If they were consolidated, it falls back to the run's `statement_id`.

---

## 4. Frontend Changes

**File**: [`frontend/pages/auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue)

1. **`fetchAuditStatementsList()`**:
   - Added `await this.fetchValidationRuns()` immediately after setting `selectedAuditStatementId`. If runs exist in the database, `validationRunsList` is populated and the dropdown is visible on initial page visit.
2. **`fetchValidationRuns()`**:
   - Added validation against `validationRunsList.some(r => r.id === this.selectedValidationRunId)`. If `selectedValidationRunId` is null or does not exist in the new list, it automatically defaults to the confirmed run or the first available run. If no runs exist, it resets to `null`.
3. **`onStatementSelected(statementId)`**:
   - Resets `this.selectedValidationRunId = null`.
   - Calls `await this.fetchValidationRuns()` to load the new statement's runs before fetching statement data, summary, and findings.
4. **`onValidationRunSelected(runId)`**:
   - Created a dedicated selection handler for the run dropdown.
   - Synchronizes `selectedAuditStatementId` with `activeRun.statement_id` if different, and calls `fetchStatementData()` so Panel 1 and Panel 2 stay in sync.
   - Updates `isValidationConfirmed` and `confirmedRunInfo`.
   - Reloads summary and findings.
5. **`getValidationRunLabel(run)`**:
   - Computes chronological version index (`v1`, `v2`, `v3`...) for statements with multiple validation runs.
   - Formats dropdown options with version tag, run number, date, and status (e.g. `v2 (Run #381) - 05-Oct-2026 [Completed]`, `v1 (Run #366) - 29-Sep-2026 [Completed]`).
   - Extended dropdown width (`min-width: 240px; max-width: 320px`) for clear option display.
6. **`currentRunId` Computed Property**:
   - Prioritizes `selectedValidationRunId` so the review workflow stepper displays the accurate run ID.
7. **Header Layout Relocation**:
   - Moved the Statement Version dropdown (`selectedValidationRunId`) and the **Run Validation** button from the right side controls group to the left side controls group, positioning them immediately to the right of the Statement dropdown (`selectedAuditStatementId`).
   - Grouped Statement selection, Version selection, and Run execution together for an intuitive workflow, while reserving the right side for action triggers (Request Evidence, Run Scope, Confirm Validation).

---

## 5. Test Results & Verification

- Executed automated API suite testing `listRuns`, `summary`, and `findings` with both matching and cross-statement/consolidated run IDs:
  - Statement `1248` (ST-806-10): Returns Run `381` (`findings_count: 19`). `GET findings` returns 19 items.
  - Statement `1239` (ST-806-01): Returns Run `357` (`findings_count: 12`). `GET findings` returns 12 items.
  - Older/consolidated Run `366`: Gracefully falls back to statement findings (19 items) without showing 0 results.
- Verified Nuxt compilation: `Client: Compiled successfully in 10.53s`.
- Verified PHP syntax: `No syntax errors detected in app/Http/Controllers/API/ValidationController.php`.

---

## 6. Files Changed Table

| File | Status | Description |
| :--- | :--- | :--- |
| [`backend/app/Http/Controllers/API/ValidationController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/ValidationController.php) | Modified | Added findings count to `listRuns`, graceful statement fallback to `index` and `summary` |
| [`frontend/pages/auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue) | Modified | Loaded runs on page load, synced run and statement selectors, added `onValidationRunSelected` and `getValidationRunLabel` |
