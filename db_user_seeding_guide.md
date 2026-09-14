# DB Seeding & Test User Credentials Guide

This guide details the procedure for seeding test users, credentials, and property contact relations after importing a fresh database dump.

---

## 1. Test User Credentials

| User Type | Email Address | Password | Role | User ID | Contact ID | Browser Context |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Sender** | `sender.test@myleaseaudit.com` | `Password123!` | Company Admin / Auditor (Role 3) | `924` | `832` | Normal Window |
| **Receiver** | `abdul.aziz@cubettech.com` | `Password123!` | Client Contact (Role 4) | `925` | `834` | Incognito Window |
| **Receiver (Alias)** | `abdul.aziz@cubettech.com.com` | `Password123!` | Client Contact (Role 4) | — | — | Alternate Login |

---

## 2. Automated DB Seeding Script

Run the following command inside the `/home/c864/Projects/mylease/backend` directory to seed/update the users, set passwords to `Password123!`, activate email verification, and link contact relations:

```bash
docker compose exec -T app php -r "
require 'vendor/autoload.php';
\$app = require_once 'bootstrap/app.php';
\$kernel = \$app->make(Illuminate\Contracts\Console\Kernel::class);
\$kernel->bootstrap();

use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

\$passwordHash = Hash::make('Password123!');

// 1. Seed / Update Sender User (sender.test@myleaseaudit.com)
\$senderUser = DB::table('users')->where('email', 'sender.test@myleaseaudit.com')->first();
if (!\$senderUser) {
    \$senderId = DB::table('users')->insertGetId([
        'first_name' => 'Sender',
        'last_name' => 'Test',
        'email' => 'sender.test@myleaseaudit.com',
        'password' => \$passwordHash,
        'role_id' => '3',
        'company_id' => 232,
        'status' => '1',
        'email_verified_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
} else {
    \$senderId = \$senderUser->id;
    DB::table('users')->where('id', \$senderId)->update([
        'password' => \$passwordHash,
        'status' => '1',
        'email_verified_at' => now(),
        'updated_at' => now(),
    ]);
}

// 2. Seed / Update Receiver User (abdul.aziz@cubettech.com)
\$receiverUser = DB::table('users')->where('email', 'abdul.aziz@cubettech.com')->first();
if (!\$receiverUser) {
    \$receiverId = DB::table('users')->insertGetId([
        'first_name' => 'Receiver',
        'last_name' => 'Test',
        'email' => 'abdul.aziz@cubettech.com',
        'password' => \$passwordHash,
        'role_id' => '4',
        'company_id' => 232,
        'status' => '1',
        'email_verified_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
} else {
    \$receiverId = \$receiverUser->id;
    DB::table('users')->where('id', \$receiverId)->update([
        'password' => \$passwordHash,
        'status' => '1',
        'email_verified_at' => now(),
        'updated_at' => now(),
    ]);
}

// 3. Seed / Update Alias Receiver (abdul.aziz@cubettech.com.com)
\$receiverDoubleUser = DB::table('users')->where('email', 'abdul.aziz@cubettech.com.com')->first();
if (!\$receiverDoubleUser) {
    DB::table('users')->insert([
        'first_name' => 'Receiver',
        'last_name' => 'Test',
        'email' => 'abdul.aziz@cubettech.com.com',
        'password' => \$passwordHash,
        'role_id' => '4',
        'company_id' => 232,
        'status' => '1',
        'email_verified_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
} else {
    DB::table('users')->where('id', \$receiverDoubleUser->id)->update([
        'password' => \$passwordHash,
        'status' => '1',
        'email_verified_at' => now(),
        'updated_at' => now(),
    ]);
}

// 4. Create / Update Contacts entries
DB::table('contacts')->updateOrInsert(
    ['email_address' => 'sender.test@myleaseaudit.com'],
    [
        'name' => 'Sender Test',
        'title' => 'Auditor',
        'company_id' => 232,
        'contact_role_id' => 1,
        'is_active' => 1,
        'updated_at' => now()
    ]
);
\$senderContact = DB::table('contacts')->where('email_address', 'sender.test@myleaseaudit.com')->first();

DB::table('contacts')->updateOrInsert(
    ['email_address' => 'abdul.aziz@cubettech.com'],
    [
        'name' => 'Receiver Test',
        'title' => 'Client Contact',
        'company_id' => 232,
        'contact_role_id' => 2,
        'is_active' => 1,
        'updated_at' => now()
    ]
);
\$receiverContact = DB::table('contacts')->where('email_address', 'abdul.aziz@cubettech.com')->first();

DB::table('contacts')->updateOrInsert(
    ['email_address' => 'abdul.aziz@cubettech.com.com'],
    [
        'name' => 'Receiver Test',
        'title' => 'Client Contact',
        'company_id' => 232,
        'contact_role_id' => 2,
        'is_active' => 1,
        'updated_at' => now()
    ]
);

// 5. Link Contacts to Locations and Audits
\$locations = DB::table('location')->limit(10)->get();
\$audits = DB::table('audits')->limit(10)->get();

foreach ([\$senderContact->id, \$receiverContact->id] as \$cid) {
    foreach (\$locations as \$loc) {
        DB::table('property_contacts_relations')->updateOrInsert(
            ['contact_id' => \$cid, 'assigned_type' => 'location', 'assigned_type_id' => \$loc->id],
            ['created_at' => now(), 'updated_at' => now()]
        );
    }
    foreach (\$audits as \$aud) {
        DB::table('property_contacts_relations')->updateOrInsert(
            ['contact_id' => \$cid, 'assigned_type' => 'audit', 'assigned_type_id' => \$aud->id],
            ['created_at' => now(), 'updated_at' => now()]
        );
    }
}

echo 'DONE: Users & Contacts seeded successfully.' . PHP_EOL;
"
```

---

## 3. Testing Workflow

1. **Normal Browser Window**:
   - Navigate to `http://localhost:3000/login` (or `http://192.168.112.2:3000/login`).
   - Log in with `sender.test@myleaseaudit.com` / `Password123!`.
   - Open a discussion or audit thread and post a message or `@mention` `Receiver Test`.

2. **Incognito Browser Window**:
   - Open an Incognito window and navigate to `http://localhost:3000/login`.
   - Log in with `abdul.aziz@cubettech.com` / `Password123!`.
   - Open the discussion drawer or Discussions Listing page to test realtime message delivery and unread count badges.
