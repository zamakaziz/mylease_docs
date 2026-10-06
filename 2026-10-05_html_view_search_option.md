# Implementation Documentation: In-Viewer Search Across HTML Documents

**Date**: 2026-10-05  
**Topic**: Document Viewer HTML Search & Highlighting  
**Branches**:  
- Backend: `changes/pdf-batch-html-search`  
- Frontend: `changes/pdf-batch-html-search`

---

## 1. Problem Description
Users viewing converted HTML lease documents in the document review page (`/batches/:batchId/lease/:id`) needed a way to search for specific words and phrases across the HTML content. Unlike the PDF viewer (which relies on external plugins or native PDF canvas rendering), the HTML view lacked an in-viewer search toolbar, match count indicators, highlighting, and smooth keyboard/button navigation between occurrences.

Furthermore, when rendering the HTML document via a direct `http://localhost:9000` MinIO pre-signed URL inside an `<iframe>`, cross-origin browser security restrictions (Same-Origin Policy between port 3000 and port 9000) prevented client-side JavaScript from traversing the iframe's DOM to highlight text and scroll to matches.

---

## 2. Technical Architecture & Design Decisions

### A. Same-Origin HTML Streaming Endpoint
To enable full DOM access for text search and styling while preserving document isolation:
1. Created a dedicated backend endpoint: `GET /api/batches/file/{batch_document}/html-content`.
2. The endpoint reads the converted HTML file from the configured batch storage disk (`minio` or `s3`) and streams it with `Content-Type: text/html; charset=UTF-8`.
3. In the Nuxt frontend, the HTML string is bound to the iframe via `:srcdoc="htmlContent"`.
4. Documents rendered via `srcdoc` inherit the application's origin (`about:srcdoc`), granting full programmatic DOM access (`iframe.contentDocument`) for highlighting, counting, and scrolling.

### B. High-Performance Text Node Highlighting with TreeWalker
1. **DOM Traversal**: Uses `document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, ...)` to locate all text nodes matching the search query while rejecting script, style, and existing mark elements.
2. **Highlight Injection**: Replaces matched substrings with `<mark class="search-highlight">` elements within document fragments.
3. **Active Match Navigation**: Marks the currently active match with `.active` styling (bright orange `#ff6b00` outline and glow) and smoothly scrolls it into view using `scrollIntoView({ behavior: 'smooth', block: 'center' })`.
4. **Keyboard Shortcuts**:
   - `Enter` or `↓`: Jump to the next match.
   - `Shift + Enter` or `↑`: Jump to the previous match.
   - `Esc`: Clear search highlights.
   - `Ctrl + F` / `Cmd + F` inside the iframe: Focuses the search input bar.
5. **Clean Restoration**: When clearing or changing the search query, `parent.replaceChild(doc.createTextNode(...))` and `parent.normalize()` cleanly restore contiguous text nodes without corrupting the document DOM.

---

## 3. Backend Changes

### Files Modified:
- [`backend/app/Http/Controllers/API/BatchFileReviewController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/BatchFileReviewController.php)
  - Added method `getHtmlContent(Request $request, BatchDocument $batch_document)`.
  - Resolves HTML path from `batchDocument->batchFile->html_file_path` or falls back to standard convention `batches/{batch_uuid}/html/{file_name}.html`.
  - Reads content via `Storage::disk(config('batch_upload.disk'))->get(...)` and returns a raw `text/html` response.
- [`backend/routes/api.php`](file:///home/c864/Projects/mylease/backend/routes/api.php)
  - Registered route: `Route::get('batches/file/{batch_document}/html-content', [BatchFileReviewController::class, 'getHtmlContent']);` under `auth:sanctum` group.

---

## 4. Frontend Changes

### Files Modified:
- [`frontend/pages/batches/_batchId/lease/_id.vue`](file:///home/c864/Projects/mylease/frontend/pages/batches/_batchId/lease/_id.vue)
  - **Search Bar & Match Navigation Toolbar**:
    - Added search input field with debounce (`onHtmlSearchInput`).
    - Added match counter badge (`X / Y` or `0 matches`).
    - Added previous/next match navigation buttons with keybinding tooltips.
    - Added clear button (`el-icon-close`) when a query is present.
    - Added shortcut help badge: `Enter next • Shift+Enter prev`.
  - **Iframe Rendering with `srcdoc`**:
    - Updated HTML iframe container to use `:srcdoc="htmlContent"` with `@load="onHtmlIframeLoaded"`.
  - **State Management**:
    - Added `htmlContent`, `htmlLoading`, `htmlSearchQuery`, `totalHtmlMatches`, `currentHtmlMatchIndex`, and `htmlMatches`.
  - **DOM Search Methods**:
    - `loadHtmlContent(leaseId)`: Fetches HTML text via `/api/batches/file/{id}/html-content`.
    - `onHtmlIframeLoaded()`: Injects highlight styles (`mark.search-highlight`, `mark.search-highlight.active`) and attaches `Ctrl+F` shortcut listener inside the iframe.
    - `executeHtmlSearch()`: Traverses text nodes with `TreeWalker`, wraps matches in `<mark>`, and scrolls to match 1.
    - `nextHtmlMatch()` and `prevHtmlMatch()`: Cycles through matches and highlights active match.
    - `clearHtmlHighlights()`: Removes mark tags and normalizes parent nodes.
  - **Styling**:
    - Added scoped CSS for `.html-search-input-field` (dark theme, responsive focus states) and `.btn-xs`.

---

## 5. Test Results & Verification

### A. API Endpoint Verification
```bash
curl -s -I -H "Authorization: Bearer <TOKEN>" http://localhost:8000/api/batches/file/15/html-content
```
Output:
```text
HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8
```

### B. Browser Automated Verification
Using the browser test runner on `http://localhost:3000/batches/5/lease/15`:
1. Switched from PDF viewer to **HTML** viewer.
2. Verified HTML search input toolbar is visible.
3. Searched for `"Denver"`:
   - Match counter badge displayed **`1 / 13`**.
   - First match in document (`Denver, Colorado 80290`) automatically highlighted with orange border and centered into view.
4. Clicked Next Match (`↓` / Enter):
   - Counter updated to **`2 / 13`**.
   - Viewer smoothly scrolled to the second occurrence and set it as active highlight.
5. Cleared search query:
   - Highlight `<mark>` tags cleanly removed.
   - Match counter badge reset.

---

## 6. Files Changed

| File | Type | Description |
| :--- | :--- | :--- |
| [`backend/app/Http/Controllers/API/BatchFileReviewController.php`](file:///home/c864/Projects/mylease/backend/app/Http/Controllers/API/BatchFileReviewController.php) | Backend | Added `getHtmlContent` endpoint to stream HTML from storage disk |
| [`backend/routes/api.php`](file:///home/c864/Projects/mylease/backend/routes/api.php) | Backend | Added route `GET /api/batches/file/{batch_document}/html-content` |
| [`frontend/pages/batches/_batchId/lease/_id.vue`](file:///home/c864/Projects/mylease/frontend/pages/batches/_batchId/lease/_id.vue) | Frontend | Added HTML search toolbar, match navigation, TreeWalker highlighting, and scoped styling |
