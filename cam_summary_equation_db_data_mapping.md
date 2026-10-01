# CAM Summary Equation — Database Data Lineage & Mapping Guide

**Target URL:** `http://192.168.0.2:3000/auditing?tab=validation&id=800`  
**Panel:** TRS Tenant Reconciliation Statement / CAM Summary Equation  
**Selected Statement:** `ST-800-10` (`id: 1258` in database `statement` table)  
**Database Name:** `myleaseauditdb`

---

## 1. Executive Summary & Quick Reference

| UI Line Item | Value Shown | Source Database Table | Source Column(s) | Criteria / Query / Formula |
| :--- | :--- | :--- | :--- | :--- |
| **Selected Statement** | `ST-800-10` | `statement` | `id`, `statement_name` | `WHERE id = 1258 AND audit_id = 800` |
| **Landlord Reported CAM** | `$307,100.00` | `statement_expenses` | `current_amount` | `SUM(current_amount)` for 19 rows with `statement_id = 1258` |
| **Less: Excluded Expenses** | `(-$113,000.00)` | `validation_findings` | `estimated_exposure`, `status` | `SUM(estimated_exposure)` where `statement_id = 1258` and `status = 'Excluded'` |
| **Less: Cap Adjustments** | `(-$46,200.00)` | `validation_findings` | `estimated_exposure`, `status` | `SUM(estimated_exposure)` where `statement_id = 1258` and `status = 'Cap Exceeded'` |
| **Add: Gross-up Adjustment** | `+$0.00` | `lease_gross_ups` / Frontend | Computed `camGrossUpAmount` | Default is `$0.00` when no gross-up applies |
| **Corrected CAM Pool** | `$147,900.00` | *(Computed)* | — | `$307,100 - $113,000 - $46,200 + $0 = $147,900.00` |
| **Tenant Proportionate Share** | `10%` | `lease_premises` / `reconInputs` | `percentage_share` / UI model | Configured in `reconInputs.tenantShare` (`10.0%`) |
| **Tenant CAM Responsibility** | `$14,790.00` | *(Computed)* | — | `$147,900.00 × 10% = $14,790.00` |
| **Already Paid by Tenant** | `(-$15,000.00)` | `reconInputs` | `alreadyPaid` | Loaded via reconciliation inputs (`Payment_Evidence_2025.pdf`) |
| **Final Balance** | `$210.00 Refund Due` | *(Computed)* | — | `$14,790.00 - $15,000.00 = -$210.00` (Negative = Refund Due) |

---

## 2. Detailed Data Origin by UI Line Item

### 1) Selected Statement Header (`ST-800-10`)
* **Table:** `statement`
* **Primary Key ID:** `1258`
* **Audit Foreign Key:** `audit_id = 800`
* **Relevant Columns:**
  * `statement.id`: `1258`
  * `statement.statement_name`: `"ST-800-10 | REVISED | Amendment | Cap=FixedWhole | ALL 5 STATUSES | TRS +$9,800"`
  * `statement.cost_year`: `2025`
  * `statement.lease_id`: `503`
  * `statement.location_id`: `491`
  * `statement.statement_start_date`: `2025-01-01`
  * `statement.statement_end_date`: `2025-12-31`
* **API Route:** `GET /api/get-statement-with-pes?statement_id=1258&audit_id=800`
* **Controller:** `App\Http\Controllers\API\StatementController::getStatementWithExpense`

---

### 2) Landlord Reported CAM (`$307,100.00`)
* **Table:** `statement_expenses`
* **Foreign Key:** `statement_id = 1258`
* **SQL Query:**
  ```sql
  SELECT SUM(CAST(current_amount AS DECIMAL(10,2))) AS total_cam
  FROM statement_expenses
  WHERE statement_id = 1258;
  ```
* **Individual Line Items in Database:**

| Expense ID | Category (`landlord_expense_category`) | Amount (`current_amount`) |
| :--- | :--- | :--- |
| `9081` | Property Management Fee | `$42,000.00` |
| `9082` | Building Automation System | `$31,000.00` |
| `9083` | Structural Parking Deck Reconstruction | `$50,000.00` |
| `9084` | Debt Repayment | `$20,000.00` |
| `9085` | Owner Personal Expenses | `$18,000.00` |
| `9086` | Undisclosed Management Overhead | `$25,000.00` |
| `9087` | Consolidated Common Area Pool | `$26,000.00` |
| `9088` | Summarized Service Charges | `$19,000.00` |
| `9089` | Unknown Utility Charge | `$4,800.00` |
| `9090` | Unclassified Administrative Fee | `$6,200.00` |
| `9091` | Real Estate & Property Taxes | `$15,200.00` |
| `9092` | Building & Liability Insurance | `$11,800.00` |
| `9093` | Common Area Electric & Utilities | `$8,900.00` |
| `9094` | Security Services & Monitoring | `$5,800.00` |
| `9095` | Grounds & Landscaping Care | `$4,100.00` |
| `9096` | Elevator & Escalator Service | `$4,900.00` |
| `9097` | Janitorial & Housekeeping Services | `$6,700.00` |
| `9098` | Fire System Testing & Maintenance | `$3,100.00` |
| `9099` | HVAC Preventative Maintenance | `$4,600.00` |
| **Total** | **19 line items** | **`$307,100.00`** |

* **Frontend Code:** `frontend/pages/auditing.vue:13049` (`camLandlordReportedAmount`)

---

### 3) Less: Excluded Expenses (`-$113,000.00`)
* **Table:** `validation_findings`
* **Foreign Key:** `statement_id = 1258`
* **Filter Condition:** `WHERE statement_id = 1258 AND status = 'Excluded'`
* **SQL Query:**
  ```sql
  SELECT id, issue_type, estimated_exposure
  FROM validation_findings
  WHERE statement_id = 1258 AND status = 'Excluded';
  ```
* **Matching Database Records:**

| Finding ID | Expense ID | Category / Issue | Exposure (`estimated_exposure`) | Status |
| :--- | :--- | :--- | :--- | :--- |
| `3579` | `9083` | Structural Parking Deck Reconstruction | `$50,000.00` | `Excluded` |
| `3580` | `9084` | Debt Repayment | `$20,000.00` | `Excluded` |
| `3581` | `9085` | Owner Personal Expenses | `$18,000.00` | `Excluded` |
| `3582` | `9086` | Undisclosed Management Overhead | `$25,000.00` | `Excluded` |
| **Sum** | | | **`$113,000.00`** | |

* **Frontend Code:** `frontend/pages/auditing.vue:13054` (`camExcludedAmount`)

---

### 4) Less: Cap Adjustments (`-$46,200.00`)
* **Table:** `validation_findings`
* **Foreign Key:** `statement_id = 1258`
* **Filter Condition:** `WHERE statement_id = 1258 AND status = 'Cap Exceeded'` (matches `status.toLowerCase().includes('cap')`)
* **SQL Query:**
  ```sql
  SELECT id, issue_type, estimated_exposure
  FROM validation_findings
  WHERE statement_id = 1258 AND status LIKE '%Cap%';
  ```
* **Matching Database Records:**

| Finding ID | Expense ID | Category / Issue | Exposure (`estimated_exposure`) | Status |
| :--- | :--- | :--- | :--- | :--- |
| `3577` | `9081` | Property Management Fee | `$28,000.00` | `Cap Exceeded` |
| `3578` | `9082` | Building Automation System | `$17,000.00` | `Cap Exceeded` |
| `3587` | `9091` | Real Estate & Property Taxes | `$1,200.00` | `Cap Exceeded` |
| **Sum** | | | **`$46,200.00`** | |

* **Frontend Code:** `frontend/pages/auditing.vue:13063` (`camCapAdjustmentAmount`)

---

### 5) Add: Gross-up Adjustment (`+$0.00`)
* **Table:** `lease_gross_ups` / Vue computed property
* **Frontend Code:** `frontend/pages/auditing.vue:13072` (`camGrossUpAmount`)
* Returns `0.00` because no gross-up adjustment is active for this calendar statement run.

---

### 6) Corrected CAM Pool (`$147,900.00`)
* **Formula:**
  $$\text{Corrected CAM Pool} = \text{Landlord Reported} - \text{Excluded} - \text{Cap Adjustments} + \text{Gross-up}$$
* **Calculation:**
  $$\$307,100.00 - \$113,000.00 - \$46,200.00 + \$0.00 = \mathbf{\$147,900.00}$$
* **Frontend Code:** `frontend/pages/auditing.vue:13075` (`camCorrectedPoolAmount`)

---

### 7) Tenant Proportionate Share (`10%`)
* **Database References:**
  * `lease_premises`: Lease premises share for `lease_id = 503` (field `percentage_share = 18.50`).
  * `reconInputs`: Overridden / confirmed auditor input in the "Reconciliation Inputs & Evidence" card (`tenantShare = '10.0%'`).
* **Frontend Code:** `frontend/pages/auditing.vue:13042` (`activeTenantSharePercent`)

---

### 8) Tenant CAM Responsibility (`$14,790.00`)
* **Formula:**
  $$\text{Tenant Responsibility} = \text{Corrected CAM Pool} \times \text{Tenant Share \%}$$
* **Calculation:**
  $$\$147,900.00 \times 10\% = \mathbf{\$14,790.00}$$
* **Frontend Code:** `frontend/pages/auditing.vue:13079` (`camTenantResponsibilityAmount`)

---

### 9) Already Paid by Tenant (`-$15,000.00`)
* **Source:** `reconInputs.alreadyPaid`
* **Evidence Source Document:** `Payment_Evidence_2025.pdf`
* **Frontend Code:** `frontend/pages/auditing.vue:13084` (`camAlreadyPaidAmount`)

---

### 10) Final Balance (`$210.00 Refund Due`)
* **Formula:**
  $$\text{Final Balance} = \text{Tenant Responsibility} - \text{Already Paid}$$
* **Calculation:**
  $$\$14,790.00 - \$15,000.00 = -\$210.00$$
* **Display Rule:**
  * Positive: `$X.XX Due`
  * Negative: `$X.XX Refund Due`
  * Zero: `Reconciled ($0.00)`
* **Frontend Code:** `frontend/pages/auditing.vue:13090` (`camFinalBalance`) & `13121` (`camFinalBalanceText`)

---

## 3. Companion TRS Reconciliation Context

In addition to the line item total ($307,100.00), the statement contains a TRS (Tenant Reconciliation Statement) total:
* **Table:** `statement_reconcilations`
* **Row ID:** `726` (`statement_id = 1258`)
* **Columns:**
  * `total_current_amount`: `316900` ($316,900.00)
  * `premises_percentage_value`: `18.50`
  * `premises_expense_exposure`: `316900`
* **Discrepancy Calculation:**
  $$\text{TRS Total } (\$316,900.00) - \text{PES Total } (\$307,100.00) = +\$9,800.00$$
  This matches the title label: `"ST-800-10 ... TRS +$9,800"`.

---

## 4. API Endpoints

1. **`GET /api/get-statement-with-pes?statement_id=1258&audit_id=800`**
   * **Controller:** `App\Http\Controllers\API\StatementController::getStatementWithExpense`
   * **Loads:**
     * `statement` (Base statement information)
     * `statement_expenses` (All 19 expense lines)
     * `statement_reconcilations` (TRS header and reconciled totals)

2. **`GET /api/audits/800/validation/findings?statement_id=1258`**
   * **Controller:** `App\Http\Controllers\API\ValidationController::index`
   * **Loads:**
     * `validation_findings` records linked to this statement (including `Excluded`, `Cap Exceeded`, `Limited`, `Needs Review`, and `Allowed`).

---

## 5. Reconciliation Inputs & Evidence Panel

This card appears directly alongside the CAM Summary Equation on the validation tab:

| Input | Value | Status | Source DB Table | Source Column / Dynamic Logic |
| :--- | :--- | :--- | :--- | :--- |
| **Tenant Share** | Dynamic (e.g. `18.5%`) | `Confirmed` | `statement_reconcilations` / `lease_premises` | Sourced from `rec.premises_percentage_value` or `rec.premises_share`. Overridable in `reconInputs.tenantShare`. |
| **Base Year** | Dynamic (e.g. `2025` / `2024`) | `Confirmed` / `N/A` | `statement_reconcilations` / `statement` | Sourced from `rec.base_cost_year_per_statement` or calculated from numeric `cost_year - 1`. If non-numeric (e.g. 'Common'), shows `N/A`. |
| **Zero Floor** | Dynamic (e.g. `$0`) | `Confirmed` | `statement_reconcilations` / `lease_base_stops` | Sourced from `rec.base_cost_value_per_statement` or `rec.base_cost_per_statement` (defaults to `$0`). |
| **Tax Pool** | Dynamic (e.g. `$15,200` or `$0.00`) | `Source Only` / `None` | `statement_expenses` | Dynamically summed from `statement_expenses` where category includes 'tax' or 'assessment'. Displays `$0.00` with status `None` if no tax line exists. |
| **Payment Evidence** | Dynamic file title or `No Document Attached` | `Confirmed` or `Pending Upload` | `audit_documents` | Automatically scans `auditDocumentsList` for payment/remittance documents. If none found, displays `No Document Attached` with a clickable `Pending Upload` badge and button linking directly to the Documents tab. |

### Database Table for Saving This Data

* **Current Status in UI:**
  * When clicking **"Save Draft"** (`auditing.vue:4617`) or **"Save & Recalculate"** in the drawer (`auditing.vue:1174`), the inputs update Vue component reactive state (`reconInputs`), which immediately triggers recalculation of the final balance.
* **Target Database Table for Persistence:**
  * **Table:** `statement_reconcilations`
  * **Model:** `App\Models\StatementReconcilations`
  * **Mapped Columns:**
    * `premises_percentage_value` & `premises_share`: Stores the confirmed **Tenant Share**.
    * `base_cost_year_per_statement`: Stores the **Base Year**.
    * `base_cost_per_statement` / `base_cost_value_per_statement`: Stores the **Zero Floor / Base Cost**.
    * `total_current_amount` / `premises_expense_exposure`: Stores statement reconciliation totals.
    * *(Payment Evidence file attachments are persisted in the `audit_documents` table and linked via `statement.document_id`)*.

---

## 6. How and Where Users Upload Documents

Users can upload receipts, remittance vouchers, cancelled checks, statements, and lease amendments:

1. **Where to Navigate:**
   * Go to the **Documents** tab at the top of the Auditing page:
     `http://192.168.0.2:3000/auditing?tab=documents&id=<audit_id>`
   * Or click the **"Documents Tab"** button / **"Pending Upload"** badge directly on the Reconciliation Inputs & Evidence card.
2. **Uploading the Document:**
   * Click the blue **"Create"** button on the Documents tab.
   * In the slide-over form, select:
     * **Type\*:** Select **`Other`**
     * **Sub Type\*:** Select **`Check or Wire Proof of Payment`** (or `Payment History`, `General Ledger`, `Tenant Ledger`)
     * **Title\*:** Enter a title (e.g., `Payment_Evidence_2025.pdf` or `Cancelled_Check_2025.pdf`)
     * **Attach Document\*:** Attach your PDF file.
   * Click **Save**.
3. **How It Turns into the Green "Confirmed" Badge:**
   * **Method A (Automatic):** When you return to the **Validation** tab, the system automatically detects documents of sub-type `Check or Wire Proof of Payment` (or matching payment/check/remittance) in `audit_documents`, displays the file name as a clickable preview link, and automatically turns the badge green (**`Confirmed`**).
   * **Method B (Manual Selection):** On the **Validation** tab $\rightarrow$ **Reconciliation Inputs & Evidence** card, click **"Review & Correct Inputs"**. Select the uploaded file from the **"Payment Evidence Document"** dropdown, and click **"Save & Recalculate"**. The badge immediately updates to green **`Confirmed`**.

---

## 7. Opex + Tax Combined Section — Database Data Lineage & Mapping

**Example Statement:** `ST-800-05` (`id: 1253` in `statement` table for `audit_id = 800`)  
**Statement Name:** `ST-800-05 | Amendment | Cap=FixedWhole | Cap+Excl | TRS Balanced`

### Quick Reference Summary & Step-by-Step Equations in Brackets

| Line Item | Displayed Amount | Step-by-Step Calculation (In Brackets) | Database Table & Field | Source Formula & Details |
| :--- | :--- | :--- | :--- | :--- |
| **Operating Expenses (Reported)** | `$190,000.00` | `(Reported Total $211,600.00 - Taxes $21,600.00) = $190,000.00` | `statement_expenses.current_amount` | Total billed minus non-operating tax lines (`$211,600 - $21,600 = $190,000.00`) across 11 line items |
| **Taxes (Reported)** | `$21,600.00` | `(Real Estate Taxes $13,800.00 + Assessment $7,800.00) = $21,600.00` | `statement_expenses.current_amount` | Sum of categories containing `'tax'` or `'assessment'` (`$13,800 + $7,800 = $21,600.00`) |
| **Reported Combined Total** | `$211,600.00` | `(OpEx $190,000.00 + Taxes $21,600.00) = $211,600.00` | `statement_expenses.current_amount` | Gross billed pool sum across all 13 line items |
| **Operating Expenses (Corrected)** | `$93,400.00` | `(OpEx $190,000.00 - Disallowed $96,600.00) = $93,400.00` | `validation_findings.estimated_exposure` | Reported OpEx minus total disallowed expenses (`$190,000 - $96,600 = $93,400.00`) |
| **Taxes (Corrected)** | `$21,600.00` | `(Contractual Allowed Taxes) = $21,600.00` | `statement_expenses.current_amount` | Allowed tax pool retained for contractual reconciliation |
| **Corrected Combined Pool** | `$115,000.00` | `(Corrected OpEx $93,400.00 + Taxes $21,600.00) = $115,000.00` | Computed in Vue | Sum of corrected OpEx and verified taxes |

---

### Detailed Breakdown by Database Row & Query

#### 1) Landlord Reported Presentation

* **Reported Combined Total ($211,600.00):**
  * **Table:** `statement_expenses`
  * **Foreign Key:** `statement_id = 1253`
  * **Query:**
    ```sql
    SELECT SUM(current_amount) AS reported_combined_total 
    FROM statement_expenses 
    WHERE statement_id = 1253;
    -- Result: 211600.00
    ```

* **Taxes ($21,600.00):**
  * **Table:** `statement_expenses`
  * **Query:**
    ```sql
    SELECT id, landlord_expense_category, current_amount 
    FROM statement_expenses 
    WHERE statement_id = 1253 
      AND (LOWER(landlord_expense_category) LIKE '%tax%' OR LOWER(landlord_expense_category) LIKE '%assessment%');
    ```
  * **Matching Rows:**
    * ID `9049`: `Real Estate Taxes` = `$13,800.00`
    * ID `9048`: `Unspecified CAM Assessment` = `$7,800.00`
    * **Step Equation in Brackets:** `($13,800.00 + $7,800.00) = $21,600.00`

* **Operating Expenses ($190,000.00):**
  * **Step Equation in Brackets:** `(Reported Total $211,600.00 - Taxes $21,600.00) = $190,000.00`
  * **SQL Query:**
    ```sql
    SELECT 
        SUM(current_amount) AS reported_opex
    FROM statement_expenses 
    WHERE statement_id = 1253 
      AND NOT (
        LOWER(landlord_expense_category) LIKE '%tax%' 
        OR LOWER(landlord_expense_category) LIKE '%assessment%'
      );
    -- Result: 190000.00
    ```
  * **11 Operating Lines Included:**
    * `Property Management Fee` (`$35,000.00`)
    * `Executive Bonus` (`$28,000.00`)
    * `Building Demolition` (`$55,000.00`)
    * `Debt Service` (`$15,000.00`)
    * `Consolidated Maintenance Pool` (`$22,000.00`)
    * `Building Insurance` (`$9,900.00`)
    * `Common Area Electricity` (`$7,200.00`)
    * `Security Operations` (`$4,800.00`)
    * `Grounds & Snow Removal` (`$3,400.00`)
    * `Elevator Service` (`$4,100.00`)
    * `Janitorial & Sanitation` (`$5,600.00`)

---

#### 2) Contractual Corrected Result

* **Where Disallowed Expenses ($96,600.00) come from:**
  * **Step Equation in Brackets:** `(Excluded $43,000.00 + Cap Overages $53,600.00) = $96,600.00`
  * **Table:** `validation_findings`
  * **Query:**
    ```sql
    SELECT id, issue_type, status, estimated_exposure 
    FROM validation_findings 
    WHERE statement_id = 1253 
      AND (status = 'Excluded' OR status = 'Cap Exceeded');
    ```
  * **Matching Disallowed Finding Rows:**
    1. **Excluded Items ($43,000.00):**
       * ID `3540`: `Executive Bonus` | Status: `Excluded` | Estimated Exposure: **$28,000.00**
       * ID `3542`: `Debt Service` | Status: `Excluded` | Estimated Exposure: **$15,000.00**
       * Subtotal in Brackets: `($28,000.00 + $15,000.00) = $43,000.00`
    2. **Cap Limit Overages ($53,600.00):**
       * ID `3539`: `Property Management Fee` | Status: `Cap Exceeded` | Estimated Exposure: **$16,800.00**
       * ID `3541`: `Building Demolition` | Status: `Cap Exceeded` | Estimated Exposure: **$36,800.00**
       * Subtotal in Brackets: `($16,800.00 + $36,800.00) = $53,600.00`

* **Operating Expenses (Corrected) ($93,400.00):**
  * **Step Equation in Brackets:** `(Reported OpEx $190,000.00 - Disallowed $96,600.00) = $93,400.00`
  * **Unified SQL Query:**
    ```sql
    SELECT 
      (
        (SELECT SUM(current_amount) 
         FROM statement_expenses 
         WHERE statement_id = 1253 
           AND NOT (LOWER(landlord_expense_category) LIKE '%tax%' OR LOWER(landlord_expense_category) LIKE '%assessment%'))
        -
        (SELECT COALESCE(SUM(estimated_exposure), 0) 
         FROM validation_findings 
         WHERE statement_id = 1253 
           AND (status = 'Excluded' OR status = 'Cap Exceeded'))
      ) AS opex_corrected;
    -- Result: 93400.00
    ```

* **Corrected Combined Pool ($115,000.00):**
  * **Step Equation in Brackets:** `(Corrected OpEx $93,400.00 + Taxes $21,600.00) = $115,000.00`
  * **Unified SQL Query:**
    ```sql
    SELECT (93400.00 + 21600.00) AS corrected_combined_pool;
    -- Result: 115000.00
    ```

---

### 3. Frontend Computed Properties in `frontend/pages/auditing.vue`

The card and drawer UI render these steps reactively using the following computed properties:

```javascript
// 1. Taxes
opexTaxTaxesAmount() {
  return this.statementItems
    .filter(item => {
      const name = (item.name || '').toLowerCase();
      return name.includes('tax') || name.includes('assessment');
    })
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0); // = $21,600.00
},

// 2. Reported Operating Expenses
opexReportedAmount() {
  const total = this.totalStatementSum > 0 ? this.totalStatementSum : (this.trsTotalAmount || 0);
  return Math.max(0, total - this.opexTaxTaxesAmount); // 211,600 - 21,600 = $190,000.00
},

// 3. Disallowed Operational Line Items
opexDisallowedAmount() {
  return this.camExcludedAmount + this.camCapAdjustmentAmount; // 43,000 + 53,600 = $96,600.00
},

// 4. Corrected Operating Expenses
opexCorrectedAmount() {
  return Math.max(0, this.opexReportedAmount - this.opexDisallowedAmount); // 190,000 - 96,600 = $93,400.00
},

// 5. Corrected Combined Pool
opexCombinedCorrectedPool() {
  return this.opexCorrectedAmount + this.opexTaxTaxesAmount; // 93,400 + 21,600 = $115,000.00
}
```

---

## 8. Base Year Contribution & Floor — Database Lineage & Calculation Mapping

**Context Statement:** `ST-800-05` (`statement.id = 1253` under `audit_id = 800`)  
**UI Location:** Validation Tab $\rightarrow$ **CAM Reconcilliations** submenu $\rightarrow$ **Base Year Contribution & Floor** card.

### Purpose
In modified gross and full-service commercial leases, the tenant pays only their proportionate share of expense increases above a specified **Base Year** stop benchmark. This panel traces each expense category's contribution to the comparable pool and verifies that the **Zero Floor** rule is enforced at the overall pool/tenant level (preventing negative escalation liabilities).

---

### Database Tables & Fields Used

| Data Point | Database Table | Field Name | Description |
| :--- | :--- | :--- | :--- |
| **Category** | `validation_findings` / `statement_expenses` | `issue_type` / `landlord_expense_category` | Billed line item description (e.g. `Property Management Fee`, `Executive Bonus`). |
| **Current Year** | `statement_expenses` / `validation_findings` | `current_amount` / `statement_amount` | Current statement year billed amount. |
| **Eligibility / Status** | `validation_findings` | `status` | Validation audit status (`'Excluded'`, `'Cap Exceeded'`, `'Allowed'`). Excluded items contribute `$0`. |
| **Tenant Share %** | `statement_reconcilations` / `lease_premises` | `premises_percentage_value` / `premises_share` | Proportionate share percentage (`18.5%` or `0.185`), editable in `reconInputs.tenantShare`. |
| **Zero Floor** | `statement_reconcilations` | `base_cost_value_per_statement` | Contractual floor stop benchmark (`$0`). |

---

### Mathematical Formulas by Column

For each expense line item $i$:

1. **Current Year:**
   $$\text{Current Year} = \text{statement\_expenses.current\_amount}$$

2. **Base Year Stop Benchmark:**
   $$\text{Base Year} = \text{round}(\text{Current Year} \times 0.85)$$
   *(Indexed base-year benchmark stop at 85% of baseline operating costs).*

3. **Difference (Escalation over Base Year):**
   $$\text{Difference} = \text{Current Year} - \text{Base Year} \quad (\approx \text{Current Year} \times 15\%)$$

4. **Eligibility:**
   $$\text{Eligibility} = \begin{cases} \textbf{Excluded} & \text{if } \text{validation\_findings.status} \text{ contains } \text{'Excluded'} \\ \textbf{Eligible} & \text{otherwise} \end{cases}$$

5. **Pool Contribution (`Pool Contrib`):**
   $$\text{Pool Contrib} = \begin{cases} \mathbf{\$0} & \text{if Excluded} \\ \mathbf{+\text{Difference}} & \text{if Eligible} \end{cases}$$

6. **Tenant Share (18.5%):**
   $$\text{Tenant Share} = \begin{cases} \mathbf{\$0} & \text{if Excluded} \\ \text{round}(\text{Difference} \times 18.5\%) & \text{if Eligible} \end{cases}$$

---

### Verified Line-Item Trace for Statement `ST-800-05`

| Category | Finding ID | Current Year | Base Year (85%) | Difference | Status / Eligibility | Pool Contrib | Tenant Share (18.5%) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Property Management Fee** | `3539` | **$35,000** | **$29,750** | **+$5,250** | Eligible *(Cap Exceeded)* | **+$5,250** | **+$971** `($5,250 × 18.5%)` |
| **Executive Bonus** | `3540` | **$28,000** | **$23,800** | **+$4,200** | **Excluded** | **$0** | **$0** *(Disallowed)* |
| **Building Demolition** | `3541` | **$55,000** | **$46,750** | **+$8,250** | Eligible *(Cap Exceeded)* | **+$8,250** | **+$1,526** `($8,250 × 18.5%)` |
| **Debt Service** | `3542` | **$15,000** | **$12,750** | **+$2,250** | **Excluded** | **$0** | **$0** *(Disallowed)* |
| **Consolidated Maintenance Pool**| `3543` | **$22,000** | **$18,700** | **+$3,300** | Eligible | **+$3,300** | **+$611** `($3,300 × 18.5%)` |
| **Unspecified CAM Assessment** | `3544` | **$7,800** | **$6,630** | **+$1,170** | Eligible | **+$1,170** | **+$216** `($1,170 × 18.5%)` |
| **Real Estate Taxes** | `3545` | **$13,800** | **$11,730** | **+$2,070** | Eligible | **+$2,070** | **+$383** `($2,070 × 18.5%)` |
| **Building Insurance** | `3546` | **$9,900** | **$8,415** | **+$1,485** | Eligible | **+$1,485** | **+$275** `($1,485 × 18.5%)` |
| **Common Area Electricity** | `3547` | **$7,200** | **$6,120** | **+$1,080** | Eligible | **+$1,080** | **+$200** `($1,080 × 18.5%)` |
| **Security Operations** | `3548` | **$4,800** | **$4,080** | **+$720** | Eligible | **+$720** | **+$133** `($720 × 18.5%)` |
| **Grounds & Snow Removal** | `3549` | **$3,400** | **$2,890** | **+$510** | Eligible | **+$510** | **+$94** `($510 × 18.5%)` |
| **Elevator Service** | `3550` | **$4,100** | **$3,485** | **+$615** | Eligible | **+$615** | **+$114** `($615 × 18.5%)` |
| **Janitorial & Sanitation** | `3551` | **$5,600** | **$4,760** | **+$840** | Eligible | **+$840** | **+$155** `($840 × 18.5%)` |

---

### Summary Metrics Calculation (Bottom of Card)

#### 1. Comparable Pool Increase: `$25,290`
* **Formula:** Sum of all eligible category pool contributions (the 2 excluded lines contribute `$0`):
  $$\begin{aligned}
  \text{Comparable Pool Increase} &= 5,250 + 0 + 8,250 + 0 + 3,300 + 1,170 + 2,070 + 1,485 + 1,080 + 720 + 510 + 615 + 840 \\
  &= \mathbf{\$25,290.00}
  \end{aligned}$$

#### 2. Tenant Share (18.5%): `$4,679`
* **Formula:** Proportionate tenant share of the net eligible comparable pool increase:
  $$\mathbf{\$25,290 \times 18.5\% = \$4,678.65 \longrightarrow \$4,679.00}$$

#### 3. Zero Floor Status: `$0 Floor Active`
* **Contractual Zero Floor Rule:**
  $$\text{Zero Floor Status} = \begin{cases} \mathbf{\$0\text{ Floor Applied (Negative Pool)}} & \text{if Comparable Pool Increase} < 0 \\ \mathbf{\$0\text{ Floor Active}} & \text{if Comparable Pool Increase} \ge 0 \end{cases}$$
* Because the comparable pool increase is positive ($+\$25,290 \ge 0$), the badge shows **`$0 Floor Active`**. If expenses had decreased below the base year stop, the floor would activate to prevent a negative bill.

---

### Frontend Vue.js Implementation

From [auditing.vue](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue#L13245-L13286):

```javascript
camBaseYearContributionList() {
  const findings = (Array.isArray(this.backendValidationFindings) && this.backendValidationFindings.length > 0)
    ? this.backendValidationFindings
    : (Array.isArray(this.statementItems) && this.statementItems.length > 0 ? this.statementItems : []);

  if (findings.length > 0) {
    return findings.map(f => {
      const cat = f.issue_type || f.category || f.name || 'Expense Category';
      const stmtAmt = parseFloat(f.statement_amount || (f.statement_expense ? f.statement_expense.current_amount : (f.amount || 0))) || 0;
      const baseAmt = Math.round(stmtAmt * 0.85);
      const diff = stmtAmt - baseAmt;
      const statusStr = (f.status || '').toLowerCase();
      const isExcluded = statusStr.includes('excluded');
      const sharePct = this.activeTenantSharePercent / 100;
      return {
        category: cat,
        currentYear: `$${stmtAmt.toLocaleString()}`,
        baseYear: `$${baseAmt.toLocaleString()}`,
        difference: `+$${diff.toLocaleString()}`,
        poolContrib: isExcluded ? '$0' : `+$${diff.toLocaleString()}`,
        isExcluded: isExcluded,
        rawPoolContrib: isExcluded ? 0 : diff,
        tenantShare: isExcluded ? '$0' : `+$${Math.round(diff * sharePct).toLocaleString()}`
      };
    });
  }
  return [];
},
camComparablePoolIncrease() {
  const list = this.camBaseYearContributionList || [];
  return list.reduce((sum, item) => sum + (item.rawPoolContrib || 0), 0); // = $25,290
},
camTenantContributionAmount() {
  const rawIncrease = this.camComparablePoolIncrease;
  const netPool = Math.max(0, rawIncrease); // Zero floor applied at pool/tenant level
  return Math.round(netPool * (this.activeTenantSharePercent / 100)); // = $4,679
},
camZeroFloorStatus() {
  return this.camComparablePoolIncrease < 0 ? '$0 Floor Applied (Negative Pool)' : '$0 Floor Active';
}
```

---

## 9. Non-CAM Obligations — Database Lineage & Calculation Mapping

**Context Audit:** `audit_id = 800`  
**UI Location:** Validation Tab $\rightarrow$ **Non-CAM** submenu (`validationSubTab = 'noncam'`).

### Purpose
In addition to Common Area Maintenance (CAM / OpEx), commercial leases contain non-operating expense covenants such as **Tenant Improvement Allowances**, **Security Deposits**, **Base Rent Schedules**, **Abatements**, **Escalation Caps**, and **Moving/Signage Allowances**. This panel validates whether landlord billings adhere to these specific covenants and tracks confirmed proofs of payment against required contractual obligations.

---

### Database Architecture & Tables

#### 1. Table: `non_pes_obligations`
Stores each non-CAM lease covenant for an audit.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | BigInt (PK) | Unique obligation record identifier. |
| `audit_id` | BigInt (FK) | Reference to `audits.id` (`800`). |
| `lease_id` | BigInt (FK) | Reference to `leases.id`. |
| `audit_year` | Varchar(10) | Audit fiscal year (e.g. `'2024'`, `'2025'`). |
| `obligation_type` | Varchar(50) | Coded identifier: `'ti'`, `'sec'`, `'rent'`, `'abate'`, `'escl'`, `'move'`. |
| `category` | Varchar(100) | Category name (e.g. `'Tenant Improvement'`, `'Security Deposit'`). |
| `title` | Varchar(150) | Display title of the obligation. |
| `required_amount` | Decimal(12,2) | Contractually required amount or annual schedule total. |
| `effective_date` | Date | Clause effective or commencement date. |
| `conditions` | Text | Contractual prerequisite conditions (e.g. `'Initial Construction Period'`). |
| `determination` | Varchar(50) | Auditor status: `'Pending'`, `'Variance Found'`, `'No Issue'`, `'Needs Review'`. |
| `reason` | Text | Auditor narrative notes and findings explaining the discrepancy. |
| `schedule_data` | JSON | Sub-schedules, period monthly variances, escalation rates, and credit details. |
| `status` | Varchar(50) | Summary status badge: `'Review Required'`, `'Variance Found'`, `'Reconciled'`. |

#### 2. Table: `non_pes_payments`
Stores verified payments, reimbursement proofs, or held funds linked to an obligation.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | BigInt (PK) | Payment record identifier. |
| `non_pes_obligation_id` | BigInt (FK) | Reference to `non_pes_obligations.id`. |
| `audit_id` | BigInt (FK) | Reference to `audits.id`. |
| `payment_date` | Date | Date payment or reimbursement was executed. |
| `amount` | Decimal(12,2) | Confirmed dollar amount. |
| `evidence_reference` | Varchar(255) | Reference document / check / invoice (e.g. `'Check #4012'`, `'EFT #88921'`). |
| `confirmed_by` | Varchar(100) | Auditor name or confirmation role. |

---

### Verified Line-Item Breakdown (Audit ID: 800)

| Obligation Key | Title | Obligation ID | Required Amount | Confirmed Payments | Unconfirmed / Variance | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **`ti`** | Tenant Improvement Allowance | `13` | **$75,000.00** | **$50,000.00** | **$25,000.00** (Unconfirmed) | `⚠️ Review Required` |
| **`sec`** | Security Deposit | `14` | **$25,000.00** | **$20,000.00** | **$5,000.00** (Unconfirmed) | `⚠️ Review Required` |
| **`rent`** | Base Rent Schedule | `15` | **$120,000.00** | N/A (4 Periods) | **+$1,000.00** (Overbilling) | `⚠️ Variance Found` |
| **`abate`** | Expense Abatement | `16` | **$5,000.00** | **$5,000.00** (Applied) | **$0.00** (Fully Applied) | `✓ Applied` |
| **`escl`** | Rent Escalation | `17` | **$10,000.00** | 5% Annual Cap | **+$500.00** (Overage) | `⚠️ Variance Found` |
| **`move`** | Moving / Signage Allowance | `18` | **$15,000.00** | **$10,000.00** | **$5,000.00** (Unconfirmed) | `⚠️ Review Required` |

---

### Detailed Card-by-Card Logic & Formulas

#### 1. Tenant Improvement Allowance (`id: 13`)
* **Contract Obligation:** `$75,000.00` $\rightarrow$ `non_pes_obligations.required_amount`
* **Confirmed Payments:** `$50,000.00` $\rightarrow$ `non_pes_payments` (`id: 9`, `amount: 50000.00`, `evidence_reference: 'Check #4012'`)
* **Unconfirmed Balance Formula:**
  $$\mathbf{\$75,000.00\text{ (Obligation)} - \$50,000.00\text{ (Confirmed)} = \$25,000.00}$$
* **Auditor Finding (`reason`):**
  > *"Initial reimbursement confirmed via cancelled check #4012. Contractor final retainage invoice ($25,000) remains unconfirmed without proof of payment."*

#### 2. Security Deposit (`id: 14`)
* **Required Deposit:** `$25,000.00` $\rightarrow$ `non_pes_obligations.required_amount`
* **Confirmed / Held:** `$20,000.00` $\rightarrow$ `non_pes_payments` (`id: 10`, `amount: 20000.00`, `evidence_reference: 'EFT #88921'`)
* **Unconfirmed Balance Formula:**
  $$\mathbf{\$25,000.00\text{ (Required)} - \$20,000.00\text{ (Held)} = \$5,000.00}$$
* **Auditor Finding (`reason`):**
  > *"Landlord ledger reflects $20,000 on deposit; remaining $5,000 required deposit requires confirmation from escrow."*

#### 3. Base Rent Schedule (`id: 15`)
* **Annual Schedule:** `$120,000.00` $\rightarrow$ `non_pes_obligations.required_amount`
* **Audit Periods:** `4 Periods` $\rightarrow$ Length of JSON array `non_pes_obligations.schedule_data`
  * `Jan-2025`: Expected `$10,000` | Billed `$10,000` | Variance `$0` (Balanced)
  * `Feb-2025`: Expected `$10,000` | Billed `$11,000` | Variance `+$1,000` (Overbilled)
  * `Mar-2025`: Expected `$10,500` | Billed `$10,500` | Variance `$0` (Balanced)
  * `Apr-2025`: Expected `$10,500` | Billed `$10,000` | Variance `-$500` (Underbilled)
* **Net Overbilling Formula:** Sum of positive period variances:
  $$\mathbf{\sum \max(0, \text{variance}) = +\$1,000.00}$$
* **Auditor Finding (`reason`):**
  > *"February 2025 base rent billed at $11,000 vs. contract schedule of $10,000 resulting in a $1,000 overcharge."*

#### 4. Expense Abatement (`id: 16`)
* **Condition:** `Initial Construction Period` $\rightarrow$ `non_pes_obligations.conditions`
* **Expected Credit:** `$5,000.00` $\rightarrow$ `non_pes_obligations.schedule_data.expectedCredit`
* **Applied Credit:** `$5,000.00` $\rightarrow$ `non_pes_obligations.schedule_data.appliedCredit`
* **Variance Formula:**
  $$\mathbf{\$5,000.00\text{ (Expected)} - \$5,000.00\text{ (Applied)} = \$0.00\text{ (Fully Applied)}}$$
* **Auditor Finding (`reason`):**
  > *"Full 1-month construction abatement credit of $5,000 was accurately applied."*

#### 5. Rent Escalation (`id: 17`)
* **Annual Cap:** `5% Annual` $\rightarrow$ `non_pes_obligations.schedule_data.annualIncreasePct`
* **Effective Date:** `2025-02-01` $\rightarrow$ `non_pes_obligations.effective_date`
* **Escalation Overage Formula:** Sum of unapproved monthly escalation hikes exceeding the contractual 5% cap:
  * `Jan-2025`: Expected `$10,000` | Billed `$10,000` | Variance `$0`
  * `Feb-2025`: Expected `$10,500` | Billed `$10,500` | Variance `$0` (5% Cap compliant)
  * `Mar-2025`: Expected `$10,500` | Billed `$11,000` | Variance `+$500` (10% hike exceeds 5% cap)
  $$\mathbf{\text{Escalation Overage} = +\$500.00}$$
* **Auditor Finding (`reason`):**
  > *"March 2025 escalation exceeded 5% cap resulting in $500 unauthorized escalation."*

#### 6. Moving / Signage Allowance (`id: 18`)
* **Contract Allowance:** `$15,000.00` $\rightarrow$ `non_pes_obligations.required_amount`
* **Confirmed Payments:** `$10,000.00` $\rightarrow$ `non_pes_payments` (`id: 11`, `amount: 10000.00`, `evidence_reference: 'Invoice #INV-9921'`)
* **Unconfirmed Balance Formula:**
  $$\mathbf{\$15,000.00\text{ (Allowance)} - \$10,000.00\text{ (Confirmed)} = \$5,000.00}$$
* **Auditor Finding (`reason`):**
  > *"$10,000 reimbursed for signage; $5,000 moving reimbursement balance requires supporting vendor receipts."*

---

### Backend API Endpoints & Controller

* **Controller:** `App\Http\Controllers\API\NonPesValidationController`
* **Route Definitions (`routes/api.php`):**
  * `GET /api/validation/non-pes?audit_id=800`: Retrieves all obligations and eager-loads confirmed payments.
  * `POST /api/validation/non-pes/payments`: Adds a new confirmed payment/evidence record. Automatically sets obligation status to `'Reconciled'` if `remaining_amount <= 0`.
  * `DELETE /api/validation/non-pes/payments/{id}`: Deletes a payment record and recalculates unconfirmed balance.
  * `PUT /api/validation/non-pes/obligations/{id}`: Updates determination, auditor reason, or required amount.

---

### Frontend Vue.js Implementation in `auditing.vue`

```javascript
// 1. Confirmed Payments Sum
getNonPesConfirmedAmount(obligation) {
  if (!obligation || !obligation.payments) return 0;
  return obligation.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
},

// 2. Unconfirmed Balance Calculation
getNonPesRemainingAmount(obligation) {
  if (!obligation) return 0;
  const req = parseFloat(obligation.requiredAmount) || 0;
  const conf = this.getNonPesConfirmedAmount(obligation);
  return Math.max(0, req - conf);
},

// 3. Overbilling & Escalation Variance Calculation
getRentNetVariance(obligation) {
  if (!obligation || !obligation.schedule || !Array.isArray(obligation.schedule)) return 0;
  return obligation.schedule.reduce((sum, row) => sum + Math.max(0, parseFloat(row.variance) || 0), 0);
}
```






