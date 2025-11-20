# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Escrow-based pay-to-contact platform (FastPass) with guaranteed email responses. Recipients monetize their inbox attention; senders guarantee responses by paying upfront.

**Revenue Model**: 75% recipient / 25% platform fee
**Core Flow**: Payment → Escrow Hold → Email Sent → Response Detection → Payout (or Refund)

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui (Radix)
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth)
- **Payments**: Stripe + Stripe Connect (for 75/25 split)
- **Email**: Postmark (outbound + inbound webhooks for response detection)
- **State**: React Query + React Context
- **Deployment**: Vercel (frontend) + Supabase (backend)

## Development Commands

```bash
# Frontend Development
npm run dev              # Start dev server (localhost:5173)
npm run build            # Production build
npm run build:dev        # Development build
npm run lint             # Run ESLint
npm run preview          # Preview production build

# Supabase Edge Functions
npx supabase functions list                    # List all deployed functions
npx supabase functions deploy {function-name}  # Deploy specific function
npx supabase functions deploy --no-verify-jwt {function-name}  # Deploy without JWT verification
npx supabase start                             # Start local Supabase (Docker required)
npx supabase db reset                          # Reset local database
npx supabase db push                           # Push local migrations to remote

# Testing & Debugging
./test-postmark-flow.sh                        # End-to-end payment + email flow
./test-postmark-webhook.sh                     # Test webhook processing
./test-production-webhook.sh                   # Test production webhook
./tests/scripts/verify-postmark-response.sh    # Verify response detection
./tests/scripts/verify-webhook-deployment.sh   # Verify webhook deployment
```

## Architecture & Key Concepts

### User Types & Authentication

**Two distinct user contexts** (critical to understand):

1. **Anonymous Senders** (No auth required)
   - Access `/pay/:userId` to make payments
   - No account, no session, pure anonymous flow
   - Payment processed via `process-escrow-payment` (verify_jwt = false)

2. **Authenticated Recipients** (Protected routes)
   - Have accounts, login via Supabase Auth
   - Access dashboard, settings, message history
   - Protected by `ProtectedRoute.tsx` (checks session)
   - Admin routes protected by `AdminRoute.tsx` (checks is_admin flag)

**Critical**: Anonymous payment flow must NEVER require authentication. This is enforced via:
- `verify_jwt = false` in `supabase/config.toml` for payment functions
- No `AuthProvider` wrapper on `/pay/:userId` route in `App.tsx`
- Separate context for anonymous vs authenticated states

### Core Data Flow

```
Payment Page (/pay/:userId)
  ↓ (anonymous user pays)
create-stripe-payment → Stripe PaymentIntent
  ↓
process-escrow-payment → Creates escrow_transactions (status: held) + messages record
  ↓
postmark-send-message → Sends email with Reply-To: reply+{messageId}@reply.fastpass.email
  ↓
[Receiver replies via email client]
  ↓
Postmark → postmark-inbound-webhook (detects reply via Reply-To address)
  ↓
mark-response-received → Updates message_responses, email_response_tracking
  ↓
distribute-escrow-funds → Transfers 75% to receiver's Stripe Connect, 25% to platform
  ↓
escrow_transactions.status = released

[If no response within deadline]
  ↓
check-escrow-timeouts (cron: every 10 minutes)
  ↓
Refunds sender, status = refunded
```

### Transaction Statuses

- `held` - Awaiting response, funds in escrow
- `released` - Response received, funds distributed (75/25)
- `pending_user_setup` - Response received but recipient hasn't configured Stripe Connect
- `refunded` - No response within deadline, funds refunded to sender

### Database Schema Highlights

**Core Tables**:
- `escrow_transactions` - Payment tracking, status, expiry
- `messages` - Message metadata (NO message body stored for privacy)
- `message_responses` - Response tracking, timestamps
- `email_response_tracking` - Webhook audit trail (includes email headers)
- `profiles` - User profiles, Stripe Connect account IDs
- `email_logs` - Email delivery tracking
- `admin_actions` - Audit trail for admin operations
- `security_audit` - Security event logging

**All tables have Row Level Security (RLS)** enabled. Check policies before modifying queries.

### Edge Functions Architecture

**23 total functions** in `supabase/functions/`. Key ones:

**Payment Flow** (verify_jwt = false):
- `create-stripe-payment` - Creates PaymentIntent
- `process-escrow-payment` - Creates transaction + message
- `capture-stripe-payment` - Manual capture if needed

**Email System** (Postmark):
- `postmark-send-message` - Sends initial message
- `postmark-inbound-webhook` - Detects email replies (verify_jwt = false)
- `postmark-webhook-public` - Public webhook wrapper (verify_jwt = false)

**Response & Payout**:
- `mark-response-received` - Marks response, triggers payout
- `distribute-escrow-funds` - 75/25 split via Stripe Connect
- `check-escrow-timeouts` - Cron job (every 10 minutes)

**Stripe Connect**:
- `create-stripe-connect-account` - Onboards recipients
- `stripe-connect-webhook` - Processes Stripe events (verify_jwt = false)
- `process-pending-transfers` - Processes pending payouts

**Monitoring**:
- `escrow-health-check` - System health (verify_jwt = false)
- `email-service-health` - Email service monitoring

**JWT Verification**: Check `supabase/config.toml` for which functions require authentication.

### Frontend Architecture

**Routing** (`src/App.tsx`):
- Anonymous routes: `/`, `/pay/:userId`, `/payment-success`
- Auth routes: `/auth`, `/auth/callback`
- Protected routes: `/dashboard`, `/respond/:messageId` (wrapped in `AuthProvider` + `ProtectedRoute`)
- Admin routes: `/admin-setup`, `/email-preview`, `/email-test` (wrapped in `AuthProvider` + `AdminRoute`)

**State Management**:
- React Query for server state (queries, mutations)
- React Context for auth state (`AuthContext.tsx`)
- Supabase client (`src/integrations/supabase/client.ts`) for all backend calls

**Component Structure**:
- `src/components/auth/` - Auth components, ProtectedRoute, AdminRoute
- `src/components/payment/` - Payment form components (Stripe)
- `src/components/ui/` - shadcn/ui components (reusable primitives)
- `src/pages/` - Page-level components
- `src/hooks/` - Custom React hooks
- `src/contexts/` - React contexts

### Email System (Postmark)

**Why Postmark?**
- Inbound email parsing (detects replies automatically)
- Real-time webhooks
- High deliverability (93.8%)

**Response Detection Flow**:
1. Email sent with `Reply-To: reply+{messageId}@reply.fastpass.email`
2. Receiver replies to email
3. Postmark catches reply, extracts message ID from `Reply-To`
4. Webhook → `postmark-inbound-webhook`
5. Validates deadline + 15-minute grace period
6. Creates `email_response_tracking` record
7. Calls `mark-response-received` → triggers payout

**Grace Period**: 15 minutes after deadline to account for email delays.

### Deployment Workflow

**Frontend** (Vercel):
```bash
git checkout -b feature/my-feature
# Make changes
git add .
git commit -m "feat: description"
git push origin feature/my-feature
# Create PR on GitHub → Merge to main → Vercel auto-deploys
```

**Edge Functions** (Supabase):
```bash
npx supabase functions deploy {function-name}
# Test immediately after deployment
```

**Database Migrations**:
```bash
# Create migration
npx supabase migration new migration_name
# Edit SQL file in supabase/migrations/
npx supabase db push  # Push to remote
```

**Critical**: Frontend requires GitHub merge to trigger Vercel. Edge Functions deploy immediately via CLI.

## Important Patterns & Conventions

### Authentication Isolation

**Never mix anonymous and authenticated contexts**:
- Payment flow is 100% anonymous (no session checks)
- Dashboard/settings are 100% authenticated (ProtectedRoute wrapper)
- Use `get-payment-profile` Edge Function for anonymous profile access (not direct Supabase queries)

### Security Best Practices

- **Row Level Security (RLS)**: All tables have policies. Check before querying.
- **JWT verification**: Check `config.toml` - payment functions are public, payout functions require auth.
- **Webhook signatures**: Always verify Stripe/Postmark signatures before processing.
- **Input validation**: Sanitize all user inputs (especially message bodies).
- **Audit trails**: Log admin actions in `admin_actions` table.

### Testing After Changes

Always test after deployment:
1. Run `./test-postmark-flow.sh` for end-to-end test
2. Check Supabase function logs
3. Check Postmark Activity dashboard
4. Query `email_response_tracking` table for webhook processing

### Git Workflow

- **Always use feature branches** - Never commit directly to main
- **Conventional commits**: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- **Professional language**: No AI/Claude references in commits
- **One feature per branch**

### Environment Variables

**Frontend** (.env):
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_...
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Edge Functions** (set in Supabase dashboard):
```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
POSTMARK_SERVER_TOKEN=...
POSTMARK_ACCOUNT_TOKEN=...
POSTMARK_INBOUND_WEBHOOK_SECRET=...
```

## Common Debugging Scenarios

### Webhook Not Firing
1. Check Supabase function logs
2. Verify webhook URL in Postmark/Stripe dashboard
3. Check signature verification logic
4. Run `./tests/scripts/verify-webhook-deployment.sh`

### Payment Failing
1. Check Stripe dashboard for payment intent status
2. Check `escrow_transactions` table for status
3. Verify Stripe keys are correct (test vs live)
4. Check browser console for frontend errors

### Email Not Sending
1. Check Postmark Activity dashboard
2. Query `email_logs` table
3. Verify `POSTMARK_SERVER_TOKEN` is set
4. Check sender email is verified in Postmark

### Response Not Detected
1. Query `email_response_tracking` table
2. Check Postmark webhook logs
3. Verify `Reply-To` header is correct format
4. Check grace period logic (15 minutes)

## Key Files to Know

- `src/App.tsx` - Main app, routing, auth boundaries
- `src/components/auth/ProtectedRoute.tsx` - Auth guard for protected routes
- `src/contexts/AuthContext.tsx` - Auth state management
- `supabase/config.toml` - Edge Function JWT settings
- `supabase/functions/process-escrow-payment/index.ts` - Core payment flow
- `supabase/functions/postmark-inbound-webhook/index.ts` - Response detection
- `supabase/functions/distribute-escrow-funds/index.ts` - Payout logic

## Recent Fixes & Known Issues (Nov 2025)

### Critical Bugs Fixed:

**1. INNER JOIN Bug in check-escrow-timeouts** (Fixed: Nov 20, 2025)
- **Issue**: Transactions without `message_responses` records were invisible to cron job
- **Impact**: Expired transactions not being automatically refunded
- **Fix**: Changed from INNER JOIN to LEFT JOIN with null-safe filtering
- **Commit**: Latest deployment
- **File**: `supabase/functions/check-escrow-timeouts/index.ts` lines 21-39

**2. Webhook Signature Verification** (Fixed: Nov 19, 2025 - Commit 8f6dc76)
- **Issue**: 96% webhook failure rate due to synchronous crypto operations
- **Impact**: Stripe webhooks not processing, payments stuck
- **Fix**: Switched to `constructEventAsync` for async signature verification
- **File**: `supabase/functions/stripe-connect-webhook/index.ts`
- **Added**: Idempotency protection with `webhook_events` table

**3. Invalid Stripe Refund Reason** (Fixed: Nov 19, 2025 - Commit 8f6dc76)
- **Issue**: Used `reason: 'expired'` which Stripe rejects
- **Impact**: Refunds failing with 400 errors
- **Fix**: Changed to `reason: 'requested_by_customer'`
- **File**: `supabase/functions/check-escrow-timeouts/index.ts` line 209

**4. Deadline Reminder Spam** (Fixed: Nov 14, 2025 - Commit e81332a)
- **Issue**: Unlimited reminders sent to recipients
- **Impact**: User complaints about spam
- **Fix**: Limited to maximum 2 reminders (50% and 75% of deadline)
- **File**: `supabase/functions/send-deadline-reminders/index.ts`

### Known Configuration Issues:

**Platform Balance for Transfers**
- **Issue**: Auto-payouts prevent funds from staying in platform for transfers
- **Impact**: Recipient payouts fail with "insufficient funds" error
- **Solution**: Switch to manual payouts in Stripe Dashboard settings
- **Workaround**: Manually fund platform account before processing transfers

### Testing & Verification:

- Webhook health: Check Stripe Dashboard → Webhooks (should be >90% success rate)
- Cron jobs: GitHub Actions → Verify automated runs every 10 minutes
- Screenshots: See `UI_inspiration/README.md` for debugging documentation

## Additional Documentation

- `CODEBASE-CLEANUP-REPORT.md` - Architecture cleanup notes
- `CLEANUP-RESULTS.md` - Recent cleanup results
- `tests/docs/` - Test documentation
- `tests/sql/` - Verification SQL queries
- `UI_inspiration/README.md` - Debug screenshots and issue documentation

## Critical Reminders

1. **Test after every deployment** (frontend + functions)
2. **Never commit directly to main** - Always use feature branches
3. **Verify webhook signatures** - Security critical
4. **Check RLS policies** - Before modifying database queries
5. **Anonymous payment flow** - Must never require authentication
6. **Grace period** - 15 minutes after deadline for email delays
7. **Update this doc** - When architecture changes

---

**Last Updated**: 2025-11-20
**Status**: Production-Ready
**Version**: 3.1
