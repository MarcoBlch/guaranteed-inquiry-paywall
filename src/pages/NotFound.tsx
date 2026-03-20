import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FastPassLogo } from "@/components/ui/FastPassLogo";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen relative overflow-hidden">

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 sm:p-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <FastPassLogo size="lg" />
            <p className="text-white/80 text-xs sm:text-sm font-medium tracking-wider -mt-4 sm:-mt-5">
              GUARANTEED RESPONSES
            </p>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="text-9xl font-bold text-green-500 animate-pulse">
                    404
                  </div>
                </div>
              </div>
              <CardTitle className="text-green-500 text-2xl sm:text-3xl font-bold">
                Page Not Found
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-slate-400 text-base sm:text-lg">
                Oops! The page you're looking for doesn't exist or has been moved.
              </p>

              <div className="bg-green-500/10 border border-green-500/30 rounded-md p-4">
                <p className="text-sm text-slate-400">
                  <strong className="text-green-500">Lost?</strong><br/>
                  <span className="text-green-500">•</span> Check the URL for typos<br/>
                  <span className="text-green-500">•</span> Return to the homepage<br/>
                  <span className="text-green-500">•</span> Contact support if the issue persists
                </p>
              </div>

              <Button
                onClick={() => navigate('/')}
                className="w-full bg-green-500 hover:bg-green-400 text-white font-bold transition-all duration-300 hover:scale-[1.02]"
                size="lg"
              >
                🏠 Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="text-center py-6 text-slate-500 text-xs sm:text-sm px-4">
          <p>© 2026 FastPass • Guaranteed Response Platform</p>
        </footer>
      </div>
    </div>
  );
};

export default NotFound;
