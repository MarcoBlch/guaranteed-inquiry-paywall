# GitHub Actions Already Set Up! 🎉

## Discovery

You **already have** deadline reminders configured in GitHub Actions!

File: `.github/workflows/escrow-timeout-check.yml`
- ✅ Runs every 10 minutes (more frequent than the 30 minutes we planned)
- ✅ Calls `send-deadline-reminders` Edge Function
- ✅ Calls `check-escrow-timeouts` Edge Function
- ✅ Has error notifications via Discord webhook

## Why Reminders Aren't Working

Three possible reasons:

### 1. Workflow is Disabled
### 2. GitHub Secrets Not Configured
### 3. Workflow Has Errors

---

## Step 1: Check if Workflow is Enabled

1. Go to your GitHub repository: https://github.com/MarcoBlch/guaranteed-inquiry-paywall
2. Click on **Actions** tab (top menu)
3. Look for **"Check Escrow Timeouts"** workflow in the left sidebar
4. Check its status:
   - ✅ **Green dot** = Enabled and running
   - ⚪ **Gray dot** = Disabled
   - 🔴 **Red dot** = Enabled but failing

### If Disabled:
1. Click on the workflow name
2. Click "Enable workflow" button (if present)

---

## Step 2: Check GitHub Secrets

The workflow needs these secrets to work:

1. Go to: **Settings** → **Secrets and variables** → **Actions**
2. Verify these Repository secrets exist:
   - ✅ `SUPABASE_URL` = `https://znncfayiwfamujvrprvf.supabase.co`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` = Your service role key (long JWT token)
   - ⚠️ `DISCORD_WEBHOOK_URL` = Optional (for error notifications)

### To Add/Update Secrets:
1. Click "New repository secret" or edit existing
2. Name: `SUPABASE_URL`
3. Value: `https://znncfayiwfamujvrprvf.supabase.co`
4. Click "Add secret"

Repeat for `SUPABASE_SERVICE_ROLE_KEY`:
1. Get key from: Supabase Dashboard → Settings → API → service_role (secret)
2. Add as secret in GitHub

---

## Step 3: Check Workflow Execution Logs

1. Go to **Actions** tab
2. Click on **"Check Escrow Timeouts"** workflow
3. Look at recent runs:
   - **Green checkmark** ✅ = Success
   - **Red X** ❌ = Failed
   - **Yellow dot** 🟡 = Running
   - **Gray circle** ⚪ = Skipped/Disabled

### If you see failures:
1. Click on a failed run
2. Click on "check-timeouts" job
3. Expand the "Send Deadline Reminders" step
4. Read the error message

### Common errors:
- `401 Unauthorized` = `SUPABASE_SERVICE_ROLE_KEY` is missing or wrong
- `404 Not Found` = `SUPABASE_URL` is wrong or function doesn't exist
- `500 Internal Server Error` = Edge Function has a bug (check Supabase logs)

---

## Step 4: Manual Test

Trigger the workflow manually to test:

1. Go to **Actions** tab
2. Click **"Check Escrow Timeouts"** workflow
3. Click "Run workflow" dropdown (top right)
4. Select branch: `main`
5. Click "Run workflow" button
6. Wait ~30 seconds
7. Refresh page - you should see the run appear
8. Click on it to see results

---

## Step 5: Verify Reminder Function Works

The workflow calls this URL every 10 minutes:
```
https://znncfayiwfamujvrprvf.supabase.co/functions/v1/send-deadline-reminders
```

Test it manually:
```bash
curl -X POST \
  'https://znncfayiwfamujvrprvf.supabase.co/functions/v1/send-deadline-reminders' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Expected response:
```json
{
  "success": true,
  "reminders_sent": 0,
  "reminders_skipped": 1,
  "errors": 0,
  "total_checked": 1
}
```

---

## Timeline Analysis for Your Nov 13 Payment

Based on your query results:
- **Payment made**: Nov 13, 11:37 PM
- **Deadline**: Nov 14, 11:37 PM (24 hours)
- **50% mark (reminder time)**: Nov 14, 11:37 AM
- **Current time**: ~10:58 AM (when we ran the query)

**Status**: "NO - Not yet at 50% mark"

The workflow will trigger a reminder in **~40 minutes** (next 10-minute interval after 11:37 AM).

---

## Expected Behavior Going Forward

If GitHub Actions is enabled and secrets are configured:

1. **Every 10 minutes**: Workflow runs
2. **Checks all held transactions**: Queries database
3. **For each transaction at 50% deadline**: Sends reminder email
4. **Logs in email_logs**: Records email with type `deadline_reminder`
5. **Only sends once**: Checks if reminder already sent before sending

---

## Debugging Checklist

- [ ] Workflow is enabled in GitHub Actions
- [ ] `SUPABASE_URL` secret is set correctly
- [ ] `SUPABASE_SERVICE_ROLE_KEY` secret is set correctly
- [ ] Recent workflow runs show success (green checkmark)
- [ ] Manual trigger works without errors
- [ ] Function responds correctly when tested with curl
- [ ] Postmark token is valid (we already verified this ✅)

---

## Why This is Better Than pg_cron

✅ **Easier to debug**: View logs directly in GitHub
✅ **No database setup**: No extensions needed
✅ **Familiar interface**: GitHub UI vs SQL
✅ **Already configured**: Just needs to be enabled
✅ **Error notifications**: Discord webhook support
✅ **Free**: GitHub Actions has generous free tier
✅ **Manual triggering**: Easy to test

---

## Next Steps

1. **Check Actions tab** - See if workflow is enabled
2. **Verify secrets** - Ensure SUPABASE_URL and SERVICE_ROLE_KEY are set
3. **Run manual test** - Trigger workflow manually
4. **Wait for 11:40 AM** - Reminder should fire for your Nov 13 payment
5. **Check email_logs** - Query to see if reminder was sent

```sql
SELECT * FROM email_logs
WHERE email_type = 'deadline_reminder'
AND message_id = '2f03fc69-eb91-4e5f-b05c-bada50c197ad'
ORDER BY sent_at DESC;
```

---

## Summary

**You don't need to set up pg_cron!**

Your GitHub Actions workflow is already configured to send reminders every 10 minutes. Just need to:
1. Enable the workflow (if disabled)
2. Verify GitHub secrets are set
3. Check execution logs for any errors

The reminder for your Nov 13 payment should fire automatically around 11:40 AM today!
