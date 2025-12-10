# File Attachment Feature - Implementation Guide

**Created**: 2025-12-10
**Status**: Implemented - Ready for Testing

## Overview

This document describes the complete file attachment feature implementation for the FastPass payment/message flow. Users can now upload files (images, PDFs, documents) along with their paid messages.

## Feature Specifications

### Limits & Validation

- **Maximum files**: 5 files per message
- **Maximum file size**: 10MB per file
- **Maximum total size**: 50MB per message
- **Allowed formats**:
  - Images: JPG, JPEG, PNG, GIF
  - Documents: PDF, TXT, DOC, DOCX

### Security Features

- **Input validation**: All files validated on frontend and backend
- **MIME type checking**: Only allowed file types accepted
- **File name sanitization**: Prevents path traversal attacks
- **Anonymous upload support**: Works with anonymous payment flow
- **UUID-based filenames**: Prevents filename collisions and adds security
- **Rate limiting**: Client-side rate limiting on payment form

## Architecture

### 1. Storage Layer

**Supabase Storage Bucket**: `message-attachments`

```sql
-- Migration: supabase/migrations/20251210000001_create_message_attachments_bucket.sql
- Public bucket for easy access
- 10MB file size limit
- MIME type restrictions enforced
- RLS policies for anonymous + authenticated access
```

**RLS Policies**:
- Allow anonymous uploads (needed for payment flow)
- Allow public downloads
- Allow authenticated uploads
- Allow users to delete their own files

### 2. Backend - Edge Functions

#### `upload-message-attachment` (NEW)

**Location**: `/supabase/functions/upload-message-attachment/index.ts`

**Purpose**: Secure file upload handler with comprehensive validation

**Configuration**: Add to `supabase/config.toml`:
```toml
[functions.upload-message-attachment]
verify_jwt = false  # Allow anonymous uploads for payment flow
```

**Features**:
- Accepts multipart/form-data
- Validates file count (max 5)
- Validates individual file sizes (max 10MB)
- Validates total size (max 50MB)
- Validates MIME types
- Sanitizes file names
- Generates unique filenames with UUID + timestamp
- Returns public URLs for uploaded files

**Error Handling**:
- Invalid file count/size/type → 400 error
- Upload failure → Detailed error message
- Partial success → Returns successful uploads + warnings

#### `process-escrow-payment` (UPDATED)

**Changes**:
- Now accepts `attachments` array in `messageData`
- Passes attachment URLs to email function

#### `postmark-send-message` (UPDATED)

**Changes**:
- Added `attachmentUrls` field to `MessageEmailData` interface
- HTML email template includes attachment links with file names
- Plain text email includes attachment URLs
- Extracts and decodes file names for display

### 3. Frontend Components

#### `FileUploadSection.tsx` (UPDATED)

**Location**: `/src/components/payment/FileUploadSection.tsx`

**Features**:
- Enhanced UI with file icons (Image, FileText, File)
- Shows individual file sizes and total size
- Remove file button for each attachment
- Real-time validation feedback
- Progress indicator (X/5 files)
- Disabled when 5 files reached

**UI Elements**:
- File type icons using lucide-react
- Individual file cards with remove button
- Total size tracker
- Error messages with bullet points
- Clean gray background for file list

#### `PaymentForm.tsx` (UPDATED)

**Location**: `/src/components/payment/PaymentForm.tsx`

**New Functions**:
- `uploadFiles()`: Uploads files to Storage via Edge Function
- Async file upload before payment processing
- Loading state during upload
- Success/error toast notifications

**Flow Changes**:
1. User fills form + selects files
2. Clicks "Continue to payment"
3. **NEW**: Files uploaded to Storage (if any)
4. Upload URLs stored in state
5. Payment form shown with summary (includes attachment count)
6. Payment processed with attachment URLs

**State Management**:
- `attachmentUrls`: Array of uploaded file URLs
- `uploadingFiles`: Boolean for upload loading state

#### `security.ts` (UPDATED)

**Location**: `/src/lib/security.ts`

**Changes**:
- Updated `fileValidationSchema`: 10MB per file (was 25MB)
- Updated `validateFiles()`: Supports 5 files (was 2), checks 50MB total
- Added filename security checks (prevents path traversal)
- Improved error messages (English)

## Database Schema

### `messages` Table

**Existing Field** (No migration needed):
```sql
attachments TEXT[] NULL  -- Array of attachment URLs
```

This field already exists in the database schema, so no migration is required.

## Deployment Checklist

### 1. Database Migration

```bash
# Apply storage bucket migration
npx supabase db push
```

**Migration file**: `supabase/migrations/20251210000001_create_message_attachments_bucket.sql`

### 2. Edge Function Deployment

```bash
# Deploy the new upload function (no JWT verification)
npx supabase functions deploy upload-message-attachment --no-verify-jwt

# Redeploy updated functions
npx supabase functions deploy process-escrow-payment --no-verify-jwt
npx supabase functions deploy postmark-send-message --no-verify-jwt
```

### 3. Frontend Deployment

```bash
# Build and deploy frontend (automatic via Vercel on merge to main)
npm run build
git add .
git commit -m "feat: add file attachment support to payment flow"
git push origin main
```

### 4. Verification Steps

After deployment:

1. **Storage Bucket**:
   - Check Supabase Dashboard → Storage
   - Verify `message-attachments` bucket exists
   - Verify RLS policies are active

2. **Edge Functions**:
   - Check Supabase Dashboard → Edge Functions
   - Verify `upload-message-attachment` is deployed
   - Check logs for any deployment errors

3. **Environment Variables**:
   - Verify all Supabase URLs and keys are set
   - Verify Postmark tokens are set

## Testing Guide

### Manual Testing Flow

1. **File Upload UI**:
   - Navigate to `/pay/:userId`
   - Select 1-5 files (various types)
   - Verify file list appears with sizes
   - Verify remove button works
   - Try selecting 6 files (should show error)
   - Try uploading 15MB file (should show error)

2. **File Upload Process**:
   - Fill out message form
   - Attach files
   - Click "Continue to payment"
   - Verify "Uploading files..." message appears
   - Verify success toast shows file count
   - Verify summary shows attachment count

3. **Payment Flow**:
   - Complete Stripe payment
   - Check Supabase Dashboard → Storage → message-attachments
   - Verify files are uploaded with UUID filenames

4. **Email Delivery**:
   - Check recipient email
   - Verify attachment section appears (HTML)
   - Verify file names are decoded properly
   - Click attachment links
   - Verify files download correctly

5. **Edge Cases**:
   - Upload with no files (should work)
   - Upload with special characters in filename
   - Upload maximum size files (10MB each)
   - Upload 5 files totaling close to 50MB

### Automated Testing

Create test scripts in `/tests/`:

```bash
# Test file upload
./test-attachment-upload.sh

# Test end-to-end flow
./test-attachment-payment-flow.sh

# Test email with attachments
./test-attachment-email.sh
```

## Error Handling

### Frontend Errors

| Error | Message | User Action |
|-------|---------|-------------|
| Too many files | "Maximum 5 files allowed" | Remove files |
| File too large | "File too large (max 10MB)" | Choose smaller file |
| Total size exceeded | "Total file size exceeds 50MB limit" | Remove files |
| Invalid file type | "File type not allowed" | Choose allowed format |
| Upload failed | "Failed to upload attachments: [reason]" | Retry upload |

### Backend Errors

| Error | Status | Response |
|-------|--------|----------|
| No files | 400 | "No files provided" |
| Too many files | 400 | "Maximum 5 files allowed" |
| File too large | 400 | "File exceeds 10MB limit" |
| Total too large | 400 | "Total size exceeds 50MB limit" |
| Invalid MIME type | 400 | "Invalid file type" |
| Invalid filename | 400 | "Invalid file name" |
| Storage error | 400 | "Failed to upload files" |

## Security Considerations

1. **Anonymous Upload Protection**:
   - Rate limiting on frontend (3 attempts per minute)
   - MIME type validation on backend
   - File size limits enforced on Storage bucket
   - Unique UUIDs prevent guessing filenames

2. **Filename Security**:
   - Sanitized on backend (alphanumeric + underscore only)
   - Path traversal prevention (no `..`, `/`, `\`)
   - Length limit (100 characters after sanitization)

3. **Storage Security**:
   - Public bucket (files accessible via URL)
   - No sensitive data in filenames
   - RLS policies prevent unauthorized deletion
   - Anonymous users can only upload, not delete

4. **Email Security**:
   - Attachment URLs are public (Supabase Storage)
   - No executable file types allowed
   - Links open in new tab (`target="_blank"`)

## Performance Considerations

- **Upload Time**: ~1-3 seconds for 5 files (depends on file sizes)
- **Storage Costs**: Supabase Storage pricing applies
- **Email Size**: Email body includes attachment links (minimal impact)
- **Frontend Bundle**: Added lucide-react icons (~5KB)

## Future Enhancements

1. **Progress Indicator**: Show upload progress bar for large files
2. **Image Preview**: Show thumbnail previews for images
3. **Drag & Drop**: Add drag-and-drop file upload UI
4. **Compression**: Auto-compress large images before upload
5. **Virus Scanning**: Integrate virus scanning service
6. **Signed URLs**: Use signed URLs instead of public bucket
7. **CDN**: Add CDN for faster attachment downloads
8. **Admin Cleanup**: Automatic deletion of old attachments

## Rollback Plan

If issues arise after deployment:

1. **Disable File Upload**:
   - Comment out `FileUploadSection` in `PaymentForm.tsx`
   - Deploy frontend

2. **Revert Edge Functions**:
   ```bash
   git revert <commit-hash>
   npx supabase functions deploy process-escrow-payment --no-verify-jwt
   npx supabase functions deploy postmark-send-message --no-verify-jwt
   ```

3. **Remove Storage Bucket**:
   - Supabase Dashboard → Storage → Delete bucket
   - Or run migration rollback

## Support & Troubleshooting

### Common Issues

**Issue**: Files not uploading
**Fix**: Check Supabase Edge Function logs, verify JWT settings

**Issue**: Attachment links broken
**Fix**: Verify Storage bucket is public, check URL format

**Issue**: Email not showing attachments
**Fix**: Check Postmark Activity, verify email template rendering

**Issue**: Upload slow
**Fix**: Check file sizes, network speed, Supabase region

### Debug Commands

```bash
# Check Storage bucket
npx supabase storage ls message-attachments

# Check Edge Function logs
npx supabase functions logs upload-message-attachment

# Check recent emails
npx supabase db query "SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10"

# Check messages with attachments
npx supabase db query "SELECT id, sender_email, array_length(attachments, 1) as attachment_count FROM messages WHERE attachments IS NOT NULL"
```

## Documentation References

- Supabase Storage: https://supabase.com/docs/guides/storage
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Postmark Email: https://postmarkapp.com/developer
- React File Upload: https://developer.mozilla.org/en-US/docs/Web/API/File

## Conclusion

This feature adds comprehensive file attachment support to the payment flow while maintaining security, performance, and user experience. All components follow the existing codebase patterns and DRY principles.

**Status**: Ready for production deployment after testing.

---

**Last Updated**: 2025-12-10
**Author**: Claude Code Implementation
**Version**: 1.0
