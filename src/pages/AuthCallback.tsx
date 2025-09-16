import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Handling OAuth callback...');
        
        // Check for error parameters first
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          console.error('OAuth error:', error, errorDescription);
          toast.error(`Authentication failed: ${errorDescription || error}`);
          navigate('/auth');
          return;
        }

        // Get the current session after OAuth redirect
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          toast.error('Failed to establish session');
          navigate('/auth');
          return;
        }

        if (session && session.user) {
          console.log('OAuth callback successful - user:', session.user.email);
          toast.success(`Welcome back, ${session.user.email}!`);
          
          // Check if user has completed profile setup
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            navigate('/dashboard');
          } else {
            // First time OAuth user - create profile
            navigate('/dashboard?setup=true');
          }
        } else {
          console.log('No session found after OAuth callback');
          toast.error('Authentication session not found');
          navigate('/auth');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        toast.error('Authentication failed');
        navigate('/auth');
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 flex items-center justify-center">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Completing sign in...</h2>
          <p className="text-gray-600">Please wait while we set up your account</p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;