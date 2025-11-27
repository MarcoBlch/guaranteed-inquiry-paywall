import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FastPassLogo } from '@/components/ui/FastPassLogo';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Determine the type of callback (email verification, password recovery, or OAuth)
        const type = searchParams.get('type');
        const isEmailVerification = type === 'email';
        const isPasswordRecovery = type === 'recovery';

        console.log('Handling auth callback...', { type, isEmailVerification, isPasswordRecovery });

        // Check for error parameters first
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          console.error('Auth error:', error, errorDescription);
          toast.error(`Authentication failed: ${errorDescription || error}`);
          navigate('/auth');
          return;
        }

        // For password recovery, redirect to reset form immediately
        if (isPasswordRecovery) {
          console.log('Password recovery detected - redirecting to reset form');
          navigate('/auth?reset=true');
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
