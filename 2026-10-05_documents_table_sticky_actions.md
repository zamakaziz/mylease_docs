# Sticky Actions Column in Documents List & Sub-Documents Tables

**Date**: 2026-10-05  
**Author**: Antigravity  
**Context**: Auditing Documents Tab (`/auditing?tab=documents&id=...`) and Audit Outstanding Documents (`/document_item_details`)

---

## 1. Problem Description
On the Documents list page/tab (`/auditing?tab=documents&id=806` and sub-documents view), the table contains 12 columns (*Sl.No, #, Title, Document Type, Source, Cost Category, Value, Stage, Year, Request Date, Reviewed, and Actions*), with a wide layout (`min-width: 1850px`).
At the far right end of each document row, the **Actions** column displays up to 8–9 operational action icons (e.g. *Sub Document, Export, Upload Document, Conflict Report, Comments, Notes, View/Lease Detail, Edit, Delete*).

Because of the table's wide footprint, users were forced to scroll all the way across horizontally to inspect or click the action buttons. When working with document rows, this required constant back-and-forth scrolling between the document title and the actions column.

---

## 2. Root Cause Analysis
- The actions header `<th scope="col">Actions</th>`, filter row `<td></td>`, and body cell `<td><div class="iconslist">...</div></td>` had standard static positioning without CSS sticky coordinates.
- As the user horizontally scrolled the table within `.doc-table-hscroll` / `.table-responsive`, the Actions column moved off-screen to the right with the rest of the table contents.

---

## 3. Backend Changes
*No backend changes required. This was entirely a frontend UI/UX enhancement.*

---

## 4. Frontend Changes
- **Files Modified**:
  - [`frontend/pages/auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue)
  - [`frontend/pages/document_item_details.vue`](file:///home/c864/Projects/mylease/frontend/pages/document_item_details.vue)
  - [`frontend/static/css/styles.css`](file:///home/c864/Projects/mylease/frontend/static/css/styles.css)

- **Table Structure Updates**:
  - Added class `doc-actions-col` to `<th scope="col" class="doc-actions-col">Actions</th>` in:
    1. Main Documents table in `auditing.vue` (`isBackBtnSet == 0`).
    2. Sub-Documents table in `auditing.vue` (`isBackBtnSet == 1`).
    3. Outstanding Documents table in `document_item_details.vue`.
  - Added class `doc-actions-col` to the filter row placeholder cell `<td class="doc-actions-col"></td>` in both header structures.
  - Added class `doc-actions-col` to the body cell `<td class="doc-actions-col"><div class="iconslist">...</div></td>`.
  - Corrected `colspan="11"` to `colspan="12"` on the empty table row in `auditing.vue` to match the 12 columns.
  - Set `min-width: 1600px` on the Sub-Documents table to maintain clean spacing across columns.

- **CSS Sticky Implementation (`.doc-actions-col`)**:
  - **`th.doc-actions-col`**:
    - `position: sticky !important; right: 0 !important; z-index: 3 !important;`
    - Solid `#f4f5fc` background matching header styling.
    - Fixed `width: 210px !important; min-width: 210px !important;` to comfortably host all action icons without wrapping.
    - Divider shadow: `box-shadow: -3px 0 6px -1px rgba(0, 0, 0, 0.08), inset 1px 0 0 #dce1eb;` and `border-left: 1px solid #dce1eb !important;`.
    - Reset `border-radius: 0` and `border-right: 0` to prevent corner bleed-through during horizontal scrolling.
  - **`thead tr:nth-child(2) td.doc-actions-col` (Filter Row Cell)**:
    - `position: sticky !important; right: 0 !important; z-index: 3 !important;`
    - Solid `#ffffff` background with divider shadow and left border.
  - **`tbody td.doc-actions-col`**:
    - `position: sticky !important; right: 0 !important; z-index: 2 !important;`
    - Solid `#ffffff` background, `vertical-align: middle !important;`, and `white-space: nowrap !important;`.
    - Flex alignment for `.iconslist` (`display: flex; align-items: center; justify-content: center; flex-wrap: nowrap;`).
    - Hover state: `background: #f8f9ff !important;`.

---

## 5. Test Results & Verification
- Checked Nuxt hot-module replacement and compilation logs: compiled cleanly with 0 errors.
- Verified HTTP status code with `curl -I http://localhost:3000/auditing?tab=documents`: returned `HTTP/1.1 200 OK`.
- Verified sticky behavior on both header rows (`z-index: 3`) and body rows (`z-index: 2`).

---

## 6. Files Changed
| File | Description |
| :--- | :--- |
| [`frontend/pages/auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue) | Added `doc-actions-col` class to main documents and sub-documents table headers, filter row, and action cells; added sticky CSS rules. |
| [`frontend/pages/document_item_details.vue`](file:///home/c864/Projects/mylease/frontend/pages/document_item_details.vue) | Added `doc-actions-col` class to Actions header and body cells in outstanding documents table. |
| [`frontend/static/css/styles.css`](file:///home/c864/Projects/mylease/frontend/static/css/styles.css) | Added global sticky styling for `.custom-table th.doc-actions-col` and `.custom-table td.doc-actions-col`. |
