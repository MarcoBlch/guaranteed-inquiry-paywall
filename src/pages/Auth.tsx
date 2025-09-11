
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import AuthForm from '@/components/auth/AuthForm';

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type');
      const redirectTo = searchParams.get('redirect_to');

      if (token && type === 'signup') {
        try {
          const { data, error } = await supabase.auth.verifyOtp({
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

    handleEmailConfirmation();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-white/10 rounded-full blur-xl" />
      </div>
      
      <div className="relative z-10">
        <AuthForm />
      </div>
    </div>
  );
};

export default AuthPage;
