# MyLeaseAudit AI Enhancement — Validation Module
## Requirements & Implementation Plan

**Source:** Client call (Sept 24, 2026) with Andrew (client) and Cubet team (Shiraj/Anu)
**Scope:** TRS, PES, Non-PES, Cap/Exclusion logic, Sales Tax, Statement Versioning, Lease data integrity, Observation/Savings integration.

---

# PART A — Requirements

## A.1 Background / Context

- MyLeaseAudit already has an existing UI/framework for lease audits. This enhancement is **not** a new UI — it is specifically an enhancement to the **Validation** section only.
- The audit process extracts data from two source documents:
  - **Lease** → financial/lease terms, concessions, caps, allowances, etc.
  - **Statement** → made up of two parts:
    - **PES – Property Expense Statement**: line-item breakdown of expenses.
    - **TRS – Tenant Reconciliation Statement**: the invoice/summary total that should reconcile against the PES breakdown.
- Current validation UI only captures/displays the **PES** side. The **TRS** side is largely missing from the new validation screen.

## A.2 Core Requirement: TRS ↔ PES Reconciliation Logic

- The validation must confirm that the **total on the TRS (invoice)** equals the **sum of line items on the PES (breakdown)**.
  - Difference = 0 → statement is consistent (no issue).
  - Difference ≠ 0 → starting point of an audit finding (an **observation**).
- **Bug identified:** current calculation subtracts "TRS total" from "sum of PES items" directly, without first computing/displaying the PES subtotal on its own line.
- **Requirement:** Extract TRS automatically (not manual entry) wherever possible, same as PES, and display it in the validation UI.

## A.3 Missing Sections in the Validation Screen

Two major categories of extracted data are **not yet surfaced**:

1. **TRS / Reconciliation** — reconciliation between invoice and detailed expense breakdown.
2. **Non-PES financial obligations** — tenant improvement allowance, security deposit, base rent/rent escalation, expense abatements. Often **larger in dollar value** than PES findings.

**Naming convention** (use existing MyLeaseAudit terminology, not "CAM"/"non-CAM"):
- Item 3 → **PES (Property Expense Statement)**
- Item 4 → **TRS (Tenant Reconciliation Statement)**
- Item 5 → **Non-PES / Non-OpEx**

## A.4 Validation Logic Requirements (per category)

### Sales Tax
- Two-part validation: (1) identify categories subject to sales tax, (2) confirm it was calculated correctly.
- Jurisdiction (city/state) rule engine is **not yet implemented** — deferred.
- If lease/statement indicates sales tax should apply but extracted amount is $0 → flag as observation.
- If lease confirms no sales tax applies → mark confirmed, no issue.

### Caps (Two Types)
- **Absolute Cap:** fixed $ or % cap for a given year. If exceeded → flag **"Cap Exceeded"** with overage amount.
- **Increase Cap (Year-over-Year):** limits how much a category can increase vs. prior year, per Lease → Operating Cost Info → Increase tab logic.
- **Effective dates matter:** cap value used must be the one effective during the statement's coverage period, accounting for lease amendments.
- **Status tags:** **Excluded** (entire category disallowed), **Limited** (partially allowable — needs sub-item detail), **Cap Exceeded**.

### Statement Granularity (4 vs. 28 categories)
- Consolidated (4-category) statements can only yield generic "Limited" results.
- Detailed (28-category) statements map more directly to lease clauses and can yield precise **Excluded / Capped / Allowed** results per line.

## A.5 Lease Data Must Be Saved to Database (Critical Blocker)

- Clause references and cap explanations shown in the validation screen appear to be **fabricated / not sourced from real lease extraction** (confirmed live on the call — the clause text shown does not exist in real leases).
- Root cause: extracted lease content is not reliably persisted into the correct DB fields.
- **Action:** Cubet to review Andrew's field-mapping sheet, confirm which fields are mapped/unmapped.
- Andrew will re-share: mapping sheet, sample extraction Excel (incl. base rent schedule), call recording.

## A.6 Non-PES Items — Detailed Requirements

- **Tenant Improvement Allowance:** lease-entitled amount (e.g., $75,000); auditor checks for proof of payment, records date/amount; confirmed vs. unconfirmed split; unconfirmed portion → Observation → Savings.
- **Security Deposit:** same pattern as above; UI should be **consistent** with Tenant Improvement Allowance (currently inconsistent).
- **Base Rent / Rent Escalation:** extracted from lease's base rent schedule; mostly extraction + auditor review, no complex calculation.

## A.7 Savings & Observations Workflow (Confirmed Working As-Designed)

- Flow: **Validation → Observation → Savings**. Savings can only be created from an Observation — confirmed correct, no change needed.
- Auto-generated savings statement (from observation conversion) can be edited by the auditor afterward.

## A.8 Statement Versioning & Duplicate Prevention (Bug)

- **Bug confirmed live on call:** system currently allows two "All Expenses / Original" statements for the same property + year. Must be blocked.
- **Exceptions:** partial-year statements, or statements split by category (e.g., taxes-only vs. insurance-only).
- **New concept (optional):** "Detailed Statement" (V2) — once saved, should supersede the Initial (V1) statement as the authoritative record for validation and Compare.
- **Statement states:** Original, Revised, Suspended, Future (Future = lower priority, only relevant for landlord revisions).
- **Compare module:** already correctly uses Original/Revised logic — confirmed working, no changes needed.
- **Validation history:** lower priority, may be dropped.

---

# PART B — Implementation Plan

## B.0 Priority Overview

| Priority | Theme | Why |
|---|---|---|
| P0 – Blocker | Lease data persistence / field mapping | Nothing else validates correctly until lease data is reliably saved to DB against confirmed fields |
| P0 – Bug | Duplicate "Original" statement per year | Data-integrity bug, agreed requirement not enforced |
| P0 – Bug | PES total/difference calculation order | Wrong number shown to auditors today |
| P1 | TRS extraction + display in Validation UI | Core missing feature, blocks reconciliation |
| P1 | Non-PES section (tenant allowance, security deposit, base rent, escalations) | Large-dollar items currently invisible |
| P1 | Cap logic (absolute + increase cap, effective-dated) | Needed for accurate findings |
| P1 | Sales-tax applicability check (not jurisdiction engine) | Reclassified P1 per 32.15 below |
| P2 | Detailed Statement (V2) concept | "Nice to have if feasible," can be simplified/dropped |
| P2 | Statement version comparison / advanced version workflow | Secondary |
| P3 | Validation run history | Explicitly low priority, may be dropped |
| P3 | Jurisdiction-based sales-tax engine | Deferred |

*Note: Section B.9 (Priority Classification) below is authoritative where it differs from this table.*

## B.1 Phase 1 — Foundation: Lease & Statement Data Integrity (P0)

### 1.1 Field Mapping Reconciliation
- [ ] Cubet to review Andrew's field-mapping sheet (extracted fields → DB schema).
- [ ] Produce a gap list: unmapped fields, incorrectly saved fields, fields missing from schema.
- [ ] Get client sign-off on the finalized mapping before building dependent validation logic.

### 1.2 Extraction Pipeline Verification (Definition of Done)
- [ ] Pull a sample extraction Excel (incl. base rent schedule) and diff against what's persisted in DB.
- [ ] Confirm batch-processing → review/confirm → save-to-DB pipeline writes every mapped field.
- [ ] For every field, verify: exists in extraction → has defined mapping → persisted in DB → correct value stored → validation retrieves the DB value → no value silently lost. This full checklist is the formal Definition of Done per field — not a spot-check.

### 1.3 Remove Fabricated / Placeholder Content (Non-Negotiable Architecture Rule)
- [ ] Audit the validation screen for hardcoded/mock clause text not actually sourced from extracted lease data.
- [ ] Replace with real DB-backed values, or show "Not extracted" — never fabricated placeholder text.
- **Rule:** Validation must never depend on hardcoded values, mock/sample lease values, temporary extraction output, UI-only values, or manually embedded validation data. Required flow:
  ```text
  Source Document → AI/Extraction → Structured Data → Review/Confirmation
     → Persist to MyLeaseAudit DB → Validation Engine → Validation Result
  ```

### 1.4 Lease Data Surfacing
- [ ] Ensure extracted lease fields (allowances, caps, exclusions, sales-tax applicability, effective dates) populate the **Lease module** itself, not just get referenced from Validation.

### 1.5 Data Model Additions (pending mapping sheet confirmation)
- [ ] Cap type (absolute/increase), cap value, effective start/end date, fee-rate type, fee-allowed flag, subject-to-cap flag.
- [ ] Sales-tax applicability (from lease), jurisdiction reference (future).
- [ ] Tenant improvement allowance, security deposit (amount/description/flag), base rent schedule (monthly table).
- [ ] **Source traceability fields:** every validation-facing value tied to caps, amendments, sales-tax applicability, increase rules, allowances, deposits, base rent, escalation, abatements should carry a reference back to source document/page/section wherever extraction can supply one.

## B.2 Phase 2 — Bug Fixes (P0)

### 2.1 PES Total / Difference Calculation
- **Required behavior:**
  ```text
  PES Subtotal = SUM(all applicable PES expense line items)   [stored/computed field, not just UI artifact]
  Difference  = TRS Total − PES Subtotal
  ```
  UI order: **PES Subtotal → TRS Total → Difference → Validation Status**.
  Difference = 0 → reconciled. Difference ≠ 0 → auto-generate candidate Observation: *"Difference between PES total and TRS total: {difference}."*
  Never calculate the difference from a manually entered or unrelated total.
- [ ] Update calculation logic in validation service/component.
- [ ] Update UI to render subtotal row above the difference row.
- [ ] Unit tests: zero difference, positive, negative, missing TRS value.

### 2.2 Duplicate Statement Prevention (Context-Aware)
- **Bug:** two statements of type **"Original / All Expenses"** can be saved for the same property + year.
- **Required behavior:** block save if existing statement matches `(property, year, statement_type = All Expenses, Original)`. Duplicate detection must consider business context — key on `(property, year, statement_type, category, partial_year_flag)`, not just `(property, year)`.
- **Allowed exceptions:** partial-year statements; statements split by category (taxes-only vs. insurance-only).
- [ ] Add server-side uniqueness validation (not just UI-level).
- [ ] Add clear error messaging to the auditor UI.
- [ ] Regression test reproducing the exact scenario from the call (2019, Calendar Year, All Expenses, Original — second save should fail).

## B.3 Phase 3 — TRS Integration into Validation Screen (P1)

### 3.1 TRS Extraction & Persistence
TRS must be treated as **first-class validation data** — not informational only. It must be (1) Extracted, (2) Persisted, (3) Displayed, (4) Used in validation, (5) Available for PES/TRS reconciliation.

**Minimum TRS fields:**
```text
Expense Pool
Base-Year Expense Pool
Tenant Premises Share %
Tenant Dollar Share
Premises Expense Exposure
Current Amount
TRS Total
```
Additional fields per the approved extraction mapping.

- [ ] Confirm/extend extraction logic to pull these TRS fields.
- [ ] Persist TRS fields distinctly from PES fields, linked to the same statement record.

### 3.2 TRS Display in Validation UI
- [ ] Add a **TRS** section to the Validation screen (paired with the existing **PES** section), using consistent MyLeaseAudit naming.
- [ ] Support collapse/expand for the TRS panel.
- [ ] Wire the reconciliation math from 2.1 into this combined view.

### 3.3 Premises Expense Exposure Calculation
- [ ] Fix "Premises Expense Exposure" — currently not calculating. Should be the sum of relevant statement exposure amounts (confirm exact formula against Andrew's Excel logic doc).
- [ ] Ensure the field updates reactively when underlying statement values change.

## B.4 Phase 4 — Non-PES Section (P1)

### 4.1 New "Non-PES" Category (rename from Non-CAM)
- [ ] Add a **Non-PES / Non-OpEx** section parallel to PES/TRS, covering Tenant Improvement Allowance, Security Deposit, Base Rent/Rent Escalation, Expense Abatements.
- **Rule:** all Non-PES obligations must be data-driven:
  ```text
  Lease → Extract Obligation → Persist Obligation → Validation → Auditor Confirmation → Observation/Finding
  ```
  None may be manually keyed into the validation screen without a persisted lease-derived source value.

### 4.2 Tenant Improvement Allowance & Security Deposit
- [ ] Unify the UI pattern for both (currently inconsistent).
- [ ] Persist: Required amount, Confirmed amount, Payment date, Evidence/reference, Remaining/unconfirmed amount.
  - Example: `Required = $75,000 → Confirmed = $50,000 → Remaining = $25,000`.
- [ ] "Add confirmed payment" action must actually persist to DB — currently a non-functional UI marker per the call demo.
- [ ] Remaining/unconfirmed amount must be actionable: auditor can create an **Observation** directly from it.

### 4.3 Base Rent / Rent Escalation
- [ ] Pull base rent schedule table from lease extraction into this section.
- [ ] Read-only review view is sufficient — extraction + auditor review + observation creation only.

### 4.4 Observation & Savings Linkage
- [ ] Confirm Non-PES items follow the same **Validation → Observation → Savings** flow used elsewhere — no independent/parallel savings workflow. Existing MyLeaseAudit savings functionality remains the source of truth.

## B.5 Phase 5 — Cap & Exclusion Logic (P1)

### 5.1 Status Tags
- [ ] Implement: **Excluded** (entire category disallowed), **Limited** (partial — needs sub-item detail, only reliable at 28-category granularity), **Cap Exceeded**.

### 5.2 Absolute Cap
- [ ] `if statement_amount_for_category > absolute_cap_value → Cap Exceeded, overage = statement_amount − cap_value`.
- [ ] Cap value must respect effective date range (see 5.4).

### 5.3 Increase Cap (Year-over-Year)
- [ ] Reuse existing lease increase-cap configuration/logic already built for the Lease module — confirm it's callable from Validation rather than reimplemented.

### 5.4 Effective-Dated Cap Resolution
- [ ] Resolve the correct cap by matching the statement's coverage period against each cap's effective date range (accounting for lease amendments), not just the original lease value.
- [ ] Tests: statement period fully within one amendment window; statement period spanning an amendment boundary (confirm expected behavior with client if this arises).

### 5.5 Granularity-Aware Validation
- **Rule:** *The validation engine must only generate a level of detail that is supported by the extracted statement data.*
- [ ] 4-category statement → generic tags only (e.g., "Limited"), no fabricated subcategory findings.
- [ ] 28-category statement → precise tags (Excluded/Capped/Allowed) per line.
- [ ] Validation engine must be granularity-aware and select the matching strategy based on which statement version is being validated.

## B.6 Phase 6 — Sales Tax (P1 applicability check / P3 jurisdiction engine)

### 6.1 Applicability Check (buildable now — P1)
- [ ] If lease extraction indicates sales tax applies to a category but extracted statement amount is $0 → flag observation ("Sales tax expected but not charged").
- [ ] If lease extraction indicates no sales tax applies → mark confirmed/no issue.

### 6.2 City/State Tax Rule Engine (deferred — P3)
- [ ] Out of scope for this phase. Backlog item: jurisdiction-based default tax applicability tied to property address.

## B.7 Phase 7 — Statement Versioning: Active/Superseded & Detailed Statement (P2, optional)

### 7.1 Active and Superseded Statement Versions
Define an explicit **Active Statement Version** concept:
```text
Statement
├── V1 – Original    Status: Superseded
└── V2 – Detailed     Status: Active
```
- Only one version should normally be active for a given statement/year/category context.
- When a Detailed Statement replaces an Original: Original stays available for history, becomes `Superseded`; Detailed becomes `Active`.
- Validation always uses the **Active Statement Version**.
- Historical validation runs retain the statement version that was active at execution time.

**Recommended fields** (model equivalents — do not duplicate if existing schema already covers these): `version_number`, `version_type`, `status`, `is_active`, `superseded_at`, `superseded_by`.

- [ ] Evaluate feasibility with the team. If not feasible within scope/timeline, **skip** — the duplicate-statement bug fix (B.2.2) must still ship regardless.
- [ ] No changes needed to the **Compare module** — already correctly uses Original/Revised logic; extend the same "authoritative version" logic to include Detailed if built.
- **Priority rule:** Core Validation (P0/P1) → then Statement Versioning (P2/Optional). If implementation complexity is high, complete core PES/TRS/lease validation first.

## B.8 Phase 8 — Validation Run History (P3, likely deprioritized)

- Not a core MVP blocker. If implemented, a run should retain at minimum:
  ```text
  Validation Run
   ├── Statement Version
   ├── Audit
   ├── User
   ├── Execution Date/Time
   └── Result / Status
  ```
- [ ] No build action needed this phase; defer unless a specific audit-trail requirement surfaces later.

## B.9 Priority Classification (Authoritative)

**P0 – Blockers / Foundation**
- Lease extraction mapping · Persist extracted lease data · Persist extracted statement data
- Remove hardcoded/mock validation data · Duplicate Original statement prevention
- Correct PES subtotal calculation · Correct PES/TRS reconciliation

**P1 – Core Validation**
- TRS validation · PES validation
- Excluded · Limited · Cap Exceeded
- Absolute cap · Percentage/increase cap · Effective-date-based cap · Lease amendment handling
- Sales-tax validation (applicability check)
- Non-PES financial obligations: Tenant Improvement Allowance, Security Deposit, Base Rent, Rent Escalation, Expense Abatements
- Observation integration · Savings integration

**P2 – Secondary**
- Detailed Statement / V2 · Statement version comparison · Advanced statement-version workflow

**P3 – Optional / Deferred**
- Validation history UI · Jurisdiction-based sales-tax engine · Other non-core enhancements

## B.10 Final Architecture Principle

> **The validation engine is a consumer of verified, persisted lease and statement data. It must not be responsible for inventing, hardcoding, or directly interpreting unverified extraction output.**

```text
                  SOURCE DOCUMENTS
                         │
                         ▼
                AI / EXTRACTION
                         │
                         ▼
              STRUCTURED EXTRACTED DATA
                         │
                         ▼
                REVIEW / CONFIRMATION
                         │
                         ▼
              MYLEASEAUDIT DATABASE
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
      LEASE DATA                STATEMENT DATA
             │                       │
             └───────────┬───────────┘
                         ▼
                  VALIDATION ENGINE
                         │
                         ▼
                 VALIDATION RESULTS
                         │
                         ▼
                    FINDINGS
                         │
                         ▼
                    OBSERVATION
                         │
                         ▼
                      SAVINGS
```
This diagram is the reference architecture for the entire validation enhancement — reference it in code review / design review checklists.

## B.11 Cross-Cutting / QA Checklist

- [ ] Regression suite covering PES/TRS reconciliation math with real sample statements.
- [ ] Regression test for duplicate statement prevention with partial-year and category-split exceptions.
- [ ] Data audit script confirming no fabricated/placeholder lease clause text remains anywhere in the Validation UI.
- [ ] End-to-end test: Lease extraction → DB save → Validation screen (PES + TRS + Non-PES) → Observation creation → Savings creation.
- [ ] UI terminology pass: replace all "CAM"/"non-CAM" labels with PES / TRS / Non-PES.

## B.12 Suggested Sequencing

1. **Sprint 1:** Phase 1 (data mapping/integrity) + Phase 2 (bug fixes) — everything else depends on this.
2. **Sprint 2:** Phase 3 (TRS integration) + Phase 4 (Non-PES section).
3. **Sprint 3:** Phase 5 (cap/exclusion logic) + Phase 6.1 (sales-tax applicability flag).
4. **Sprint 4:** Phase 7 (statement versioning, if feasible) + QA/regression pass.

## B.13 Open Items Requiring Client Input Before Build

- Final confirmation of field-mapping sheet (Phase 1.1).
- Sample extraction Excel with base rent schedule (Phase 1.2, 4.3).
- Confirmation on whether Detailed Statement (Phase 7) is in scope for this release or backlog.
- Excel document with full validation logic/formulas (caps, sales tax, etc.) — referenced by Andrew during the call.
- Final name for the Non-PES section.
- Exact statement version model and fields used for version comparison.
- Validation history UI — build or skip.
- Jurisdiction-based sales-tax calculation — confirm deferral to backlog.
- Exact payment-evidence workflow for Non-PES confirmations.
- Final KPI/summary-card list for the Validation screen.
- Any remaining unresolved lease-field mappings.

---

*This plan should be reviewed with Andrew on the scheduled Tuesday follow-up call before development begins, particularly Phases 1, 5, and 7.*
