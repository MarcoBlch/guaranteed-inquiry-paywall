
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AuthForm from '@/components/auth/AuthForm';
import { FastPassLogo } from '@/components/ui/FastPassLogo';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { storeInviteCode, getInviteCodeSync } from '@/utils/inviteCodeStorage';

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthFlow = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type');
      const redirectTo = searchParams.get('redirect_to');
      const isPasswordReset = searchParams.get('reset') === 'true';

      // Handle invitation code from URL
      const inviteCodeFromUrl = searchParams.get('invite_code');
      if (inviteCodeFromUrl) {
        console.log('Invitation code detected in URL:', inviteCodeFromUrl);

        // Validate and enrich the code before storing
        try {
          const { data, error } = await supabase.functions.invoke('validate-invite-code', {
            body: { code: inviteCodeFromUrl }
          });

          if (error || !data?.valid) {
            console.error('Invalid invite code from URL:', error);
            toast.error('Invalid invitation code');
          } else {
            // Store enriched invite code data
            storeInviteCode({
              code: data.code,
              code_type: data.code_type,
              invite_code_id: data.invite_code_id,
              stored_at: Date.now()
            });
            setInviteCode(data.code);
            toast.success('Using invitation code: ' + data.code, {
              description: 'Your code will be applied when you sign up'
            });
          }
        } catch (error) {
          console.error('Error validating invite code:', error);
          toast.error('Failed to validate invitation code');
        }
      } else {
        // Check if there's a pending code in localStorage
        const storedCode = getInviteCodeSync();
        if (storedCode) {
          setInviteCode(storedCode);
        }
      }

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
          <div className="w-full max-w-md space-y-4">
            {/* Invitation Code Badge */}
            {inviteCode && (
              <div className="bg-gradient-to-r from-[#5cffb0]/20 to-[#2C424C]/20 backdrop-blur-md border border-[#5cffb0]/30 rounded-lg p-4 shadow-[0_0_15px_rgba(92,255,176,0.2)]">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-[#5cffb0]" />
                  <span className="text-[#5cffb0] font-semibold">Invitation Code Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#B0B0B0] text-sm">Code:</span>
                  <Badge className="bg-[#5cffb0]/20 text-[#5cffb0] border-[#5cffb0]/30 font-mono">
                    {inviteCode}
                  </Badge>
                </div>
                <p className="text-[#B0B0B0]/80 text-xs mt-2">
                  This code will be applied automatically when you sign up
                </p>
              </div>
            )}

            <AuthForm />
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-6 text-[#B0B0B0]/60 text-sm">
          <p>© 2026 FastPass • Guaranteed Response Platform</p>
        </footer>
      </div>
    </div>
  );
};

export default AuthPage;
