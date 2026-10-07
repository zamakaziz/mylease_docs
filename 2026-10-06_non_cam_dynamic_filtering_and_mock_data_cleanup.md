# Implementation Documentation: Non-CAM Strict Lease Concession Display & Mock Data Cleanup

**Date:** 2026-10-06  
**Module:** Non-CAM / Non-PES Validation & Lease Concessions Integration  
**Route:** `/auditing?tab=validation&id=801`  

---

## 1. Problem Description
On the validation page under the Non-CAM sub-tab (`http://192.168.0.2:3000/auditing?tab=validation&id=801`), all 6 standard Non-CAM cards (Tenant Improvement Allowance, Security Deposit, Base Rent Schedule, Expense Abatement, Rent Escalation, Moving / Signage Allowance) were being displayed even when the lease only contained a single concession (such as Security Deposit $4,000). Furthermore, historical mock/dummy seeded records ($75,000 TI with check #4012, $120,000 Base Rent, $5,000 Abatement, $10,000 Escalation, and $15,000 Moving Allowance) were stored in the database and hardcoded in backend fallback initializers.

The client requirement states:
1. **Strict Concession Display**: Only show Non-CAM cards for concessions that have actually been created on the lease in the Lease Concessions tab. If no concession was created for a category, do NOT show that card.
2. **No Dummy / Hardcoded Fallbacks**: Remove all dummy fallback initialization and sample payments.
3. **Data Truncation**: Truncate obsolete mock/seeded table data in `non_pes_obligations` and `non_pes_payments` so that obligations are purely driven by real lease concessions.

---

## 2. Root Cause Analysis
1. **Frontend Static Card Array**: In [`frontend/pages/auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue), the computed property `nonCamValidationList()` previously checked `if (!this.nonPesObligations || !this.nonPesObligations.ti) return [];` and unconditionally returned an array containing all 6 cards. If any audit had `this.nonPesObligations` populated, it displayed cards for categories with no concession.
2. **Backend Dummy Fallbacks**: In [`backend/app/Services/Validation/NonCamConcessionService.php`](file:///home/c864/Projects/mylease/backend/app/Services/Validation/NonCamConcessionService.php) and [`backend/app/Http/Controllers/API/NonPesValidationController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/NonPesValidationController.php), obsolete mock seeding functions (`initializeObligations` and `seedInitialObligations`) hardcoded $75k, $25k, $120k, $5k, $10k, $15k dummy obligations and fake payments (Check #4012, EFT #88921, Invoice #INV-9921).
3. **Seeded Database Rows**: The database previously contained 7 legacy mock obligation rows and 7 sample payment rows created during earlier prototyping.

---

## 3. Backend Changes

### 3.1 Strict Synchronization in [`NonCamConcessionService.php`](file:///home/c864/Projects/mylease/backend/app/Services/Validation/NonCamConcessionService.php)
- Cleaned up `syncObligationsFromLease()`:
  - If a lease has no concessions (`$applicableConcessions->isEmpty()`), all existing obligations for the audit are deleted and an empty collection is returned.
  - For each category (`ti`, `sec`, `abate`, `move`, `rent`), obligations are created/updated **strictly if** a matching concession exists in `$applicableConcessions`. If no concession exists for that category, any existing obligations for that type are deleted via cascade.
  - Escalation (`escl`), which has no concession type, is explicitly removed.
  - All unlinked mock obligations (`whereNull('concession_id')`) are purged.
- Removed dead and dummy method `initializeObligations()` which contained hardcoded dummy amounts and sample payments.

### 3.2 Cleanup in [`NonPesValidationController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/NonPesValidationController.php)
- Removed obsolete `seedInitialObligations()` method containing dummy data.
- Ensured `index()` returns purely data generated from `syncObligationsFromLease()`.

### 3.3 Database Table Cleanup
- Truncated `non_pes_payments` and `non_pes_obligations` table data to eliminate all mock and seeded records.

---

## 4. Frontend Changes

### 4.1 Dynamic Filtering in [`frontend/pages/auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue)
- Refactored `nonCamValidationList()`:
  - Removed the hardcoded check for `obs.ti`.
  - Dynamically constructs `list = []` by inspecting which concession keys exist in `this.nonPesObligations` (`obs.ti`, `obs.sec`, `obs.rent`, `obs.abate`, `obs.escl`, `obs.move`).
  - If only `obs.sec` exists (e.g. for Audit 801 whose lease has only Security Deposit $4,000), only the Security Deposit card is returned in the list.
  - If no concessions exist on the lease, `list` is empty (`[]`), causing the template to render the standard empty state: *"No Non-CAM obligations recorded for this audit"*.

---

## 5. Test Results & Verification

### 5.1 API Verification for Audit 801
Ran API verification for `GET /api/validation/non-pes?audit_id=801`:
```json
{
    "status": true,
    "data": [
        {
            "id": 1,
            "audit_id": 801,
            "lease_id": 497,
            "concession_id": 3,
            "obligation_type": "sec",
            "category": "Security Deposit",
            "title": "Security Deposit",
            "required_amount": 4000,
            "reason": "security deposite",
            "payments": [],
            "concession": {
                "id": 3,
                "type": "Security Deposit",
                "amount": 4000
            }
        },
        {
            "id": 2,
            "audit_id": 801,
            "lease_id": 497,
            "concession_id": 1,
            "obligation_type": "rent",
            "category": "Base Rent",
            "title": "Base Rent Schedule",
            "required_amount": 5000,
            "reason": "descrption",
            "payments": [],
            "concession": {
                "id": 1,
                "type": "Rent Concessions",
                "amount": 5000
            }
        }
    ]
}
```
*Result:* Both created concessions (Security Deposit $4,000 and Rent Concessions $5,000) are returned and displayed in Non-CAM cards. All other mock cards are absent.

### 5.2 Automated Backend Feature Tests
```bash
docker exec myleaseaudit_app php artisan test --filter=NonCamConcessionIntegrationTest
```
Output:
```text
   PASS  Tests\Feature\NonCamConcessionIntegrationTest
  ✓ tenant improvement allowance partial payment
  ✓ fully paid tenant improvement allowance
  ✓ security deposit concession integration
  ✓ expense abatement concession integration
  ✓ missing concession graceful handling
  ✓ multiple concessions handled by respective rules
  ✓ multiple premises filtering
  ✓ existing lease backward compatibility
  ✓ no double counting

  Tests:  9 passed
  Time:   0.54s
```

```bash
docker exec myleaseaudit_app php artisan test --filter=LeaseConcessionsTest
```
Output:
```text
   PASS  Tests\Feature\LeaseConcessionsTest
  ✓ lease without concessions returns empty and zero totals
  ✓ single concession can be created and retrieved
  ✓ multiple concessions and security deposit total calculation
  ✓ concession can be updated
  ✓ concession can be deleted without affecting other concessions or lease
  ✓ unsupported concession type is rejected
  ✓ premise from another lease is rejected
  ✓ add lease with concession cart persists concessions
  ✓ get lease concessions validates non existent lease
  ✓ create lease concession validates negative amount
  ✓ update lease concession validates non existent id
  ✓ delete lease concession validates non existent id

  Tests:  12 passed
  Time:   1.04s
```

Total: **21 passed tests** across the integration and concessions test suites.

---

## 6. Files Changed Table

| File | Type | Description |
| :--- | :--- | :--- |
| [`frontend/components/Lease/Components/Concessions.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/Components/Concessions.vue) | Frontend | Add immediate network API calls for Add (`POST /api/leases/:id/concessions`), Edit (`PUT /api/lease-concessions/:id`), and `fetchConcessions` on mount. |
| [`frontend/components/Lease/Form.vue`](file:///home/c864/Projects/mylease/frontend/components/Lease/Form.vue) | Frontend | Pass `leaseFormData` prop into `Concessions` component for lease ID resolution. |
| [`frontend/pages/auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue) | Frontend | Dynamically push only Non-CAM cards for concessions present in `nonPesObligations`. |
| [`backend/app/Http/Controllers/API/LeaseController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/LeaseController.php) | Backend | Safeguard `addLease` on edit to only modify concessions when `concessionCart` is explicitly provided in the request payload. |
| [`backend/app/Models/DocumentSource.php`](file:///home/c864/Projects/mylease/backend/app/Models/DocumentSource.php) | Backend | Fix Eloquent relationships connecting `DocumentSource` to `AuditDocument` via `Lease`. |
| [`backend/app/Services/Validation/NonCamConcessionService.php`](file:///home/c864/Projects/mylease/backend/app/Services/Validation/NonCamConcessionService.php) | Backend | Enforce strict concession synchronization and remove dummy `initializeObligations()`. |
| [`backend/app/Http/Controllers/API/NonPesValidationController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/NonPesValidationController.php) | Backend | Remove obsolete `seedInitialObligations()` method containing hardcoded sample data. |
| [`backend/tests/Feature/NonCamConcessionIntegrationTest.php`](file:///home/c864/Projects/mylease/backend/tests/Feature/NonCamConcessionIntegrationTest.php) | Test | Update tests to assert empty list for leases without concessions and dynamic sync upon concession addition. |
| [`docs/commit_messages.md`](file:///home/c864/Projects/mylease/docs/commit_messages.md) | Docs | Log proposed commit messages for backend and frontend. |

