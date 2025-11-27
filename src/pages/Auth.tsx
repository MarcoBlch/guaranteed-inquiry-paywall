
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AuthForm from '@/components/auth/AuthForm';
import { FastPassLogo } from '@/components/ui/FastPassLogo';

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthFlow = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type');
      const redirectTo = searchParams.get('redirect_to');
      const isPasswordReset = searchParams.get('reset') === 'true';

      // If we're in password reset mode, don't do anything - just show the form
      if (isPasswordReset) {
        console.log('Password reset mode detected - staying on auth page');
        return;
      }

      // Check for OAuth session (access_token and refresh_token in URL)
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      if (accessToken && refreshToken) {
        console.log('OAuth tokens found in URL, redirecting to callback handler...');
        navigate('/auth/callback');
        return;
      }

      // Handle email confirmation
      if (token && type === 'signup') {
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
          });

          if (error) {
            console.error('Email confirmation error:', error);
            toast.error('Email confirmation failed: ' + error.message);
          } else {
            toast.success('Email confirmed successfully! You are now logged in.');
            // Redirect to dashboard or specified redirect URL
            navigate(redirectTo || '/dashboard');
          }
        } catch (err) {
          console.error('Confirmation error:', err);
          toast.error('Failed to confirm email');
        }
      }
    };

    handleAuthFlow();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* StaticBackground component from App.tsx provides the background */}

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header with Logo */}
        <header className="p-4 sm:p-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <FastPassLogo size="lg" />
            <p className="text-white/80 text-xs sm:text-sm font-medium tracking-wider -mt-4 sm:-mt-5">
              GUARANTEED RESPONSES
            </p>
          </div>
        </header>

        {/* Main Content - Auth Form */}
        <div className="flex-1 flex items-center justify-center p-4">
          <AuthForm />
        </div>

        {/* Footer */}
        <footer className="text-center py-6 text-[#B0B0B0]/60 text-sm">
          <p>© 2025 FastPass • Guaranteed Response Platform</p>
        </footer>
      </div>
    </div>
  );
};

export default AuthPage;
