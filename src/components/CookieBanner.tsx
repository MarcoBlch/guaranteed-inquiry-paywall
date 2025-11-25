/**
 * CookieBanner Component
 *
 * GDPR-compliant cookie consent banner for FastPass.email
 * Appears only on first visit, stores consent in localStorage
 *
 * Brand Standards:
 * - Glassmorphism styling with backdrop blur
 * - Neon Vert (#5cffb0) accents and borders
 * - Dark Navy (#1a1f2e) card background
 * - Two equally prominent buttons: "Essential Only" and "Accept All"
 * - Mobile responsive (buttons stack on small screens)
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface CookieConsent {
  timestamp: string;
  accepted: boolean;
  categories: string[];
}

export const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // First visit - show banner after a brief delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConsent = (accepted: boolean) => {
    const consent: CookieConsent = {
      timestamp: new Date().toISOString(),
      accepted,
      categories: accepted ? ['essential', 'functional'] : ['essential'],
    };

    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    setIsVisible(false);
  };

  const handleEssentialOnly = () => {
    handleConsent(false);
  };

  const handleAcceptAll = () => {
    handleConsent(true);
  };

  const handleClose = () => {
    // Treat close as "Essential Only"
    handleEssentialOnly();
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 animate-in slide-in-from-bottom duration-500"
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-description"
    >
      <div className="max-w-6xl mx-auto">
        <div className="relative bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/30 shadow-[0_0_30px_rgba(92,255,176,0.2)] rounded-2xl p-6 sm:p-8">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-[#B0B0B0] hover:text-[#5cffb0] transition-colors"
            aria-label="Close cookie banner"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
            {/* Content */}
            <div className="pr-8">
              <h2
                id="cookie-banner-title"
                className="text-[#5cffb0] text-xl sm:text-2xl font-semibold mb-3"
              >
                🍪 We Value Your Privacy
              </h2>
              <p
                id="cookie-banner-description"
                className="text-[#B0B0B0] text-sm sm:text-base leading-relaxed mb-4"
              >
                FastPass uses essential cookies to provide secure authentication and core functionality.
                We also use optional functional cookies to enhance your experience. You can customize
                your preferences anytime in{' '}
                <a
                  href="/cookie-settings"
                  className="text-[#5cffb0] hover:underline font-medium"
                >
                  Cookie Settings
                </a>
                .
              </p>
              <p className="text-[#B0B0B0]/80 text-xs sm:text-sm">
                Read our full{' '}
                <a
                  href="/privacy"
                  className="text-[#5cffb0] hover:underline font-medium"
                >
                  Privacy Policy
                </a>
                {' '}for more details.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[200px]">
              <Button
                onClick={handleAcceptAll}
                className="w-full bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(92,255,176,0.3)] hover:shadow-[0_0_25px_rgba(92,255,176,0.5)]"
                aria-label="Accept all cookies"
              >
                Accept All
              </Button>
              <Button
                onClick={handleEssentialOnly}
                variant="outline"
                className="w-full border-2 border-[#5cffb0] text-[#5cffb0] hover:bg-[#5cffb0]/10 hover:text-[#5cffb0] font-semibold py-3 px-6 rounded-xl transition-all duration-300"
                aria-label="Accept essential cookies only"
              >
                Essential Only
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
