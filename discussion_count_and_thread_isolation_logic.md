# Discussion Count and Thread Isolation Logic Documentation

## 1. Overview & Purpose
This document provides a comprehensive specification of the **Discussion Module**, **Thread Isolation by Audit Year**, **Unread Notification Count Deduction**, and **Real-time Notification Navigation** implemented across the MyLease Audit application.

---

## 2. Thread Data Model & Audit Year Isolation

### Discussion Thread Scoping
Discussions are linked to an Audit (`audit_id`), a Parent Object (`parent_object_type`, `parent_object_id`), and an optional **Audit Year** (`audit_year`):

| Discussion Type | `parent_object_type` | `audit_year` Value | Audit Year Dropdown Visible? | Example Thread Context |
| :--- | :--- | :--- | :--- | :--- |
| **Audit General** | `'General'` | `NULL` | **Yes** | General audit discussion for Audit #807 |
| **Audit Year 2024** | `'General'` | `2024` | **Yes** | 2024 audit thread for Audit #807 |
| **Audit Year 2025** | `'General'` | `2025` | **Yes** | 2025 audit thread for Audit #807 |
| **Validation Expense Item** | `'ValidationExpense'` | N/A | **No** (Hidden) | Discussion on specific Validation Expense item |
| **Checklist Item** | `'ChecklistItem'` | N/A | **No** (Hidden) | Discussion on specific Checklist item |
| **Validation Finding** | `'ValidationFinding'` | N/A | **No** (Hidden) | Discussion on specific Validation Finding |

* **General / Audit-level threads:** The Audit Year select box is displayed, allowing navigation between General, 2024, 2025, etc.
* **Item-specific threads (e.g., Validation Expenses, Checklist Items, Findings):** The Audit Year select box is hidden (`v-if="!parentObjectType || parentObjectType === 'General'"`), as item chats are scoped directly to that specific parent object.

Each combination creates a distinct `discussion_threads` record with a unique `id`.

---

## 3. Thread Message Isolation Logic

### Backend Query Isolation (`DiscussionController.php`)
When a user opens a discussion drawer or switches the year dropdown, `GET /api/discussion/thread` fetches or initializes the exact thread record:

```php
// DiscussionController.php
$messageQuery = DiscussionMessage::whereNull('parent_message_id')
    ->where('thread_id', $thread->id)
    ->with(['creator', 'assignedUser', 'mentions.mentionedUser', 'attachments', 'replies.creator', 'replies.attachments'])
    ->orderBy('created_at', 'asc')
    ->get();
```

* **General Messages** (`thread_id` = General Thread ID) are returned **only** when General is selected.
* **2024 Messages** (`thread_id` = 2024 Thread ID) are returned **only** when 2024 is selected.
* **2025 Messages** (`thread_id` = 2025 Thread ID) are returned **only** when 2025 is selected.

### Real-Time Pusher Broadcast Filtering (`DiscussionDrawer.vue`)
To prevent incoming real-time messages from leaking across different open tabs or threads:

```javascript
// DiscussionDrawer.vue
handleIncomingMessageEvent(e) {
  if (!e) return

  const currentThreadId = this.thread ? Number(this.thread.id) : null
  if (!currentThreadId) return

  const incomingThreadId = Number(e.threadId || (e.messageData && e.messageData.thread_id) || (e.message && e.message.thread_id) || 0)
  if (!incomingThreadId || incomingThreadId !== currentThreadId) return

  // Append message to active view feed
}
```

---

## 4. Unread Notification Count & Read Status Marking

### Automatic Thread Read Marking
When a user views a thread (by opening the discussion drawer or selecting a year in the dropdown), the backend marks all unread mentions belonging **strictly to that thread** as read for the logged-in user:

```php
// DiscussionController.php -> getThread()
$userId = Auth::id();
if ($userId) {
    \App\Modules\Discussion\Models\DiscussionMention::where('mentioned_user_id', $userId)
        ->whereNull('read_at')
        ->whereHas('message', function ($mq) use ($thread) {
            $mq->where('thread_id', $thread->id);
        })
        ->update([
            'read_at' => now(),
            'notification_status' => 'Read',
        ]);
}
```

### Audit-Specific Unread Count Badge Calculation
The `GET /api/discussion/notifications/unread-count?audit_id={id}` endpoint calculates the unread count for the active audit:

```php
// DiscussionController.php -> getUnreadNotificationCount()
$auditId = $request->input('audit_id');

$mentionQuery = \App\Modules\Discussion\Models\DiscussionMention::where('mentioned_user_id', $userId)
    ->whereNull('read_at');

if ($auditId) {
    $mentionQuery->whereHas('message.thread', function ($q) use ($auditId) {
        $q->where('audit_id', (int) $auditId);
    });
}
```

### Step-by-Step Unread Count Reduction Example

Assume User A has **10 total unread mentions** for Audit #807:
* **General Thread:** 3 unread mentions
* **2024 Thread:** 3 unread mentions
* **2025 Thread:** 4 unread mentions

1. **Initial State:**
   - Unread Badge Count: **10** (General = 3, 2024 = 3, 2025 = 4)
2. **User opens General Thread:**
   - General mentions marked as read.
   - Unread Badge Count updates to: **7** (General = 0, 2024 = 3, 2025 = 4)
3. **User selects 2024 in Year Dropdown:**
   - 2024 mentions marked as read.
   - Unread Badge Count updates to: **4** (General = 0, 2024 = 0, 2025 = 4)
4. **User selects 2025 in Year Dropdown:**
   - 2025 mentions marked as read.
   - Unread Badge Count updates to: **0** (General = 0, 2024 = 0, 2025 = 0)

### System-Wide Notification Bell Unread Count Deduction

The notification bell icon in the top navbar (`Header.vue`) displays the total unread notifications (`unreadNotificationCount`) across all audit years and threads for the user.

When a user clicks a notification (or opens a thread for a specific Audit Year):
1. **Identifies the Audit Year / Thread** (`thread_id` and `audit_year`).
2. **Opens the Chat Drawer** with the corresponding thread loaded.
3. **Marks all unread mentions belonging to that specific thread** as read in the database (`read_at = now()`, `notification_status = 'Read'`).
4. **Removes all notifications associated with that thread** from the bell dropdown list (`recentNotifications`).
5. **Updates the System-Wide Bell Count** according to:
   $$\text{Total Unread Notifications} - \text{Unread Notifications for Selected Thread} = \text{Updated Bell Count}$$

#### Example Calculation:
* Total system-wide unread notifications: **100**
* User clicks notification for **2024 Audit Thread** (which contains **23 unread notifications**).
* All **23 notifications** for the 2024 thread are marked as read and removed from the unread list.
* Notification bell count updates: $100 - 23 = \mathbf{77}$.
* Unread notifications for other audit years/threads remain intact.

---

## 5. Notification Toaster Popup & Navigation

### Toaster Position
Real-time notification popups (`$notify`) are positioned in the **bottom-right** of the viewport:

```javascript
// Header.vue
this.$notify({
  title: title,
  message: message,
  type: 'info',
  duration: 8000,
  position: 'bottom-right',
  customClass: 'cursor-pointer discussion-toast-notification',
  onClick: () => {
    this.navigateToNotificationDiscussion(notifData)
  }
})
```

### Navigation Context Extraction
Clicking a notification toast or bell icon item preserves the `audit_year` and opens the exact thread:

```javascript
// Header.vue -> navigateToNotificationDiscussion()
const targetQuery = {
  tab: 'documents',
  id: String(auditId),
  openDiscussion: '1',
  parent_object_type: parentObjectType,
  parent_object_id: String(parentObjectId || auditId),
  thread_id: String(threadId || ''),
  audit_year: auditYear ? String(auditYear) : 'General'
}
```

---

## 6. API Endpoints Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/discussion/thread` | `GET` | Retrieves/initializes thread, returns messages, marks thread mentions as read |
| `/api/discussion/message` | `POST` | Posts a new message or file attachment to a thread |
| `/api/discussion/thread/{id}/read` | `PATCH` | Marks all unread mentions belonging to a specific thread as read |
| `/api/discussion/notifications/unread-count` | `GET` | Returns unread mention count (supports optional `?audit_id=` parameter) |
| `/api/discussion/my-mentions` | `GET` | Returns list of mentions for the current user (`?unread_only=1`) |

---

## 7. Testing & Verification
Automated feature tests in `backend/tests/Feature/DiscussionModuleTest.php`:
* `test_discussion_visibility_rules_by_audit_year`: Verifies thread isolation by `audit_year`.
* `test_opening_thread_marks_mentions_in_that_thread_as_read_and_reduces_unread_count`: Verifies per-thread read status marking and badge count deduction.

---

## 8. Lazy Loading & Reverse Scroll-Up Pagination

### Architecture
To maintain high performance and low memory consumption in long discussion threads, the chat drawer uses **Reverse Scroll Pagination** (similar to Slack, WhatsApp, and Discord):

1. **Initial View Load**:
   - `GET /api/discussion/thread?limit=20` fetches the 20 most recent messages.
   - The drawer auto-scrolls to the bottom so the user immediately sees the latest messages.
   - If older messages exist (`has_more: true`), a top button/loader `Load older messages` is displayed.

2. **Scrolling Up / Loading Older Messages**:
   - Scrolling near the top (`scrollTop <= 30`) or clicking `Load older messages` triggers `loadOlderMessages()`.
   - `GET /api/discussion/thread?before_id={oldest_message_id}&limit=20` fetches the preceding 20 older messages.
   - Older messages are prepended to the message array (`messages = [...olderMessages, ...messages]`).

3. **Scroll Position Preservation**:
   - Scroll position is preserved upon prepending older messages using height delta calculation:
     $$\text{feed.scrollTop} = \text{newScrollHeight} - \text{oldScrollHeight}$$
   - This prevents viewport jumpiness when older messages load into view.
