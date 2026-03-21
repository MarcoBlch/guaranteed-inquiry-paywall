import { FastPassLogo } from '@/components/ui/FastPassLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface NavLink {
  label: string;
  href: string;
}

interface PageNavProps {
  showCTA?: boolean;
  ctaLabel?: string;
  onCTAClick?: () => void;
  links?: NavLink[];
}

const PageNav = ({ showCTA, ctaLabel = 'Get Started', onCTAClick, links }: PageNavProps) => {
  const navigate = useNavigate();

  const handleLinkClick = (href: string) => {
    if (href.startsWith('#')) {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(href);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
        <FastPassLogo
          size="sm"
          onClick={() => navigate('/')}
        />

        {links && links.length > 0 && (
          <nav className="hidden sm:flex items-center gap-5">
            {links.map((link) => (
              <button
                key={link.href}
                onClick={() => handleLinkClick(link.href)}
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors bg-transparent border-none cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {showCTA && (
            <Button
              size="sm"
              className="bg-green-500 hover:bg-green-400 text-white font-medium rounded-md text-sm px-4"
              onClick={onCTAClick}
            >
              {ctaLabel}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default PageNav;
