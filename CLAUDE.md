# FASTPASS ESCROW SYSTEM - Documentation

**Version**: 2.0 (Updated: 2025-10-08)
**Status**: Production-Ready
**Language**: 100% English

---

## 🎯 Project Overview

**Purpose**: Escrow-based pay-to-contact platform with guaranteed email responses
**Revenue Model**: 75% recipient / 25% platform fee
**Target Market**: Busy professionals (VCs, investors, HR) & serious inquirers

### Core Value Proposition
- **For Recipients**: Monetize inbox attention, filter serious inquiries
- **For Senders**: Guarantee responses, skip the noise
- **For Platform**: Quality filtering marketplace

---

## 📐 Architecture

### Tech Stack
```
Frontend:  React 18 + TypeScript + Vite + Tailwind CSS
Backend:   Supabase (PostgreSQL + Edge Functions)
Payment:   Stripe + Stripe Connect (75/25 split)
Email:     Postmark (outbound + inbound webhooks)
Auth:      Supabase Auth (email/password + OAuth)
State:     React Query + React Context
```

### User Types
**Receivers** (Revenue Generators):
- Have accounts, profiles, dashboards
- Share `/pay/[userId]` payment links
- Receive 75% of payments

**Senders** (Anonymous):
- No accounts required
- Pay via Stripe (sessionless)
- Receive responses via email

---

## 🔄 Core Flow

### Payment → Email → Response → Payout

```
1. Sender visits /pay/{userId}
   ↓
2. Pays via Stripe (escrow: held)
   ↓
3. Postmark sends email to receiver
   Reply-To: reply+{messageId}@reply.fastpass.email
   ↓
4. Receiver replies via email client
   ↓
5. Postmark webhook detects response
   ↓
6. Escrow released (75% receiver, 25% platform)
```

### Transaction Statuses
- `held` → Awaiting response
- `released` → Response received, funds distributed
- `pending_user_setup` → Response received, Stripe Connect not configured
- `refunded` → Timeout (no response)

---

## 🗄️ Database Schema

### Core Tables
```sql
escrow_transactions    -- Payment tracking with status
├── status: held|released|refunded|pending_user_setup
├── amount: integer (cents)
├── expires_at: timestamp
└── stripe_payment_intent_id

messages               -- Message metadata
├── sender_email
├── response_deadline_hours: 24|48|72
└── (no message body - privacy)

message_responses      -- Response tracking
├── has_response: boolean
├── responded_at: timestamp
└── detection_method: webhook|manual

email_response_tracking -- Webhook audit trail
├── response_received_at
├── within_deadline: boolean
├── grace_period_used: boolean (15min buffer)
└── email_headers: jsonb

profiles               -- User Stripe Connect info
email_logs            -- Email delivery tracking
admin_actions         -- Audit trail
security_audit        -- Security events
```

---

## ⚙️ Supabase Edge Functions

### Active Functions (15)

**Payment Flow**:
- `create-stripe-payment` → Create PaymentIntent
- `process-escrow-payment` → Create message + transaction
- `capture-stripe-payment` → Manual capture if needed

**Email System** (Postmark):
- `postmark-send-message` → Send initial message
- `postmark-inbound-webhook` → Detect email replies
- `postmark-webhook-public` → Public webhook wrapper
- `send-refund-notification` → Timeout refund emails
- `send-timeout-notification` → Deadline notifications

**Response & Distribution**:
- `mark-response-received` → Mark response, trigger payout
- `distribute-escrow-funds` → 75/25 split distribution
- `check-escrow-timeouts` → Cron job (10min intervals)

**Stripe Connect**:
- `create-stripe-connect-account` → Onboard receivers
- `stripe-connect-webhook` → Stripe events
- `process-pending-transfers` → Process pending payouts

**Utilities**:
- `escrow-health-check` → System monitoring
- `email-service-health` → Email service monitoring
- `get-payment-profile` → Anonymous profile access

---

## 🔧 Development

### Commands
```bash
# Frontend
npm run dev              # Development server
npm run build           # Production build
npm run lint            # ESLint

# Supabase
npx supabase functions list              # List deployed functions
npx supabase functions deploy {name}     # Deploy Edge Function
npx supabase start                       # Local Supabase

# Deployment
git push origin {branch}   # Push to GitHub
# Merge to main → triggers Vercel deployment

# Testing
./test-postmark-flow.sh              # End-to-end test
./tests/scripts/verify-*.sh          # Verification scripts
```

### Project Structure
```
src/
├── components/
│   ├── auth/          # Auth components + ProtectedRoute
│   ├── payment/       # Stripe payment forms
│   └── ui/            # shadcn/ui components
├── pages/             # Main pages
├── hooks/             # Custom hooks
└── integrations/      # Supabase client

supabase/
├── functions/         # Edge Functions (20 total)
├── migrations/        # Database migrations
└── config.toml        # Configuration

tests/
├── scripts/           # Test scripts
├── sql/               # SQL queries
└── docs/              # Test documentation
```

---

## 🌐 Environment Variables

```bash
# Frontend (.env)
VITE_STRIPE_PUBLISHABLE_KEY=pk_...
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Supabase Edge Functions
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Postmark)
POSTMARK_SERVER_TOKEN=...           # Outbound emails
POSTMARK_ACCOUNT_TOKEN=...          # Account management
POSTMARK_INBOUND_WEBHOOK_SECRET=... # Webhook verification
```

---

## 🔐 Security

### Authentication Architecture
- **Anonymous payment flow**: No auth required for `/pay/:userId`
- **Protected routes**: Dashboard, settings (via `ProtectedRoute.tsx`)
- **Session isolation**: Zero bleeding between anonymous/authenticated contexts
- **RLS enabled**: All tables have Row Level Security
- **Secure webhooks**: Signature verification (Stripe, Postmark)

### Key Security Features
- JWT verification for protected endpoints
- Input validation and sanitization
- Rate limiting on Edge Functions
- Audit trails (`admin_actions`, `security_audit`)
- Anonymous profile access via secure Edge Function

---

## 📧 Email System (Postmark)

### Why Postmark?
- **Inbound email parsing**: Automatic response detection
- **93.8% deliverability**: Better than Resend
- **Real-time webhooks**: Instant response processing
- **Cost**: $15/month for 10k emails

### Email Flow
```
Outbound:
postmark-send-message
  → api.postmarkapp.com
  → Email with Reply-To: reply+{uuid}@reply.fastpass.email

Inbound:
Receiver replies
  → Postmark catches reply
  → Webhook: postmark-inbound-webhook
  → Escrow released (15min grace period)
```

### Webhook Processing
1. Extract message ID from `Reply-To` address
2. Query `escrow_transactions` for status
3. Validate deadline + 15-minute grace period
4. Insert `email_response_tracking` record
5. Invoke `mark-response-received`
6. Distribute funds (75/25 split)

---

## 🎨 UI Design System

### Design Language
- **Gradient backgrounds**: Orange → Red → Pink
- **Glassmorphism**: `bg-white/95 backdrop-blur-sm`
- **Mobile-first**: Responsive breakpoints (sm, md, lg, xl)
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Headless components (Radix UI)

### Key Pages
- `/` → Landing (hero + features)
- `/pay/:userId` → Payment form (anonymous)
- `/dashboard` → Receiver dashboard (protected)
- `/auth` → Login/signup/OAuth
- `/payment-success` → Confirmation

---

## 🚀 Deployment

### Workflow
```bash
# 1. Edge Functions (immediate)
npx supabase functions deploy {name}

# 2. Frontend (via GitHub)
git push origin {branch}
# Merge to main → Vercel auto-deploys
```

### Critical Notes
- **Frontend**: Requires GitHub merge to trigger Vercel
- **Edge Functions**: Direct deployment via CLI
- **Database**: Migrations via Supabase CLI
- **Always test** after deployment

---

## 📊 Monitoring & Analytics

### Key Metrics
- **Response Rate**: % within deadline
- **Revenue**: MRR, average transaction value
- **Deliverability**: Email success rate
- **System Health**: Uptime, error rates

### Monitoring Tools
- `escrow-health-check` → System stats
- `email-service-health` → Email monitoring
- `email_logs` table → Delivery tracking
- Supabase Dashboard → Function logs

---

## 🧪 Testing

### Test Scripts
```bash
# End-to-end flow
./test-postmark-flow.sh

# Webhook testing
./test-postmark-webhook.sh

# Production webhook
./test-production-webhook.sh
```

### Verification Queries
See `tests/sql/verify-webhook-fix.sql` for comprehensive database queries.

---

## 🛠️ Common Tasks

### Add New Edge Function
```bash
# 1. Create function directory
mkdir supabase/functions/my-function

# 2. Create index.ts
# (use existing functions as template)

# 3. Deploy
npx supabase functions deploy my-function
```

### Update Payment Flow
1. Edit `process-escrow-payment/index.ts`
2. Deploy: `npx supabase functions deploy process-escrow-payment`
3. Test with `./test-postmark-flow.sh`

### Debug Webhook Issues
1. Check Supabase function logs
2. Query `email_response_tracking` table
3. Check Postmark Activity dashboard
4. Run verification queries

---

## 🔄 Recent Changes (October 2025)

### ✅ Completed
- **Email Migration**: Resend → Postmark (complete)
- **Codebase Cleanup**: Removed 6 unused functions (-26%)
- **Webhook Fixes**: Safe date parsing, schema matching
- **Security**: Anonymous payment flow isolation
- **Tests**: Organized into `/tests` directory

### 🎯 Current Architecture
- **Email**: Postmark only (Resend removed)
- **Functions**: 15 active (PayPal removed)
- **Payment**: Stripe only
- **Auth**: Supabase + OAuth (Google, LinkedIn)

---

## 📚 Additional Documentation

- **Cleanup Report**: `CODEBASE-CLEANUP-REPORT.md`
- **Cleanup Results**: `CLEANUP-RESULTS.md`
- **Test Docs**: `tests/docs/`
- **SQL Queries**: `tests/sql/`

---

## 🚨 Critical Reminders

1. **Always work on feature branches** - Never commit to main directly
2. **Test after deployment** - Edge Functions + Frontend
3. **Monitor webhooks** - Check Postmark + Supabase logs
4. **Backup before changes** - Database migrations especially
5. **Update this doc** - When architecture changes

---

## Git Workflow

### Branching
```bash
# Always create feature branch
git checkout -b feature/my-feature

# Make changes, commit
git add .
git commit -m "Add feature description"

# Push and create PR
git push origin feature/my-feature
```

### Commit Guidelines
- **Clear, descriptive messages**: "Fix webhook date parsing"
- **Professional language**: No AI/Claude references
- **Conventional commits**: `feat:`, `fix:`, `docs:`, etc.
- **One feature per branch**

---

**Last Updated**: 2025-10-08
**Codebase Version**: 2.0 (Cleaned & Optimized)
**Production Status**: ✅ Active & Stable
