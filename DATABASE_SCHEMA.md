# Database Schema Reference

**Last Updated**: 2025-11-26
**Generated From**: `src/integrations/supabase/types.ts`

This document provides a comprehensive reference for all database tables, columns, views, and functions in the FastPass escrow platform. Use this as a quick reference when writing SQL queries or debugging database issues.

---

## Tables

### 1. `auth.users` (Supabase Auth - Managed)

**Description**: Core authentication table managed by Supabase Auth. Contains user credentials and auth metadata.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key, user ID |
| `email` | TEXT | NO | User's email address |
| `created_at` | TIMESTAMPTZ | NO | Account creation timestamp |
| `last_sign_in_at` | TIMESTAMPTZ | YES | Last successful login |
| `email_confirmed_at` | TIMESTAMPTZ | YES | Email verification timestamp |
| `confirmation_sent_at` | TIMESTAMPTZ | YES | Confirmation email sent time |

**Access**: Use `auth.admin.listUsers()` via service role key or query directly with admin privileges.

---

### 2. `public.profiles`

**Description**: User profiles with business logic (pricing, Stripe integration, admin flags).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | - | Primary key, references `auth.users.id` |
| `created_at` | TIMESTAMPTZ | YES | `now()` | Profile creation timestamp |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | Last update timestamp |
| `is_admin` | BOOLEAN | YES | `false` | Admin privileges flag |
| `price` | DECIMAL(10,2) | YES | `null` | Default price for 24h response |
| `stripe_account_id` | TEXT | YES | `null` | Stripe Connect account ID |
| `stripe_onboarding_completed` | BOOLEAN | YES | `false` | Stripe onboarding status |

**Foreign Keys**:
- `id` → `auth.users(id)` (implicit via trigger)

**Indexes**:
- `profiles_pkey` on `id`

**RLS Policies**:
- Users can view/update their own profile
- Admins can view all profiles

**Important Notes**:
- ⚠️ **NO `email` or `full_name` columns** - Email is in `auth.users`
- ⚠️ Column is `stripe_account_id`, NOT `stripe_connect_account_id`
- Profile created automatically via trigger when auth user signs up

---

### 3. `public.messages`

**Description**: Message metadata (NO message body stored for privacy).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | NO | - | Recipient user ID |
| `sender_email` | TEXT | NO | - | Sender's email address |
| `content` | TEXT | NO | - | Message content (encrypted/hashed) |
| `amount_paid` | DECIMAL(10,2) | NO | - | Payment amount in EUR |
| `response_deadline_hours` | INTEGER | YES | `24` | Response deadline (24/48/72) |
| `attachments` | TEXT[] | YES | `null` | Attachment URLs/paths |
| `read` | BOOLEAN | YES | `false` | Message read status |
| `notification_sent` | BOOLEAN | YES | `false` | Email notification sent flag |
| `created_at` | TIMESTAMPTZ | YES | `now()` | Message creation timestamp |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | Last update timestamp |

**Constraints**:
- `check_sender_email_format`: Validates email format
- `check_content_length`: Content must be 10-10,000 characters
- `check_response_deadline`: Deadline must be 1-168 hours

**Indexes**:
- `messages_pkey` on `id`
- `idx_messages_user_id` on `user_id`

**RLS Policies**:
- Users can view/update/delete their own messages

---

### 4. `public.escrow_transactions`

**Description**: Payment tracking, escrow status, and expiry management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `message_id` | UUID | YES | `null` | Related message ID |
| `stripe_payment_intent_id` | TEXT | NO | - | Stripe PaymentIntent ID (UNIQUE) |
| `amount` | DECIMAL(10,2) | NO | - | Payment amount in EUR |
| `currency` | TEXT | YES | `'EUR'` | Currency code |
| `status` | TEXT | YES | `'pending'` | Transaction status |
| `recipient_user_id` | UUID | YES | `null` | Recipient's user ID |
| `sender_email` | TEXT | NO | - | Sender's email |
| `expires_at` | TIMESTAMPTZ | YES | `null` | Expiry timestamp |
| `created_at` | TIMESTAMPTZ | YES | `now()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | Last update timestamp |

**Status Values**:
- `pending` - Payment intent created, not yet captured
- `held` - Funds captured, awaiting response
- `released` - Response received, funds distributed
- `pending_user_setup` - Response received but recipient hasn't configured Stripe
- `refunded` - No response, funds refunded to sender
- `failed` - Payment failed

**Foreign Keys**:
- `message_id` → `messages(id)` ON DELETE CASCADE
- `recipient_user_id` → `profiles(id)`

**Constraints**:
- `check_sender_email_format`: Validates email format
- `check_amount_range`: Amount must be 0-10,000 EUR

**Indexes**:
- `escrow_transactions_pkey` on `id`
- `idx_escrow_transactions_status` on `status`
- `idx_escrow_transactions_expires_at` on `expires_at`
- `escrow_transactions_stripe_payment_intent_id_key` on `stripe_payment_intent_id` (UNIQUE)

**RLS Policies**:
- Users can view transactions where they are recipient OR sender
- Admins can view all transactions
- System can insert/update transactions

---

### 5. `public.message_responses`

**Description**: Response tracking metadata (NO response content stored).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `message_id` | UUID | YES | `null` | Related message ID |
| `escrow_transaction_id` | UUID | YES | `null` | Related escrow transaction |
| `has_response` | BOOLEAN | YES | `false` | Response received flag |
| `response_received_at` | TIMESTAMPTZ | YES | `null` | Response timestamp |
| `validated_by_admin` | BOOLEAN | YES | `false` | Admin validation flag |
| `validated_at` | TIMESTAMPTZ | YES | `null` | Admin validation timestamp |
| `admin_notes` | TEXT | YES | `null` | Admin validation notes |
| `email_thread_id` | TEXT | YES | `null` | Email conversation thread ID |
| `created_at` | TIMESTAMPTZ | YES | `now()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | Last update timestamp |

**Foreign Keys**:
- `message_id` → `messages(id)` ON DELETE CASCADE
- `escrow_transaction_id` → `escrow_transactions(id)` ON DELETE CASCADE

**Indexes**:
- `message_responses_pkey` on `id`
- `idx_message_responses_message_id` on `message_id`
- `idx_message_responses_has_response` on `has_response`

**RLS Policies**:
- Users can view responses for their messages
- Admins can view/update all responses
- System can insert responses

---

### 6. `public.email_response_tracking`

**Description**: Detailed email response tracking with webhook audit trail.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `message_id` | UUID | NO | - | Related message ID |
| `original_email_id` | TEXT | NO | - | Original outbound email ID |
| `inbound_email_id` | TEXT | YES | `null` | Inbound reply email ID |
| `response_detected_method` | TEXT | NO | - | Detection method (webhook/manual) |
| `response_received_at` | TIMESTAMPTZ | NO | - | Response timestamp |
| `within_deadline` | BOOLEAN | NO | `true` | Within deadline flag |
| `grace_period_used` | BOOLEAN | NO | `false` | 15-min grace period used |
| `response_email_from` | TEXT | YES | `null` | Reply sender email |
| `response_email_subject` | TEXT | YES | `null` | Reply subject line |
| `response_content_preview` | TEXT | YES | `null` | First 200 chars of reply |
| `email_headers` | JSONB | YES | `null` | Full email headers |
| `metadata` | JSONB | YES | `null` | Additional metadata |
| `quality_score` | INTEGER | YES | `null` | Response quality (0-100) |
| `quality_notes` | TEXT | YES | `null` | Quality assessment notes |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Tracking record creation |

**Foreign Keys**:
- `message_id` → `messages(id)`

**Indexes**:
- `email_response_tracking_pkey` on `id`

**RLS Policies**:
- Users can view tracking for their messages
- Admins can view all tracking records

**Important**: Contains webhook audit trail including headers for debugging

---

### 7. `public.email_logs`

**Description**: Email delivery tracking (sent, delivered, opened, clicked, bounced, spam).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `message_id` | UUID | YES | `null` | Related message ID |
| `sender_email` | TEXT | NO | - | From email address |
| `recipient_email` | TEXT | NO | - | To email address |
| `email_type` | TEXT | NO | - | Email type (message/notification/reminder) |
| `email_service_provider` | TEXT | YES | `null` | Provider (Postmark/SendGrid) |
| `email_provider_id` | TEXT | YES | `null` | Provider's message ID |
| `sent_at` | TIMESTAMPTZ | NO | `now()` | Email sent timestamp |
| `delivered_at` | TIMESTAMPTZ | YES | `null` | Delivery confirmation |
| `opened_at` | TIMESTAMPTZ | YES | `null` | Email opened timestamp |
| `clicked_at` | TIMESTAMPTZ | YES | `null` | Link clicked timestamp |
| `bounced_at` | TIMESTAMPTZ | YES | `null` | Bounce timestamp |
| `spam_at` | TIMESTAMPTZ | YES | `null` | Spam complaint timestamp |
| `failed_at` | TIMESTAMPTZ | YES | `null` | Failure timestamp |
| `failure_reason` | TEXT | YES | `null` | Failure error message |
| `response_detected_at` | TIMESTAMPTZ | YES | `null` | Response received |
| `metadata` | JSONB | YES | `null` | Additional metadata |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Log entry creation |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | Last update timestamp |

**Foreign Keys**:
- `message_id` → `messages(id)`

**Indexes**:
- `email_logs_pkey` on `id`
- `idx_email_logs_message_id` on `message_id`
- `idx_email_logs_email_type` on `email_type`

**RLS Policies**:
- Users can view logs for their messages
- Admins can view all email logs

---

### 8. `public.pricing_tiers`

**Description**: Custom pricing for different response deadlines (24h/48h/72h).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | YES | `null` | User who set this pricing |
| `deadline_hours` | INTEGER | NO | - | Response deadline (24/48/72) |
| `price` | DECIMAL(10,2) | NO | - | Price in EUR (minimum €10) |
| `is_active` | BOOLEAN | YES | `true` | Active pricing tier |
| `created_at` | TIMESTAMPTZ | YES | `now()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | Last update timestamp |

**Foreign Keys**:
- `user_id` → `profiles(id)` ON DELETE CASCADE

**Constraints**:
- `check_price_range`: Price must be 0-10,000 EUR
- `check_deadline_hours`: Deadline must be 1-168 hours
- `UNIQUE(user_id, deadline_hours)`: One price per deadline per user

**Indexes**:
- `pricing_tiers_pkey` on `id`
- `idx_pricing_tiers_user_deadline` on `(user_id, deadline_hours)`
- `idx_pricing_tiers_active` on `is_active`

**RLS Policies**:
- Users can manage their own pricing tiers
- Public can view active pricing tiers (for anonymous payment page)

---

### 9. `public.admin_actions`

**Description**: Audit trail for admin operations (validate response, manual refund, etc.).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `admin_user_id` | TEXT | YES | `null` | Admin who performed action |
| `action_type` | TEXT | NO | - | Action type |
| `description` | TEXT | YES | `null` | Human-readable description |
| `escrow_transaction_id` | UUID | YES | `null` | Related transaction |
| `message_response_id` | UUID | YES | `null` | Related response |
| `notes` | TEXT | YES | `null` | Admin notes |
| `metadata` | JSONB | YES | `null` | Additional metadata |
| `created_at` | TIMESTAMPTZ | YES | `now()` | Action timestamp |

**Action Types**:
- `validate_response` - Admin validated response
- `reject_response` - Admin rejected response
- `refund_manual` - Manual refund initiated
- `release_manual` - Manual payout initiated

**Foreign Keys**:
- `admin_user_id` → `profiles(id)`
- `escrow_transaction_id` → `escrow_transactions(id)`
- `message_response_id` → `message_responses(id)`

**Indexes**:
- `admin_actions_pkey` on `id`
- `idx_admin_actions_created_at` on `created_at`

**RLS Policies**:
- Only admins can view/insert admin actions

---

### 10. `public.security_audit`

**Description**: Security event logging (login attempts, privilege changes, suspicious activity).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | YES | `null` | Related user ID |
| `event_type` | TEXT | NO | - | Event type |
| `event_data` | JSONB | YES | `null` | Event details |
| `ip_address` | INET | YES | `null` | IP address |
| `user_agent` | TEXT | YES | `null` | User agent string |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Event timestamp |

**Event Types**:
- `admin_privilege_change` - Admin status modified
- `failed_login` - Failed authentication attempt
- `suspicious_activity` - Flagged suspicious behavior

**Indexes**:
- `security_audit_pkey` on `id`
- `idx_security_audit_user_id` on `user_id`
- `idx_security_audit_event_type` on `event_type`
- `idx_security_audit_created_at` on `created_at`

**RLS Policies**:
- Only admins can view security audit
- System can insert audit logs

---

### 11. `public.webhook_events`

**Description**: Idempotency tracking for Stripe webhooks (prevents duplicate processing).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `event_id` | TEXT | NO | - | Stripe event ID (UNIQUE) |
| `event_type` | TEXT | NO | - | Stripe event type |
| `processed_at` | TIMESTAMPTZ | YES | `null` | Processing timestamp |
| `created_at` | TIMESTAMPTZ | YES | `now()` | First received timestamp |

**Indexes**:
- `webhook_events_pkey` on `id`
- `webhook_events_event_id_key` on `event_id` (UNIQUE)

**RLS Policies**:
- System-only access (no user access)

**Important**: Check this table before processing Stripe webhooks to prevent duplicate operations

---

## Views

### 1. `public.email_stats`

**Description**: Aggregated email delivery statistics by email type.

| Column | Type | Description |
|--------|------|-------------|
| `email_type` | TEXT | Email type |
| `total_sent` | BIGINT | Total emails sent |
| `delivered` | BIGINT | Successfully delivered |
| `opened` | BIGINT | Emails opened |
| `clicked` | BIGINT | Links clicked |
| `failed` | BIGINT | Failed deliveries |
| `delivery_rate` | NUMERIC | Delivery success % |
| `open_rate` | NUMERIC | Open rate % |

**Usage**:
```sql
SELECT * FROM public.email_stats WHERE email_type = 'message';
```

---

### 2. `public.email_service_stats`

**Description**: Email statistics grouped by service provider (Postmark/SendGrid).

| Column | Type | Description |
|--------|------|-------------|
| `email_service_provider` | TEXT | Provider name |
| `total_sent` | BIGINT | Total sent |
| `delivered` | BIGINT | Delivered count |
| `opened` | BIGINT | Opened count |
| `clicked` | BIGINT | Clicked count |
| `bounced` | BIGINT | Bounced count |
| `spam` | BIGINT | Spam complaints |
| `failed` | BIGINT | Failed count |
| `delivery_rate` | NUMERIC | Delivery % |
| `failure_rate` | NUMERIC | Failure % |
| `open_rate` | NUMERIC | Open % |

---

### 3. `public.response_tracking_stats`

**Description**: Response detection statistics and quality metrics.

| Column | Type | Description |
|--------|------|-------------|
| `total_responses` | BIGINT | Total responses detected |
| `on_time_responses` | BIGINT | Within deadline |
| `grace_period_responses` | BIGINT | Used 15-min grace period |
| `webhook_detected` | BIGINT | Detected via Postmark webhook |
| `manually_marked` | BIGINT | Manually marked by admin |
| `on_time_percentage` | NUMERIC | On-time response % |
| `avg_quality_score` | NUMERIC | Average quality score |

---

### 4. `public.message_email_status`

**Description**: Email status summary per message.

| Column | Type | Description |
|--------|------|-------------|
| `message_id` | UUID | Message ID |
| `sender_email` | TEXT | Sender email |
| `recipient_user_id` | UUID | Recipient user ID |
| `emails_sent` | BIGINT | Total emails sent |
| `last_email_sent` | TIMESTAMPTZ | Last email timestamp |
| `any_delivered` | BOOLEAN | At least one delivered |
| `any_opened` | BOOLEAN | At least one opened |
| `any_failed` | BOOLEAN | At least one failed |

---

## Functions

### Security & Auth Functions

#### `public.is_admin()`
**Returns**: `BOOLEAN`
**Description**: Checks if current user is an admin
**Usage**:
```sql
SELECT public.is_admin(); -- Returns true/false
```

#### `public.get_current_user_email()`
**Returns**: `TEXT`
**Description**: Returns email of currently authenticated user
**Usage**:
```sql
SELECT public.get_current_user_email();
```

#### `public.get_current_user_id()`
**Returns**: `TEXT`
**Description**: Returns ID of currently authenticated user
**Usage**:
```sql
SELECT public.get_current_user_id();
```

#### `public.is_verified_admin()`
**Returns**: `BOOLEAN`
**Description**: Stricter admin check with additional verification
**Usage**:
```sql
SELECT public.is_verified_admin();
```

---

### Validation Functions

#### `public.is_valid_email(email_text TEXT)`
**Returns**: `BOOLEAN`
**Description**: Validates email format (regex + length checks)
**Usage**:
```sql
SELECT public.is_valid_email('test@example.com'); -- Returns true
```

#### `public.sanitize_text(input_text TEXT)`
**Returns**: `TEXT`
**Description**: Removes XSS vectors (strips `<>`, `javascript:`, `data:`)
**Usage**:
```sql
SELECT public.sanitize_text('<script>alert("xss")</script>'); -- Returns: scriptalert("xss")/script
```

---

### Business Logic Functions

#### `public.calculate_expiration_time(message_id UUID)`
**Returns**: `TIMESTAMPTZ`
**Description**: Calculates escrow expiration based on message deadline
**Usage**:
```sql
SELECT public.calculate_expiration_time('550e8400-e29b-41d4-a716-446655440000');
```

---

### Utility Functions

#### `public.clean_old_email_logs(days_to_keep INTEGER)`
**Returns**: `INTEGER` (number of deleted rows)
**Description**: Deletes email logs older than specified days (default: 90)
**Usage**:
```sql
SELECT public.clean_old_email_logs(30); -- Delete logs older than 30 days
```

#### `public.cleanup_old_webhook_events()`
**Returns**: `VOID`
**Description**: Deletes webhook events older than 30 days
**Usage**:
```sql
SELECT public.cleanup_old_webhook_events();
```

---

## Common Queries

### Query 1: List All Users with Profiles

```sql
SELECT
  u.id,
  u.email,
  u.created_at as user_created_at,
  u.last_sign_in_at,
  u.email_confirmed_at,
  p.is_admin,
  p.price as default_price,
  p.stripe_account_id,
  p.stripe_onboarding_completed,
  p.created_at as profile_created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;
```

### Query 2: Get User Transaction History

```sql
SELECT
  et.id as transaction_id,
  et.amount,
  et.status,
  et.created_at as paid_at,
  et.expires_at,
  m.content as message_preview,
  m.sender_email,
  mr.has_response,
  mr.response_received_at
FROM public.escrow_transactions et
LEFT JOIN public.messages m ON et.message_id = m.id
LEFT JOIN public.message_responses mr ON mr.escrow_transaction_id = et.id
WHERE et.recipient_user_id = auth.uid()
ORDER BY et.created_at DESC;
```

### Query 3: Active Pricing Tiers for User

```sql
SELECT
  pt.deadline_hours,
  pt.price,
  pt.is_active,
  pt.created_at
FROM public.pricing_tiers pt
WHERE pt.user_id = auth.uid()
  AND pt.is_active = true
ORDER BY pt.deadline_hours ASC;
```

### Query 4: Email Delivery Status for Message

```sql
SELECT
  el.email_type,
  el.sent_at,
  el.delivered_at,
  el.opened_at,
  el.failed_at,
  el.failure_reason,
  el.email_provider_id
FROM public.email_logs el
WHERE el.message_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY el.sent_at DESC;
```

### Query 5: Transactions Expiring Soon (Next 1 Hour)

```sql
SELECT
  et.id,
  et.amount,
  et.sender_email,
  et.expires_at,
  EXTRACT(EPOCH FROM (et.expires_at - NOW()))/60 as minutes_remaining,
  m.sender_email as message_from,
  u.email as recipient_email
FROM public.escrow_transactions et
LEFT JOIN public.messages m ON et.message_id = m.id
LEFT JOIN auth.users u ON et.recipient_user_id = u.id
WHERE et.status = 'held'
  AND et.expires_at > NOW()
  AND et.expires_at < NOW() + INTERVAL '1 hour'
ORDER BY et.expires_at ASC;
```

### Query 6: Admin Actions Log

```sql
SELECT
  aa.action_type,
  aa.created_at,
  u.email as admin_email,
  aa.description,
  aa.notes,
  aa.metadata
FROM public.admin_actions aa
LEFT JOIN auth.users u ON aa.admin_user_id::uuid = u.id
ORDER BY aa.created_at DESC
LIMIT 50;
```

### Query 7: Response Quality Stats

```sql
SELECT
  COUNT(*) as total_responses,
  AVG(quality_score) as avg_quality,
  COUNT(*) FILTER (WHERE within_deadline = true) as on_time,
  COUNT(*) FILTER (WHERE grace_period_used = true) as used_grace_period,
  COUNT(*) FILTER (WHERE response_detected_method = 'webhook') as webhook_detected,
  COUNT(*) FILTER (WHERE response_detected_method = 'manual') as manually_marked
FROM public.email_response_tracking
WHERE created_at > NOW() - INTERVAL '30 days';
```

---

## Important Notes

### Column Name Gotchas
- ⚠️ `profiles.stripe_account_id` NOT `stripe_connect_account_id`
- ⚠️ `profiles` table has NO `email` or `full_name` columns
- ⚠️ User email is in `auth.users.email`, not `profiles`

### RLS (Row Level Security)
- All tables have RLS enabled
- Anonymous access blocked by default
- Use service role key to bypass RLS for admin operations
- Payment functions use `verify_jwt = false` for anonymous payments

### Grace Period Logic
- Response deadline has 15-minute grace period for email delays
- Check `email_response_tracking.grace_period_used` to see if grace was needed
- Grace period prevents false refunds due to email network delays

### Status Transitions
**Escrow Transaction Lifecycle**:
1. `pending` → Payment intent created
2. `held` → Funds captured, waiting for response
3. `released` or `pending_user_setup` → Response received
4. `refunded` → No response, deadline expired

### Transaction Cleanup
- `check-escrow-timeouts` runs every 10 minutes (cron)
- Expired transactions with status `held` → auto-refund
- Webhook events auto-delete after 30 days

---

## Troubleshooting

### "Column does not exist" Error
- Check this document for exact column names
- Common mistake: `full_name` doesn't exist in `profiles`
- Use `auth.users` for email, not `profiles`

### Permission Denied Errors
- Check RLS policies for the table
- Use service role key for admin operations
- Verify user is authenticated for protected tables

### Webhook Not Processing
- Check `webhook_events` table for duplicate event_id
- Verify signature validation in Edge Function
- Check Postmark/Stripe webhook logs

---

**End of Schema Reference**
