/**
 * Plausible Analytics Integration
 *
 * Provides type-safe tracking utilities for custom events in Plausible Analytics.
 * All functions are safe to call even if Plausible script is not loaded (will no-op).
 */

// Type declaration for Plausible
declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: Record<string, string | number | boolean> }) => void;
  }
}

/**
 * Track a custom event with Plausible Analytics
 *
 * @param eventName - Name of the event to track
 * @param props - Optional properties to attach to the event
 *
 * @example
 * trackEvent('Button Clicked', { button_id: 'signup', location: 'header' })
 */
export const trackEvent = (eventName: string, props?: Record<string, string | number | boolean>) => {
  if (typeof window !== 'undefined' && window.plausible) {
    window.plausible(eventName, { props });
  }
};

/**
 * Pre-defined event tracking helpers for common FastPass events
 *
 * These provide type-safe, consistent event tracking across the application.
 */
export const analytics = {
  // Authentication & Signup Events
  signupStarted: (viaInvite: boolean) =>
    trackEvent('Signup Started', { via_invite: viaInvite }),

  signupCompleted: (viaInvite: boolean) =>
    trackEvent('Signup Completed', { via_invite: viaInvite }),

  loginCompleted: () =>
    trackEvent('Login Completed'),

  // Invite Code Events
  inviteCodeValidated: (codeType: string) =>
    trackEvent('Invite Code Validated', { code_type: codeType }),

  inviteCodeShared: (platform: 'twitter' | 'linkedin' | 'email') =>
    trackEvent('Invite Code Shared', { platform }),

  inviteCodeGenerated: (batchSize: number) =>
    trackEvent('Invite Code Generated', { batch_size: batchSize }),

  bonusUnlocked: () =>
    trackEvent('85% Bonus Unlocked'),

  // Invitation Request Events (Waitlist)
  invitationModalOpened: () =>
    trackEvent('Invitation Modal Opened'),

  invitationRequestSubmitted: () =>
    trackEvent('Invitation Request Submitted'),

  // Payment Events
  paymentPageViewed: (recipientUsername: string) =>
    trackEvent('Payment Page Viewed', { recipient: recipientUsername }),

  paymentStarted: (amount: number) =>
    trackEvent('Payment Started', { amount }),

  paymentCompleted: (amount: number) =>
    trackEvent('Payment Completed', { amount }),

  paymentFailed: (reason: string) =>
    trackEvent('Payment Failed', { reason }),

  // Message Events
  messageSent: (amount: number) =>
    trackEvent('Message Sent', { amount }),

  responseReceived: (withinDeadline: boolean) =>
    trackEvent('Response Received', { within_deadline: withinDeadline }),

  deadlineExpired: () =>
    trackEvent('Deadline Expired'),

  refundIssued: () =>
    trackEvent('Refund Issued'),

  // Dashboard Events
  dashboardViewed: () =>
    trackEvent('Dashboard Viewed'),

  profileUpdated: () =>
    trackEvent('Profile Updated'),

  stripeConnected: () =>
    trackEvent('Stripe Connected'),

  // Admin Events
  adminPanelAccessed: () =>
    trackEvent('Admin Panel Accessed'),

  platformSettingsUpdated: () =>
    trackEvent('Platform Settings Updated'),
};
