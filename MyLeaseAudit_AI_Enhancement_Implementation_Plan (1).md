# MyLeaseAudit AI Enhancement — Implementation Plan
## Validation Module (TRS / PS / Non-PS) — Technical Build Plan

**Source:** Requirements captured from client call (Sept 24, 2026) with Andrew (client) and Cubet team (Shiraj/Anu)
**Purpose:** Translate the discussed requirements into a phased, actionable implementation plan for the dev team.

---

## 0. Priority Overview

*Note: Section 32.15 (added as an addendum below) is the authoritative priority classification and supersedes this table where they differ — most notably, sales-tax applicability validation is reclassified from P2 to P1.*

| Priority | Theme | Why |
|---|---|---|
| P0 – Blocker | Lease data persistence / field mapping | Nothing else validates correctly until lease data is reliably saved to DB against confirmed fields |
| P0 – Bug | Duplicate "Original" statement per year | Data-integrity bug, agreed requirement not enforced |
| P0 – Bug | PS total/difference calculation order | Wrong number shown to auditors today |
| P1 | TRS extraction + display in Validation UI | Core missing feature, blocks reconciliation |
| P1 | Non-PS section (tenant allowance, security deposit, base rent, escalations) | Large-dollar items currently invisible |
| P1 | Cap logic (absolute + increase cap, effective-dated) | Needed for accurate findings |
| P2 | Sales tax city/state rule engine | Explicitly deprioritized by client ("don't worry about that yet") but flag-if-mismatch logic still needed |
| P2 | Detailed Statement (V2) concept | "Nice to have if feasible," can be simplified/dropped |
| P3 | Validation run history | Explicitly low priority, may be dropped |
| Done | Discussions module filters/location + start-from-anywhere | Confirmed complete, needs sign-off only |

---

## Phase 1 — Foundation: Lease & Statement Data Integrity (P0)

### 1.1 Field Mapping Reconciliation
- [ ] Cubet to review Andrew's previously shared field-mapping sheet (lease/statement extracted fields → MyLeaseAudit DB schema).
- [ ] Produce a gap list: fields extracted but **not mapped/saved**, fields mapped but **incorrectly saved**, and fields that don't yet exist in the schema.
- [ ] Get client sign-off on the finalized mapping before building dependent validation logic.
- **Blocking dependency for:** Sections 1.3–1.5, all of Phase 3 (Cap logic), Phase 4 (Non-PS).

### 1.2 Extraction Pipeline Verification
- [ ] Pull a sample extraction Excel (incl. base rent schedule sheet) from Andrew and diff it against what's currently persisted in the DB for the same document.
- [ ] Confirm the batch-processing → review/confirm → save-to-DB pipeline actually writes every mapped field (not just a subset used for display).
- [ ] Fix any silent drops where extracted values are shown in the Excel/API output but never reach the DB.

### 1.3 Remove Fabricated / Placeholder Content
- [ ] Audit the validation screen for any hardcoded/mock clause text (e.g., the "expenses shall not exceed permitted contractual cap configuration..." string identified in the call) that is not actually sourced from extracted lease data.
- [ ] Replace with real DB-backed values, or leave blank/"Not extracted" state until real data is wired in — never show placeholder text as if it were real lease content.

### 1.4 Lease Data Surfacing
- [ ] Ensure extracted lease fields (allowances, caps, exclusions, sales-tax applicability, effective dates) actually populate their respective sections in the **Lease module** (not just referenced from Validation) — client flagged this is currently missing.

### 1.5 Data Model Additions (pending mapping sheet confirmation)
- [ ] Add/confirm DB fields for: cap type (absolute vs. increase), cap value, cap effective start/end date, fee-rate type (%, cost amount), fee-allowed flag, subject-to-cap flag.
- [ ] Add/confirm fields for: sales-tax applicability (from lease), sales-tax jurisdiction reference (future).
- [ ] Add/confirm fields for tenant improvement allowance, security deposit (amount, description, yes/no flag), base rent schedule (monthly table).

---

## Phase 2 — Bug Fixes (P0)

### 2.1 PS Total / Difference Calculation
- **Current behavior:** `difference = TRS_total − sum(PS_line_items)` is computed and shown directly, without first displaying the PS subtotal.
- **Required behavior:**
  1. Compute and **display** `PS_subtotal = sum(PS_line_items)`.
  2. Compute and display `difference = TRS_total − PS_subtotal` as a separate field below/after the subtotal.
  3. `difference == 0` → statement reconciles, no flag.
  4. `difference != 0` → flag as an auto-generated candidate Observation with description template: *"Difference between PS total and TRS total: {difference}."*
- [ ] Update calculation logic in validation service/component.
- [ ] Update UI to render subtotal row above the difference row.
- [ ] Add unit tests: zero difference, positive difference, negative difference, missing TRS value.

### 2.2 Duplicate Statement Prevention
- **Bug:** System currently allows saving two statements of type **"Original / All Expenses"** for the same property + same year.
- **Required behavior:**
  - Block save with a validation error if an existing statement exists with the same: `property_id + year + statement_type(All Expenses) + Original`.
  - **Allowed exceptions:**
    - One of the two statements is marked **partial year**.
    - Statements are split by category (e.g., one Taxes-only, one Insurance-only) rather than "All Expenses."
- [ ] Add server-side uniqueness validation (not just UI-level) on statement create/save.
- [ ] Add clear error messaging to the auditor UI.
- [ ] Add regression test reproducing the exact scenario from the call (2019, Calendar Year, All Expenses, Original — second save should fail).

---

## Phase 3 — TRS Integration into Validation Screen (P1)

### 3.1 TRS Extraction
- [ ] Confirm/extend extraction logic to pull TRS (Tenant Reconciliation Statement / invoice-level) fields: expense pool amount, base year expense stop, premises share %, premises expense exposure, tenant share %, sales tax, etc.
- [ ] Persist TRS fields distinctly from PS fields in the DB (linked to the same statement record).

### 3.2 TRS Display in Validation UI
- [ ] Add a **TRS / Reconciliation** section to the Validation screen (paired with the existing PS section), using naming consistent with the rest of MyLeaseAudit:
  - Section label: **"TRS"** (not "CAM Reconciliation").
  - Adjacent PS section labeled **"PS"** (not "CAM Expenses").
- [ ] Support collapse/expand for the TRS panel so it doesn't overwhelm the PS item list.
- [ ] Wire the reconciliation math from Section 2.1 into this combined view.

### 3.3 Premises Expense Exposure Calculation
- [ ] Fix "Premises Expense Exposure" field — currently not calculating. Should be computed as: `sum of relevant statement information exposure amounts` (confirm exact formula against Andrew's Excel logic doc).
- [ ] Ensure this field updates reactively when underlying statement values change (currently static/non-reactive per the call).

---

## Phase 4 — Non-PS Section (P1)

### 4.1 New "Non-PS" Category (rename from Non-CAM)
- [ ] Add a **Non-PS / Non-OpEx** section to the Validation screen, parallel to PS/TRS, covering:
  - Tenant Improvement Allowance
  - Security Deposit
  - Base Rent / Rent Escalation
  - Expense Abatements

### 4.2 Tenant Improvement Allowance & Security Deposit
- [ ] Unify the UI pattern for both (currently inconsistent per the call).
- [ ] Fields: lease-entitled amount, date of payment recorded, amount confirmed paid, running "confirmed" vs. "unconfirmed" balance.
- [ ] "Add confirmed payment" action: auditor enters date + amount → system recalculates confirmed/unconfirmed split.
- [ ] Unconfirmed remainder must be actionable: auditor can create an **Observation** from it directly.

### 4.3 Base Rent / Rent Escalation
- [ ] Pull base rent schedule table from lease extraction (per Andrew's sample Excel) into this section.
- [ ] Read-only review view is sufficient per the call — no complex validation math required here, just extraction + auditor review + observation creation.

### 4.4 Observation & Savings Linkage (confirm existing flow, no change needed)
- [ ] Confirm Non-PS items follow the same **Validation → Observation → Savings** flow already used elsewhere (client confirmed this architecture is correct and should not change).

---

## Phase 5 — Cap & Exclusion Logic (P1)

### 5.1 Status Tags
- [ ] Implement three distinct validation outcome tags per line item:
  - **Excluded** — entire category disallowed by lease.
  - **Limited** — category partially allowable; requires sub-item-level detail to resolve (only reliable at 28-category granularity, not the 4-category summary).
  - **Cap Exceeded** — amount exceeds the applicable cap.

### 5.2 Absolute Cap
- [ ] Logic: if `statement_amount_for_category > absolute_cap_value` → flag Cap Exceeded, overage = `statement_amount − cap_value`.
- [ ] Cap value must respect **effective date range** tied to lease amendments (see 5.4).

### 5.3 Increase Cap (Year-over-Year)
- [ ] Logic: category's increase vs. prior year expense is capped by the % (or amount) defined in Lease → Operating Cost Info → Increase tab.
- [ ] Reuse existing lease increase-cap configuration/logic already built for the Lease module — confirm it's callable from Validation rather than reimplemented.

### 5.4 Effective-Dated Cap Resolution
- [ ] When multiple cap values exist for a category due to lease amendments, resolve the correct cap by matching the **statement's coverage period** against each cap's effective date range — not just using the latest/original lease value.
- [ ] Add tests covering: statement period fully within one amendment window; statement period spanning an amendment boundary (edge case — confirm expected behavior with client if this arises).

### 5.5 Granularity-Aware Validation
- [ ] When validating against a 4-category (consolidated) statement, only generic tags (e.g., "Limited") can be produced.
- [ ] When validating against a 28-category (detailed) statement, produce precise tags (Excluded/Capped/Allowed) per line, since detail categories map more directly to lease clause language.
- [ ] Validation engine should be granularity-aware and select the appropriate matching strategy based on which statement version is being validated.

---

## Phase 6 — Sales Tax (P2 — logic flag only, jurisdiction engine deferred)

### 6.1 Applicability Check (buildable now)
- [ ] If lease extraction indicates sales tax applies to a category but extracted statement amount is $0 → flag as error/observation ("Sales tax expected but not charged").
- [ ] If lease extraction indicates no sales tax applies → mark as confirmed/no issue.

### 6.2 City/State Tax Rule Engine (explicitly deferred by client)
- [ ] Out of scope for this phase. Note as a future backlog item: jurisdiction-based default tax applicability (e.g., no sales tax typically on electricity or real estate tax) tied to property address.

---

## Phase 7 — Statement Versioning: Detailed Statement / "V2" (P2, optional)

- [ ] Evaluate feasibility with the team: introduce a **Detailed Statement** type distinct from Original (V1) and Revised (V3).
- [ ] If feasible: once a Detailed Statement is saved for a property/year, it should **suspend** the corresponding Initial (consolidated) statement and become the authoritative record used for validation and Compare.
- [ ] If not feasible within scope/timeline: **skip** — client explicitly said this can be dropped if too complex, as long as the duplicate-statement bug (Phase 2.2) is still fixed.
- [ ] No changes needed to the **Compare module** — confirmed already correctly using Original/Revised logic; extend the same "authoritative version" logic to include Detailed if built.

---

## Phase 8 — Validation Run History (P3, likely deprioritized)

- [ ] Client indicated this may not be necessary. Recommend deferring unless a specific audit-trail requirement surfaces later. No build action needed this phase.

---

## Phase 9 — Discussions Module (Done — confirm & close out)

- [x] Location filter added; filter order rearranged (Location → Tracking ID → ES → Audit → Type → Usage).
- [x] "Start discussion from anywhere" (audit level, validation screen, discussion view) implemented.
- [ ] Get final client sign-off/UAT confirmation to formally close this item.

---

## Cross-Cutting / QA Checklist

- [ ] Regression test suite covering PS/TRS reconciliation math (Phase 2.1) with real sample statements.
- [ ] Regression test for duplicate statement prevention with partial-year and category-split exceptions.
- [ ] Data audit script to confirm no fabricated/placeholder lease clause text remains anywhere in the Validation UI.
- [ ] End-to-end test: Lease extraction → DB save → Validation screen (PS + TRS + Non-PS) → Observation creation → Savings creation.
- [ ] UI terminology pass: replace all "CAM"/"non-CAM" labels with PS / TRS / Non-PS per client naming requirement.

---

## Suggested Sequencing

1. **Sprint 1:** Phase 1 (data mapping/integrity) + Phase 2 (bug fixes) — everything else depends on this.
2. **Sprint 2:** Phase 3 (TRS integration) + Phase 4 (Non-PS section).
3. **Sprint 3:** Phase 5 (cap/exclusion logic) + Phase 6.1 (sales tax applicability flag).
4. **Sprint 4:** Phase 7 (detailed statement, if feasible) + QA/regression pass + Phase 9 sign-off.

## Open Items Requiring Client Input Before Build
- Final confirmation of field-mapping sheet (Phase 1.1).
- Sample extraction Excel with base rent schedule (Phase 1.2, 4.3).
- Confirmation on whether Detailed Statement (Phase 7) is in scope for this release or backlog.
- Excel document with full validation logic/formulas (caps, sales tax, etc.) — referenced by Andrew during the call, needed to finalize Phase 5 formulas precisely.
- Final name for the Non-PS section (see 32.14).
- Exact statement version model and fields used for version comparison (see 32.2, 32.14).
- Validation history UI — build or skip (see 32.4, 32.14).
- Jurisdiction-based sales-tax calculation — confirm deferral to backlog (see 32.14).
- Exact payment-evidence workflow for Non-PS confirmations (see 32.10, 32.14).
- Final KPI/summary-card list for the Validation screen (see 32.14).
- Any remaining unresolved lease-field mappings (see 32.14).

---

*This plan should be reviewed with Andrew on the scheduled Tuesday follow-up call before development begins, particularly Phases 1, 5, and 7.*

---

# Addendum — Section 32: Required Enhancements (Explicit Requirements)

*The following points formalize and tighten the phases above. Where a rule here is more specific than the corresponding phase, this section governs.*

## 32.1 Validation Must Use Persisted Database Data (Non-Negotiable)

Validation must **never** depend on hardcoded values, mock/sample lease values, temporary extraction output, UI-only values, or manually embedded validation data.

**Required flow:**
```text
Source Document → AI/Document Extraction → Extracted Structured Data
   → Review/Confirmation → Persist to MyLeaseAudit Database
   → Validation Engine → Validation Result
```
The validation engine must retrieve lease and statement values **only** from persisted DB records.

- ❌ Incorrect: `Validation Rule → Hardcoded Cap = $20,000`
- ✅ Correct: `Lease Document → Extracted Cap = $20,000 → Reviewed/Confirmed → Lease DB → Validation Engine → Cap Validation`

This formalizes Phase 1.3 ("Remove Fabricated / Placeholder Content") as an architectural rule, not just a cleanup task.

## 32.2 Active and Superseded Statement Versions

Define an explicit **Active Statement Version** concept for statement versioning:

```text
Statement
├── V1 – Original    Status: Superseded
└── V2 – Detailed     Status: Active
```

- Only one statement version should normally be **active** for a given statement/year/category context.
- When a Detailed Statement replaces an Original:
  - Original remains available for history/reference.
  - Original becomes `Superseded`.
  - Detailed Statement becomes `Active`.
- Validation always uses the **Active Statement Version**.
- Historical validation runs retain the statement version that was active when that run was executed.

**Recommended fields (model equivalents — do not duplicate if existing schema already covers these):**
```text
version_number
version_type
status
is_active
superseded_at
superseded_by
```
This refines Phase 7 ("Detailed Statement / V2") with a concrete data model.

## 32.3 Statement Versioning Is Secondary / Optional

```text
Core Validation (P0/P1) → Statement Versioning (P2/Optional)
```
If implementation complexity is high, complete core PS/TRS and lease validation first. Confirms Phase 7's "optional, can be skipped" status.

## 32.4 Validation History Is Optional / Deferred (P3)

Not a core MVP blocker. If implemented, a validation run should retain at minimum:
```text
Validation Run
 ├── Statement Version
 ├── Audit
 ├── User
 ├── Execution Date/Time
 └── Result / Status
```
Do not delay core validation for this. Confirms Phase 8.

## 32.5 Duplicate Statement Prevention — Context-Aware

Prevent duplicate **Original / All Expenses** statements for the same property + year, but duplicate detection must consider business context and not blanket-reject every same property/year record. Legitimate duplicates include different periods, categories, partial-year statements, or other explicitly defined contexts. Refines Phase 2.2 — the uniqueness check must key on `(property, year, statement_type, category, partial_year_flag)`, not just `(property, year)`.

## 32.6 Statement Granularity Must Control Validation Results

- **4-Category statement:** system must not attempt to generate detailed subcategory findings unsupported by the source data → result should stay generic (e.g., `Limited`).
- **28-Category statement:** engine may produce granular results: `Allowed`, `Excluded`, `Limited`, `Cap Exceeded`.
- **Rule:** *The validation engine must only generate a level of detail that is supported by the extracted statement data.*

Formalizes Phase 5.5 as a hard rule, not just a design preference.

## 32.7 PS Subtotal Must Be Explicitly Stored/Calculated

```text
PS Subtotal = SUM(all applicable PS expense line items)
Difference  = TRS Total − PS Subtotal
```
UI must show, in order: **PS Subtotal → TRS Total → Difference → Validation Status**. The difference must never be calculated from a manually entered or unrelated total. Tightens Phase 2.1: PS Subtotal must be a **stored/computed field**, not just a UI display artifact.

## 32.8 TRS Must Be Treated as First-Class Validation Data

TRS is not informational-only. It must be: (1) Extracted, (2) Persisted, (3) Displayed, (4) Used in validation, (5) Available for PS/TRS reconciliation.

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
Additional fields per the approved extraction mapping. Expands Phase 3.1's field list with this explicit minimum set.

## 32.9 Non-PS Financial Obligations Must Be Data-Driven

All Non-PS obligations (Tenant Improvement Allowance, Security Deposit, Base Rent, Rent Escalation, Expense Abatements, other agreed obligations) must follow:
```text
Lease → Extract Obligation → Persist Obligation → Validation → Auditor Confirmation → Observation/Finding
```
None of these may be manually keyed into the validation screen without a persisted lease-derived source value. Reinforces Phase 4.

## 32.10 Payment Confirmation Must Be Persisted

Auditor must be able to record, and the system must persist: Required amount, Confirmed amount, Payment date, Evidence/reference, Remaining/unconfirmed amount.

Example: `Required = $75,000 → Confirmed = $50,000 → Remaining = $25,000`. Remaining amount must be available to the Observation/Finding workflow. Tightens Phase 4.2 — payment confirmations must be DB-persisted, not left as non-functional UI markers (as seen live in the call demo).

## 32.11 Validation Result → Observation → Savings (No Parallel Workflow)

```text
Validation Result → Finding/Issue → Observation → Savings
```
The validation module must **not** create an independent/parallel savings workflow. Existing MyLeaseAudit savings functionality remains the source of truth. Confirms Phase 4.4 / Section 7 of the requirements summary — no changes needed to that flow, just don't bypass it.

## 32.12 Source Traceability

Important validation values must be traceable back to source:
```text
Validation Result → Database Field → Extracted Value → Source Document → Page/Section/Reference
```
Especially required for: lease caps, lease amendments, sales-tax applicability, increase rules, tenant improvement allowances, security deposits, base rent, rent escalation, expense abatements, other contractual obligations.

**New cross-cutting requirement** (not previously captured): every validation-facing value tied to the items above should carry a reference back to its source document/page/section wherever the extraction pipeline can supply one. Add to Phase 1 (Foundation) as a new task, and add corresponding fields to the data model in 1.5.

## 32.13 Extraction Excel → Database Reconciliation (Definition of Done)

Before validation development is considered complete for a given field:
```text
Extraction Excel → Field Mapping → MyLeaseAudit Database → Validation Engine
```
Verify: field exists in extraction; field has a defined mapping; field is persisted in DB; correct value is stored; validation retrieves the DB value; no value is silently lost. This becomes the **formal Definition of Done** for Phase 1.2, replacing the looser "diff against sample Excel" wording — every field must pass this checklist individually, not just spot-checked.

## 32.14 Client Confirmation Items (Pending)

Keep explicitly marked **Pending Client Confirmation** until resolved:
1. Final name for the Non-PS section.
2. Exact statement version model.
3. Exact fields used for version comparison.
4. Validation history UI.
5. Jurisdiction-based sales-tax calculation.
6. Exact payment-evidence workflow.
7. Final KPI/summary-card list.
8. Any unresolved lease-field mappings.

Add to the "Open Items Requiring Client Input" list at the end of this document.

## 32.15 Priority Classification (Authoritative)

This reclassification **supersedes** the Section 0 priority table where they differ (notably: sales-tax *validation logic* — as opposed to the jurisdiction rule engine — is now P1, not P2).

**P0 – Blockers / Foundation**
- Lease extraction mapping
- Persist extracted lease data
- Persist extracted statement data
- Remove hardcoded/mock validation data
- Duplicate Original statement prevention
- Correct PS subtotal calculation
- Correct PS/TRS reconciliation

**P1 – Core Validation**
- TRS validation · PS validation
- Excluded · Limited · Cap Exceeded
- Absolute cap · Percentage/increase cap · Effective-date-based cap · Lease amendment handling
- Sales-tax validation (applicability check — see 6.1)
- Non-PS financial obligations: Tenant Improvement Allowance, Security Deposit, Base Rent, Rent Escalation, Expense Abatements
- Observation integration · Savings integration

**P2 – Secondary**
- Detailed Statement / V2
- Statement version comparison
- Advanced statement-version workflow

**P3 – Optional / Deferred**
- Validation history UI
- Jurisdiction-based sales-tax engine
- Other enhancements not required for core validation

## 32.16 Final Architecture Principle (Guiding Principle for the Whole Enhancement)

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

This diagram should be treated as the reference architecture for the entire validation enhancement, and referenced in code review / design review checklists.
