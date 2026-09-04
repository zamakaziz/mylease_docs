# Real-Time Chat – Response Time Email Notification

## 1. Requirement

The application has a real-time chat system implemented using **Laravel + Vue + Pusher**.

The existing application already has a **Settings** area.

A new chat response notification setting needs to be added to the existing Settings area.

### Expected behaviour

When a user sends a message to another user:

1. The recipient's response notification settings must be checked.
2. If the recipient has enabled the response-time email notification:

   * Start a response timer based on the configured time.
3. If the recipient responds before the configured time:

   * Cancel/complete the pending notification.
   * No email should be sent.
4. If the recipient does not respond within the configured time:

   * Send an email notification to the recipient.
5. The existing Pusher real-time chat functionality must continue working without changes to its existing behaviour.

---

# 2. Example

Assume the user configures:

```text
Response Email Notification: ON
Response Time: 30 minutes
```

Conversation:

```text
10:00 AM
User A → User B
"Please review this document."
```

The system creates a pending response reminder for User B.

```text
10:00 AM
Response reminder created

Due time:
10:30 AM
```

### Scenario 1 – User responds

```text
10:20 AM
User B → User A
"I will review it."
```

System:

```text
Pending reminder
       ↓
User responded
       ↓
Mark reminder as responded
       ↓
10:30 AM job executes
       ↓
No email
```

### Scenario 2 – User does not respond

```text
10:00 AM
Message received

10:30 AM
No response found

       ↓

Send email to User B
```

---

# 3. High-Level Architecture

```text
                    Vue Chat
                       |
                       | API
                       v
                Laravel Backend
                       |
          +------------+-------------+
          |            |             |
          v            v             v
     Chat Message    Pusher      Response Timer
          |            |             |
          |            v             v
          |           Vue       Laravel Queue
          |                          |
          |                          | after configured time
          |                          v
          |                   Check Response
          |                          |
          |                 +--------+--------+
          |                 |                 |
          |             Responded         No Response
          |                 |                 |
          |                STOP                v
          |                              Send Email
          |
          v
       Database
```

---

# 4. Important Design Decision

The response timer must be handled by the **Laravel backend**, not Vue.

### Do NOT implement the timer using JavaScript

Avoid:

```javascript
setTimeout(() => {
    sendEmail();
}, 30 * 60 * 1000);
```

This is unreliable because:

* Browser may be closed.
* User may refresh the page.
* Computer may go to sleep.
* Network connection may be lost.
* Multiple browser tabs may create duplicate timers.
* Client-side code should not be responsible for system email delivery.

The backend queue should control the timer.

---

# 5. Existing Settings Area

Do not create a new Settings module.

Add the required fields to the application's existing Settings structure.

Suggested settings:

```text
response_email_notification_enabled
response_email_notification_time
```

Example:

```text
Response Email Notification
    [ ON / OFF ]

Response Time
    [ 30 ] minutes
```

If the existing application has a different Settings architecture, follow the existing pattern.

---

# 6. Settings Requirements

### Setting 1 – Enable/Disable

```text
response_email_notification_enabled
```

Possible values:

```text
true
false
```

Default:

```text
false
```

### Setting 2 – Response Time

```text
response_email_notification_time
```

Example:

```text
5 minutes
15 minutes
30 minutes
1 hour
2 hours
```

The exact available values should follow the application's existing Settings UI/requirements.

---

# 7. Database Design

Create a new table to track pending response notifications.

Suggested table:

```text
chat_response_reminders
```

### Columns

| Column          | Type          | Description                                            |
| --------------- | ------------- | ------------------------------------------------------ |
| id              | BIGINT        | Primary key                                            |
| conversation_id | BIGINT        | Conversation reference                                 |
| message_id      | BIGINT        | Message that requires response                         |
| user_id         | BIGINT        | User who needs to respond                              |
| due_at          | DATETIME      | Time when response notification becomes due            |
| status          | VARCHAR       | pending/responded/sent/cancelled                       |
| version         | BIGINT        | Prevents old queued jobs from sending duplicate emails |
| email_sent_at   | DATETIME NULL | Time email was sent                                    |
| created_at      | DATETIME      | Laravel timestamp                                      |
| updated_at      | DATETIME      | Laravel timestamp                                      |

### Suggested statuses

```text
pending
responded
sent
cancelled
```

---

# 8. Suggested Migration

Example:

```php
Schema::create('chat_response_reminders', function (Blueprint $table) {
    $table->id();

    $table->foreignId('conversation_id')
        ->constrained()
        ->cascadeOnDelete();

    $table->foreignId('message_id')
        ->constrained('chat_messages')
        ->cascadeOnDelete();

    $table->foreignId('user_id')
        ->constrained('users')
        ->cascadeOnDelete();

    $table->dateTime('due_at');

    $table->string('status')->default('pending');

    $table->unsignedBigInteger('version')->default(1);

    $table->dateTime('email_sent_at')->nullable();

    $table->timestamps();

    $table->index([
        'conversation_id',
        'user_id',
        'status'
    ]);

    $table->index([
        'due_at',
        'status'
    ]);
});
```

> Adjust foreign-key table names according to the existing project's database structure.

---

# 9. Laravel Model

Create:

```text
app/Models/ChatResponseReminder.php
```

Example:

```php
class ChatResponseReminder extends Model
{
    protected $fillable = [
        'conversation_id',
        'message_id',
        'user_id',
        'due_at',
        'status',
        'version',
        'email_sent_at',
    ];

    protected $casts = [
        'due_at' => 'datetime',
        'email_sent_at' => 'datetime',
    ];

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }

    public function message()
    {
        return $this->belongsTo(ChatMessage::class, 'message_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

Use the existing project model namespaces and relationships.

---

# 10. Message Flow

The existing chat message flow should remain approximately:

```text
Vue
 ↓
Laravel Chat API
 ↓
Validate request
 ↓
Save message
 ↓
Broadcast Pusher event
 ↓
Return response
```

Add the response reminder process after the message is successfully stored.

```text
Vue
 ↓
Laravel
 ↓
Save Message
 ↓
Broadcast Pusher
 ↓
Determine Recipient
 ↓
Check Settings
 ↓
Create/Update Response Reminder
 ↓
Dispatch Queue Job
```

---

# 11. Identify the User Who Needs to Respond

After receiving a message:

```php
$sender = auth()->user();

$recipient = $conversation->getRecipientFor($sender);
```

Use the application's existing conversation/participant logic.

Do not duplicate participant logic if the project already has a method/service for determining the recipient.

---

# 12. Check Existing Settings

Before creating a reminder:

```php
$settings = $recipient->settings;
```

Or use the existing Settings service/repository.

Example:

```php
if (!$settings->response_email_notification_enabled) {
    return;
}
```

Then get the configured response time:

```php
$responseTime = $settings->response_email_notification_time;
```

---

# 13. Response Reminder Service

Create a dedicated service:

```text
app/Services/ChatResponseReminderService.php
```

Purpose:

```text
ChatResponseReminderService
        |
        +-- check settings
        |
        +-- identify recipient
        |
        +-- create reminder
        |
        +-- update existing reminder
        |
        +-- mark reminder responded
```

This keeps the controller/service handling chat messages clean.

---

# 14. Create Reminder

Example:

```php
public function createReminder(
    Conversation $conversation,
    ChatMessage $message,
    User $recipient
): void {
    $settings = $this->getResponseSettings($recipient);

    if (!$settings->response_email_notification_enabled) {
        return;
    }

    $minutes = $settings->response_email_notification_time;

    $reminder = ChatResponseReminder::create([
        'conversation_id' => $conversation->id,
        'message_id' => $message->id,
        'user_id' => $recipient->id,
        'due_at' => now()->addMinutes($minutes),
        'status' => 'pending',
        'version' => 1,
    ]);

    SendResponseReminder::dispatch(
        $reminder->id,
        $reminder->version
    )->delay($reminder->due_at);
}
```

---

# 15. Important – Multiple Messages

This is an important edge case.

Example:

```text
10:00 User A → User B
10:05 User A → User B
10:10 User A → User B
```

We should NOT generate three emails:

```text
10:30 Email
10:35 Email
10:40 Email
```

Instead, there should be only one active response requirement.

Recommended behaviour:

```text
10:00
Message received
Timer starts

10:05
New message
Timer is refreshed

10:10
New message
Timer is refreshed

10:40
If no response
Send ONE email
```

---

# 16. Handling Timer Version

Because Laravel Queue cannot simply remove an already queued delayed job, use a `version` field.

Example:

```text
Reminder ID = 100
Version = 1
```

A new message arrives:

```text
Version = 2
```

The old queued job still exists, but when it executes:

```text
Job version = 1
Database version = 2
```

Therefore:

```text
1 != 2
    ↓
Old job
    ↓
STOP
```

The latest job will handle the current reminder.

---

# 17. Example Implementation

When a new message arrives:

```php
$reminder = ChatResponseReminder::where([
    'conversation_id' => $conversation->id,
    'user_id' => $recipient->id,
    'status' => 'pending',
])->first();

if ($reminder) {

    $reminder->increment('version');

    $reminder->update([
        'message_id' => $message->id,
        'due_at' => now()->addMinutes($responseTime),
    ]);

} else {

    $reminder = ChatResponseReminder::create([
        'conversation_id' => $conversation->id,
        'message_id' => $message->id,
        'user_id' => $recipient->id,
        'due_at' => now()->addMinutes($responseTime),
        'status' => 'pending',
        'version' => 1,
    ]);
}
```

Then dispatch the job using the latest version.

---

# 18. Laravel Queue Job

Create:

```bash
php artisan make:job SendResponseReminder
```

File:

```text
app/Jobs/SendResponseReminder.php
```

Example:

```php
class SendResponseReminder implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(
        public int $reminderId,
        public int $version
    ) {
    }

    public function handle(): void
    {
        $reminder = ChatResponseReminder::find($this->reminderId);

        if (!$reminder) {
            return;
        }

        // Old job - ignore it.
        if ($reminder->version !== $this->version) {
            return;
        }

        // User already responded.
        if ($reminder->status !== 'pending') {
            return;
        }

        // Safety check.
        if ($reminder->due_at->isFuture()) {
            return;
        }

        $user = $reminder->user;

        // Send email
        Mail::to($user->email)
            ->queue(
                new ResponseReminderMail($reminder)
            );

        $reminder->update([
            'status' => 'sent',
            'email_sent_at' => now(),
        ]);
    }
}
```

---

# 19. Mark Reminder as Responded

When the recipient sends a response message:

```php
$this->responseReminderService
    ->markAsResponded(
        $conversation,
        auth()->user()
    );
```

Service:

```php
public function markAsResponded(
    Conversation $conversation,
    User $user
): void {
    ChatResponseReminder::where([
        'conversation_id' => $conversation->id,
        'user_id' => $user->id,
        'status' => 'pending',
    ])->update([
        'status' => 'responded',
    ]);
}
```

This should happen **when the user's message is successfully saved**.

---

# 20. Complete Message Processing

The existing message method can follow this structure:

```php
public function sendMessage(Request $request)
{
    $sender = auth()->user();

    $conversation = $this->conversationService
        ->findConversation($request->conversation_id);

    $message = $this->chatService->createMessage(
        $conversation,
        $sender,
        $request->message
    );

    // Existing Pusher functionality
    broadcast(
        new MessageSent($message)
    )->toOthers();

    // Mark previous response requirement as completed
    $this->responseReminderService
        ->markAsResponded(
            $conversation,
            $sender
        );

    // Determine recipient
    $recipient = $conversation->getRecipientFor($sender);

    // Create response reminder for recipient
    $this->responseReminderService
        ->createReminder(
            $conversation,
            $message,
            $recipient
        );

    return response()->json($message);
}
```

### Important

The exact order should be adjusted according to the existing application.

For example, if the sender's message should complete a previous reminder **before** creating a new reminder, keep that order.

---

# 21. Email Mailable

Create:

```bash
php artisan make:mail ResponseReminderMail
```

File:

```text
app/Mail/ResponseReminderMail.php
```

Example:

```php
class ResponseReminderMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public ChatResponseReminder $reminder
    ) {
    }

    public function build()
    {
        return $this->subject(
            'You have an unanswered chat message'
        )->view(
            'emails.chat.response-reminder'
        );
    }
}
```

---

# 22. Email Template

Create:

```text
resources/views/emails/chat/response-reminder.blade.php
```

Example content:

```blade
Hello {{ $reminder->user->name }},

You have an unanswered message in a chat conversation.

Please log in to the application to review and respond to the message.

Thank you.
```

The actual email design should follow the application's existing email templates.

---

# 23. Queue Configuration

The application must have a working Laravel Queue.

For example:

```env
QUEUE_CONNECTION=redis
```

or use the existing queue driver.

Start worker:

```bash
php artisan queue:work
```

For production, make sure the queue worker is permanently running using the application's existing deployment/process management approach.

---

# 24. Pusher Changes

No major Pusher changes are required.

Existing:

```text
Laravel
   ↓
Pusher
   ↓
Vue
```

continues as before.

The response reminder process is independent:

```text
Laravel
   ↓
Queue
   ↓
Email
```

Do not send the email from the Pusher/Vue event.

---

# 25. Vue Changes

The Vue application only needs changes to the **Settings UI**, if the Settings area is already exposed through Vue.

Example:

```text
Settings
 └── Notifications
       └── Chat Response Email

          Enable:
          [ ON ]

          Response time:
          [ 30 minutes ]
```

Vue sends the setting to the existing Settings API.

No client-side timer is required.

No email-related Pusher event is required.

---

# 26. API Changes

If the existing Settings API supports dynamic settings, no new endpoint may be necessary.

For example, existing:

```text
GET /api/settings
PUT /api/settings
```

can be extended with:

```json
{
    "response_email_notification_enabled": true,
    "response_email_notification_time": 30
}
```

If the application uses individual setting endpoints, follow the existing implementation.

---

# 27. Validation

Settings validation:

```php
$request->validate([
    'response_email_notification_enabled' => [
        'required',
        'boolean',
    ],

    'response_email_notification_time' => [
        'required_if:response_email_notification_enabled,true',
        'integer',
        'min:1',
    ],
]);
```

If only predefined timeout values are allowed:

```php
'response_email_notification_time' => [
    'required_if:response_email_notification_enabled,true',
    Rule::in([
        5,
        15,
        30,
        60,
        120,
    ]),
],
```

---

# 28. Important Edge Cases

## Case 1 – Notification disabled

```text
Setting = OFF
       ↓
Message received
       ↓
No reminder created
```

---

## Case 2 – User responds before timeout

```text
Message received
       ↓
Reminder created
       ↓
User responds
       ↓
Reminder = responded
       ↓
Queue job executes
       ↓
No email
```

---

## Case 3 – User does not respond

```text
Message received
       ↓
Reminder created
       ↓
Timeout reached
       ↓
Reminder still pending
       ↓
Send email
       ↓
status = sent
```

---

## Case 4 – Multiple messages

```text
Message 1
   ↓
Reminder version 1

Message 2
   ↓
Reminder version 2

Message 3
   ↓
Reminder version 3
```

Only version 3 should be valid.

---

## Case 5 – User sends multiple responses

Once the reminder is:

```text
responded
```

additional responses must not cause errors.

---

## Case 6 – User sends a message to themselves

If the application allows this, response reminder should not be created.

---

## Case 7 – Deleted conversation

If a conversation is deleted before the job runs:

```text
Job executes
   ↓
Reminder/conversation unavailable
   ↓
STOP
```

---

## Case 8 – User account disabled

Before sending the email, optionally check whether the user is active.

```php
if (!$user->is_active) {
    return;
}
```

Follow the application's existing user-status implementation.

---

## Case 9 – Email failure

Email delivery should be queued and Laravel's failed-job mechanism should be used.

Do not mark the reminder as successfully sent if the email operation fails.

For robust handling, consider updating `status = sent` only after the queued mail has successfully completed, or use a dedicated notification/email job whose success/failure lifecycle controls the reminder state.

---

# 29. Duplicate Email Protection

The implementation must prevent duplicate emails.

Before sending:

```php
if ($reminder->status !== 'pending') {
    return;
}
```

For stronger protection, use a database transaction/row lock:

```php
DB::transaction(function () use ($reminderId) {

    $reminder = ChatResponseReminder::query()
        ->whereKey($reminderId)
        ->lockForUpdate()
        ->first();

    if (!$reminder || $reminder->status !== 'pending') {
        return;
    }

    $reminder->update([
        'status' => 'sent',
        'email_sent_at' => now(),
    ]);

    // Queue/send email according to the application's email architecture.
});
```

This is useful when multiple queue workers could potentially process the same job.

---

# 30. Testing Plan

## Settings

### Test 1

```text
Notification = OFF
```

Send chat message.

Expected:

```text
No reminder
No email
```

### Test 2

```text
Notification = ON
Response time = 5 minutes
```

Send message.

Expected:

```text
Reminder created
due_at = current time + 5 minutes
```

---

# 31. Queue Job Tests

### Test 3 – No response

```text
Send message
Wait until timeout
```

Expected:

```text
Email sent
status = sent
email_sent_at != NULL
```

### Test 4 – User responds

```text
Send message
User responds before timeout
```

Expected:

```text
status = responded
No email
```

### Test 5 – Old queue job

```text
Message 1
version = 1

Message 2
version = 2

Run version 1 job
```

Expected:

```text
Version mismatch
Job exits
No email
```

---

# 32. Multiple Message Test

Test:

```text
10:00 Message 1
10:05 Message 2
10:10 Message 3
```

Expected:

```text
Only one pending reminder
Latest message_id = Message 3
Latest due_at = 10:40
```

Only one email should be generated if there is no response.

---

# 33. Pusher Regression Test

Verify that the new implementation does not affect existing Pusher functionality.

Test:

```text
User A sends message
       ↓
User B receives message instantly
```

Expected:

```text
Pusher functionality unchanged
```

---

# 34. Recommended Code Structure

```text
app/
│
├── Jobs/
│   └── SendResponseReminder.php
│
├── Mail/
│   └── ResponseReminderMail.php
│
├── Models/
│   └── ChatResponseReminder.php
│
├── Services/
│   └── ChatResponseReminderService.php
│
└── Events/
    └── MessageSent.php


database/
└── migrations/
    └── xxxx_xx_xx_create_chat_response_reminders_table.php


resources/
└── views/
    └── emails/
        └── chat/
            └── response-reminder.blade.php
```

Vue:

```text
resources/js/
└── components/
    └── Settings/
        └── ChatResponseNotification.vue
```

Use the project's existing directory/component structure if it differs.

---

# 35. Implementation Sequence

Implement in the following order.

### Step 1 – Existing Settings

Add:

```text
response_email_notification_enabled
response_email_notification_time
```

Update:

* Settings backend
* Settings API
* Vue Settings UI
* Validation

---

### Step 2 – Database

Create:

```text
chat_response_reminders
```

Run:

```bash
php artisan migrate
```

---

### Step 3 – Model

Create:

```text
ChatResponseReminder
```

Add relationships.

---

### Step 4 – Service

Create:

```text
ChatResponseReminderService
```

Implement:

```text
createReminder()
markAsResponded()
refreshReminder()
```

---

### Step 5 – Queue Job

Create:

```text
SendResponseReminder
```

Implement:

```text
load reminder
check version
check status
check due_at
send/queue email
update status
```

---

### Step 6 – Integrate With Chat Message

After successful message creation:

```text
Save message
   ↓
Pusher broadcast
   ↓
Mark sender's pending reminder as responded
   ↓
Create/update recipient's reminder
```

---

### Step 7 – Mailable

Create:

```text
ResponseReminderMail
```

and the corresponding Blade email template.

---

### Step 8 – Queue Worker

Verify the application's queue worker is running.

Example:

```bash
php artisan queue:work
```

---

### Step 9 – Test

Test:

```text
Settings OFF
Settings ON
Response before timeout
No response
Multiple messages
Multiple conversations
Old queue job
Duplicate job
Email failure
Pusher functionality
```

---

# 36. Final Expected Flow

```text
                    USER A
                       |
                       | Sends Message
                       v
                 Laravel API
                       |
                       v
                Save Chat Message
                       |
             +---------+---------+
             |                   |
             v                   v
          Pusher             Reminder Service
             |                   |
             v                   v
          USER B          Check User Settings
                                 |
                          Notification ON?
                            /          \
                          NO            YES
                          |              |
                         STOP            v
                                  Create Reminder
                                        |
                                        v
                                  Laravel Queue
                                        |
                                  Wait configured time
                                        |
                                        v
                                  Check Reminder
                                        |
                              +---------+---------+
                              |                   |
                         Responded            Pending
                              |                   |
                             STOP                  v
                                           Send Email
                                                 |
                                                 v
                                           status = sent
```

# 37. Definition of Done

The feature is considered complete when:

* [ ] Existing Settings area contains the response email notification setting.
* [ ] User can enable/disable the notification.
* [ ] User can configure the response timeout.
* [ ] A reminder is created when a message requires a response.
* [ ] Laravel Queue handles the delayed processing.
* [ ] Vue does not manage the response timer.
* [ ] Pusher continues to work as before.
* [ ] User response cancels/completes the pending reminder.
* [ ] No email is sent when the user responds within the configured time.
* [ ] Email is sent when the configured response time expires without a response.
* [ ] Multiple messages do not generate multiple unnecessary emails.
* [ ] Old queued jobs cannot send duplicate emails.
* [ ] Duplicate email protection is implemented.
* [ ] Failed email processing is handled by Laravel's queue mechanism.
* [ ] Unit/feature tests cover the main scenarios.
* [ ] Production queue worker is configured and running.

# 38. Recommended Approach

The recommended architecture is:

```text
Existing Settings
       +
Chat Message
       +
Response Reminder Table
       +
Laravel Queue
       +
Laravel Mailable
       +
Existing Pusher
```

**Do not modify the existing Pusher architecture to implement the email timer.**

Pusher should remain responsible for real-time chat updates, while **Laravel Queue + database reminder tracking** should be responsible for delayed response notifications.
