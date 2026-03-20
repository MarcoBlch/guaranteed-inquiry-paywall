/**
 * Cookie Settings Page
 *
 * GDPR-compliant cookie preference management for FastPass.email
 * Allows users to customize their cookie consent at any time
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import PageNav from '@/components/layout/PageNav';
import PageFooter from '@/components/layout/PageFooter';

interface CookieConsent {
  timestamp: string;
  accepted: boolean;
  categories: string[];
}

const CookieSettings = () => {
  const navigate = useNavigate();
  const [essentialEnabled] = useState(true);
  const [functionalEnabled, setFunctionalEnabled] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
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
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <PageNav />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          {/* Back */}
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="sm"
            className="mb-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </Button>

          {/* Title */}
          <h1 className="font-display text-4xl sm:text-5xl text-slate-900 dark:text-slate-100 mb-2">
            Cookie Settings
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base mb-10">
            Manage your cookie preferences and control what data is stored on your device.
          </p>

          {/* Intro */}
          <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-10 pb-10 border-b border-slate-100 dark:border-slate-800">
            FastPass uses cookies to provide secure authentication and enhance your experience. You
            can customize your preferences below. Changes take effect immediately and can be updated
            at any time.
          </p>

          {/* Cookie Categories */}
          <div className="space-y-6 mb-10">
            {/* Essential */}
            <div className="p-5 rounded-md border border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={essentialEnabled}
                  disabled
                  className="mt-1"
                  aria-label="Essential cookies (always enabled)"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                      Essential Cookies
                    </h2>
                    <span className="px-1.5 py-0.5 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded text-xs font-medium">
                      Required
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-3">
                    These cookies are necessary for the website to function and cannot be switched off.
                    They are usually only set in response to actions made by you such as logging in,
                    managing your preferences, or filling in forms.
                  </p>
                  <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <p><span className="font-mono text-slate-700 dark:text-slate-300">sb-access-token</span> — Authentication session (1 hour)</p>
                    <p><span className="font-mono text-slate-700 dark:text-slate-300">sb-refresh-token</span> — Session renewal (30 days)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Functional */}
            <div className="p-5 rounded-md border border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={functionalEnabled}
                  onCheckedChange={handleFunctionalChange}
                  className="mt-1"
                  aria-label="Functional cookies (optional)"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                      Functional Cookies
                    </h2>
                    <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded text-xs font-medium">
                      Optional
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-3">
                    These cookies enable enhanced functionality and personalization, such as
                    remembering your preferences and settings.
                  </p>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <p><span className="font-mono text-slate-700 dark:text-slate-300">cookie-consent</span> — Remembers your cookie preferences (1 year)</p>
                  </div>
                  <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-700 dark:text-slate-300">What happens if I disable this?</span>{' '}
                      The cookie banner will appear on every visit, as we won't remember your preference.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex-1 bg-green-500 hover:bg-green-400 text-white font-semibold py-2.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Preferences
            </Button>
            <Button
              onClick={handleAcceptAll}
              variant="outline"
              className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 font-medium py-2.5 rounded-md transition-colors"
            >
              Accept All
            </Button>
            <Button
              onClick={handleRejectAll}
              variant="outline"
              className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 font-medium py-2.5 rounded-md transition-colors"
            >
              Reject All
            </Button>
          </div>
          {hasChanges && (
            <p className="text-green-500 text-sm text-center">
              You have unsaved changes.
            </p>
          )}

          {/* Privacy link */}
          <div className="text-center mt-10 pt-10 border-t border-slate-100 dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
              For detailed information about how we collect and protect your data, read our full Privacy Policy.
            </p>
            <Button
              onClick={() => navigate('/privacy')}
              variant="outline"
              className="border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 font-medium px-6 py-2 rounded-md transition-colors"
            >
              Read Privacy Policy
            </Button>
          </div>
        </div>
      </main>

      <PageFooter />
    </div>
  );
};

export default CookieSettings;
