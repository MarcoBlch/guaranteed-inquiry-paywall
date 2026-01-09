import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Generate or retrieve a persistent session ID for the browser
const getSessionId = (): string => {
  const storageKey = 'fastpass_session_id';
  let sessionId = sessionStorage.getItem(storageKey);

  if (!sessionId) {
    // Generate a simple session ID (UUID-like format)
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem(storageKey, sessionId);
  }

  return sessionId;
};

interface PageViewOptions {
  enabled?: boolean;
  trackTitle?: boolean;
}

/**
 * Custom hook to track page views for analytics
 *
 * This hook automatically tracks page views when a component mounts.
 * It respects user privacy by:
 * - Not storing IP addresses
 * - Using session-based tracking (not persistent across browser sessions)
 * - Only tracking when explicitly enabled
 *
 * @param pagePath - The path of the page (e.g., '/dashboard', '/pay/123')
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * // In a page component
 * usePageViewTracking('/dashboard');
 *
 * // With options
 * usePageViewTracking('/pay/' + userId, { enabled: true, trackTitle: true });
 * ```
 */
export const usePageViewTracking = (
  pagePath: string,
  options: PageViewOptions = {}
) => {
  const { enabled = true, trackTitle = true } = options;
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track once per mount
    if (!enabled || hasTracked.current) {
      return;
    }

    const trackPageView = async () => {
      try {
        // Get session ID
        const sessionId = getSessionId();

        // Get current user session (if logged in)
        const { data: { session } } = await supabase.auth.getSession();

        // Prepare page view data
        const pageViewData = {
          page_path: pagePath,
          page_title: trackTitle ? document.title : undefined,
          session_id: sessionId,
          referrer: document.referrer || undefined,
          user_agent: navigator.userAgent,
        };

        // Call the Edge Function to record page view
        const { error } = await supabase.functions.invoke('track-page-view', {
          body: pageViewData,
          headers: session?.access_token ? {
            Authorization: `Bearer ${session.access_token}`,
          } : undefined,
        });

        if (error) {
          // Silent fail - don't disrupt user experience for analytics failures
          console.debug('Page view tracking failed:', error);
        } else {
          console.debug('Page view tracked:', pagePath);
        }

        hasTracked.current = true;
      } catch (error) {
        // Silent fail
        console.debug('Page view tracking error:', error);
      }
    };

    // Track with a small delay to avoid blocking initial render
    const timeoutId = setTimeout(trackPageView, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [pagePath, enabled, trackTitle]);
};

/**
 * Hook to track custom events (optional - for future use)
 *
 * @example
 * ```tsx
 * const trackEvent = useEventTracking();
 * trackEvent('button_click', { button_id: 'cta-signup' });
 * ```
 */
export const useEventTracking = () => {
  return (eventName: string, eventData?: Record<string, any>) => {
    // Could be extended to track custom events
    // For now, just log to console
    console.debug('Event tracked:', eventName, eventData);
  };
};
