/**
 * Cookie Settings Page
 *
 * GDPR-compliant cookie preference management for FastPass.email
 * Allows users to customize their cookie consent at any time
 */

import { useState, useEffect } from 'react';
import { FastPassLogo } from '@/components/ui/FastPassLogo';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface CookieConsent {
  timestamp: string;
  accepted: boolean;
  categories: string[];
}

const CookieSettings = () => {
  const navigate = useNavigate();
  const [essentialEnabled, setEssentialEnabled] = useState(true);
  const [functionalEnabled, setFunctionalEnabled] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Load existing preferences
    const consentStr = localStorage.getItem('cookie-consent');
    if (consentStr) {
      try {
        const consent: CookieConsent = JSON.parse(consentStr);
        setFunctionalEnabled(consent.categories.includes('functional'));
      } catch (error) {
        console.error('Failed to parse cookie consent:', error);
      }
    }
  }, []);

  const handleFunctionalChange = (checked: boolean) => {
    setFunctionalEnabled(checked);
    setHasChanges(true);
  };

  const handleSave = () => {
    const consent: CookieConsent = {
      timestamp: new Date().toISOString(),
      accepted: functionalEnabled,
      categories: functionalEnabled ? ['essential', 'functional'] : ['essential'],
    };

    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    setHasChanges(false);

    toast.success('Cookie preferences saved', {
      description: 'Your cookie preferences have been updated successfully.',
      duration: 4000,
    });
  };

  const handleAcceptAll = () => {
    setFunctionalEnabled(true);
    const consent: CookieConsent = {
      timestamp: new Date().toISOString(),
      accepted: true,
      categories: ['essential', 'functional'],
    };

    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    setHasChanges(false);

    toast.success('All cookies accepted', {
      description: 'You have accepted all cookie categories.',
      duration: 4000,
    });
  };

  const handleRejectAll = () => {
    setFunctionalEnabled(false);
    const consent: CookieConsent = {
      timestamp: new Date().toISOString(),
      accepted: false,
      categories: ['essential'],
    };

    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    setHasChanges(false);

    toast.success('Non-essential cookies rejected', {
      description: 'Only essential cookies will be used.',
      duration: 4000,
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* StaticBackground component from App.tsx provides the background */}

      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <header className="p-4 sm:p-6 text-center border-b border-[#5cffb0]/20">
          <div className="flex flex-col items-center">
            <FastPassLogo size="md" />
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Back Button */}
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="mb-6 text-[#5cffb0] hover:text-[#4de89d] hover:bg-[#5cffb0]/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          {/* Title */}
          <h1 className="text-[#5cffb0] text-4xl sm:text-5xl font-bold mb-4">
            Cookie Settings
          </h1>
          <p className="text-[#B0B0B0] text-base sm:text-lg mb-8">
            Manage your cookie preferences and control what data is stored on your device.
          </p>

          {/* Introduction */}
          <Card className="bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/30 shadow-[0_0_20px_rgba(92,255,176,0.2)] mb-8">
            <CardContent className="p-6 sm:p-8">
              <p className="text-[#B0B0B0] text-base leading-relaxed">
                FastPass uses cookies to provide secure authentication and enhance your experience. You
                can customize your preferences below. Changes take effect immediately and can be updated
                at any time.
              </p>
            </CardContent>
          </Card>

          {/* Cookie Categories */}
          <div className="space-y-6 mb-8">
            {/* Essential Cookies */}
            <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={essentialEnabled}
                    disabled
                    className="mt-1"
                    aria-label="Essential cookies (always enabled)"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-[#5cffb0] text-xl sm:text-2xl font-semibold">
                        Essential Cookies
                      </h2>
                      <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded text-xs font-semibold">
                        REQUIRED
                      </span>
                    </div>

                    <p className="text-[#B0B0B0] text-base leading-relaxed mb-4">
                      These cookies are necessary for the website to function and cannot be switched off.
                      They are usually only set in response to actions made by you such as logging in,
                      managing your preferences, or filling in forms.
                    </p>

                    <div className="space-y-3">
                      <h3 className="text-[#5cffb0] text-lg font-semibold">Cookies Used:</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-[#5cffb0] flex-shrink-0">•</span>
                          <div>
                            <span className="font-mono text-[#5cffb0]">sb-access-token</span>
                            <span className="text-[#B0B0B0]"> - Authentication session (1 hour)</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-[#5cffb0] flex-shrink-0">•</span>
                          <div>
                            <span className="font-mono text-[#5cffb0]">sb-refresh-token</span>
                            <span className="text-[#B0B0B0]"> - Session renewal (30 days)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Functional Cookies */}
            <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={functionalEnabled}
                    onCheckedChange={handleFunctionalChange}
                    className="mt-1"
                    aria-label="Functional cookies (optional)"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-[#5cffb0] text-xl sm:text-2xl font-semibold">
                        Functional Cookies
                      </h2>
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-semibold">
                        OPTIONAL
                      </span>
                    </div>

                    <p className="text-[#B0B0B0] text-base leading-relaxed mb-4">
                      These cookies enable enhanced functionality and personalization, such as
                      remembering your preferences and settings. They may be set by us or by third-party
                      providers whose services we use.
                    </p>

                    <div className="space-y-3">
                      <h3 className="text-[#5cffb0] text-lg font-semibold">Cookies Used:</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-[#5cffb0] flex-shrink-0">•</span>
                          <div>
                            <span className="font-mono text-[#5cffb0]">cookie-consent</span>
                            <span className="text-[#B0B0B0]">
                              {' '}
                              - Remembers your cookie preferences (1 year)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-[#5cffb0]/10 border border-[#5cffb0]/30 rounded-lg">
                        <p className="text-[#B0B0B0] text-sm">
                          <strong className="text-[#5cffb0]">What happens if I disable this?</strong>
                          <br />
                          The cookie banner will appear on every visit, as we won't remember your
                          preference.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <Card className="bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/30 shadow-[0_0_20px_rgba(92,255,176,0.2)] mb-8">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="flex-1 bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Preferences
                </Button>
                <Button
                  onClick={handleAcceptAll}
                  variant="outline"
                  className="flex-1 border-2 border-[#5cffb0] text-[#5cffb0] hover:bg-[#5cffb0]/10 hover:text-[#5cffb0] font-semibold py-3 px-6 rounded-xl transition-all duration-300"
                >
                  Accept All
                </Button>
                <Button
                  onClick={handleRejectAll}
                  variant="outline"
                  className="flex-1 border-2 border-[#B0B0B0]/30 text-[#B0B0B0] hover:bg-[#B0B0B0]/10 hover:text-[#B0B0B0] font-semibold py-3 px-6 rounded-xl transition-all duration-300"
                >
                  Reject All
                </Button>
              </div>

              {hasChanges && (
                <p className="text-[#5cffb0] text-sm text-center mt-4">
                  You have unsaved changes. Click "Save Preferences" to apply them.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-[#5cffb0] text-xl font-semibold mb-4">
                Learn More About Our Privacy Practices
              </h2>
              <p className="text-[#B0B0B0] text-base leading-relaxed mb-4">
                For detailed information about how we collect, use, and protect your data, please read
                our full Privacy Policy. You can also learn about your rights under GDPR and how to
                exercise them.
              </p>
              <Button
                onClick={() => navigate('/privacy')}
                variant="outline"
                className="border-2 border-[#5cffb0] text-[#5cffb0] hover:bg-[#5cffb0]/10 hover:text-[#5cffb0] font-semibold px-6 py-2 rounded-lg transition-all duration-300"
              >
                Read Privacy Policy
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="text-center py-6 text-white/60 text-sm border-t border-[#5cffb0]/20 mt-12">
          <p>© 2026 FastPass • Guaranteed Response Platform</p>
        </footer>
      </div>
    </div>
  );
};

export default CookieSettings;
