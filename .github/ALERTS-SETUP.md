# GitHub Actions Alerts Setup Guide

This guide explains how to set up Discord webhook notifications for critical GitHub Actions workflows.

## Why Alerts Matter

Your workflows monitor critical financial operations:
- **Daily Reconciliation** (9 AM UTC daily) - Detects payment discrepancies, stuck funds, fraud patterns
- **Escrow Timeout Check** (Every 10 minutes) - Processes refunds for unresponded messages

**Without alerts**, failures can go unnoticed for hours/days, causing:
- Unprocessed refunds → angry customers
- Undetected payment issues → revenue loss
- Regulatory/compliance risks

## Discord Webhook Setup (5 minutes)

### 1. Create Discord Webhook

1. Open your Discord server
2. Go to **Server Settings** → **Integrations** → **Webhooks**
3. Click **New Webhook**
4. Name it: `FastPass Alerts`
5. Choose a channel (e.g., `#alerts` or `#monitoring`)
6. Click **Copy Webhook URL**

Example URL format:
```
https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz
```

### 2. Add Secret to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `DISCORD_WEBHOOK_URL`
5. Value: Paste your Discord webhook URL
6. Click **Add secret**

### 3. Verify Setup

**Option A: Wait for next scheduled run**
- Daily reconciliation: 9 AM UTC
- Escrow timeout: Every 10 minutes

**Option B: Trigger manually** (recommended)
1. Go to **Actions** tab in GitHub
2. Select **Daily Reconciliation** workflow
3. Click **Run workflow** → **Run workflow**
4. Check Discord for success/failure notification

## Alert Types

### 🚨 Critical Failure (Red)
**Trigger**: Workflow execution failed
**Example**: API timeout, authentication error, Edge Function not deployed

```
Title: 🚨 Daily Reconciliation Failed
Description: The daily reconciliation job encountered an error and failed to complete.
Fields:
  - Workflow: Daily Reconciliation
  - Run ID: 12345678
  - Action: [View Logs](link)
```

### ⚠️ Issues Detected (Orange)
**Trigger**: Reconciliation found problems (refund rate >30%, failed transfers, stuck transactions)

```
Title: ⚠️ Daily Reconciliation - Issues Found
Description: Issues detected in reconciliation for 2025-11-06
Fields:
  - Refund Rate: 45.2%
  - Issues Count: 3
  - Issues:
      ⚠️ 5 failed transfers totaling €500.00
      ⚠️ 2 transactions stuck in 'processing' status
      🚨 High refund rate: 45.2% (15/33)
```

### ✅ Success (No notification)
Workflows succeed silently to avoid noise. Failures always notify.

## Troubleshooting

### "Webhook not found" error
- Webhook URL in GitHub secret is incorrect or expired
- Regenerate webhook in Discord and update GitHub secret

### No notifications received
1. Verify secret name is exactly: `DISCORD_WEBHOOK_URL`
2. Check workflow logs for curl errors
3. Test webhook manually:
   ```bash
   curl -X POST "YOUR_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{"content": "Test message from FastPass"}'
   ```

### Notifications too noisy
- Daily reconciliation only alerts on failures or issues (refund rate >30%, failed transfers)
- Escrow timeout only alerts on complete workflow failure
- Successful runs are silent

## Alternative Notification Methods

### Slack
Replace Discord webhook with Slack Incoming Webhook:
1. Create Slack App → Enable Incoming Webhooks
2. Add to your workspace → Copy webhook URL
3. Replace `DISCORD_WEBHOOK_URL` secret with Slack URL
4. Update workflow JSON payload format (Discord embeds → Slack blocks)

### Email
Use a service like [Mailgun](https://www.mailgun.com/) or [SendGrid](https://sendgrid.com/):
```bash
curl -X POST "https://api.mailgun.net/v3/YOUR_DOMAIN/messages" \
  -F from="alerts@fastpass.email" \
  -F to="your-email@example.com" \
  -F subject="Workflow Failed" \
  -F text="Details..."
```

### PagerDuty (for on-call teams)
For 24/7 monitoring with escalation:
1. Create PagerDuty integration
2. Replace curl with PagerDuty Events API
3. Configure on-call schedule

## Best Practices

1. **Test alerts immediately** - Don't wait for real failures
2. **Create dedicated channel** - Avoid mixing with general chat
3. **Document response procedures** - What to do when alert fires
4. **Monitor alert frequency** - Too many = alert fatigue
5. **Set up escalation** - Who gets notified if primary contact unavailable?

## Next Steps

After setting up basic alerts, consider:
- [ ] Add application-level monitoring (Sentry, DataDog)
- [ ] Set up Supabase Function logs monitoring
- [ ] Configure Stripe webhook failure alerts
- [ ] Implement uptime monitoring (UptimeRobot, Pingdom)

---

**Need Help?**
Check GitHub Actions logs: `Actions` tab → Select workflow → View run details
