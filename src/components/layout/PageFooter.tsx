import { FastPassLogo } from '@/components/ui/FastPassLogo';

const PageFooter = () => {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          {/* Logo + tagline */}
          <div className="flex flex-col items-center sm:items-start gap-2">
            <FastPassLogo size="sm" />
            <p className="text-slate-400 dark:text-slate-500 text-xs">
              Guaranteed response platform
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <a
              href="/privacy"
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              Terms & Conditions
            </a>
            <a
              href="/cookie-settings"
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              Cookie Settings
            </a>
            <a
              href="mailto:support@fastpass.email"
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-slate-400 dark:text-slate-500 text-xs">
            &copy; {new Date().getFullYear()} FastPass
          </p>
        </div>
      </div>
    </footer>
  );
};

export default PageFooter;
