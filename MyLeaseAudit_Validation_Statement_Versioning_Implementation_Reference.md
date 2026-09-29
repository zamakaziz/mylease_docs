# MyLeaseAudit — Statement Versioning & Version Comparison Implementation Reference

**Document Version:** 1.0  
**Date:** September 2026  
**Module:** Validation Module — Statement Versioning & Version Comparison  
**Requirement References:**
- `docs/MyLeaseAudit_Validation_UI_Changes_To_Implement.md` (Sections 27 & 28)
- `docs/MyLeaseAudit_Validation_Module_client_meeting_bug_24_09_26.md` (Sections A.8 & B.7)
**Key Code Files:**
- Backend Controller: [`backend/app/Http/Controllers/API/ValidationController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/ValidationController.php)
- Backend Routes: [`backend/routes/api.php`](file:///home/c864/Projects/mylease/backend/routes/api.php)
- Frontend View: [`frontend/pages/auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue)

---

## 1. Executive Summary

In commercial lease auditing, landlords frequently issue revised or updated expense statements during or after an initial reconciliation (e.g. providing an expanded breakdown, reclassifying items, or revising total billed expenses).

Prior to this implementation:
1. The Validation toolbar contained **two redundant, separate statement dropdowns** that were not synchronized.
2. The `[Compare Versions]` modal was populated entirely with **static, hardcoded dummy values** (e.g. `$50,000` vs `$60,500`, `8 Lines` vs `10 Lines`, `+ Roof Repair`, `+ Legal Fees`), copied directly from sample design wireframes.
3. The comparison modal's buttons were non-functional placeholders that did not allow the auditor to switch the active validation statement.

Following client specifications in **Sections A.8 & B.7** of `docs/MyLeaseAudit_Validation_Module_client_meeting_bug_24_09_26.md` and **Sections 27 & 28** of `docs/MyLeaseAudit_Validation_UI_Changes_To_Implement.md`, this feature was redesigned and implemented as a **100% data-driven Statement Versioning and Version Comparison workflow**:
- **Zero hardcoded figures or static mock arrays.**
- **Real-time multi-statement discovery** scoping all statements associated with the audit.
- **Dynamic side-by-side version comparison** calculating live mathematical variance, line count deltas, and distinct category additions/removals.
- **Active Statement Switching**: Clicking `[Use for Validation]` dynamically switches `selectedAuditStatementId`, immediately reloading all PES items, TRS balances, validation findings, and cap history traces.

---

## 2. Requirements Compliance Matrix

| Requirement Spec | Document Reference | Status | Implementation Detail |
| :--- | :--- | :--- | :--- |
| **Statement Versioning** | Section B.7 (P2) | ✅ **Implemented** | Backend dynamically indexes all statements linked to the audit (`audit_id` or `location_id` + `audit_year`), assigning version tags (`V1 – Original`, `V2 – Revised / Detailed`). |
| **Unified Statement Selector** | Section 27 | ✅ **Implemented** | Consolidated redundant dropdowns into a single active statement selector in the Validation sub-navigation bar with formatted labels (`ST-808-01: 2025 (Annual Reconciliation)`). |
| **Compare Versions Trigger** | Section 28 & B.7 | ✅ **Implemented** | Added `[Compare Versions]` button adjacent to the statement dropdown whenever `auditStatementsList.length > 1`. |
| **Side-by-Side Comparison Modal** | Section B.7.1 | ✅ **Implemented** | Interactive modal displaying Base Statement vs Comparison Statement with dynamic selection dropdowns. |
| **Dynamic Variance & Metric Calculations** | Section B.7.2 | ✅ **Implemented** | Live calculation of Total Billed variance (`+$191,300.00`), line item deltas (`+3 Lines`), and category additions/removals. |
| **Promote Revision to Active Validation** | Section B.7.3 | ✅ **Implemented** | `[Use for Validation]` button sets the selected revision as the active statement, closes the modal, and triggers `onStatementSelected()`. |

---

## 3. Backend Architecture & API Specification

### Endpoint: `GET /api/validation/statement-versions`

- **Controller:** [`backend/app/Http/Controllers/API/ValidationController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/ValidationController.php#L1075-L1142)
- **Parameters:** `audit_id` (integer, required)
- **Route:** Registered in [`backend/routes/api.php`](file:///home/c864/Projects/mylease/backend/routes/api.php#L612-L618) under `auth:api` and public API groups.

#### Query & Aggregation Logic
1. **Scoping**: First queries `Statement::where('audit_id', $audit->id)`. If empty, safely falls back to `location_id` filtered by `cost_year`.
2. **Expense Metrics**: Loads related `statementExpenses` where `current_amount` is non-empty and non-zero:
   - Aggregates cleaned numeric sums to compute `total_billed`.
   - Counts real non-zero line items as `line_count`.
3. **Category Set Analysis**: Extracts all unique categories from `landlord_expense_category` and `rrg_category` for dynamic delta comparison.
4. **Version Tagging**: Determines whether statement title or type includes "revised" or assigns chronological tags (`V1 – Original`, `V2 – Revised / Detailed`, etc.).

#### Sample JSON Response (Audit 808)
```json
{
  "status": true,
  "data": [
    {
      "id": 1139,
      "statement_name": "ST-808-01 | OrigLease | Cap=No | All Allowed | TRS Balanced (diff=0)",
      "statement_code": "ST-1139",
      "statement_type": "Annual Reconciliation",
      "version_tag": "V1 – Original",
      "version_number": 1,
      "is_revised": false,
      "cost_year": "2025",
      "start_date": "2025-01-01",
      "end_date": "2025-12-31",
      "line_count": 12,
      "total_billed": 59800,
      "categories": [
        "Janitorial & Cleaning",
        "Landscaping & Grounds Maintenance",
        "Building Insurance",
        "Real Estate Taxes"
      ]
    },
    {
      "id": 1148,
      "statement_name": "ST-808-10 | Full Mixed Multi-Rule Scenario | Caps + Exclusions + Inclusions",
      "statement_code": "ST-1148",
      "statement_type": "Revised Detailed Statement",
      "version_tag": "V10 – Revised / Detailed",
      "version_number": 10,
      "is_revised": true,
      "cost_year": "2025",
      "start_date": "2025-01-01",
      "end_date": "2025-12-31",
      "line_count": 15,
      "total_billed": 251100,
      "categories": [
        "Janitorial & Cleaning",
        "Landscaping & Grounds Maintenance",
        "Building Insurance",
        "Building Automation System",
        "Debt Repayment",
        "Owner Personal Expenses"
      ]
    }
  ]
}
```

---

## 4. Frontend Implementation & Reactive State

### File: [`frontend/pages/auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue)

### 4.1 Unified Navigation Bar
The previous duplicate dropdown on the right was removed. In its place, the primary Statement selector now displays:
```html
<div class="d-flex align-items-center" style="gap:10px;">
  <span style="font-size:12px;font-weight:600;color:#495057;">Active Statement:</span>
  <el-select v-model="selectedAuditStatementId" size="small" style="width:260px;" @change="onStatementSelected">
    <el-option
      v-for="st in auditStatementsList"
      :key="st.id"
      :label="getStatementDisplayLabel(st)"
      :value="st.id">
    </el-option>
  </el-select>
  <el-button
    v-if="auditStatementsList.length > 1"
    size="small"
    type="primary"
    plain
    icon="el-icon-connection"
    @click="openStatementVersionCompareModal">
    Compare Versions
  </el-button>
</div>
```

### 4.2 Dynamic Version Comparison Modal
Located at lines `1570–1695`:
- **Base vs Target Dropdowns**:
  - `compareBaseStatementId` defaults to the first original statement (`V1`).
  - `compareTargetStatementId` automatically selects the currently active or most recently revised statement.
- **Computed Comparisons**:
  - `compareAmountDiff`: Computes `target.total_billed - base.total_billed` with color coding (red for increases, green for decreases).
  - `compareLinesDiff`: Computes `target.line_count - base.line_count`.
  - `compareAddedCategories`: Computes `target.categories` subtracted by `base.categories`.
  - `compareRemovedCategories`: Computes `base.categories` subtracted by `target.categories`.
- **Promotion Action (`applyComparisonStatementForValidation`)**:
  ```javascript
  async applyComparisonStatementForValidation() {
    if (!this.compareTargetStatementId) return;
    this.selectedAuditStatementId = this.compareTargetStatementId;
    this.showVersionCompareModal = false;
    const target = this.compareTargetStatement;
    const title = target ? (target.statement_name || target.statement_code) : 'selected statement';
    this.$message.success(`Active statement switched to ${title}. Loading validation findings...`);
    await this.onStatementSelected();
  }
  ```

---

## 5. Verification & Live Audit Test Results

### Test Environment: Audit 808
- **URL**: `http://localhost:3000/auditing?tab=validation&id=808`
- **Total Statements Available**: 10 statements (`ST-808-01` to `ST-808-10`)

### Verification Scenarios Tested:
1. **API Response**: Verified via `curl http://localhost:8000/api/validation/statement-versions?audit_id=808` returns HTTP 200 with all 10 statements and live calculated totals.
2. **Base vs Revised Variance**:
   - Base (`ST-808-01`): `$59,800.00` | 12 Lines
   - Revised (`ST-808-10`): `$251,100.00` | 15 Lines
   - Mathematical Variance: `+$191,300.00` | `+3 Lines`
   - Added Categories Detected:
     - `+ Building Automation System`
     - `+ Debt Repayment`
     - `+ Owner Personal Expenses`
3. **Active Switching**:
   - Clicking `[Use for Validation]` correctly updates `selectedAuditStatementId = 1148`.
   - Triggers `onStatementSelected()`, reloading PES line items, TRS balances, and Validation Findings for Statement 1148.
4. **Compilation**:
   - Nuxt client hot reload compiled in 4.37s with 0 errors.
