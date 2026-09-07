# Validation Submenu – Implementation Requirements

**Page:** `/auditing?tab=validation&id=807`

Please implement the following changes in the **Validation** submenu.

---

## 1. Expense Statement Tab

### Current Requirement

The **Expense Statement** tab should display **all available expense statements**.

### Changes Required

1. Remove any restriction that prevents all statements from being displayed.
2. Display all expense statements in the statement listing/select dropdown.
3. There is currently a **Statement Select** dropdown on the page.
4. When the user selects a statement:

   * Use the selected statement for validation.
   * Automatically execute/run the validation for that statement.
   * **Remove the existing "Run Validation" button**, since validation should happen automatically after selecting a statement.
5. Make sure the selected statement is clearly reflected in the UI.

### Test Data

Please create factories for testing.

#### Expense Items Factory

* Create a factory to generate expense statement items.
* Add **10 test expense items** initially.
* Use realistic data covering different expense/cost scenarios.
* The factory should be easy to remove or disable after testing.

Example:

```text
Expense Statement
    ├── Expense Item 1
    ├── Expense Item 2
    ├── ...
    └── Expense Item 10
```

#### Expense Statement Factory

Also create a factory to generate **5 expense statements**.

The statements should have enough variation to properly test the validation logic.

Example:

```text
Statement 1
Statement 2
Statement 3
Statement 4
Statement 5
```

Each statement should have associated expense items where required by the existing database relationships.

---

# 2. Validation Results Tab

The **Validation Results** tab needs changes to the validation-rule logic.

## Lease Matching Requirement

The `leases` table contains both:

* **Original Lease**
* **Lease Amendment**

The lease type is identified using the existing `lease_type` field.

The validation must determine which lease should be used based on the **selected expense statement**.

### Required Logic

When a statement is selected:

1. Identify the lease associated with the audit/statement.
2. Check the lease records in the `leases` table.
3. Consider both:

   * Original Lease
   * Lease Amendment
4. Match the selected statement against the appropriate lease based on the existing lease/statement relationship and `lease_type`.
5. The validation should not incorrectly compare an expense statement against an unrelated lease amendment or original lease.

---

# 3. Validation Status Logic

The validation result should determine the status based on the statement cost and the applicable lease cost/cap.

### Case 1 – Allowed

If the **statement cost matches the applicable Original Lease or Lease Amendment cost against the audit**, mark the validation as:

**Status:** `Allowed`

Display the status using **green color**.

```text
Allowed
```

---

### Case 2 – Excluded

If the statement cost does **not match** the applicable lease cost and does not fall under the cap-exceeded condition, mark the validation as:

**Status:** `Excluded`

Display the status using **red color**.

```text
Excluded
```

---

### Case 3 – Cap Exceeded

Add logic to identify when the expense/statement amount exceeds the applicable allowed lease cost/cap.

When the configured/applicable cap is exceeded:

**Status:** `Cap Exceeded`

Display the status using **orange color**.

```text
Cap Exceeded
```

The cap-exceeded condition should take precedence over the normal Allowed/Excluded result where appropriate.

---

# 4. Expected Status Display

The Validation Results UI should visually distinguish the results:

| Condition                                                   | Status           | Color     |
| ----------------------------------------------------------- | ---------------- | --------- |
| Statement cost is within/matches applicable lease allowance | **Allowed**      | 🟢 Green  |
| Statement cost does not satisfy the applicable lease rule   | **Excluded**     | 🔴 Red    |
| Statement cost exceeds the applicable cap                   | **Cap Exceeded** | 🟠 Orange |

Use the project's existing badge/status component and styling conventions if available rather than introducing a new UI pattern.

---

# 5. Test Data for Validation Results

Please create factory/seed data to properly test all three scenarios:

### Scenario A – Allowed

Create test data where:

```text
Statement Cost <= Applicable Lease Cost/Allowance
```

and the statement matches the applicable Original Lease or Lease Amendment.

Expected:

```text
Allowed (Green)
```

### Scenario B – Excluded

Create test data where the statement does not satisfy the applicable lease validation rule.

Expected:

```text
Excluded (Red)
```

### Scenario C – Cap Exceeded

Create test data where:

```text
Statement Cost > Applicable Cap
```

Expected:

```text
Cap Exceeded (Orange)
```

Also include test data containing both:

```text
Original Lease
Lease Amendment
```

so we can verify that the correct `lease_type` is selected/matched for the statement.

---

# 6. Factory Requirements

Factories should:

* Follow the existing Laravel factory conventions in the project.
* Reuse existing factories/relationships where possible.
* Avoid hardcoding IDs.
* Create valid relationships between:

  * Audit
  * Lease
  * Original Lease
  * Lease Amendment
  * Expense Statement
  * Expense Statement Items
  * Validation Results
* Generate deterministic/understandable test data where needed so each validation scenario can be easily verified.
* Keep the test data isolated so it can be removed after validation/testing.

Do **not** modify production/business data just to create test scenarios.

---

# 7. Important Implementation Checks

Before implementation, inspect the existing code and determine:

1. How Expense Statements are currently loaded.
2. How the Statement Select dropdown is populated.
3. Where the existing **Run Validation** action is implemented.
4. How validation rules are currently executed.
5. How `lease_type` is currently represented and used.
6. Existing relationships between:

   * Audit → Lease
   * Audit → Statement
   * Statement → Expense Items
   * Lease → Lease Amendment
7. Existing validation status constants/enums.
8. Existing status badge/color components.
9. Existing validation result calculation logic.

Prefer extending/refactoring the existing implementation instead of creating duplicate validation logic.

---

# 8. Acceptance Criteria

### Expense Statement

* [ ] Expense Statement tab displays all statements.
* [ ] Statement dropdown contains all available statements.
* [ ] Selecting a statement automatically triggers validation.
* [ ] Existing **Run Validation** button is removed.
* [ ] 5 test statements can be generated using a factory.
* [ ] 10 test expense items can be generated using a factory.

### Lease Validation

* [ ] Original Lease and Lease Amendment are both supported.
* [ ] `lease_type` is correctly considered.
* [ ] Selected statement is matched against the correct lease.
* [ ] Unrelated lease amendments are not used for validation.

### Validation Results

* [ ] Valid/matching statement → **Allowed** → Green.
* [ ] Invalid/non-matching statement → **Excluded** → Red.
* [ ] Amount exceeding applicable cap → **Cap Exceeded** → Orange.
* [ ] Correct status is returned consistently from backend validation logic.
* [ ] Frontend displays the status using the correct color.

### Test Data

* [ ] Factory for 5 statements.
* [ ] Factory/data generation for 10 expense items.
* [ ] Test data for Allowed scenario.
* [ ] Test data for Excluded scenario.
* [ ] Test data for Cap Exceeded scenario.
* [ ] Test data includes Original Lease and Lease Amendment cases.

---

## Implementation Approach

First inspect the existing models, migrations, factories, validation services/rules, controllers/API endpoints, and Vue components involved in the Validation submenu.

Then implement the changes while preserving the existing architecture and coding conventions.

After implementation:

1. Run relevant Laravel tests.
2. Run frontend/lint/type checks if available.
3. Verify the Validation page manually.
4. Test all three statuses.
5. Verify both Original Lease and Lease Amendment scenarios.
6. Confirm selecting a different statement recalculates the validation correctly.
7. Document any assumptions made where the existing business logic is ambiguous.
