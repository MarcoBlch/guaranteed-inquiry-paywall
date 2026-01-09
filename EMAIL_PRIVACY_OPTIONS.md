# Email Privacy Options - Decision Document

**Created**: 2025-12-16
**Status**: Pending Review
**Context**: Addressing receiver email address visibility in forwarded replies

---

## Current Situation

When a receiver replies to a FastPass message, their email address may be visible to the sender in two ways:

1. **In email headers** (technical metadata) - visible when viewing "Show Original" or raw email source
2. **In email signature** - if their email client automatically adds a signature with contact info

### What We Already Do Right ✅

- Forward replies with `From: FASTPASS <noreply@fastpass.email>` (not receiver's address)
- Create a NEW email (not forwarding original with all headers)
- Payment release happens independently of email forwarding
- Already added reminder text: "If you wish to continue the conversation, don't forget to communicate your contact details"

### The Problem We're Solving

**Scenario from screenshot**:
- Receiver (marc.bernard@ece-france.com) replied to a message
- Sender received the reply and saw Marc's email in the "answer info" area
- Marc didn't explicitly type his email, but it appeared anyway (likely from signature or headers)

---

## Option A: Accept Current Implementation (No Changes)

### How It Works
- Keep existing email forwarding as-is
- Rely on the reminder text we just added

### Pros
- ✅ Zero development work
- ✅ No risk of breaking anything
- ✅ Standard practice for email relay services (LinkedIn, Facebook do this)
- ✅ 99% of users never check email headers
- ✅ Receivers who want to share contact info can do so freely

### Cons
- ❌ Tech-savvy senders can find email in raw headers
- ❌ Email signatures might leak contact info accidentally

### Recommendation Level: ⭐⭐⭐ (Good baseline)

---

## Option B: Strip All Email Headers (Not Recommended)

### How It Works
- Completely reconstruct emails to remove all identifying information
- Strip headers like `X-Original-From`, `Return-Path`, etc.

### Pros
- ✅ 100% email privacy protection

### Cons
- ❌ ~30-50% deliverability rate (spam filters)
- ❌ Breaks email threading (no conversation view)
- ❌ Sender cannot reply directly (one-way communication)
- ❌ May violate email authentication standards (SPF, DKIM, DMARC)
- ❌ High maintenance overhead
- ❌ 2-4 hours coding + 2-3 days testing

### Recommendation Level: ⭐ (Too risky, not worth it)

---

## Option C: Add Privacy Warning Banner

### How It Works
Add explicit warning in receiver's notification email:

```
⚠️ PRIVACY NOTICE:
Your email address may appear in technical email headers when you reply.
If you want to remain anonymous:
  • Remove your email signature before replying
  • Create a separate anonymous email address to reply from
  • OR communicate your contact details within the message if you want the sender to reach you
```

### Pros
- ✅ Quick to implement (~15 minutes)
- ✅ Educates receivers about email privacy
- ✅ No risk to deliverability
- ✅ Receivers have full control

### Cons
- ⚠️ Relies on receiver remembering to act
- ⚠️ Doesn't prevent accidental leaks (only warns)

### Recommendation Level: ⭐⭐⭐⭐ (Low effort, good protection)

---

## Option A+ (Level 1): Smart Signature Sanitization

### How It Works
Strip email addresses ONLY from signature area (end of email), preserve body content

**Example Input**:
```
Thanks for your message! I'd love to discuss further.
You can reach me at marc@example.com or call +33 6 12 34 56 78.

Best regards,
Marc Bernard
Senior Engineer
marc.bernard@ece-france.com
+33 6 12 34 56 78
```

**Output to Sender**:
```
Thanks for your message! I'd love to discuss further.
You can reach me at marc@example.com or call +33 6 12 34 56 78.

Best regards,
Marc Bernard
Senior Engineer
[email address removed for privacy]
+33 6 12 34 56 78
```

### Pros
- ✅ Protects accidental signature leaks
- ✅ Preserves intentional contact sharing in message body
- ✅ No deliverability impact
- ✅ Surgical approach (only affects likely-unwanted content)

### Cons
- ⚠️ May miss signatures without standard markers (Best regards, Regards, etc.)
- ⚠️ Adds complexity to email processing

### Implementation Time: ~1 hour
### Recommendation Level: ⭐⭐⭐⭐ (Good balance)

---

## Option A+ (Level 3): Hybrid Approach **[RECOMMENDED]**

### How It Works
Combine multiple protections:

1. **Smart signature sanitization** (Level 1 logic above)
2. **Privacy warning banner** (Option C)
3. **Explanatory footer** to senders explaining removed content

**Footer added to forwarded messages**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Privacy Protection Active
Email addresses in signatures were automatically removed to protect privacy.
If you want to contact this person, they may have included their details in the message above.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Pros
- ✅ Protects privacy by default (strips signature emails)
- ✅ Preserves intentional sharing (keeps body emails)
- ✅ Educates receivers (warning banner)
- ✅ Sets sender expectations (explanatory footer)
- ✅ No deliverability risk
- ✅ Best of all worlds

### Cons
- ⚠️ Most complex to implement
- ⚠️ Adds content to forwarded emails

### Implementation Time: ~2 hours
### Implementation Details:
- Modify `supabase/functions/postmark-inbound-webhook/index.ts` (lines 329-336)
- Add sanitization function before forwarding
- Update `postmark-send-message/index.ts` with privacy banner
- Add footer template to forwarded messages

### Recommendation Level: ⭐⭐⭐⭐⭐ (Best overall solution)

---

## Technical Implementation Notes

### Key Code Location
File: `supabase/functions/postmark-inbound-webhook/index.ts` (lines 318-342)

**Current forwarding code**:
```typescript
await fetch('https://api.postmarkapp.com/email', {
  body: JSON.stringify({
    From: 'FASTPASS <noreply@fastpass.email>',
    To: transaction.sender_email,
    Subject: `Re: ${inboundEmail.Subject}`,
    TextBody: inboundEmail.TextBody,
    HtmlBody: inboundEmail.HtmlBody,
    MessageStream: 'outbound',
  })
})
```

**With Level 3 implementation**:
```typescript
// Add sanitization function
const sanitizeEmailSignature = (text: string): string => {
  // Logic to strip signature emails only
}

await fetch('https://api.postmarkapp.com/email', {
  body: JSON.stringify({
    From: 'FASTPASS <noreply@fastpass.email>',
    To: transaction.sender_email,
    Subject: `Re: ${inboundEmail.Subject}`,
    TextBody: sanitizeEmailSignature(inboundEmail.TextBody) + '\n\n[Privacy footer]',
    HtmlBody: sanitizeEmailSignature(inboundEmail.HtmlBody) + '<div>[Privacy footer HTML]</div>',
    MessageStream: 'outbound',
  })
})
```

### Safety Guarantees
- ✅ Payment detection happens BEFORE forwarding (lines 288-296)
- ✅ Webhook processing is independent of content sanitization
- ✅ Stripe operations completely separate
- ✅ Only affects display content, not system functionality

---

## Critical Question for Decision

### The Intentional Contact Sharing Dilemma

**If a receiver explicitly types their email to continue the conversation:**

```
"Thanks! Let's discuss further. Reach me at marc@example.com"
```

**Should we**:

**A) Preserve it** (receiver wants to share)
- ✅ Respects receiver's intent
- ❌ No privacy protection for this case

**B) Strip it** (prioritize privacy)
- ✅ Maximum privacy protection
- ❌ Breaks legitimate communication

**C) Strip signature only, preserve body** (Level 1/3)
- ✅ Best of both worlds
- ✅ Accidental leaks prevented
- ✅ Intentional sharing preserved

---

## Recommended Next Steps

1. **Review this document with your colleague**
2. **Discuss the key question**: Should we preserve intentionally shared emails?
3. **Choose an option**:
   - Quick win: **Option C** (warning banner only)
   - Balanced: **Option A+ Level 1** (smart signature sanitization)
   - Comprehensive: **Option A+ Level 3** (hybrid approach) ⭐ **Recommended**
4. **If choosing Level 1 or 3**: Confirm implementation approach
5. **Test on staging** before deploying to production

---

## Questions to Ask Your Colleague

1. How important is it that receivers can explicitly share their email if they want to?
2. Are we okay with some tech-savvy users potentially finding emails in raw headers?
3. Should we prioritize ease of communication vs. maximum privacy?
4. What's our tolerance for added complexity in email processing?
5. Do we want to add visible footer text to all forwarded messages?

---

## My Recommendation

**Implement Option A+ Level 3 (Hybrid Approach)**

**Why**:
- Provides strong privacy protection while preserving user intent
- Low risk (no impact on payments/webhooks/deliverability)
- Educates users about privacy considerations
- Transparent about what we're doing (footer explanation)
- Solves the screenshot issue (accidental signature leak)
- Maintains smooth communication flow

**Implementation timeline**: 2-3 hours
**Testing timeline**: 1 day
**Total time to production**: 2 days

---

## Current Status

**Completed**:
- ✅ Added reminder text in receiver notification: "If you wish to continue the conversation, don't forget to communicate your contact details"

**Pending Decision**:
- Choose privacy protection approach (Option A, C, A+ Level 1, or A+ Level 3)
- Confirm with colleague on intentional email sharing behavior

**Branch**: `feature/improve-email-privacy`
**Ready to implement**: Yes (pending approval)

---

**Document Owner**: Development Team
**Last Updated**: 2025-12-16
**Review Deadline**: TBD
