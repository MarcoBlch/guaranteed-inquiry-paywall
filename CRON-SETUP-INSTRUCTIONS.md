# Setting Up Deadline Reminder Cron Job

## Problem
Deadline reminder emails are never sent because there's no automatic schedule configured.

## Solution
Set up a cron job using Supabase's `pg_cron` extension to call `send-deadline-reminders` every 30 minutes.

---

## Option 1: Using Supabase Dashboard (Easiest) ✅

### Step 1: Access Cron Jobs in Dashboard

1. Go to **Supabase Dashboard** → **Integrations** (left sidebar)
2. Look for **Cron** or **Scheduled Jobs**
3. Click "Create a new cron job" or similar button

### Step 2: Configure the Job

If you have a UI form, fill in:
- **Name**: `send-deadline-reminders-every-30-min`
- **Schedule**: `*/30 * * * *` (every 30 minutes)
- **Type**: HTTP Request / Edge Function
- **URL**: `https://znncfayiwfamujvrprvf.supabase.co/functions/v1/send-deadline-reminders`
- **Method**: POST
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer YOUR_SERVICE_ROLE_KEY`
- **Body** (optional): `{"time": "now"}`

### Step 3: Save and Test

- Save the cron job
- Wait 30 minutes for first execution
- Check logs to verify it ran successfully

---

## Option 2: Using SQL Editor (More Control) ✅

### Step 1: Get Your Service Role Key

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Copy the **service_role** key (secret) - it's a very long JWT token
3. Keep this safe - you'll need it in Step 3

### Step 2: Enable Extensions

Go to **Database** → **Extensions** and enable:
- ✅ **pg_cron** - for scheduling
- ✅ **pg_net** - for HTTP requests
- ✅ **vault** (supabase_vault) - for secure credential storage

### Step 3: Run Setup SQL

Go to **SQL Editor** and run this SQL (replace `YOUR_SERVICE_ROLE_KEY`):

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Store credentials in Vault (ONE TIME ONLY)
SELECT vault.create_secret('https://znncfayiwfamujvrprvf.supabase.co', 'supabase_url');
SELECT vault.create_secret('YOUR_SERVICE_ROLE_KEY_HERE', 'service_role_key');

-- Schedule the deadline reminder function
SELECT cron.schedule(
  'send-deadline-reminders-every-30-min',
  '*/30 * * * *', -- Every 30 minutes
  $$
    SELECT net.http_post(
      url:= (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
            || '/functions/v1/send-deadline-reminders',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body:=jsonb_build_object('time', now())
    ) AS request_id;
  $$
);
```

### Step 4: Verify Setup

```sql
-- Check if cron job was created
SELECT * FROM cron.job WHERE jobname = 'send-deadline-reminders-every-30-min';

-- After 30 minutes, check execution history
SELECT *
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-deadline-reminders-every-30-min')
ORDER BY start_time DESC
LIMIT 5;
```

---

## Cron Schedule Syntax

```
*/30 * * * *
│   │ │ │ │
│   │ │ │ └─── Day of week (0-7, 0 and 7 are Sunday)
│   │ │ └───── Month (1-12)
│   │ └─────── Day of month (1-31)
│   └───────── Hour (0-23)
└─────────────  Minute (0-59)
```

**Examples:**
- `*/30 * * * *` - Every 30 minutes
- `0 */2 * * *` - Every 2 hours (on the hour)
- `0 9,17 * * *` - At 9 AM and 5 PM every day
- `0 12 * * 1-5` - At noon, Monday through Friday

---

## How Reminders Work

1. **Trigger**: Cron job runs every 30 minutes
2. **Check**: Function queries all `held` escrow transactions
3. **Calculate**: For each transaction, checks if 50% of deadline has passed
4. **Send**: If yes AND no reminder sent yet, sends reminder email via Postmark
5. **Log**: Records in `email_logs` table with type `deadline_reminder`

**Example Timeline:**
- Payment made: Nov 13, 11:00 PM (24-hour deadline)
- 50% mark: Nov 14, 11:00 AM (12 hours later)
- Cron runs: Nov 14, 11:00 AM or 11:30 AM
- Reminder sent: ✅

---

## Testing the Cron Job

### Manual Test (Before Waiting 30 Minutes)

```bash
curl -X POST \
  'https://znncfayiwfamujvrprvf.supabase.co/functions/v1/send-deadline-reminders' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

**Expected response:**
```json
{
  "success": true,
  "reminders_sent": 0,
  "reminders_skipped": 1,
  "errors": 0,
  "total_checked": 1
}
```

- `reminders_sent`: How many reminders were actually sent
- `reminders_skipped`: Transactions not yet at 50% mark OR already sent
- `errors`: Failed processing
- `total_checked`: Total held transactions examined

---

## Troubleshooting

### Cron Job Not Running

1. Check if extensions are enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');
   ```

2. Check cron job status:
   ```sql
   SELECT * FROM cron.job;
   ```

3. Check execution logs:
   ```sql
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
   ```

### Reminders Not Sending

1. Check function logs in Supabase Dashboard → Edge Functions → send-deadline-reminders → Logs
2. Verify `POSTMARK_SERVER_TOKEN` is set correctly
3. Run manual test (curl command above)
4. Check if transactions are at 50% mark with our diagnostic query

### Check if Reminder Already Sent

```sql
SELECT * FROM email_logs WHERE email_type = 'deadline_reminder' ORDER BY sent_at DESC LIMIT 10;
```

---

## About the Nov 13 Payment

Your Nov 13 payment (`initial_email_sent = 0`) failed because functions weren't redeployed after the token update.

**Options to fix:**
1. **Do nothing** - The reminder will eventually be sent (if it reaches 50% mark)
2. **Manual trigger** - See section below

### Manually Send Missing Email

If you want to resend the initial email for the Nov 13 payment:

```sql
-- Get the details
SELECT
  message_id,
  recipient_user_id,
  sender_email,
  amount,
  expires_at
FROM escrow_transactions
WHERE id = 'c2162de4-06a2-4f21-8c02-e92e60db0438';

-- Then call postmark-send-message Edge Function with those details
-- (This would need to be done via code or manually)
```

Or just wait - when the reminder cron runs at the 50% mark, the recipient will be notified.

---

## Summary

1. ✅ **Enable extensions**: pg_cron, pg_net, vault
2. ✅ **Store credentials**: Supabase URL and service role key in vault
3. ✅ **Create cron job**: Schedule to run every 30 minutes
4. ✅ **Verify**: Check cron.job table
5. ✅ **Test**: Wait 30 minutes or run manual test
6. ✅ **Monitor**: Check email_logs for reminder emails

After setup, reminders will automatically send when transactions reach the 50% deadline mark!
