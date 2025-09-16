
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';

const PaywallPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-white/10 rounded-full blur-xl" />
      </div>
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 sm:p-6 text-center">
          <div className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2">
            <h1 className="text-white font-bold text-lg sm:text-xl tracking-wide">FASTPASS</h1>
            <p className="text-white/80 text-xs sm:text-sm font-medium">GUARANTEED RESPONSES</p>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center">
          {/* Hero Text */}
          <div className="mb-8 sm:mb-12 max-w-2xl w-full">
            <h2 className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 leading-tight">
              GET PAID
              <br />
              <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                TO RESPOND
              </span>
            </h2>
            <p className="text-white/90 text-lg sm:text-xl md:text-2xl font-light mb-6 sm:mb-8 leading-relaxed px-2">
              Turn your attention into revenue with guaranteed response payments
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl mb-8 sm:mb-12">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center text-xl sm:text-2xl">
                  💰
                </div>
                <h3 className="font-bold mb-2 text-sm sm:text-base">Set Your Price</h3>
                <p className="text-white/80 text-xs sm:text-sm leading-relaxed">Choose response timeframes and pricing that works for you</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center text-xl sm:text-2xl">
                  ✉️
                </div>
                <h3 className="font-bold mb-2 text-sm sm:text-base">Receive Messages</h3>
                <p className="text-white/80 text-xs sm:text-sm leading-relaxed">Serious inquiries only - no more spam in your inbox</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white sm:col-span-2 lg:col-span-1">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center text-xl sm:text-2xl">
                  ⚡
                </div>
                <h3 className="font-bold mb-2 text-sm sm:text-base">Get Paid</h3>
                <p className="text-white/80 text-xs sm:text-sm leading-relaxed">75% to you, automatic payouts for every response</p>
              </CardContent>
            </Card>
          </div>

          {/* CTA Section */}
          <Card className="w-full max-w-md mx-4 bg-white/95 backdrop-blur-sm">
            <CardContent className="p-6 sm:p-8">
              {isAuthenticated ? (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Welcome back!</h3>
                  <Button 
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 text-lg" 
                    onClick={() => navigate('/dashboard')}
                  >
                    Go to Dashboard
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full border-orange-500 text-orange-600 hover:bg-orange-50" 
                    onClick={() => navigate('/pay/b706cf3e-8d0b-47ed-af50-502b288510a8')}
                  >
                    🧪 Test Payment (Demo)
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to get started?</h3>
                  <p className="text-gray-600 mb-6">Join professionals who are monetizing their time and expertise</p>
                  <Button
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 text-lg"
                    onClick={() => navigate('/auth')}
                  >
                    Start Earning Today
                  </Button>
                  <p className="text-xs text-gray-500 text-center">Free to join • No setup fees • 75% revenue share</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="text-center py-6 text-white/60 text-sm">
          <p>© 2024 FastPass • Guaranteed Response Platform</p>
        </footer>
      </div>
    </div>
  );
};

export default PaywallPage;

