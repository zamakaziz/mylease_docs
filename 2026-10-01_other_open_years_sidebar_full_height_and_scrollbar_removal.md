# Other Open Years Sidebar: Full Height & Scrollbar Removal

## 1. Problem Description
On the Auditing page (`/auditing?tab=validation&id=800` or `/auditing?tab=documents&id=800`):
- In the left sidebar under the "Other Open Years" section:
  - An inner vertical scrollbar was visible next to the listed audit years (e.g. 2018, 2017).
  - The list container was constrained to a small fixed height, cutting off content prematurely and showing an awkward scrollbar despite vast unused vertical whitespace below it on the page.
  - The scrollbar consumed horizontal width (~15px), causing the audit status text (`File Review: Location File Review`) to be squeezed.
  - The user requested:
    > *"under validation , other open years : left hand side of the page with year selection option. marked in image : Remove the scrollbar and make the height full width"*

---

## 2. Root Cause Analysis
1. **Hardcoded Height in CSS**:
   - In [`frontend/static/css/styles.css`](file:///home/c864/Projects/mylease/frontend/static/css/styles.css#L14193-L14198):
     ```css
     .lease-document-section .section-left.leftbar .other-aud {
         height: calc(100vh - 587px);
         overflow: auto;
     }
     ```
   - Subtracting 587px from the viewport height reduced the container's height to ~150px–200px on typical screens. With just two items (year, status, margins), the total content exceeded this small threshold and triggered `overflow: auto`, creating a scrollbar.
2. **Fixed Sidebar Height**:
   - `.section-left.leftbar` had `height: calc(100vh - 126px); min-height: auto;`, preventing natural flexible expansion to accommodate content down the page.
3. **Year Switching Tab Preservation**:
   - The anchor tag `<a :href="'/auditing?tab=documents&id=' + otherAudit.id">` hardcoded `tab=documents`, resetting users to the Documents tab even when browsing while on the Validation tab.

---

## 3. Backend Changes
- **No backend changes required**.

---

## 4. Frontend Changes
- **Files Modified**:
  - [`frontend/static/css/styles.css`](file:///home/c864/Projects/mylease/frontend/static/css/styles.css)
  - [`frontend/pages/auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue)

### A. Remove Constrained Height and Scrollbar
- Updated `.lease-document-section .section-left.leftbar .other-aud` in both `styles.css` and `auditing.vue`:
  - `height: auto !important;`
  - `max-height: none !important;`
  - `overflow: visible !important;`
  - `width: 100% !important;`
  - Removed browser scrollbar rendering (`scrollbar-width: none; -ms-overflow-style: none; ::-webkit-scrollbar { display: none; }`).
- Updated `.lease-document-section .section-left.leftbar`:
  - `min-height: calc(100vh - 126px);`
  - `height: auto;`
  - Allows the sidebar to cleanly span full height without clipping or nested scrolling.

### B. Full Width for Year List Items
- Added `width: 100%` on `.lease-document-section .section-left .audit-list li` and `.lease-document-section .section-left .audit-list li div` so text utilizes the full sidebar width without being squeezed.

### C. Active Tab Preservation on Year Selection
- Updated year link to dynamically retain active tab:
  ```html
  <a :href="'/auditing?tab=' + (tab || 'documents') + '&id=' + otherAudit.id">
    {{ otherAudit.audit_year }}
  </a>
  ```

---

## 5. Test Results & Verification
- **Nuxt Webpack Client Hot Reload**:
  - Docker logs confirmed: `✔ Client: Compiled successfully in 3.86s` with zero errors.
- **Visual & Functional Checks**:
  - Verified no scrollbar renders in the "Other Open Years" list.
  - Verified the items expand naturally to full height down the sidebar.
  - Verified text spans full width without cramped horizontal squeezing.
  - Verified clicking another year maintains the active tab context.

---

## 6. Files Changed
| File Path | Description |
|-----------|-------------|
| [`frontend/static/css/styles.css`](file:///home/c864/Projects/mylease/frontend/static/css/styles.css) | Removed `calc(100vh - 587px)` and `overflow: auto` on `.other-aud`, set `min-height` and `height: auto` on `.leftbar` |
| [`frontend/pages/auditing.vue`](file:///home/c864/Projects/mylease/frontend/pages/auditing.vue) | Added scoped full-width/no-scrollbar styles for `.other-aud` and updated year link to preserve active tab |
