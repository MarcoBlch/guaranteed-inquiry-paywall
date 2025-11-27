import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FastPassLogo } from '@/components/ui/FastPassLogo';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Prevent multiple executions
    let executed = false;

    const handleAuthCallback = async () => {
      if (executed) return;
      executed = true;

      try {
        // CRITICAL: Supabase sends auth parameters in URL FRAGMENT (#), not query string (?)
        // React Router's useSearchParams only reads query params, so we must parse the fragment manually
        const fragment = window.location.hash.substring(1); // Remove leading #
        const fragmentParams = new URLSearchParams(fragment);

        // Try query params first (for email verification), then fragment params (for password recovery)
        const type = searchParams.get('type') || fragmentParams.get('type');
        const tokenHash = searchParams.get('token_hash') || fragmentParams.get('token_hash');
        const isEmailVerification = type === 'email';
        const isPasswordRecovery = type === 'recovery';

        // Log ALL URL parameters to debug
        const allQueryParams: Record<string, string> = {};
        searchParams.forEach((value, key) => {
          allQueryParams[key] = key.includes('token') || key.includes('hash')
            ? value.substring(0, 10) + '...'
            : value;
        });

        const allFragmentParams: Record<string, string> = {};
        fragmentParams.forEach((value, key) => {
          allFragmentParams[key] = key.includes('token') || key.includes('hash')
            ? value.substring(0, 10) + '...'
            : value;
        });

        console.log('Handling auth callback...', {
          type,
          tokenHash: tokenHash?.substring(0, 10) + '...',
          isEmailVerification,
          isPasswordRecovery,
          queryParams: allQueryParams,
          fragmentParams: allFragmentParams,
          fullURL: window.location.href
        });

        // Check for error parameters first
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          console.error('Auth error:', error, errorDescription);
          toast.error(`Authentication failed: ${errorDescription || error}`);
          navigate('/auth');
          return;
        }

        // CRITICAL: For password recovery, we need to let Supabase establish the session
        // from the URL fragment BEFORE redirecting, otherwise the session will be lost
        if (isPasswordRecovery) {
          console.log('Password recovery detected - establishing session from fragment');

          // Extract access_token and refresh_token from fragment
          const accessToken = fragmentParams.get('access_token');
          const refreshToken = fragmentParams.get('refresh_token');

          if (accessToken && refreshToken) {
            // Set the session using the tokens from the URL
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (sessionError) {
              console.error('Failed to set recovery session:', sessionError);
              toast.error('Failed to start password reset session');
              navigate('/auth');
              return;
            }

            console.log('Recovery session established - redirecting to reset form');
          }

          // Now redirect to reset form with session established
          navigate('/auth?reset=true', { replace: true });
          return;
        }

        // Get the current session (this automatically processes email verification tokens)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          toast.error('Failed to establish session');
          navigate('/auth');
          return;
        }

        if (session && session.user) {
          console.log('Auth callback successful - user:', session.user.email);

          // Different messages for email verification vs OAuth
          if (isEmailVerification) {
            toast.success('Email verified! Welcome to FastPass.');
          } else {
            toast.success(`Welcome back, ${session.user.email}!`);
          }

          // Check if user has completed profile setup
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            navigate('/dashboard');
          } else {
            // First time user - create profile
            navigate('/dashboard?setup=true');
          }
        } else {
          console.log('No session found after auth callback');

          // For email verification, provide more helpful message
          if (isEmailVerification) {
            toast.error('Email verification link may have expired. Please try logging in or request a new verification email.');
          } else {
            toast.error('Authentication session not found');
          }
          navigate('/auth');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error('Authentication failed');
        navigate('/auth');
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

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
          <div className="bg-[#1a1f2e]/95 backdrop-blur-md rounded-2xl p-8 shadow-[0_0_20px_rgba(92,255,176,0.2)] border border-[#5cffb0]/20">
            <div className="text-center">
              <div className="relative inline-block mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5cffb0]/20 border-t-[#5cffb0] mx-auto"></div>
                <div className="absolute inset-0 rounded-full bg-[#5cffb0]/10 blur-xl animate-pulse"></div>
              </div>
              <h2 className="text-xl font-semibold text-[#5cffb0] mb-2">Verifying your account...</h2>
              <p className="text-[#B0B0B0]">Please wait while we complete the process</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-6 text-[#B0B0B0]/60 text-xs sm:text-sm px-4">
          <p>© 2025 FastPass • Guaranteed Response Platform</p>
        </footer>
      </div>
    </div>
  );
};

export default AuthCallback;
