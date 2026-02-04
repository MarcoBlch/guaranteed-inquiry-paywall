import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FastPassLogo } from "@/components/ui/FastPassLogo";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Check if user has admin privileges
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', currentUser.id)
          .single();

        if (!error && profile?.is_admin === true) {
          setIsAdmin(true);
        }
      }

      setLoading(false);
    };

    checkAdminStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAdmin(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5cffb0]/20 border-t-[#5cffb0] mx-auto mb-4"></div>
            <p className="text-[#B0B0B0]">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to auth page if not logged in
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    // Show unauthorized page if logged in but not admin
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="relative z-10 min-h-screen flex flex-col">
          <header className="p-4 sm:p-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <FastPassLogo size="lg" />
              <p className="text-white/80 text-xs sm:text-sm font-medium tracking-wider -mt-4 sm:-mt-5">
                GUARANTEED RESPONSES
              </p>
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_20px_rgba(92,255,176,0.2)]">
              <CardHeader className="text-center">
                <div className="text-6xl mb-4">🔒</div>
                <CardTitle className="text-[#5cffb0] text-2xl font-bold">
                  Access Denied
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-[#B0B0B0]">
                  This page is restricted to administrators only.
                </p>
                <Button
                  onClick={() => window.location.href = '/dashboard'}
                  className="bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold"
                >
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>

          <footer className="text-center py-6 text-[#B0B0B0]/60 text-xs sm:text-sm px-4">
            <p>© 2026 FastPass • Guaranteed Response Platform</p>
          </footer>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;
