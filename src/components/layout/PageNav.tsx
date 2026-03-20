import { FastPassLogo } from '@/components/ui/FastPassLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface PageNavProps {
  showCTA?: boolean;
  ctaLabel?: string;
  onCTAClick?: () => void;
}

const PageNav = ({ showCTA, ctaLabel = 'Get Started', onCTAClick }: PageNavProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
        <FastPassLogo
          size="sm"
          onClick={() => navigate('/')}
        />

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
