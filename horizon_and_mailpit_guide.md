# Horizon & Mailpit User Guide

This guide provides an overview, usage instructions, configuration rules, and troubleshooting steps for **Laravel Horizon** (queue manager) and **Mailpit** (local email inbox) in the MyLeaseAudit application.

---

## 1. Overview & Architecture

- **Laravel Horizon**: Manages background Redis queues, delayed jobs, retries, and job metrics for real-time notification reminders.
- **Mailpit**: A lightweight SMTP server and web interface that intercepts all outgoing development emails so you can test email delivery safely without sending real emails.
- **Chat Response Reminder System**: When messages are created in audit discussions, delayed queue jobs (`SendResponseReminder`) are dispatched to Horizon. If the assigned Auditor or mentioned Project Manager does not respond within the configured timeframe, Horizon triggers the job and dispatches the email via Mailpit.

---

## 2. Dashboard Access

| Service | Access URL | Description |
| :--- | :--- | :--- |
| **Laravel Horizon** | [http://localhost:8080/horizon](http://localhost:8080/horizon) | Dashboard for monitoring active workers, pending jobs, delayed jobs, throughput, and failed jobs. |
| **Mailpit Web UI** | [http://localhost:8025](http://localhost:8025) | Web interface to view, inspect, and search intercepted reminder emails. |

---

## 3. Essential Docker & CLI Commands

All command-line operations run through the Docker container environment:

### Horizon Commands

- **Check Horizon Status**:
  ```bash
  docker exec myleaseaudit_app php artisan horizon:status
  ```

- **Restart Horizon (Required after code / `.env` changes)**:
  *Because Horizon processes run in persistent PHP memory, always restart after editing Mailables, Jobs, or environment configurations.*
  ```bash
  docker exec myleaseaudit_app php artisan horizon:terminate
  # OR restart the container directly:
  docker restart myleaseaudit_horizon
  ```

- **Pause / Continue Horizon Queue Execution**:
  ```bash
  # Pause Horizon processing
  docker exec myleaseaudit_app php artisan horizon:pause

  # Resume Horizon processing
  docker exec myleaseaudit_app php artisan horizon:continue
  ```

- **View Live Horizon Logs**:
  ```bash
  docker logs -f myleaseaudit_horizon
  ```

---

### Mailpit & Mail Commands

- **Test Mail Delivery via PHP CLI**:
  ```bash
  docker exec myleaseaudit_app php artisan mail:send
  ```

- **View Mailpit Container Logs**:
  ```bash
  docker logs -f myleaseaudit_mailpit
  ```

---

## 4. Chat Response Reminder Rules & Workflow

### Notification Delivery Logic

1. **Project Manager (`role_id: 5`)**:
   - Receives a reminder email **ONLY** if explicitly `@mentioned` in the chat message (e.g. `@[John Doe](484)`).
2. **Assigned Auditors (`role_id: 4`)**:
   - All Auditors assigned to the Audit or Location receive a reminder email **AUTOMATICALLY** whenever a message is posted, regardless of whether they are mentioned.

### Job Lifecycle in Horizon

```
[Chat Message Posted] 
       │
       ▼
[Dispatch SendResponseReminder Job (Status: 'pending')] 
       │
       ▼
[Job sits in Horizon "Delayed Jobs" for configured delay (e.g., 15 mins)]
       │
       ├───────────────────────────────────────────┐
       ▼                                           ▼
[Recipient Replies in Chat Thread]         [No Reply Before Timer Expires]
       │                                           │
       ▼                                           ▼
[DB Reminder Status -> 'responded']       [Horizon Executes Job]
       │                                           │
       ▼                                           ▼
[Horizon Executes Job: Sees 'responded']  [Horizon Sends Email via Mailpit]
[SKIPS EMAIL DISPATCH]                     [INBOX: http://localhost:8025]
```

---

## 5. System Configuration (UI Settings)

You can manage response reminder settings directly from the web interface at `/usersettings` under **System Configurations**:

- `chat_response_reminder_enabled` (Default: `true`): Toggles the entire email reminder queue on/off.
- `chat_response_reminder_time` (Default: `15`): Time in minutes before a reminder email is dispatched.
- `chat_response_reminder_max_reminders` (Default: `1`): Maximum number of reminders sent per un-responded message thread.

---

## 6. End-to-End Testing Walkthrough

1. Open **Mailpit** at `http://localhost:8025` and **Horizon** at `http://localhost:8080/horizon`.
2. Navigate to an Audit discussion thread in the application.
3. Post a message mentioning a Project Manager (e.g. `@[PM Name](ID)`).
4. Go to **Horizon Dashboard -> Delayed Jobs**:
   - You will see `App\Jobs\SendResponseReminder` listed with the delay timestamp.
5. **Scenario A (No Response)**: Wait for timer expiration (or temporarily lower `chat_response_reminder_time` in `/usersettings`). The job completes, and the email appears in Mailpit inbox.
6. **Scenario B (With Response)**: Post a reply in the chat thread before timer expiration. When the timer expires, Horizon runs the job, verifies `status = 'responded'`, and skips sending the email cleanly.

---

## 7. Troubleshooting

- **Emails not appearing in Mailpit?**
  1. Verify Horizon is running: `docker exec myleaseaudit_app php artisan horizon:status`.
  2. Check backend `.env` mail configuration:
     - `MAIL_MAILER=smtp`
     - `MAIL_HOST=myleaseaudit_mailpit`
     - `MAIL_PORT=1025`
  3. Check Horizon metrics/failed jobs tab at `http://localhost:8080/horizon/failed`.
- **Code changes not reflected in emails?**
  - Run `docker exec myleaseaudit_app php artisan horizon:terminate` to refresh Horizon's PHP memory cache.
