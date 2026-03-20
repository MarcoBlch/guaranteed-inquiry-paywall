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

      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <header className="p-4 sm:p-6 text-center border-b border-slate-200 dark:border-slate-700">
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
            className="mb-6 text-green-500 hover:text-green-400 hover:bg-green-500/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          {/* Title */}
          <h1 className="text-green-500 text-4xl sm:text-5xl font-bold mb-4">
            Cookie Settings
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg mb-8">
            Manage your cookie preferences and control what data is stored on your device.
          </p>

          {/* Introduction */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 mb-8">
            <CardContent className="p-6 sm:p-8">
              <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
                FastPass uses cookies to provide secure authentication and enhance your experience. You
                can customize your preferences below. Changes take effect immediately and can be updated
                at any time.
              </p>
            </CardContent>
          </Card>

          {/* Cookie Categories */}
          <div className="space-y-6 mb-8">
            {/* Essential Cookies */}
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
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
                      <h2 className="text-green-500 text-xl sm:text-2xl font-semibold">
                        Essential Cookies
                      </h2>
                      <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded text-xs font-semibold">
                        REQUIRED
                      </span>
                    </div>

                    <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mb-4">
                      These cookies are necessary for the website to function and cannot be switched off.
                      They are usually only set in response to actions made by you such as logging in,
                      managing your preferences, or filling in forms.
                    </p>

                    <div className="space-y-3">
                      <h3 className="text-green-500 text-lg font-semibold">Cookies Used:</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-green-500 flex-shrink-0">•</span>
                          <div>
                            <span className="font-mono text-green-500">sb-access-token</span>
                            <span className="text-slate-500 dark:text-slate-400"> - Authentication session (1 hour)</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-500 flex-shrink-0">•</span>
                          <div>
                            <span className="font-mono text-green-500">sb-refresh-token</span>
                            <span className="text-slate-500 dark:text-slate-400"> - Session renewal (30 days)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Functional Cookies */}
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
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
                      <h2 className="text-green-500 text-xl sm:text-2xl font-semibold">
                        Functional Cookies
                      </h2>
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-semibold">
                        OPTIONAL
                      </span>
                    </div>

                    <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mb-4">
                      These cookies enable enhanced functionality and personalization, such as
                      remembering your preferences and settings. They may be set by us or by third-party
                      providers whose services we use.
                    </p>

                    <div className="space-y-3">
                      <h3 className="text-green-500 text-lg font-semibold">Cookies Used:</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-green-500 flex-shrink-0">•</span>
                          <div>
                            <span className="font-mono text-green-500">cookie-consent</span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {' '}
                              - Remembers your cookie preferences (1 year)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-md">
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                          <strong className="text-green-500">What happens if I disable this?</strong>
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
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 mb-8">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="flex-1 bg-green-500 hover:bg-green-400 text-white font-bold py-3 px-6 rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Preferences
                </Button>
                <Button
                  onClick={handleAcceptAll}
                  variant="outline"
                  className="flex-1 border-2 border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-500 font-semibold py-3 px-6 rounded-md transition-all duration-300"
                >
                  Accept All
                </Button>
                <Button
                  onClick={handleRejectAll}
                  variant="outline"
                  className="flex-1 border-2 border-slate-400/30 text-slate-500 dark:text-slate-400 hover:bg-slate-400/10 hover:text-slate-500 dark:hover:text-slate-400 font-semibold py-3 px-6 rounded-md transition-all duration-300"
                >
                  Reject All
                </Button>
              </div>

              {hasChanges && (
                <p className="text-green-500 text-sm text-center mt-4">
                  You have unsaved changes. Click "Save Preferences" to apply them.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-green-500 text-xl font-semibold mb-4">
                Learn More About Our Privacy Practices
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mb-4">
                For detailed information about how we collect, use, and protect your data, please read
                our full Privacy Policy. You can also learn about your rights under GDPR and how to
                exercise them.
              </p>
              <Button
                onClick={() => navigate('/privacy')}
                variant="outline"
                className="border-2 border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-500 font-semibold px-6 py-2 rounded-md transition-all duration-300"
              >
                Read Privacy Policy
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="text-center py-6 text-white/60 text-sm border-t border-slate-200 dark:border-slate-700 mt-12">
          <p>© 2026 FastPass • Guaranteed Response Platform</p>
        </footer>
      </div>
    </div>
  );
};

export default CookieSettings;
