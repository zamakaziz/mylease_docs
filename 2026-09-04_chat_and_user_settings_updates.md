# Requirements and Implementation Guide: Chat Discussions & User Settings Updates

**Date**: September 04, 2026  
**File**: `docs/2026-09-04_chat_and_user_settings_updates.md`

---

## 1. Overview of Requirements

1. **Chat Discussion – User Selection**
   - The user selection list in the Chat Discussion drawer must display **all users belonging to the company**.
   - Disabled users (`status = 0`) and unverified users (`email_verified_at = null`) must be strictly **excluded** from the selection list.

2. **Mention Notifications & Emails**
   - In-app notifications and email reminders must be sent **only to users explicitly `@mentioned`** in the chat message.
   - The message sender must **never** receive a notification or email for their own message.

3. **Response Email Reminder Setting (User-Level)**
   - The **Response Email Reminder** enable/disable toggle setting must be configurable at the **User level**.
   - Each user can set their own preference for receiving email reminders.

4. **Response Time Setting (Company-Level)**
   - The **Response Time** setting must be configured at the **Company level**.
   - The configured response time applies to all users within the company.

5. **Notification Bell Formatting & Styling**
   - Update message text displayed in the Notification Bell dropdown list.
   - Strip raw mention markup (e.g. `@[User Name](user_id)` converted to `User Name`).
   - Remove category filter tabs (All, Discussions, Mentions).
   - Compact notification list font sizes: Title `11.5px`, Text `10.5px`, Timestamp `9.5px`.

6. **User Settings Profile Update Enablement**
   - On `/usersettings/`, fix the Edit Profile drawer so toggling *only* the **Response Email Reminder** switch enables the "Update" button (previously blocked because `phoneValidated` defaulted to `false`).

---

## 2. Implementation Details

### A. Backend Changes

1. **User Model & Filtering Logic**:
   - File: `backend/app/Models/User.php`
     - Added `status` and `email_verified_at` to the `$fillable` array.
   - File: `backend/app/Modules/Discussion/Controllers/DiscussionController.php`
     - Updated `getMentionableUsers` and `getUsers` methods to query company users and filter out disabled (`status = 0`) or unverified (`email_verified_at IS NULL`) accounts.

2. **Explicit Mention Notifications**:
   - File: `backend/app/Modules/Discussion/Services/DiscussionService.php`
     - Modified `addMessage` and `updateMessage` methods so in-app notifications are created strictly for users explicitly mentioned in the message text, explicitly excluding the message sender (`auth()->id()`).

3. **Explicit Mention Email Reminders & Verification Check**:
   - File: `backend/app/Services/ChatResponseReminderService.php`
     - Updated `createReminder` to dispatch reminder jobs exclusively for explicitly `@mentioned` users (excluding the sender).
   - File: `backend/app/Jobs/SendResponseReminder.php`
     - Added `.fresh()` check to verify user active status (`status != 0`) and email verification status before sending out email reminders.

4. **User-Level Response Email Reminder API**:
   - File: `backend/app/Http/Controllers/API/UserController.php`
     - Handled `response_email_notification_enabled` field in user profile update API (`/api/add-onboard-user`).

---

### B. Frontend Changes

1. **Discussion Drawer User Listing**:
   - File: `frontend/components/auditing/DiscussionDrawer.vue`
     - Updated `filteredCompanyUsers` computed property to filter out unverified (`!u.email_verified_at`) and disabled (`u.status === 0`) users.

2. **Notification Bell Dropdown**:
   - File: `frontend/components/Header.vue`
     - Removed category tabs/badges from notification dropdown header.
     - Stripped raw mention tag syntax `@[User Name](id)` into clean `User Name` text.
     - Adjusted CSS styles to reduce font sizes (Title: `11.5px`, Body: `10.5px`, Timestamp: `9.5px`).

3. **User Settings Profile Drawer & Update Button Enablement**:
   - File: `frontend/pages/usersettings.vue`
     - Bound `el-switch` to `addFormData.response_email_notification_enabled`.
     - Updated `data()`, `showEditProfile()`, and `closeEditProfile()` to set `phoneValidated: true` by default so modifying individual fields (like Response Email Reminder) does not keep the Update button disabled when telephone input is untouched.

---

## 3. Verification & Test Coverage

- **Feature Tests**:
  - `Tests\Feature\DiscussionModuleTest` (25 tests passed)
  - `Tests\Feature\ChatResponseReminderTest` (7 tests passed)
- **Manual Verification**:
  - Navigated to `/usersettings/` Edit Profile drawer, toggled **Response Email Reminder**, and verified the **Update** button activates and saves correctly.
  - Verified user listing in Chat Discussion excludes disabled/unverified users.
  - Verified notifications and emails are sent strictly to explicitly mentioned users (excluding sender).
