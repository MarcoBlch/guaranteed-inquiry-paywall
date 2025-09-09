# FASTPASS Escrow System

A premium contact platform that allows busy professionals to get paid for responding to messages with guaranteed response times.

## 🚀 Quick Start

### Local Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

## 📦 Deployment

### Vercel Deployment (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`

### Manual Vercel Setup
1. Go to [vercel.com](https://vercel.com)
2. Connect your GitHub repository
3. Set environment variables in Settings > Environment Variables
4. Deploy automatically from main branch

### Environment Variables
Set these in your deployment platform:
- `VITE_SUPABASE_URL=https://znncfayiwfamujvrprvf.supabase.co`
- `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubmNmYXlpd2ZhbXVqdnJwcnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3OTY5MDQsImV4cCI6MjA2MDM3MjkwNH0.NcM9yKGoQsttzE4cYfqhyV1aG7fvt-lQCHZKy5CPHCk`
- `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51RiErSRrgEEFpaiMLBBwEwv3hzswFpxx99iToSwtF1R0ouwbFHQygddjv7ABOuKELDjgO0e7tL9DkZiYVINdStjS00OQpDFGqR`

## 🏗️ Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (Auth + Database + Edge Functions)
- **Payment**: Stripe + Stripe Connect
- **Email**: Resend API
- **State Management**: React Query

## 🔧 Project Structure
```
src/
├── components/       # Reusable UI components
├── pages/           # Main application pages
├── contexts/        # React contexts
├── hooks/          # Custom React hooks
├── lib/            # Utility functions
└── integrations/   # External service integrations

supabase/
├── functions/      # Edge functions
├── migrations/     # Database migrations
└── config.toml     # Supabase configuration
```

## 📱 Key Features
- **Escrow Payment System** - 75/25 revenue split
- **Response Guarantees** - 24h/48h/72h response times
- **Admin Dashboard** - Analytics and user management
- **Email Notifications** - Deadline reminders and notifications
- **Stripe Connect** - Automatic payouts to users
- **Mobile Responsive** - Works on all devices

## 🔐 Admin Access
- Admin setup available at `/admin-setup`
- Requires admin privileges granted via database migration
- Full analytics and user management capabilities

## 🌐 Live App
- **Production**: https://fastpass.email/
- **Admin Panel**: https://fastpass.email/admin-setup

## 📚 Architecture Overview

### Payment Flow (75/25 Split)
1. **Payment** → Escrow on main account (status: 'held')
2. **Message sent** → Timer based on chosen deadline (24h/48h/72h)
3. **Response received** → Auto-capture + Distribution:
   - 75% → Transfer to user (if Stripe Connect configured)
   - 25% → Remains on main account (commission)
4. **No response** → Auto-cancel + Refund

### Transaction Status
- `held` → Funds in escrow, awaiting response
- `released` → Response received, funds distributed
- `pending_user_setup` → Response received but user hasn't set up Stripe
- `refunded` → Timeout, funds refunded

### Monitoring
- **Health Check**: `/functions/v1/escrow-health-check`
- **Cron Jobs**: GitHub Actions checking timeouts every 10 minutes
- **Admin Analytics**: Comprehensive KPIs and metrics

## 🔒 Security
- **Row Level Security (RLS)** enabled on all tables
- **JWT verification** for protected endpoints
- **Stripe Connect** for secure fund distribution
- **Automatic timeouts** with refund protection

See `CLAUDE.md` for comprehensive technical documentation.