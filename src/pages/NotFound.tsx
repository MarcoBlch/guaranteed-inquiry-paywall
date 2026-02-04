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
      {/* StaticBackground component from App.tsx provides the background */}

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
          <Card className="w-full max-w-md bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_20px_rgba(92,255,176,0.2)]">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="text-9xl font-bold text-[#5cffb0] animate-pulse">
                    404
                  </div>
                  <div className="absolute inset-0 text-9xl font-bold text-[#5cffb0]/20 blur-xl animate-pulse"></div>
                </div>
              </div>
              <CardTitle className="text-[#5cffb0] text-2xl sm:text-3xl font-bold">
                Page Not Found
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-[#B0B0B0] text-base sm:text-lg">
                Oops! The page you're looking for doesn't exist or has been moved.
              </p>

              <div className="bg-[#5cffb0]/10 border border-[#5cffb0]/30 rounded-lg p-4">
                <p className="text-sm text-[#B0B0B0]">
                  <strong className="text-[#5cffb0]">Lost?</strong><br/>
                  <span className="text-[#5cffb0]">•</span> Check the URL for typos<br/>
                  <span className="text-[#5cffb0]">•</span> Return to the homepage<br/>
                  <span className="text-[#5cffb0]">•</span> Contact support if the issue persists
                </p>
              </div>

              <Button
                onClick={() => navigate('/')}
                className="w-full bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold transition-all duration-300 hover:shadow-[0_0_25px_rgba(92,255,176,0.5)] hover:scale-[1.02]"
                size="lg"
              >
                🏠 Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="text-center py-6 text-[#B0B0B0]/60 text-xs sm:text-sm px-4">
          <p>© 2026 FastPass • Guaranteed Response Platform</p>
        </footer>
      </div>
    </div>
  );
};

export default NotFound;
