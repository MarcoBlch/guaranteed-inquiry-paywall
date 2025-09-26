# FASTPASS ESCROW SYSTEM - Claude Code Documentation

## Project Overview
**Project Name**: Guaranteed Inquiry Paywall (Fastpass Escrow System)
**Type**: React + TypeScript web application with Supabase backend
**Purpose**: Escrow payment system for guaranteed message responses with 75/25 revenue split
**Language**: 100% English throughout the entire application (UI, emails, notifications, date formatting)

## Business Purpose & Context

### Problem Statement
Busy professionals (VCs, investors, HR managers) receive overwhelming amounts of email solicitations and cannot respond to them all. This creates frustration for both senders (who get ignored) and recipients (who feel guilty about not responding).

### Solution
A pay-to-contact platform that filters serious inquiries through micropayments and guarantees responses within specified timeframes. This creates value for both parties:
- **Recipients** get filtered, serious inquiries + compensation for their time
- **Senders** get guaranteed responses and cut through the noise

### Target Users
**Message Recipients (Revenue Generators):**
- Venture Capitalists and investors
- Business angels and investment funds  
- HR professionals and recruiters
- Any "important/busy" professionals with high email volume

**Message Senders (Payers):**
- Entrepreneurs with business ideas seeking investment
- Job seekers wanting to reach HR professionals
- Anyone needing to contact busy professionals with serious intent

### Revenue Model (75/25 Split)
- **75% to Recipient** - Compensation for their time and attention
- **25% Platform Fee** - For providing the filtering service and platform

### Pricing Tiers by Urgency
- **24h response** - Highest price tier (urgent)
- **48h response** - Medium price tier (standard)
- **72h response** - Lower price tier (less urgent)

## 🎯 **CORRECTED ARCHITECTURE: Receiver-Only Platform**

### **Core Design Principle**
- **Receivers (Revenue Generators)**: Have accounts, profiles, dashboards
- **Senders (Anonymous Customers)**: No accounts needed, visit public payment links

### **Corrected User Journey**
**Sender Side (Anonymous Visitor):**
1. Receives `/pay/[receiverId]` link from receiver (shared publicly)
2. Visits link in any browser without login/registration required
3. Fills form: their email, message subject, message body, payment details
4. Pays via Stripe (completely sessionless transaction)
5. Sees "Message sent, you'll receive response via email" confirmation
6. Receives response directly to their email address
7. **Optional**: 24h after response, gets quality rating request email

**Receiver Side (Platform User):**
1. Shares their `/pay/[receiverId]` link publicly (LinkedIn, email signature, etc.)
2. Receives actual email notification with sender's message content
3. Reads message in their email client (Gmail, Outlook, etc.)
4. Responds directly via email reply to sender's address
5. System detects response via webhook → releases 75% payment
6. Views earnings/stats in dashboard (message subjects only, no body content)

**Resolution Scenarios:**
- **SUCCESS**: Email response detected within deadline → 75% to receiver, 25% platform
- **TIMEOUT**: No response detected → Full automatic refund to sender
- **DISPUTE**: Manual admin review for edge cases and quality issues

### Key System Features
- **Anonymous payment flow** - No sender authentication required
- **Email-first communication** - Actual email delivery with branded templates
- **Resend webhook response detection** - Automatic reply tracking
- **Privacy-focused design** - No message body storage in dashboard
- **Quality control system** - Sender rating + dispute resolution
- **Hybrid deadline tracking** - Automatic detection with manual review fallback
- **15-minute grace period** - Buffer for email delivery delays
- **One-time contact model** - Platform facilitates initial connection only

### Market Position
- **First-mover advantage** - No direct competitors identified
- **Creates new category** - Monetized attention/time marketplace  
- **Quality filter mechanism** - Separates serious inquiries from spam
- **Limited liability model** - Platform not responsible for response quality

### Success Metrics & KPIs
**Primary Success Indicators:**
- **Response rate within timeframes** - Core platform promise
- **Recipient retention rate** - Professionals who continue using the service
- **Sender repeat usage** - Quality of filtering attracts return customers

**Platform Disclaimers:**
- No responsibility for response quality or content
- Focus on delivery guarantee, not satisfaction guarantee
- Success = timely response delivery, not outcome quality

## Architecture
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui + Tailwind CSS + Radix UI
- **Backend**: Supabase (Database + Edge Functions)
- **Payment Processing**: Stripe + Stripe Connect
- **Email Service**: Resend API
- **Authentication**: Supabase Auth
- **State Management**: React Query (@tanstack/react-query)
- **Routing**: React Router v6

## UI Design System
### PLATA-Inspired Modern Design
The platform features a cohesive, modern design inspired by the PLATA fintech app:

**🎨 Design Language:**
- **Gradient Backgrounds**: Orange-to-red-to-pink gradients across all pages
- **Glassmorphism**: Backdrop blur effects with transparency for cards and modals
- **Bold Typography**: Large, impactful headings with professional hierarchy
- **Modern Cards**: Enhanced shadows, rounded corners, and hover effects
- **Consistent Branding**: FASTPASS header styling throughout the platform

**📱 Page-Specific Styling:**
- **Landing Page (`/`)**: Hero section with "GET PAID TO RESPOND", feature cards, professional CTA
- **Payment Page (`/pay/:userId`)**: Enhanced card layout with recipient info and secure payment styling  
- **Dashboard (`/dashboard`)**: Transaction cards with profile icons, glassmorphism tabs, professional data display
- **Auth Pages (`/auth`)**: Consistent gradient background with enhanced form cards and complete password reset flow

**🎯 Key UI Components:**
- Glassmorphism cards with `bg-white/95 backdrop-blur-sm` styling
- Professional gradient buttons with hover states
- Enhanced tab navigation with active state styling
- Modern badge components for transaction status
- Responsive design with mobile-first approach

**🔧 Technical Implementation:**
- Tailwind CSS utility classes for consistent styling
- CSS backdrop-filter for glassmorphism effects
- Gradient backgrounds with CSS gradients
- Custom component variants using class-variance-authority
- Professional color palette with accessibility considerations
- **Stripe Elements with English locale (`locale: 'en')` for consistent payment experience**

**📱 Responsive Design System:**
The platform is fully responsive and adaptive across all device types:

**🎯 Breakpoint Strategy:**
- **Mobile**: `< 640px` - Single column layouts, compact spacing, condensed navigation
- **Tablet**: `640px - 1024px` - Two-column grids, medium spacing, hybrid navigation
- **Desktop**: `> 1024px` - Multi-column layouts, full spacing, complete navigation

**📐 Mobile-First Optimizations:**
- **Landing Page**: Responsive hero text (3xl → 6xl), adaptive feature cards (1 → 2 → 3 columns)
- **Dashboard**: Collapsible header, compact tabs with abbreviated labels, mobile-optimized message cards
- **Payment Page**: Responsive card sizing, adaptive typography, mobile-friendly form layouts
- **Auth Forms**: Consistent glassmorphism styling with mobile padding adjustments

**⚡ Performance Considerations:**
- Conditional rendering for mobile/desktop elements (`hidden sm:inline`)
- Optimized image and icon sizing across breakpoints
- Efficient grid systems with responsive column counts
- Truncated text with responsive font sizes

**🔧 Implementation Details:**
- Tailwind responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`
- Flexible layouts with `flex-1`, `min-w-0`, `truncate` utilities
- Adaptive spacing with `p-4 sm:p-6 lg:p-8` patterns
- Mobile-first typography scaling with responsive text sizes

## Core Business Logic
### Escrow Flow (75/25 Split)
1. **Payment** → Funds held in escrow (status: 'held')
2. **Message sent** → Timer starts based on deadline (24h/48h/72h)
3. **Response received** → Auto-capture + distribution:
   - 75% → Transfer to user (if Stripe Connect configured)
   - 25% → Remains on main account (commission)
4. **No response** → Auto-cancel + refund

### Transaction Statuses
- `held` → Funds in escrow, awaiting response
- `released` → Response received, funds distributed
- `pending_user_setup` → Response received but user hasn't set up Stripe
- `refunded` → Timeout, funds refunded

## Development Commands
```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build           # Production build
npm run build:dev       # Development build
npm run preview         # Preview production build
npm run lint            # Run ESLint

# Database
supabase start          # Start local Supabase
supabase stop           # Stop local Supabase

# Testing & Monitoring
curl [supabase-url]/functions/v1/escrow-health-check     # System health check
curl [supabase-url]/functions/v1/send-deadline-reminders # Manual reminder trigger
curl [supabase-url]/functions/v1/check-escrow-timeouts   # Manual timeout check
```

## Project Structure
```
/
├── src/
│   ├── components/
│   │   ├── auth/           # Authentication components
│   │   ├── payment/        # Payment & Stripe components
│   │   ├── security/       # Admin routes & security
│   │   └── ui/             # shadcn/ui components
│   ├── contexts/           # React contexts (Auth, etc.)
│   ├── hooks/              # Custom React hooks
│   ├── integrations/       # External service integrations
│   ├── lib/                # Utilities & configurations
│   └── pages/              # Main page components
├── supabase/
│   ├── functions/          # Edge functions
│   ├── migrations/         # Database migrations
│   └── config.toml         # Supabase configuration
├── public/                 # Static assets
└── .github/workflows/      # GitHub Actions (cron jobs)
```

## Key Pages & Routes
- `/` → Index/Landing page
- `/auth` → Authentication (login/signup)
- `/dashboard` → User dashboard
- `/pay/:userId` → Payment page for specific user
- `/respond/:messageId` → Response page for recipients
- `/payment-success` → Post-payment confirmation

## Key Dependencies
### Core Framework
- `react` + `react-dom` (18.3.1) - Core React
- `typescript` (5.5.3) - Type safety
- `vite` (5.4.1) - Build tool
- `react-router-dom` (6.26.2) - Routing

### UI & Styling
- `@radix-ui/*` - Headless UI components
- `tailwindcss` (3.4.11) - CSS framework
- `lucide-react` - Icons
- `class-variance-authority` - Component variants

### Backend & Data
- `@supabase/supabase-js` (2.49.4) - Database & auth
- `@tanstack/react-query` (5.56.2) - Data fetching & caching

### Payment Processing
- `@stripe/react-stripe-js` (3.9.0) - Stripe React components
- `@stripe/stripe-js` (7.8.0) - Stripe JS SDK

### Forms & Validation
- `react-hook-form` (7.53.0) - Form handling
- `@hookform/resolvers` (3.9.0) - Form validation
- `zod` (3.23.8) - Schema validation

## Environment Variables
```bash
# Frontend (.env)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# Supabase Edge Functions
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SECRET=whsec_... # For email reply detection
```

## Database Schema
### Key Tables
- `escrow_transactions` - Payment escrow tracking with status management
- `messages` - User messages and metadata with deadline tracking
- `message_responses` - Response tracking and validation with timestamps
- `profiles` - User profiles and Stripe Connect info
- `email_logs` - Email delivery tracking, opens, clicks, and response detection
- `admin_actions` - Audit trail for administrative actions
- `security_audit` - Security event logging and monitoring

## Supabase Edge Functions

### Core Payment Functions
- `create-stripe-payment` - Create escrow PaymentIntent
- `process-escrow-payment` - Create message + transaction after payment
- `distribute-escrow-funds` - Capture + distribute 75/25 split
- `create-stripe-connect-account` - User onboarding for payouts
- `process-pending-transfers` - Process pending user transfers

### Response & Timeout Management  
- `mark-response-received` - Mark response as received and trigger fund distribution
- `check-escrow-timeouts` - Auto-refund expired transactions with 5min grace period
- `resend-email-webhook` - **NEW** Automatic email reply detection via webhooks
- `send-deadline-reminders` - **NEW** Send urgent reminders at 50% deadline

### Communication & Monitoring
- `send-email-notification` - Send HTML notifications to recipients via Resend
- `send-response-email` - Send response confirmations via Resend  
- `escrow-health-check` - System monitoring & metrics with detailed stats

## Automation & Monitoring

### Enhanced Cron Jobs (GitHub Actions)
- **Every 10 minutes**: Deadline reminders + timeout checks for maximum precision
- **Dual-phase processing**: First sends reminders, then processes refunds
- **Grace period handling**: 5-minute buffer for late responses
- **Comprehensive logging**: All actions logged with timestamps and metadata

### Response Detection Methods
1. **Manual Web Interface** - Users click ResponsePage link
2. **Email Reply Webhooks** - Automatic detection via Resend webhooks  
3. **Grace Period Processing** - Late responses honored within 5min window

### Monitoring & Alerts
- Real-time health checks with detailed metrics
- Email delivery tracking and status monitoring
- Transaction audit trails for compliance
- Error logging and failure notifications

### Security

#### Authentication Architecture Security Fix (September 26, 2025)
**CRITICAL VULNERABILITY RESOLVED**: Fixed authentication bleeding where anonymous payment senders could access receiver dashboards.

**🚨 Original Problem:**
- Global `AuthProvider` wrapped entire application, causing session bleeding
- Anonymous users visiting payment links inherited receiver authentication state
- Senders could access receiver dashboards via URL manipulation (e.g., `/dashboard`)
- Payment flow failed in truly anonymous browsers due to authentication dependencies

**✅ Solution Implemented:**
1. **Route-Based Authentication Separation:**
   - Split routes into anonymous and protected groups in `App.tsx`
   - Removed global `AuthProvider` wrapper
   - Applied `AuthProvider` only to protected routes (`/dashboard`, `/respond`, etc.)

2. **Created ProtectedRoute Component:**
   - Authentication guard with session validation
   - Loading states for authentication checks
   - Automatic redirect to `/auth` for unauthenticated users
   - Located: `src/components/auth/ProtectedRoute.tsx`

3. **Anonymous Profile Access Solution:**
   - Created `get-payment-profile` Edge Function to bypass RLS for payment data
   - Uses service role key to securely fetch profile information
   - Returns only necessary data: price, setup status, generic user name
   - Updated `usePaymentDetails` hook to use Edge Function instead of direct queries

**🔧 Technical Changes:**
- **App.tsx**: Route architecture completely restructured for security isolation
- **ProtectedRoute.tsx**: New component with robust authentication checks
- **PaymentSuccess.tsx**: Removed navigation that could lead to protected areas
- **usePaymentDetails.ts**: Replaced direct database queries with secure Edge Function calls
- **get-payment-profile**: New Edge Function for anonymous profile access

**🛡️ Security Benefits:**
- Complete isolation between anonymous payment flows and authenticated user sessions
- Prevents session hijacking and unauthorized dashboard access
- Maintains payment functionality while enforcing strict authentication boundaries
- No sensitive information exposed to anonymous users

**📋 Testing Results:**
- ✅ Anonymous browsers can access payment links without authentication
- ✅ Payment flow works independently of receiver authentication state
- ✅ Protected routes properly redirect unauthenticated users
- ✅ No session bleeding between different user contexts

#### Additional Security Measures
- Row Level Security (RLS) enabled on all tables
- JWT verification for protected endpoints
- Secure webhook handling for Stripe events
- Rate limiting on Edge Functions
- Input validation and sanitization

## Development Patterns
### Code Style
- TypeScript strict mode
- ESLint with React hooks plugin
- Tailwind CSS for styling
- Component composition with Radix UI

### State Management
- React Query for server state
- React Context for auth state
- Local state with useState/useReducer

### Error Handling
- Toast notifications with Sonner
- Form validation with react-hook-form + Zod
- Graceful error boundaries

## Common Workflows
### Adding New Features
1. Create components in appropriate `src/components/` subdirectory
2. Add pages in `src/pages/` if needed
3. Update routes in `App.tsx`
4. Add database changes via Supabase migrations
5. Create/update Edge functions if backend logic needed

### Payment Integration
- All payment logic uses Stripe Elements
- Escrow managed via Stripe PaymentIntents
- Connect accounts for user payouts

### Authentication Flow
- Supabase Auth with email/password
- **Complete Password Reset Flow**:
  1. User clicks "Forgot Password?" on login form
  2. Enters email → `resetPasswordForEmail()` sends reset link
  3. Email link redirects to `/auth?reset=true`
  4. Form automatically detects URL parameter and shows "Set New Password" UI
  5. User enters new password + confirmation with validation
  6. `supabase.auth.updateUser()` updates password
  7. Success → auto-redirect to dashboard with login
- Protected routes via `AuthContext`
- Automatic session management

## Testing & Quality Assurance
- ESLint configuration for code quality
- TypeScript for compile-time checks
- Manual testing workflows documented in README.md

## Deployment
- Built with Vite for optimized production bundles
- Deployed via Lovable platform
- Supabase for backend infrastructure
- Environment-specific builds supported

## Key Files to Know

### Frontend Core
- `src/App.tsx` - Main app component and routing
- `src/integrations/supabase/client.ts` - Supabase configuration
- `src/components/auth/AuthForm.tsx` - Authentication with login/signup/forgot password
- `src/components/payment/StripePaymentForm.tsx` - Payment processing
- `src/pages/ResponsePage.tsx` - Response interface with deadline tracking

### Backend Functions  
- `supabase/functions/resend-email-webhook/index.ts` - **NEW** Email reply detection
- `supabase/functions/send-deadline-reminders/index.ts` - **NEW** Smart reminders
- `supabase/functions/check-escrow-timeouts/index.ts` - Enhanced timeout processing
- `supabase/functions/send-email-notification/index.ts` - Rich HTML email templates

### Configuration & Automation
- `supabase/config.toml` - Edge function configuration with new webhook endpoints
- `.github/workflows/escrow-timeout-check.yml` - Enhanced cron jobs (10min intervals)
- `package.json` - Dependencies and scripts

## Monitoring & Analytics System

### Current Monitoring Infrastructure
The platform includes comprehensive monitoring tables for tracking all business activities:

**📊 Data Collection Tables:**
- `admin_actions` - Administrative audit trail and action logging
- `email_logs` - Email delivery, open rates, click tracking, response detection
- `security_audit` - Security events, login attempts, suspicious activity
- `escrow_transactions` - Complete payment flow with status tracking
- `messages` - Message metadata, user activity, response deadlines
- `message_responses` - Response timing and validation tracking

### Key Performance Indicators (KPIs)

**💰 Revenue & Financial Metrics:**
- Monthly Recurring Revenue (MRR) from successful transactions
- Average Transaction Value and platform commission (25%)
- User payout totals (75%) and refund rates
- Revenue per User and transaction success rates

**📈 User Engagement & Growth:**
- Daily/Monthly Active Users creating messages
- User retention rates and onboarding funnel completion
- Response success rates and average response times
- Email engagement metrics (opens, clicks, deliveries)

**⚡ Platform Performance:**
- Message success rate within deadlines
- Payment processing success rates
- Email delivery and engagement rates  
- System uptime from health check functions

### Implementation Phases

**Phase 1: Quick Wins (1-2 days)**
- Create SQL views for common KPIs in Supabase
- Add admin analytics tab to Dashboard with basic metrics
- Set up email alerts for critical events (failed payments, errors)

**Phase 2: Enhanced Analytics (1 week)**  
- Build custom admin dashboard with interactive charts
- Add comprehensive user activity tracking
- Implement automated reporting via email notifications

**Phase 3: Advanced Intelligence (2-3 weeks)**
- Integrate behavioral analytics (PostHog/Mixpanel)
- Set up A/B testing for pricing optimization  
- Create predictive models for user success and churn prevention

### Sample KPI Queries
```sql
-- Daily Revenue Trend
SELECT 
  DATE(created_at) as date,
  COUNT(*) as transactions,
  SUM(amount) as revenue,
  AVG(amount) as avg_transaction
FROM escrow_transactions 
WHERE status = 'released' 
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at);

-- Response Success Rate
SELECT 
  COUNT(*) FILTER (WHERE mr.has_response = true) as responded,
  COUNT(*) as total_messages,
  ROUND(100.0 * COUNT(*) FILTER (WHERE mr.has_response = true) / COUNT(*), 2) as success_rate
FROM messages m
LEFT JOIN message_responses mr ON m.id = mr.message_id
WHERE m.created_at >= NOW() - INTERVAL '30 days';
```

### Alerting & Notifications
Automated alerts configured for:
- High refund rate spikes (>20% in 24h)  
- Payment processing failures
- System downtime detection
- Unusual user activity patterns

## Response Tracking System Overview

### How Responses Are Detected & Validated

**1. Response Detection Channels:**
```
┌─────────────────┬──────────────────┬─────────────────┐
│   Method        │   Trigger        │   Validation    │
├─────────────────┼──────────────────┼─────────────────┤
│ Web Interface   │ Manual click     │ Immediate       │
│ Email Webhook   │ Reply detected   │ Auto-processed  │  
│ Grace Period    │ Late response    │ 5min buffer     │
└─────────────────┴──────────────────┴─────────────────┘
```

**2. Timeline Processing:**
- `T+0`: Message sent → Timer starts
- `T+50%`: Automatic reminder sent (once only)  
- `T+100%`: Deadline reached
- `T+100% + 5min`: Grace period expires → Refund processed

**3. System Guarantees:**
- Responses detected via web interface OR email replies
- 5-minute grace period for technical delays
- Comprehensive audit logging for all transactions
- Automatic fund distribution within minutes of valid response
- to memorize
- to memorize  
- last update

## OAuth Authentication System

### Google & LinkedIn OAuth Implementation
The platform includes comprehensive OAuth authentication with proper session management:

**🔧 OAuth Flow Architecture:**
- **Initiation**: OAuth providers redirect to dedicated callback endpoint
- **Callback Handling**: `/auth/callback` processes OAuth tokens and establishes session
- **Session Recovery**: Enhanced AuthContext with async session restoration
- **Error Handling**: Comprehensive error detection and user feedback

**🛠️ Key Components:**
- `AuthCallback.tsx` - Dedicated OAuth callback processor with error handling
- Enhanced `AuthContext.tsx` - Proper session persistence and race condition fixes
- Updated `AuthForm.tsx` - OAuth initiation with proper callback URLs
- `Auth.tsx` - Fallback OAuth token detection and routing

**⚙️ Configuration:**
- **Supabase Config**: All necessary OAuth redirect URLs configured in `config.toml`
- **Google OAuth**: Includes `access_type: 'offline'` and `prompt: 'consent'` for proper token handling
- **LinkedIn OAuth**: Standard OAuth flow with callback processing
- **Multiple Environments**: Supports localhost development and production domains

**🔍 Session Management:**
- Async session recovery on app load with mounted state tracking
- Comprehensive auth state change logging for debugging
- Proper cleanup and subscription management
- Race condition prevention between auth listener and session check

**📱 User Experience:**
- Loading states during OAuth processing
- Clear success/error messaging with toast notifications
- Automatic redirect to dashboard after successful authentication
- Profile setup detection for first-time OAuth users

### Debugging OAuth Issues
- Console logs track all auth events: `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`
- Session state logged on initial load and state changes
- Error parameters captured from OAuth callback URLs
- AuthProvider properly wraps entire application for consistent auth state

## 🚀 **ARCHITECTURE REFACTOR IMPLEMENTATION PLAN**

### **Current Critical Issues Identified**
1. **Authentication Dependency Bug**: Payment links fail in different browsers due to sender authentication requirements
2. **User Session Confusion**: Senders incorrectly need user accounts/sessions
3. **Communication Method Wrong**: Web interface responses instead of actual email communication
4. **Privacy Issues**: Message body content stored and displayed in dashboard
5. **Security Vulnerability**: Sender can access receiver dashboard via URL manipulation

### **Implementation Phases**

#### **Phase 1: Critical Fix - Anonymous Payment Flow** ✅ **COMPLETED**
**Priority**: URGENT - Fixes browser compatibility and core functionality

**✅ COMPLETED TASKS:**
- ✅ Removed all sender authentication requirements from `/pay/[receiverId]` routes
- ✅ Made payment flow completely sessionless for anonymous visitors
- ✅ Fixed "User not found" errors across different browsers/devices
- ✅ Removed sender profile dependencies from payment components
- ✅ Updated PaymentSuccess page (removed "Back to Home" button)
- ✅ **BONUS**: Complete English localization of payment flow
- ✅ **BONUS**: Created secure `get-payment-profile` Edge Function for anonymous access

**🏆 RESULTS ACHIEVED:**
- Payment links work reliably across all browsers and devices
- Complete security isolation between anonymous senders and authenticated receivers
- 100% English interface throughout payment flow
- Enterprise-level security with proper authentication boundaries
- Production-ready anonymous payment processing

#### **Phase 2: Email-First Communication System**
**Priority**: HIGH - Core functionality alignment
- Design branded FastPass email template with visual identity
- Implement actual email sending with sender message content to receiver
- Configure Resend inbound parsing webhook for response detection
- Remove message body content from dashboard display (privacy)
- Update dashboard to show only: sender email, subject, timestamp, payment status

#### **Phase 3: Hybrid Response Tracking System**
**Priority**: HIGH - Revenue protection and quality control
- **Automatic Detection**: Resend webhook catches receiver email replies in real-time
- **Grace Period**: 15-minute buffer for email delivery delays
- **Quality Control**: Manual admin review system for disputed cases
- **Deadline Enforcement**: Original countdown with webhook override capability

#### **Phase 4: Quality Control & Rating System**
**Priority**: MEDIUM - Platform quality assurance
- Implement sender rating system (24h post-response delay)
- Add meaningful response quality checks and validation
- Create dispute resolution process for low-quality responses
- Email automation for rating requests to senders

#### **Phase 5: Security & Privacy Hardening**
**Priority**: MEDIUM - Data protection and security
- Complete separation of sender/receiver data access
- Secure receiver-only dashboard with proper authentication
- Remove all message body storage for privacy compliance
- Audit and fix any remaining session bleeding issues

### **Technical Implementation Details**

#### **Response Detection: Resend Webhooks + Manual Dispute Hybrid**
- **Primary Method**: Resend inbound parsing webhook for automatic reply detection
- **Backup Method**: Manual admin review for edge cases and disputes
- **Quality Assurance**: Sender rating system to ensure meaningful responses
- **Grace Period**: 15-minute buffer to handle email delivery delays
- **Dispute Process**: Admin dashboard for reviewing contested cases

#### **Email Template Design Requirements**
- Branded FastPass visual identity consistent with platform
- Professional template that clearly identifies platform origin
- Include sender message content inline with proper formatting
- Clear call-to-action for receiver to respond via email
- Responsive design for mobile and desktop email clients

#### **Privacy & Security Specifications**
- **No Message Body Storage**: Dashboard shows subjects only, never content
- **Complete Anonymity**: Senders require no accounts, profiles, or sessions
- **Session Separation**: Zero access bleeding between sender/receiver contexts
- **Data Minimization**: Store only necessary transaction and contact metadata

### **Success Metrics**
- ✅ Payment links work in any browser without authentication
- ✅ Receivers get actual emails with sender messages
- ✅ Response detection works reliably via email webhooks
- ✅ Dashboard shows earnings data only (no private message content)
- ✅ Quality control maintains meaningful response standards
- ✅ Complete security separation between senders and receivers

## Git Workflow Guidelines

### **Branching Strategy**
- **ALWAYS work on feature branches** for any fix, debug, or new function
- **Branch naming convention**: `fix/description` or `feature/description` or `debug/issue-name`
- **One branch per task**: Each fix or feature gets its own dedicated branch
- **Merge when complete**: Only merge to main when task is fully complete and tested
- **Clean workflow**: Switch tasks = create new branch

### **Branch Workflow Process**
1. **Start new task**: `git checkout -b fix/authentication-dependency`
2. **Work on changes**: Make commits with clear descriptions
3. **Complete task**: Test and verify functionality
4. **Push branch**: `git push origin branch-name`
5. **Create PR**: Merge via pull request when ready
6. **Switch tasks**: Create new branch for next task

### **Commit Guidelines**
- NEVER mention Claude or AI assistance in commits
- Write commits as if made by human developer
- Follow conventional commit format with clear descriptions
- Use descriptive branch names that explain the work being done