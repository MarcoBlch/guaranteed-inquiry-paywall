# Security Checklist & Best Practices

This document provides security analysis and best practices for the FastPass escrow platform. It serves as the equivalent to Brakeman for Ruby on Rails, adapted for a React + Supabase + Edge Functions stack.

## Table of Contents

1. [Security Overview](#security-overview)
2. [Current Security Posture](#current-security-posture)
3. [Vulnerability Checklist](#vulnerability-checklist)
4. [Best Practices](#best-practices)
5. [Security Audit Results](#security-audit-results)
6. [Action Items](#action-items)

---

## Security Overview

### Tech Stack Security Model

- **Frontend (React)**: Client-side security (XSS, CSRF, sensitive data exposure)
- **Backend (Supabase)**: Row Level Security (RLS), JWT authentication
- **Edge Functions (Deno)**: Input validation, webhook signature verification
- **Database (PostgreSQL)**: RLS policies, encrypted at rest
- **Payments (Stripe)**: PCI DSS compliant, webhook signatures

---

## Current Security Posture

### ✅ Strengths

1. **Row Level Security (RLS)**: All database tables have RLS policies enabled
2. **Input Sanitization**: XSS prevention in `process-escrow-payment` (lines 64-69)
3. **Webhook Verification**: Stripe and Postmark webhooks verify signatures
4. **No Sensitive Data in Frontend**: API keys are server-side only
5. **JWT Authentication**: Protected routes use Supabase Auth
6. **HTTPS Enforced**: All communications use TLS
7. **Rate Limiting**: Implemented in `_shared/rateLimiter.ts`

### ⚠️ Areas of Concern

1. **CORS Configuration**: Many Edge Functions use `Access-Control-Allow-Origin: '*'`
2. **Environment Variables**: Some functions don't validate required secrets
3. **Content Security Policy**: Not explicitly set in frontend
4. **CSRF Protection**: No explicit CSRF tokens (relies on SameSite cookies)
5. **dangerouslySetInnerHTML**: Used in chart.tsx (controlled, but still risky)

---

## Vulnerability Checklist

### 1. SQL Injection

**Status**: ✅ **PROTECTED**

- **Why**: Supabase uses parameterized queries by default
- **Verification**: No raw SQL concatenation found in codebase
- **Supabase JS Client**: Automatically escapes inputs

**Example (Safe)**:
```tsx
// ✅ Safe: Supabase client uses parameterized queries
const { data } = await supabase
  .from('messages')
  .select('*')
  .eq('user_id', userId); // Automatically escaped
```

**Red Flags to Avoid**:
```tsx
// ❌ NEVER DO THIS (bypasses parameterization)
const { data } = await supabase.rpc('unsafe_query', {
  query: `SELECT * FROM messages WHERE user_id = '${userId}'` // SQL injection risk!
});
```

**Action**: Continue using Supabase client methods. If using RPC functions, always use parameterized queries.

---

### 2. Cross-Site Scripting (XSS)

**Status**: ⚠️ **MOSTLY PROTECTED** (1 finding)

#### Protections in Place

1. **React Default Escaping**: React automatically escapes `{variables}` in JSX
2. **Input Sanitization in Edge Functions**:
   - `process-escrow-payment/index.ts` (lines 64-69): Removes `<>`, `javascript:`, `data:`
3. **DOMPurify**: Installed (`@types/dompurify` in package.json)

#### Findings

**Finding #1: `dangerouslySetInnerHTML` in chart.tsx**

**File**: `src/components/ui/chart.tsx` (line 79)

**Risk**: MEDIUM (Controlled, but risky pattern)

**Current Code**:
```tsx
<style
  dangerouslySetInnerHTML={{
    __html: Object.entries(THEMES)
      .map(([theme, prefix]) => `
        ${prefix} [data-chart=${id}] {
          ${colorConfig.map([key, itemConfig] => {
            const color = itemConfig.theme?.[theme] || itemConfig.color;
            return color ? `--color-${key}: ${color};` : null;
          }).join("\n")}
        }
      `)
      .join("\n"),
  }}
/>
```

**Analysis**:
- **Safe if**: `colorConfig` is always controlled (from internal theme config)
- **Unsafe if**: User input can reach `itemConfig.color` or `itemConfig.theme`

**Current Usage**: Only used with shadcn/ui chart components (internal config, not user input)

**Recommendation**: ✅ **SAFE** (internal data only), but monitor for future changes.

**Mitigation (if needed)**:
```tsx
// If color config ever comes from user input, sanitize:
import DOMPurify from 'dompurify';

const sanitizedColor = DOMPurify.sanitize(itemConfig.color);
```

#### XSS Prevention Checklist

- [x] React escapes all `{variables}` by default
- [x] User input sanitized in Edge Functions before database storage
- [x] No `eval()` or `Function()` constructors found
- [x] No direct `innerHTML` assignments (only controlled `dangerouslySetInnerHTML`)
- [x] DOMPurify available for future sanitization needs
- [ ] Consider Content Security Policy (CSP) headers

**Action**: Add CSP headers to prevent inline script execution.

---

### 3. Cross-Site Request Forgery (CSRF)

**Status**: ⚠️ **PARTIAL PROTECTION**

#### Current Protection

1. **SameSite Cookies**: Supabase Auth uses `SameSite=Lax` by default
2. **CORS Restrictions**: Some functions restrict origins (e.g., `create-stripe-payment`)
3. **JWT Tokens**: Protected routes require `Authorization` header (not cookies)

#### Concern

- **Anonymous Payment Flow**: No CSRF tokens on `/pay/:userId` (by design, for frictionless UX)
- **Edge Functions with `*` CORS**: Allow requests from any origin

#### Risk Assessment

- **Payment Flow**: Low risk (payment intent requires Stripe 3D Secure)
- **Authenticated Actions**: Low risk (JWT in `Authorization` header, not vulnerable to CSRF)

**Recommendation**: ✅ **ACCEPTABLE** (JWT auth mitigates CSRF). Consider adding CSRF tokens if switching to cookie-based auth.

---

### 4. Sensitive Data Exposure

**Status**: ✅ **PROTECTED**

#### Environment Variables

**Frontend** (`.env` file):
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_...  # ✅ Safe (publishable key, meant to be public)
VITE_SUPABASE_URL=https://...       # ✅ Safe (public URL)
VITE_SUPABASE_ANON_KEY=eyJ...       # ✅ Safe (anon key, RLS protects data)
```

**Backend** (Supabase Dashboard → Edge Functions → Secrets):
```bash
STRIPE_SECRET_KEY=sk_...                    # ✅ Server-side only
STRIPE_WEBHOOK_SECRET=whsec_...             # ✅ Server-side only
POSTMARK_SERVER_TOKEN=...                   # ✅ Server-side only
POSTMARK_INBOUND_WEBHOOK_SECRET=...         # ✅ Server-side only
SUPABASE_SERVICE_ROLE_KEY=...               # ✅ Server-side only
```

**Findings**:
- ✅ No secrets hardcoded in source code
- ✅ `.env` file in `.gitignore`
- ✅ Frontend only uses public keys (VITE_ prefix)
- ✅ Sensitive keys only in Supabase Dashboard (encrypted at rest)

**Recommendations**:
1. Rotate `SUPABASE_SERVICE_ROLE_KEY` periodically
2. Use separate Stripe accounts for dev/staging/production
3. Never log `Authorization` headers or API keys

---

### 5. Broken Authentication

**Status**: ✅ **PROTECTED**

#### Current Implementation

1. **Supabase Auth**: Industry-standard OAuth 2.0 + JWT
2. **Password Requirements**: Enforced by Supabase (min 8 chars)
3. **Session Management**: HTTPOnly cookies + JWT refresh tokens
4. **Protected Routes**: `ProtectedRoute.tsx` checks `session.access_token`
5. **Admin Routes**: `AdminRoute.tsx` checks `is_admin` flag in database

#### Session Handling

```tsx
// src/contexts/AuthContext.tsx
const { data: { session } } = await supabase.auth.getSession();

// Automatic token refresh
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed');
  }
});
```

**Recommendation**: ✅ **SECURE** (Supabase handles auth securely)

---

### 6. Security Misconfiguration

**Status**: ⚠️ **NEEDS IMPROVEMENT**

#### Findings

**Finding #1: Overly Permissive CORS**

**Issue**: Many Edge Functions use `Access-Control-Allow-Origin: '*'`

**Affected Functions** (21 total):
- `send-refund-notification`
- `verify-stripe-status`
- `postmark-send-message`
- `mark-response-received`
- ... (see full list in grep results)

**Risk**: MEDIUM (allows requests from any origin)

**Exception**: 2 functions correctly restrict CORS:
- `create-stripe-payment`: Restricts to `fastpass.email` in production
- `process-escrow-payment`: Restricts to `fastpass.email` in production

**Current (Insecure)**:
```ts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // ❌ Allows any origin
};
```

**Recommended (Secure)**:
```ts
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ENVIRONMENT') === 'production'
    ? 'https://fastpass.email'
    : '*',  // Allow all origins in development only
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Action**: Update all Edge Functions to restrict CORS in production.

**Finding #2: Missing Security Headers**

**Issue**: No Content Security Policy (CSP), X-Frame-Options, or X-Content-Type-Options headers

**Recommendation**: Add security headers to frontend responses.

**Implementation** (add to `vite.config.ts` or Vercel config):
```ts
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=()"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.stripe.com;"
        }
      ]
    }
  ]
}
```

---

### 7. Insecure Deserialization

**Status**: ✅ **PROTECTED**

- **JSON Parsing**: Only parses trusted sources (Stripe, Postmark webhooks with signature verification)
- **No `eval()`**: Not found in codebase
- **Webhook Validation**: All webhooks verify signatures before processing

**Example (Secure)**:
```ts
// postmark-inbound-webhook/index.ts
// ✅ Verifies signature before parsing
const authHeader = req.headers.get('authorization');
if (credentials !== expectedCredentials) {
  return new Response('Unauthorized', { status: 401 });
}
const inboundEmail = await req.json(); // Safe after auth
```

---

### 8. Using Components with Known Vulnerabilities

**Status**: ✅ **GOOD** (with monitoring required)

**Check for vulnerabilities**:
```bash
npm audit
```

**Current Status** (as of 2026-01-09):
- No critical vulnerabilities detected

**Recommendation**:
- Run `npm audit` weekly
- Update dependencies monthly
- Use Dependabot (GitHub) for automated security updates

---

### 9. Insufficient Logging & Monitoring

**Status**: ⚠️ **NEEDS IMPROVEMENT**

#### Current Logging

1. **Edge Functions**: Console logs visible in Supabase Dashboard
2. **Security Events**: Logged to `security_audit` table
3. **Admin Actions**: Logged to `admin_actions` table
4. **Email Tracking**: Logged to `email_logs` and `email_response_tracking`

#### Missing

1. **Failed Authentication Attempts**: Not tracked
2. **Rate Limiting Violations**: Logged but not alerted
3. **Suspicious Activity Detection**: No anomaly detection
4. **Centralized Error Tracking**: No Sentry/Datadog integration

**Recommendation**: Add Sentry for error tracking and alerting.

```bash
npm install @sentry/react @sentry/vite-plugin
```

---

### 10. Insufficient Rate Limiting

**Status**: ✅ **PROTECTED** (basic implementation)

#### Current Implementation

**File**: `supabase/functions/_shared/rateLimiter.ts`

**Usage**:
```ts
import { checkRateLimit } from '../_shared/rateLimiter.ts';

// Check rate limit (5 requests per 60 seconds)
if (!await checkRateLimit(req, 'payment-submit', { maxRequests: 5, windowMs: 60000 })) {
  return new Response('Too many requests', { status: 429 });
}
```

**Coverage**:
- ✅ Payment submission (frontend: `StripeEscrowForm.tsx` line 76)
- ✅ Some Edge Functions use rate limiting

**Gaps**:
- ❌ No rate limiting on authentication endpoints
- ❌ No IP-based rate limiting (uses in-memory, resets on cold start)

**Recommendation**:
1. Use Redis for persistent rate limiting (survives cold starts)
2. Add rate limiting to all public Edge Functions
3. Implement IP-based blocking for repeated violations

---

## Best Practices

### Input Validation

#### Edge Functions

Always validate and sanitize user input:

```ts
// ✅ Good: Comprehensive validation
const { email, message, price } = await req.json();

// Validate email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  throw new Error('Invalid email format');
}

// Validate message length
if (!message || message.length < 10 || message.length > 10000) {
  throw new Error('Message must be 10-10000 characters');
}

// Validate price range
if (typeof price !== 'number' || price <= 0 || price > 100000) {
  throw new Error('Invalid price');
}

// Sanitize content
const sanitizedMessage = message
  .replace(/[<>]/g, '')           // Remove HTML tags
  .replace(/javascript:/gi, '')   // Remove javascript: protocol
  .replace(/data:/gi, '')         // Remove data: protocol
  .trim();
```

#### Frontend

Use validation libraries like Zod:

```tsx
import { z } from 'zod';

const messageSchema = z.object({
  email: z.string().email(),
  content: z.string().min(10).max(10000),
  price: z.number().positive().max(100000),
});

const result = messageSchema.safeParse(userInput);
if (!result.success) {
  toast.error(result.error.errors[0].message);
  return;
}
```

### Webhook Security

Always verify webhook signatures:

```ts
// ✅ Stripe webhook verification
import Stripe from 'stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const signature = req.headers.get('stripe-signature')!;
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

try {
  const event = await stripe.webhooks.constructEventAsync(
    await req.text(),
    signature,
    webhookSecret
  );
  // Process event
} catch (error) {
  console.error('Invalid signature');
  return new Response('Invalid signature', { status: 400 });
}
```

### Database Security

#### Row Level Security (RLS)

Verify RLS policies for all tables:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- View policies
SELECT * FROM pg_policies WHERE tablename = 'messages';
```

**Example RLS Policy**:
```sql
-- Users can only see their own messages
CREATE POLICY "Users can view own messages"
  ON messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only update their own messages
CREATE POLICY "Users can update own messages"
  ON messages
  FOR UPDATE
  USING (auth.uid() = user_id);
```

### Secret Management

1. **Never commit secrets**: Use `.env` files (in `.gitignore`)
2. **Rotate regularly**: Change API keys quarterly
3. **Use separate keys per environment**: Dev, staging, production
4. **Store in Supabase Dashboard**: Edge Functions → Secrets
5. **Audit access**: Review who has access to secrets

---

## Security Audit Results

### Summary

| Category | Status | Findings |
|----------|--------|----------|
| SQL Injection | ✅ Protected | 0 vulnerabilities |
| XSS | ⚠️ Mostly Protected | 1 controlled use of `dangerouslySetInnerHTML` |
| CSRF | ⚠️ Partial Protection | JWT auth mitigates risk |
| Sensitive Data Exposure | ✅ Protected | 0 hardcoded secrets |
| Broken Authentication | ✅ Protected | Supabase Auth is secure |
| Security Misconfiguration | ⚠️ Needs Improvement | CORS too permissive, missing CSP |
| Insecure Deserialization | ✅ Protected | Webhook signatures verified |
| Known Vulnerabilities | ✅ Good | No critical npm vulnerabilities |
| Logging & Monitoring | ⚠️ Needs Improvement | No centralized error tracking |
| Rate Limiting | ✅ Protected | Basic rate limiting implemented |

**Overall Risk Level**: **LOW-MEDIUM** (production-ready with recommended improvements)

---

## Action Items

### High Priority (Fix Before Production)

1. **Restrict CORS in Edge Functions**
   - Update all functions to use environment-based CORS (like `create-stripe-payment`)
   - Restrict to `https://fastpass.email` in production

2. **Add Content Security Policy (CSP)**
   - Add CSP headers to `vercel.json` or `vite.config.ts`
   - Prevent inline script execution

3. **Add Centralized Error Tracking**
   - Install Sentry or similar service
   - Track errors, performance, security events

### Medium Priority (Improve Security Posture)

4. **Implement Persistent Rate Limiting**
   - Use Redis or Supabase for rate limit storage
   - Survives Edge Function cold starts

5. **Add Security Headers**
   - X-Frame-Options
   - X-Content-Type-Options
   - Referrer-Policy
   - Permissions-Policy

6. **Audit RLS Policies**
   - Review all tables have appropriate policies
   - Test with different user roles

### Low Priority (Nice to Have)

7. **Add CSRF Tokens for Anonymous Flow**
   - Consider adding tokens to `/pay/:userId` form
   - Balance security vs UX friction

8. **Implement Anomaly Detection**
   - Track unusual patterns (e.g., many failed payments from same IP)
   - Auto-block suspicious activity

9. **Add Security Documentation**
   - Document security architecture
   - Create incident response plan

---

## Testing Security

### Manual Testing

1. **Test RLS Policies**:
   ```sql
   -- Login as User A
   SET request.jwt.claims.sub = 'user-a-id';

   -- Try to access User B's data (should fail)
   SELECT * FROM messages WHERE user_id = 'user-b-id';
   ```

2. **Test Rate Limiting**:
   ```bash
   # Send 10 requests in quick succession
   for i in {1..10}; do
     curl -X POST https://your-function-url/payment \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com"}'
   done
   # Should receive 429 Too Many Requests after threshold
   ```

3. **Test XSS Protection**:
   - Submit message with `<script>alert('XSS')</script>`
   - Verify it's escaped or sanitized in UI

### Automated Testing

```bash
# Check for vulnerable dependencies
npm audit

# Run security linting
npm run lint

# Test authentication flow
npm run test:auth
```

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Stripe Security](https://stripe.com/docs/security/stripe)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

**Last Updated**: 2026-01-09
**Next Review**: 2026-04-09 (Quarterly)
