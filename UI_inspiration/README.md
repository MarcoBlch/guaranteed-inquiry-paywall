# UI Inspiration & Debug Screenshots

This folder contains screenshots documenting UI/UX inspiration, debugging sessions, and system behavior for the FastPass escrow payment platform.

## Recent Screenshots (Nov 20, 2025)

### Transaction Recovery & Stripe Issues Documentation

These screenshots were captured during the investigation and resolution of stuck transactions and Stripe integration issues:

---

### 1. **Capture d'écran 2025-11-20 115924.png**
**Stripe Balance Dashboard**

**What it shows:**
- Platform Stripe account balance and recent activity
- Recent transactions including €10 top-up and €1.50 refund
- Climate contribution payments visible
- Balance activity over time

**Context:**
- Demonstrates the platform's Stripe Connect balance management
- Shows successful top-up operation needed for transfers
- Documents refund processing capabilities

**Relevant Issue:** Platform balance management for escrow transfers

---

### 2. **Capture d'écran 2025-11-20 120313.png**
**Stripe Webhook Performance - Critical Failure Rate**

**What it shows:**
- Webhook endpoint: `we_1ST1e0RslzVtFaJlJGflQGI6`
- **29 total events, 28 failed (96% failure rate)** 🚨
- Average response time: 597ms
- Target function: `stripe-connect-webhook`

**Context:**
- **CRITICAL BUG**: Nearly all webhooks were failing before Nov 19 fix
- Root cause: Synchronous `constructEvent` in Supabase Edge Functions environment
- Fix: Switched to `constructEventAsync` (commit 8f6dc76)

**Resolution:**
- Webhook async signature verification implemented
- Idempotency protection added
- Failure rate should drop significantly after deployment

**Relevant Commit:** `8f6dc76` - "fix: async webhook signature verification"

---

### 3. **Capture d'écran 2025-11-20 120326.png**
**Stripe Webhook - Backup Endpoint**

**What it shows:**
- Alternative webhook configuration: "elegant-spark-thin"
- 0 events processed (backup/test endpoint)
- Thin payload style configuration

**Context:**
- Demonstrates webhook configuration testing
- Used for comparison with main webhook endpoint
- Shows alternative webhook setup patterns

---

### 4. **Capture d'écran 2025-11-20 120343.png**
**Stripe Event Log - Top-up Success**

**What it shows:**
- Successful `topup.succeeded` event
- €10 top-up completed on Nov 19, 2025
- Complete JSON payload structure visible
- Event ID and API version documented

**Context:**
- Demonstrates successful Stripe balance top-up operation
- Shows Stripe event structure and payload format
- Documents working integration with Stripe Events API

**Relevant Issue:** Platform balance funding for escrow transfers

---

### 5. **Capture d'écran 2025-11-20 120415.png**
**Stripe API Logs - Refund Errors Before Fix**

**What it shows:**
- Multiple **400 ERR** responses on `/v1/refunds` endpoint
- One successful **200 OK** refund at 3:28 PM
- Failed POST to `/v1/transfers` endpoint (400 ERR)

**Context:**
- **BUG DOCUMENTED**: Refund requests failing with invalid reason parameter
- Original code used `reason: 'expired'` (invalid)
- Stripe only accepts: `duplicate`, `fraudulent`, or `requested_by_customer`

**Resolution:**
- Fixed in `check-escrow-timeouts/index.ts` line 209
- Changed to `reason: 'requested_by_customer'`
- Transfer failures due to insufficient platform balance (separate issue)

**Relevant Commits:**
- `8f6dc76` - Stripe refund reason fix
- Related issue: Platform balance for transfers

---

### 6. **Capture d'écran 2025-11-20 120425.png**
**Transfer Error - Insufficient Funds**

**What it shows:**
- **400 ERR** on POST `/v1/transfers`
- Error code: `balance_insufficient`
- Error message: "You have insufficient funds in your Stripe account"
- IP address: 90.100.37.54 (request origin)

**Context:**
- **ROOT CAUSE**: Platform auto-payouts enabled, funds sent to bank before transfers
- Transfer attempt: €1.13 (75% of €1.50 transaction)
- Platform balance: €0.00 at time of transfer

**Solutions Implemented:**
1. Disable auto-payouts → Use manual payout schedule
2. Fund platform account with sufficient balance
3. Keep funds in Stripe for recipient transfers

**Relevant Documentation:**
- Escrow flow requires platform to hold funds temporarily
- 75/25 split: 75% to recipient, 25% platform fee
- Funds must stay in platform account to enable transfers

**Recommendation:** Switch to manual payouts for escrow platforms

---

## Key Insights from Screenshots

### Critical Bugs Identified:

1. **Webhook Signature Verification** (96% failure rate)
   - Synchronous crypto operations in async environment
   - Fixed with `constructEventAsync`

2. **Invalid Refund Reason** (400 errors on refunds)
   - Used `'expired'` instead of Stripe-approved reasons
   - Fixed with `'requested_by_customer'`

3. **Insufficient Platform Balance** (transfer failures)
   - Auto-payouts prevented funds from staying for transfers
   - Requires manual payout configuration

4. **INNER JOIN Bug** (not shown in screenshots but discovered during investigation)
   - Transactions without `message_responses` records invisible to cron job
   - Fixed with LEFT JOIN and null-safe filtering

### System Architecture Lessons:

- **Escrow platforms need manual payouts** to keep funds available
- **Webhook async operations** required in Supabase Edge Functions
- **Stripe API validation** is strict on enumerated parameters
- **Error logging** via screenshots invaluable for debugging production issues

---

## Screenshot Naming Convention

Screenshots follow the format: `Capture d'écran YYYY-MM-DD HHMMSS.png`

Examples:
- `2025-11-20 115924` = Nov 20, 2025 at 11:59:24 AM
- `2025-11-20 120415` = Nov 20, 2025 at 12:04:15 PM

---

## Related Documentation

- **CLAUDE.md** - Project overview and development guide
- **CRON-SETUP-INSTRUCTIONS.md** - GitHub Actions cron configuration
- **GITHUB-ACTIONS-TROUBLESHOOTING.md** - Debugging cron jobs
- **POSTMARK-FIXES.md** - Email service integration fixes

---

## Future Screenshots

When adding new screenshots:

1. **Name clearly** - Use descriptive filenames or follow timestamp convention
2. **Document context** - Update this README with what the screenshot shows
3. **Link to issues** - Reference commit hashes or GitHub issues
4. **Explain resolution** - Note how the issue was fixed
5. **Add date** - Include capture date for timeline tracking

---

**Last Updated:** November 20, 2025
**Maintained By:** FastPass Development Team
