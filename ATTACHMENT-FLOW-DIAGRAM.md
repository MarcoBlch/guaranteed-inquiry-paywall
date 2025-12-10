# File Attachment Feature - Flow Diagram

## Complete User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER VISITS /pay/:userId                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     PAYMENT FORM LOADS                           │
│  Components: EmailInput, MessageInput, FileUploadSection,       │
│              ResponseTimeSelector                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│               USER FILLS OUT FORM                                │
│  - Email: sender@example.com                                     │
│  - Message: "I'd like to discuss..."                             │
│  - Files: [image.jpg, document.pdf]  ← NEW                       │
│  - Response Time: 24 hours                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│            USER CLICKS "Continue to payment"                     │
│                                                                   │
│  1. Frontend Validation:                                         │
│     - validateEmail(email) ✓                                     │
│     - validateMessage(message) ✓                                 │
│     - validateFiles(files) ✓  ← NEW                              │
│       * Max 5 files                                              │
│       * Max 10MB each                                            │
│       * Max 50MB total                                           │
│       * Allowed types only                                       │
│       * Safe filenames                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                         ┌─────────┐
                         │ Files?  │
                         └─────────┘
                          ↙       ↘
                     YES ↙         ↘ NO
                        ↓           ↓
          ┌──────────────────────┐  │
          │  UPLOAD FILES        │  │
          │  (NEW FLOW)          │  │
          └──────────────────────┘  │
                    ↓                │
          ┌──────────────────────┐  │
          │ 1. Show "Uploading"  │  │
          │    loading state     │  │
          └──────────────────────┘  │
                    ↓                │
          ┌──────────────────────┐  │
          │ 2. Create FormData   │  │
          │    with all files    │  │
          └──────────────────────┘  │
                    ↓                │
          ┌──────────────────────┐  │
          │ 3. POST to Edge      │  │
          │    Function:         │  │
          │    upload-message-   │  │
          │    attachment        │  │
          └──────────────────────┘  │
                    ↓                │
          ┌──────────────────────┐  │
          │ EDGE FUNCTION        │  │
          │ PROCESSING           │  │
          ├──────────────────────┤  │
          │ 1. Parse FormData    │  │
          │ 2. Validate count    │  │
          │ 3. Validate sizes    │  │
          │ 4. Validate types    │  │
          │ 5. Sanitize names    │  │
          │ 6. Generate UUIDs    │  │
          │ 7. Upload to Storage │  │
          │ 8. Return URLs       │  │
          └──────────────────────┘  │
                    ↓                │
          ┌──────────────────────┐  │
          │ 4. Store URLs in     │  │
          │    attachmentUrls    │  │
          │    state             │  │
          └──────────────────────┘  │
                    ↓                │
          ┌──────────────────────┐  │
          │ 5. Show success      │  │
          │    toast             │  │
          └──────────────────────┘  │
                    ↓                │
                    └────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SHOW PAYMENT FORM                             │
│                                                                   │
│  Summary:                                                        │
│  - Response time: 24 hours                                       │
│  - Price: 50.00€                                                 │
│  - Email: sender@example.com                                     │
│  - Attachments: 2 file(s)  ← NEW                                 │
│                                                                   │
│  [Stripe Card Input]                                             │
│  [Pay €50.00]                                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  USER COMPLETES PAYMENT                          │
│                                                                   │
│  1. create-stripe-payment → PaymentIntent                        │
│  2. stripe.confirmCardPayment                                    │
│  3. capture-stripe-payment                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              process-escrow-payment                              │
│                                                                   │
│  1. Create message record with:                                  │
│     - content: sanitized message                                 │
│     - attachments: [url1, url2]  ← NEW                           │
│                                                                   │
│  2. Create escrow_transactions record                            │
│                                                                   │
│  3. Create message_responses record                              │
│                                                                   │
│  4. Call postmark-send-message with:                             │
│     - senderEmail, senderMessage, etc.                           │
│     - attachmentUrls: [url1, url2]  ← NEW                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              postmark-send-message                               │
│                                                                   │
│  1. Generate HTML email with:                                    │
│     - Message content                                            │
│     - Attachment section:  ← NEW                                 │
│       📎 Attachments (2):                                        │
│       📄 image.jpg [download link]                               │
│       📄 document.pdf [download link]                            │
│                                                                   │
│  2. Generate plain text email with:                              │
│     - Message content                                            │
│     - ATTACHMENTS (2):  ← NEW                                    │
│       1. image.jpg                                               │
│          https://...supabase.co/storage/.../image.jpg            │
│       2. document.pdf                                            │
│          https://...supabase.co/storage/.../document.pdf         │
│                                                                   │
│  3. Send via Postmark API                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                RECIPIENT RECEIVES EMAIL                          │
│                                                                   │
│  From: sender@example.com                                        │
│  Message: "I'd like to discuss..."                               │
│                                                                   │
│  📎 Attachments (2):  ← NEW                                      │
│  📄 image.jpg [Click to download]                                │
│  📄 document.pdf [Click to download]                             │
│                                                                   │
│  [Reply to this email to claim payment]                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│           RECIPIENT CLICKS ATTACHMENT LINK                       │
│                                                                   │
│  Browser → Supabase Storage → File Download  ← NEW               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   FILE DOWNLOADED                                │
│                   ✓ Success                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Storage Architecture

```
Supabase Storage
├── message-attachments (bucket)
│   ├── 1733834567890-uuid-image.jpg
│   ├── 1733834567891-uuid-document.pdf
│   ├── 1733834567892-uuid-presentation.pdf
│   └── ...
│
├── Public Access: Yes
├── File Size Limit: 10MB per file
├── Allowed MIME Types:
│   ├── image/jpeg, image/jpg, image/png, image/gif
│   ├── application/pdf, text/plain
│   └── application/msword, application/vnd.openxmlformats...
│
└── RLS Policies:
    ├── Allow anonymous uploads (payment flow)
    ├── Allow public downloads
    ├── Allow authenticated uploads
    └── Allow users to delete own files
```

## Database Schema

```sql
-- messages table (already exists, no changes needed)
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  sender_email TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments TEXT[], -- ← Array of public URLs
  amount_paid DECIMAL(10,2),
  response_deadline_hours INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example data:
-- attachments: [
--   'https://znncfayiwfamujvrprvf.supabase.co/storage/v1/object/public/message-attachments/1733834567890-uuid-image.jpg',
--   'https://znncfayiwfamujvrprvf.supabase.co/storage/v1/object/public/message-attachments/1733834567891-uuid-document.pdf'
-- ]
```

## Component Hierarchy

```
PaymentPage
  └── PaymentForm
      ├── EmailInput
      ├── MessageInput
      ├── FileUploadSection  ← ENHANCED
      │   ├── Input[type="file", multiple]
      │   ├── Error Display
      │   └── File List
      │       └── FileCard (each file)
      │           ├── FileIcon (Image/FileText/File)
      │           ├── FileName
      │           ├── FileSize
      │           └── RemoveButton
      ├── ResponseTimeSelector
      └── StripePaymentForm
          └── Stripe CardElement
```

## State Management

```javascript
// PaymentForm.tsx state
{
  // Existing state
  customerEmail: string,
  message: string,
  selectedResponseTime: ResponseTimeOption | null,
  submitting: boolean,
  paymentError: string | null,
  showPayment: boolean,

  // NEW state
  attachments: File[],           // Selected files (before upload)
  attachmentUrls: string[],      // Uploaded file URLs (after upload)
  uploadingFiles: boolean        // Upload loading state
}
```

## API Flow

```
Frontend                     Edge Functions                 External Services
───────                      ──────────────                 ─────────────────

[Select Files]
    ↓
[Validate Files]
    ↓
[Click Pay] ──────────────→ upload-message-attachment
                                    ↓
                            [Validate Files]
                                    ↓
                            [Generate UUIDs]
                                    ↓
                            [Upload to Storage] ──────→ Supabase Storage
                                    ↓                          ↓
[Store URLs] ←─────────────[Return Public URLs]              [Store Files]
    ↓
[Complete Payment]
    ↓
[Submit Form] ────────────→ create-stripe-payment
                                    ↓
                            [Create PaymentIntent] ─────→ Stripe API
                                    ↓                          ↓
[Confirm Card] ←───────────[Return Client Secret]      [Hold Funds]
    ↓
[Confirm Payment] ─────────→ capture-stripe-payment
                                    ↓
                            [Capture Payment] ──────────→ Stripe API
                                    ↓                          ↓
                            [Funds Captured]              [Charge Card]
                                    ↓
                            process-escrow-payment
                                    ↓
                            [Create Message + Escrow]
                                    ↓
                            [Store Attachment URLs]
                                    ↓
                            postmark-send-message
                                    ↓
                            [Build Email with Links]
                                    ↓
                            [Send Email] ────────────────→ Postmark API
                                    ↓                          ↓
                            [Log Email]                  [Deliver Email]
                                    ↓                          ↓
[Success!] ←────────────── [Return Success]        [Recipient Inbox]
```

## Error Handling Flow

```
User Action              Validation Point           Error Message
───────────              ────────────────           ─────────────

Select 6 files    →     validateFiles()      →     "Maximum 5 files allowed"
Select 15MB file  →     validateFiles()      →     "File too large (max 10MB)"
Select .exe file  →     validateFiles()      →     "File type not allowed"
Total 55MB        →     validateFiles()      →     "Total exceeds 50MB limit"

Upload files      →     Edge Function        →     "Failed to upload: [reason]"

No network        →     Fetch Error          →     "Network error"
Storage full      →     Supabase Storage     →     "Storage error"
Invalid JWT       →     Edge Function        →     "Authentication error"
```

## Security Layers

```
Layer 1: Frontend (React)
├── File count validation (max 5)
├── File size validation (10MB each)
├── Total size validation (50MB)
├── MIME type validation
├── Filename validation
└── Rate limiting (3 attempts/minute)

Layer 2: Edge Function (Deno)
├── Request validation
├── File count re-validation
├── File size re-validation
├── Total size re-validation
├── MIME type re-validation
├── Filename sanitization
├── Path traversal prevention
└── UUID generation

Layer 3: Supabase Storage
├── File size limit (10MB)
├── MIME type restrictions
├── RLS policies
└── Public bucket (via UUID security)

Layer 4: Database
├── RLS policies on messages table
├── Foreign key constraints
└── Data type validation (TEXT[])
```

## Performance Characteristics

```
Operation                Time        Network Usage
─────────────────────── ──────────  ─────────────
Select files            Instant     0 bytes
Validate files (FE)     <100ms      0 bytes
Upload 1MB file         ~500ms      ~1MB
Upload 5 files (5MB)    ~2-3s       ~5MB
Payment processing      ~3-5s       ~10KB
Email sending           ~1-2s       ~50KB
Total flow (with files) ~8-12s      ~5-6MB

Without files:          ~5-8s       ~100KB
```

## Monitoring Points

```
✓ Frontend Analytics
  - File upload attempts
  - File upload successes
  - File upload failures
  - Average file sizes
  - Average upload times

✓ Edge Function Logs
  - Upload function invocations
  - Validation errors
  - Storage errors
  - Success rate

✓ Storage Metrics
  - Bucket size growth
  - Number of files
  - Public access attempts
  - Bandwidth usage

✓ Email Tracking
  - Emails with attachments
  - Attachment link clicks
  - Email deliverability

✓ Database Queries
  - Messages with attachments
  - Average attachments per message
  - Most common file types
```

---

**This diagram shows the complete end-to-end flow of the file attachment feature.**
