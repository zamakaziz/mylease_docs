# MyLeaseAudit --- Client Review Changes Implementation Guide

## 1. Purpose

This document describes the implementation required for the changes
requested by the client during the Friday demo.

The changes are focused on the **Notes & Discussions** feature:

1.  Clickable URLs in discussion messages.
2.  Notification count based on user role and mentions.
3.  Audit Year filter in Discussions.
4.  Visibility rules for General and audit-year-specific discussions.
5.  Current Audit Year selected by default.

These changes extend the existing contextual Notes & Discussions design.
Discussions remain attached to audit objects rather than becoming a
separate Slack-style chat system.

------------------------------------------------------------------------

# 2. Existing Design Context

The existing Notes & Discussions design uses contextual discussion
threads attached to audit records and supports threaded replies,
@mentions, notifications, attachments, status handling, activity logging
and search/filtering.

Each discussion thread should be associated with:

-   `audit_id`
-   `audit_year_id` where applicable
-   `parent_object_type`
-   `parent_object_id`

The existing audit workflow is still:

``` text
Documents
    ↓
AI Extraction
    ↓
Manual Review
    ↓
Validation
    ↓
Findings & Observations
    ↓
Checklist
    ↓
Approval
    ↓
Savings
    ↓
Close
```

The client review changes do not replace this workflow.

------------------------------------------------------------------------

# 3. Client Review Requirements

## Requirement 1 --- Clickable Links in Chat

### Business requirement

Any URL entered into a discussion message or reply must be displayed as
a clickable link.

### Current behavior

A message such as:

``` text
Please check https://example.com/lease.pdf
```

may currently appear as plain text.

### Expected behavior

The URL should be rendered as a clickable link:

``` text
Please check https://example.com/lease.pdf
                  ^ clickable
```

Clicking the URL should open the destination.

### Implementation

This is primarily a frontend message-rendering change.

#### Frontend

When rendering:

``` text
message.message_text
```

detect URLs and render them as links instead of plain text.

Support at minimum:

``` text
https://example.com
http://example.com
```

Optionally support:

``` text
www.example.com
```

### Security requirements

Do not render arbitrary message content as raw HTML.

Only convert valid URLs into links.

Use safe URL handling and prevent:

``` text
javascript:
data:
```

or other unsafe schemes from being rendered as clickable links.

### Expected result

The same behavior must work for:

-   Original messages
-   Replies
-   Questions
-   Comments
-   Decisions
-   Review Requests

------------------------------------------------------------------------

# 4. Requirement 2 --- Notification Count Based on User Role

## Business requirement

The discussion notification count should behave differently depending on
the user's role.

### Auditor

Auditors should see the general discussion notification count by
default.

Example:

``` text
Auditor

🔔 12
```

The count represents discussion activity that the Auditor is expected to
see according to the existing discussion notification behavior.

### Other roles

For QC Reviewers, Project Managers, Admins and other non-Auditor users,
the notification count should be based on items specifically requiring
their attention.

Examples:

-   User was @mentioned.
-   User was assigned a question.
-   User was assigned a review request.
-   User received a relevant reply/notification.

Example:

``` text
QC Reviewer

🔔 2
```

where the `2` represents two relevant notifications for that user.

### Important distinction

Do not confuse:

``` text
Discussion count
```

with:

``` text
Notification count
```

A discussion count indicates discussion activity.

A notification count indicates something requiring the current user's
attention.

------------------------------------------------------------------------

# 5. Notification Logic

Recommended logic:

``` text
IF current_user.role == Auditor

    Show general discussion notification count

ELSE

    Show only user-specific discussion notifications

    Examples:
        - Mentioned
        - Question assigned
        - Review request assigned
        - Relevant reply
```

### Example

Suppose an audit has:

``` text
20 discussion messages
```

and:

``` text
2 messages mention the QC reviewer
```

Then:

``` text
Auditor:
    Discussion notification = 20

QC Reviewer:
    Notification = 2
```

If the Project Manager has not been mentioned or assigned anything:

``` text
Project Manager:
    Notification = 0
```

If the Project Manager is mentioned:

``` text
@John please review this finding.
```

then:

``` text
Project Manager:
    Notification = 1
```

------------------------------------------------------------------------

# 6. Requirement 3 --- Audit Year Filter

## Business requirement

Add an Audit Year filter at the top of the Discussions panel.

Example:

``` text
NOTES & DISCUSSIONS

Audit Year: [ 2026 ▼ ]
```

The dropdown should contain:

``` text
General
2023
2024
2025
2026
```

The available audit years should come from the selected location/audit
context.

------------------------------------------------------------------------

# 7. General Discussion

A **General** discussion is not associated with a particular audit year.

Example:

``` text
General

Who is the current property manager?
```

This discussion can be relevant to the entire audit/location.

Recommended database representation:

``` text
audit_id      = 123
audit_year_id = NULL
```

`NULL audit_year_id` represents a General discussion.

------------------------------------------------------------------------

# 8. Audit-Year-Specific Discussion

A year-specific discussion belongs to one audit year.

Example:

``` text
Audit Year: 2025

Why was the 2025 management fee calculated at 4%?
```

Recommended database representation:

``` text
audit_id      = 123
audit_year_id = 2025
```

------------------------------------------------------------------------

# 9. Requirement 4 --- Discussion Visibility Rules

This is the most important filtering rule.

## General selected

If the user selects:

``` text
Audit Year: General
```

show:

``` text
General discussions only
```

Do not show:

``` text
2023
2024
2025
2026
```

specific discussions.

------------------------------------------------------------------------

## Specific year selected

If the user selects:

``` text
Audit Year: 2025
```

show:

``` text
General discussions
+
2025 discussions
```

Hide:

``` text
2023 discussions
2024 discussions
2026 discussions
```

### Visibility matrix

  -----------------------------------------------------------------------
  Selected             Show General Show selected year   Show other years
  filter                                               
  -------------- ------------------ ------------------ ------------------
  General                       Yes                 No                 No

  2023                          Yes                Yes                 No

  2024                          Yes                Yes                 No

  2025                          Yes                Yes                 No

  2026                          Yes                Yes                 No
  -----------------------------------------------------------------------

### Backend query concept

For a selected year such as `2025`:

``` text
WHERE audit_id = selectedAuditId
AND (
    audit_year_id IS NULL
    OR audit_year_id = 2025
)
```

For General:

``` text
WHERE audit_id = selectedAuditId
AND audit_year_id IS NULL
```

------------------------------------------------------------------------

# 10. Requirement 5 --- Default Audit Year

## Business requirement

When the Discussions panel is opened, the filter should automatically
select the current audit year.

Example:

Available years:

``` text
2023
2024
2025
2026
```

Current audit year:

``` text
2026
```

Opening Discussions should show:

``` text
Audit Year: [ 2026 ▼ ]
```

not:

``` text
Audit Year: [ General ▼ ]
```

------------------------------------------------------------------------

# 11. Frontend Implementation

## 11.1 Discussion Drawer

Existing pattern:

``` text
Main Audit Workspace
        ↓
Discussion Button
        ↓
Right-side Discussion Drawer
```

Keep this design.

Add the filter near the top:

``` text
┌─────────────────────────────────────────┐
│ NOTES & DISCUSSIONS                     │
│                                         │
│ Audit Year: [ 2026 ▼ ]                  │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ Discussion messages                     │
│                                         │
└─────────────────────────────────────────┘
```

------------------------------------------------------------------------

## 11.2 Frontend State

Maintain state conceptually similar to:

``` text
selectedDiscussionYear
availableDiscussionYears
discussionMessages
discussionNotificationCount
```

Example:

``` text
selectedDiscussionYear = currentAuditYear
```

When the dropdown changes:

``` text
selectedDiscussionYear
        ↓
Fetch discussions
        ↓
Update discussion list
```

------------------------------------------------------------------------

# 12. API Changes

The existing Discussion API design includes endpoints for retrieving
threads, creating threads/messages, replies, mentions, attachments,
status changes, search and user mentions.

Extend the thread retrieval behavior to support audit-year filtering.

## Suggested request

``` http
GET /discussion/thread?audit_id=123&audit_year_id=2025
```

For General:

``` http
GET /discussion/thread?audit_id=123&audit_year_id=general
```

The exact parameter representation can follow the existing project's
conventions.

------------------------------------------------------------------------

# 13. Backend Discussion Query

## Specific audit year

For:

``` text
audit_id = 123
audit_year_id = 2025
```

return:

``` text
audit_id = 123
AND (
    audit_year_id IS NULL
    OR audit_year_id = 2025
)
```

## General

For:

``` text
audit_id = 123
audit_year_id = NULL
```

return:

``` text
audit_id = 123
AND audit_year_id IS NULL
```

------------------------------------------------------------------------

# 14. Available Audit Years API

The frontend needs the list of available years.

The response should conceptually look like:

``` json
{
  "years": [
    "General",
    2023,
    2024,
    2025,
    2026
  ],
  "current_year": 2026
}
```

If the application already has an API that returns the selected audit's
years, reuse it rather than creating a duplicate endpoint.

------------------------------------------------------------------------

# 15. Creating a Discussion

When a user creates a discussion, the system needs to know the selected
year.

## General

``` text
Selected filter = General

Create:
audit_id = 123
audit_year_id = NULL
```

## 2025

``` text
Selected filter = 2025

Create:
audit_id = 123
audit_year_id = 2025
```

This is important because the visibility rules depend on the stored
`audit_year_id`.

------------------------------------------------------------------------

# 16. Parent Object Handling

The existing design allows Discussions to be attached to objects such
as:

-   Audit
-   Document
-   Validation Finding
-   Observation
-   Checklist Item
-   Approval Request
-   Savings Record
-   Generated Report

The thread should continue to store:

``` text
parent_object_type
parent_object_id
audit_id
audit_year_id
```

For year-specific objects, `audit_year_id` should identify the relevant
audit year.

For audit-level/general discussions, `audit_year_id` can be `NULL`.

------------------------------------------------------------------------

# 17. Notification Implementation

## Step 1 --- Identify current user

``` text
currentUser
```

Get:

``` text
user_id
role
```

------------------------------------------------------------------------

## Step 2 --- Determine notification scope

``` text
IF role = Auditor

    use Auditor discussion notification rules

ELSE

    use user-specific notification rules
```

------------------------------------------------------------------------

## Step 3 --- User-specific notification sources

At minimum check:

``` text
DiscussionMention
Question assignment
Review request assignment
Reply notifications
```

The existing discussion design already defines mention records and
notification status tracking.

------------------------------------------------------------------------

# 18. Notification Count Query

Conceptually:

``` text
Auditor
    ↓
Count relevant discussion notifications

Other roles
    ↓
Count notifications where:
    mentioned_user_id = current_user.id
    OR assigned_to = current_user.id
    OR current user is otherwise explicitly notified
```

Do not calculate non-Auditor notification count simply from the total
number of discussion messages.

------------------------------------------------------------------------

# 19. Clickable URL Implementation

## Message rendering

Current:

``` text
{{ message.message_text }}
```

New behavior:

``` text
renderMessage(message.message_text)
```

The renderer should:

1.  Detect URLs.
2.  Preserve normal text.
3.  Convert valid URLs to anchor elements.
4.  Open links safely.

Example input:

``` text
Please check https://example.com/report and confirm.
```

Expected display:

``` text
Please check https://example.com/report and confirm.
             ^ clickable
```

Do not allow arbitrary HTML from the message.

------------------------------------------------------------------------

# 20. Database Changes

First inspect the existing Discussion tables before creating a
migration.

Check whether the discussion thread already contains:

``` text
audit_id
audit_year_id
```

If `audit_year_id` already exists:

``` text
No new database column is required.
```

Only update the model/query/business logic.

If it does not exist:

Create a migration adding:

``` text
audit_year_id
```

with a nullable foreign key where appropriate.

Recommended meaning:

``` text
NULL = General
non-null = specific audit year
```

------------------------------------------------------------------------

# 21. Recommended Backend Files to Inspect

Before coding, identify the existing Discussion implementation.

Look for:

``` text
DiscussionThread model
DiscussionMessage model
DiscussionMention model
DiscussionAttachment model
Discussion controller
Discussion service
Discussion routes
Notification service
Notification model
```

Do not create duplicate models/services if equivalent functionality
already exists.

------------------------------------------------------------------------

# 22. Recommended Frontend Files to Inspect

Identify:

``` text
Discussion drawer/component
Discussion message component
Audit page
Audit year selector
Notification badge/component
Notification API composable/service
```

Reuse the existing audit-year state if one already exists.

The application already uses the concept of an Active Year for
year-specific workflow tabs such as Validation, Findings & Observations,
Checklist, Approvals and Savings.

------------------------------------------------------------------------

# 23. Implementation Sequence

## Phase 1 --- Understand Existing Code

Before making changes:

``` text
1. Find Discussion database tables.
2. Find Discussion models.
3. Find Discussion APIs.
4. Find Discussion drawer/component.
5. Find notification count implementation.
6. Find audit year/current year implementation.
```

Do not modify anything yet.

------------------------------------------------------------------------

## Phase 2 --- Verify Audit Year Data

Confirm:

``` text
Audit
 ├── 2023
 ├── 2024
 ├── 2025
 └── 2026
```

and determine which year is the current/active year.

------------------------------------------------------------------------

## Phase 3 --- Implement Discussion Year Filtering

Implement:

``` text
General
2023
2024
2025
2026
```

and the visibility rules.

Test the backend independently first.

------------------------------------------------------------------------

## Phase 4 --- Add Frontend Audit Year Filter

Add:

``` text
Audit Year: [Current Year ▼]
```

Default to current audit year.

Changing the value should reload the discussion list.

------------------------------------------------------------------------

## Phase 5 --- Update Discussion Creation

When creating a new thread:

``` text
General → audit_year_id = NULL
2025   → audit_year_id = 2025
```

Make sure replies inherit the thread's year context and do not create a
conflicting year.

------------------------------------------------------------------------

## Phase 6 --- Implement Notification Rules

Implement:

``` text
Auditor
    → general discussion notification behavior

Other roles
    → mention/assignment-specific notification behavior
```

Test each role separately.

------------------------------------------------------------------------

## Phase 7 --- Implement Clickable URLs

Update the message renderer.

Test:

``` text
https://example.com
http://example.com
URL in question
URL in reply
URL next to punctuation
multiple URLs
normal text
unsafe URL schemes
```

------------------------------------------------------------------------

# 24. Testing Plan

## A. Audit Year Filter

### Test 1

Current year = 2026.

Open Discussions.

Expected:

``` text
Audit Year: 2026
```

------------------------------------------------------------------------

### Test 2

Select General.

Expected:

``` text
Only General discussions
```

------------------------------------------------------------------------

### Test 3

Select 2025.

Expected:

``` text
General
+
2025 discussions
```

------------------------------------------------------------------------

### Test 4

Create a 2025 discussion.

Select 2024.

Expected:

``` text
2025 discussion is hidden
```

------------------------------------------------------------------------

### Test 5

Create a General discussion.

Select 2025.

Expected:

``` text
General discussion is visible
```

------------------------------------------------------------------------

### Test 6

Select 2026.

Expected:

``` text
General
+
2026 discussions
```

------------------------------------------------------------------------

# 25. Notification Testing

Create the following users:

``` text
Auditor
QC Reviewer
Project Manager
Admin
```

### Test 1 --- Auditor

Create several discussions.

Expected:

``` text
Auditor sees the general discussion notification count.
```

### Test 2 --- QC not mentioned

Create a discussion without mentioning QC.

Expected:

``` text
QC notification does not increase.
```

### Test 3 --- QC mentioned

Create:

``` text
@QC Reviewer please review this finding.
```

Expected:

``` text
QC notification increases.
```

### Test 4 --- PM not mentioned

Expected:

``` text
PM notification remains unchanged.
```

### Test 5 --- PM mentioned

Create:

``` text
@Project Manager please review.
```

Expected:

``` text
PM receives notification.
```

------------------------------------------------------------------------

# 26. URL Testing

Test:

``` text
Please visit https://example.com
```

Expected:

``` text
https://example.com
```

is clickable.

Test:

``` text
Please see https://example.com/report.pdf.
```

Expected:

``` text
https://example.com/report.pdf
```

is clickable without the trailing period becoming part of the URL.

Test replies as well.

------------------------------------------------------------------------

# 27. Regression Testing

After implementation, verify that the existing Discussion functionality
still works:

-   Create discussion
-   Send message
-   Reply
-   @mention
-   Attach file
-   Resolve
-   Reopen
-   Activity logging
-   Search
-   Existing discussion count
-   Existing notification behavior
-   Validation discussion
-   Finding/Observation discussion
-   Checklist discussion
-   Approval discussion
-   Savings discussion

The existing design expects discussions to work across these audit
objects.

------------------------------------------------------------------------

# 28. Acceptance Criteria

## Clickable Links

-   [ ] URLs in messages are clickable.
-   [ ] URLs in replies are clickable.
-   [ ] Normal text remains unchanged.
-   [ ] Unsafe URL schemes are not allowed.
-   [ ] Existing @mentions continue to work.

## Notification Count

-   [ ] Auditor sees the expected general discussion notification count.
-   [ ] Non-Auditors do not receive the general discussion count by
    default.
-   [ ] Mentioned users receive notifications.
-   [ ] Assigned questions generate notifications.
-   [ ] Assigned review requests generate notifications.
-   [ ] Notification count is user-specific for non-Auditors.

## Audit Year Filter

-   [ ] Audit Year dropdown is displayed.
-   [ ] General is available.
-   [ ] All available audit years are displayed.
-   [ ] Current audit year is selected by default.
-   [ ] Changing the year refreshes discussions.

## Visibility

-   [ ] General discussions are visible when General is selected.
-   [ ] General discussions are visible when any specific year is
    selected.
-   [ ] Year-specific discussions are visible only for their own year.
-   [ ] Discussions from other years are hidden.
-   [ ] New discussions save the selected year correctly.

------------------------------------------------------------------------

# 29. Suggested Developer Checklist

``` text
[ ] Inspect existing Discussion schema
[ ] Confirm audit_year_id availability
[ ] Inspect current notification-count logic
[ ] Inspect current audit-year/current-year logic
[ ] Add/modify discussion year filtering
[ ] Add Audit Year dropdown
[ ] Set current year as default
[ ] Update discussion creation
[ ] Implement General discussion behavior
[ ] Implement year-specific discussion behavior
[ ] Update notification count by role
[ ] Verify mention notifications
[ ] Convert URLs to safe clickable links
[ ] Test messages
[ ] Test replies
[ ] Test all supported roles
[ ] Test General filtering
[ ] Test year filtering
[ ] Run regression tests
```

------------------------------------------------------------------------

# 30. Final Expected Flow

After implementation, the Discussion flow should be:

``` text
Open Audit
    ↓
Open Discussions
    ↓
Current Audit Year selected automatically
    ↓
Load:
    General discussions
    +
    Current-year discussions
    ↓
User changes Audit Year
    ↓
Reload:
    General discussions
    +
    Selected-year discussions
    ↓
User sends message
    ↓
URLs become clickable
    ↓
System processes @mentions
    ↓
Mentioned/assigned users receive notifications
    ↓
Notification count follows user's role
```

------------------------------------------------------------------------

# 31. Example End-to-End Scenario

Assume:

``` text
Audit: ABC Plaza
Current Year: 2026

Available Years:
2024
2025
2026
```

The database contains:

``` text
Discussion A
audit_id = 100
audit_year_id = NULL
Title = General property question

Discussion B
audit_id = 100
audit_year_id = 2025
Title = 2025 management fee

Discussion C
audit_id = 100
audit_year_id = 2026
Title = 2026 CAM reconciliation
```

When the user opens Discussions:

``` text
Audit Year: 2026
```

Visible:

``` text
Discussion A - General property question
Discussion C - 2026 CAM reconciliation
```

Hidden:

``` text
Discussion B - 2025 management fee
```

User changes filter:

``` text
Audit Year: 2025
```

Visible:

``` text
Discussion A - General property question
Discussion B - 2025 management fee
```

Hidden:

``` text
Discussion C - 2026 CAM reconciliation
```

User writes:

``` text
@John please review https://example.com/cam-report.pdf
```

Expected:

``` text
@John
```

is treated as a mention and:

``` text
https://example.com/cam-report.pdf
```

is displayed as a clickable link.

John receives the appropriate notification.

------------------------------------------------------------------------

# 32. Important Implementation Notes

1.  **Do not build a separate chat module.** Keep Discussions contextual
    to the audit/work item.
2.  **Do not remove the existing audit workflow.** These are Discussion
    enhancements.
3.  **Do not use total discussion messages as the notification count for
    every role.**
4.  **Do not mix General discussions with year-specific storage.**
5.  **Do not duplicate existing audit-year APIs or notification services
    if reusable implementations already exist.**
6.  **Do not render discussion text as unrestricted HTML.**
7.  **Keep `audit_id` as the primary audit context and `audit_year_id`
    for year-specific context.**
8.  **Preserve existing @mention, attachment, activity-log and
    discussion functionality.**

------------------------------------------------------------------------

# 33. Definition of Done

The implementation is complete when:

``` text
✓ Discussion URLs are clickable
✓ Auditor notification behavior is correct
✓ Non-Auditor notification behavior is user-specific
✓ Audit Year filter exists
✓ General is available
✓ Current year is selected automatically
✓ General discussions are visible across year selections
✓ Year-specific discussions are isolated to their year
✓ New discussions save the correct year
✓ @mentions still generate notifications
✓ Existing Discussion functionality is not broken
✓ Regression tests pass
```

## Reference

The existing Notes & Discussions design defines contextual discussion
threads, @mentions, notifications, attachments, activity logging and
search/filtering, while the audit workflow defines Validation, Findings,
Checklist, Approvals and Savings as year-specific workflow areas. The
client review changes should be implemented as an extension of those
existing structures rather than as a replacement.
