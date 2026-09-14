# Approval Module & System Configurations: Requirements & Implementation

## 1. Executive Summary
This document provides a comprehensive overview of the requirements, architectural design, database schema changes, backend APIs, frontend component enhancements, notification delivery mechanisms, and authorization security controls implemented for the **Approval Module** and **System Configurations**.

---

## 2. Requirements Breakdown

| # | Requirement | Description | Status |
|---|---|---|---|
| **1** | **List Items Display** | Display associated list item details (Item Name & Formatted Currency Value) in the main Approvals listing table. | **Completed** |
| **2** | **Notification Alignment** | Trigger real-time bell icon notifications and bottom-right toast popups for assigned approvers and requesters upon request creation or status updates. | **Completed** |
| **3** | **Notification Type Differentiation** | Clearly differentiate Approval notifications (`warning` badge tag, document icon) from Discussion notifications (`primary` tag, chat icon) in the header dropdown. | **Completed** |
| **4** | **Unread Count Decrement** | Decrement the bell icon notification count when an approval notification is clicked or visited. | **Completed** |
| **5** | **Discussion Drawer Isolation** | Prevent approval notification links from inadvertently opening the discussion drawer when navigating to `/auditing?tab=approvals`. | **Completed** |
| **6** | **Toast Popup Deduplication** | Eliminate stacked, blurred, or duplicate bottom-right notification toast popups. Enforce a single-active-toast policy on screen. | **Completed** |
| **7** | **User Request Visibility Scoping** | Restrict non-admin users to view only their own created approval requests (`requested_by`) or requests where they are assigned as approver (`approver_id`). | **Completed** |
| **8** | **Approver Email Dispatch** | Send formatted HTML emails via SMTP to designated approvers containing request details, stage advancement, list items table, and direct action links. | **Completed** |
| **9** | **Discussion Badge Count Sync** | Ensure @mentions in discussions initiated from the approval list increment and display the "Start Discussion" button badge count on `auditing.vue`. | **Completed** |
| **10**| **System Configurations Admin Restriction** | Restrict access to the **System Configurations** controls on `/usersettings/` exclusively to Admin and Super Admin users (`role_id` 1, 2, 3). | **Completed** |

---

## 3. Backend Architecture & Implementation

### 3.1 Schema & Models
- **Migration**: `database/migrations/2026_09_14_200001_add_list_items_to_approvals_table.php`
  - Added `list_items` `JSON` column to the `approvals` table.
- **Model**: `app/Models/Approval.php`
  - Added `'list_items'` to `$fillable` array.
  - Added `'list_items' => 'array'` cast.

### 3.2 Approval Controller (`app/Http/Controllers/API/ApprovalController.php`)
- **`store` & `update`**: Validates and persists `list_items` array containing item names and numerical values.
- **User Scoping (`index`)**: Restricts non-superadmin users to:
  ```php
  $query->where(function ($q) use ($userId) {
      $q->where('requested_by', $userId)
        ->orWhere('approver_id', $userId);
  });
  ```
- **Notification & Event Dispatch (`sendNotifications`)**:
  1. Creates `AuditWindowNotifications` record.
  2. Creates `DiscussionThread`, `DiscussionMessage`, and `DiscussionMention` for in-app bell notification tracking.
  3. Dispatches targeted `DiscussionUserMentioned` real-time WebSocket event.
  4. Dispatches `ApprovalRequestMail` HTML email to the approver.

### 3.3 Email Delivery (`app/Mail/ApprovalRequestMail.php`)
- Built custom responsive HTML email template featuring:
  - Request ID & Stage advancement (`From Stage` → `To Stage`)
  - Requester Name, Target Approver Name, Due Date, and Comments
  - Formatted List Items table (`Item Name` & `Currency Value`)
  - Action button linking directly to `/auditing?tab=approvals&id={audit_id}`
- Accessible locally via Mailpit at `http://localhost:8025`.

### 3.4 Discussion Controller (`app/Modules/Discussion/Controllers/DiscussionController.php`)
- **`getUnreadNotificationCount`**: Counts all unread discussion mentions across the audit window (including mentions originating from approval discussions) so the "Start Discussion" button badge count on `auditing.vue` stays in sync.
- **`markNotificationsAsRead`**: Supports `only_approvals` and `audit_id` query parameters for targeted read marking.

### 3.5 Security & Authorization (`app/Http/Controllers/API/ConfigurationController.php`)
- Added `isAdminUser()` authorization helper check.
- Protected `create()`, `update()`, and `bulkUpdate()` endpoints with HTTP 403 Forbidden checks for non-admin roles.

---

## 4. Frontend Architecture & Implementation

### 4.1 Approvals Listing (`frontend/components/auditing/ApprovalsTab.vue`)
- Added `List Items` table column header.
- Implemented `parseListItems()` helper method to render styled chips with formatted currency values (`$XX.XX`).
- Added `$nuxt.$on('switch-audit-tab')` event handling to switch tabs without opening the discussion drawer.

### 4.2 Header Notifications & Toast Flushing (`frontend/components/Header.vue`)
- **Visual Differentiation**: Rendered `warning` tag and document icon for Approval notifications vs `primary` tag and chat icon for Discussion notifications.
- **Toast Queue Flushing**: Invoked `this.$notify.closeAll()` before spawning a new toast popup to eliminate duplicate, stacked, or blurred popups.
- **Clean Message Validation**: Required `cleanMsg.length > 0` to prevent empty background events from rendering blank card containers.
- **Optimistic Count Update**: Decrements unread bell count immediately upon clicking a notification item.

### 4.3 Discussion Badge Sync (`frontend/pages/auditing.vue`)
- Updated `fetchDiscussionNotificationCount()` to fetch unread mentions without approval exclusions, ensuring mentions created from the approval list increment the "Start Discussion" button badge count.

### 4.4 Admin Access Control (`frontend/pages/usersettings.vue`)
- Wrapped `<Configuration />` tag with `v-if="isAdmin"`.
- Updated `isAdmin` computed property to validate Admin / Super Admin roles (`1`, `2`, `3`).

---

## 5. Verification & Testing Evidence

### 5.1 Automated Test Suite
- Executed PHPUnit feature test suite in `ApprovalModuleTest.php`:
  ```bash
  docker exec myleaseaudit_app vendor/bin/phpunit tests/Feature/ApprovalModuleTest.php
  ```
- **Results**: 13 / 13 tests passed (100% success rate, 46 assertions).

### 5.2 Key Test Coverage
1. `test_can_create_and_update_approval_request_with_list_items` (verifies list items storage and `ApprovalRequestMail` email dispatch).
2. `test_user_only_sees_own_and_approver_requests` (verifies user request scoping).
3. `test_can_mark_approval_notifications_as_read` (verifies unread count decrement).
