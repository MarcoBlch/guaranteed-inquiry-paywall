
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if this is a password reset flow
    const isReset = searchParams.get('reset') === 'true';
    if (isReset) {
      setIsPasswordReset(true);
      setIsLogin(false);
      setIsForgotPassword(false);
    }
  }, [searchParams]);

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      if (error) throw error;
      toast.success('Password reset email sent! Check your inbox.');
      setIsForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;

      console.log('Google OAuth initiated:', data);
      // Supabase will handle the redirect to Google
    } catch (error: any) {
      console.error('Google OAuth error:', error);
      toast.error('Google sign in failed: ' + error.message);
      setLoading(false);
    }
  };

  const handleLinkedInSignIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      console.log('LinkedIn OAuth initiated:', data);
      // Supabase will handle the redirect to LinkedIn
    } catch (error: any) {
      console.error('LinkedIn OAuth error:', error);
      toast.error('LinkedIn sign in failed: ' + error.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isForgotPassword) {
      return handleForgotPasswordSubmit(e);
    }

    if (isPasswordReset) {
      return handlePasswordResetSubmit(e);
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          // SECURITY FIX: Better error handling for login
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password');
          } else if (error.message.includes('Email not confirmed')) {
            throw new Error('Please confirm your email before logging in');
          } else {
            throw error;
          }
        }
        navigate('/dashboard');
      } else {
        // SECURITY FIX: Add proper emailRedirectTo for signup
        const redirectUrl = `${window.location.origin}/auth`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl
          }
        });
        if (error) {
          // SECURITY FIX: Better error handling for signup
          if (error.message.includes('already registered')) {
            throw new Error('This email is already in use. Please try logging in.');
          } else if (error.message.includes('password')) {
            throw new Error('Password must be at least 6 characters long.');
          } else {
            throw error;
          }
        }
        toast.success('Check your email to confirm your account!');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_20px_rgba(92,255,176,0.2)]">
      <CardHeader>
        <CardTitle className="text-[#5cffb0] text-2xl font-bold">
          {isPasswordReset ? 'Set New Password' :
           isForgotPassword ? 'Reset Password' :
           isLogin ? 'Login' : 'Sign Up'}
        </CardTitle>
        <CardDescription className="text-[#B0B0B0]">
          {isPasswordReset ? 'Enter your new password below' :
           isForgotPassword ? 'Enter your email to receive a reset link' :
           isLogin ? 'Welcome back!' : 'Create a new account'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isPasswordReset ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-[#5cffb0]">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0] placeholder:text-[#B0B0B0]/50 focus:border-[#5cffb0]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[#5cffb0]">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0] placeholder:text-[#B0B0B0]/50 focus:border-[#5cffb0]"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#5cffb0]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0] placeholder:text-[#B0B0B0]/50 focus:border-[#5cffb0]"
                />
              </div>
              {!isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[#5cffb0]">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0] placeholder:text-[#B0B0B0]/50 focus:border-[#5cffb0]"
                  />
                </div>
              )}
            </>
          )}
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold transition-colors duration-300"
            disabled={loading}
          >
            {loading ? 'Loading...' :
             isPasswordReset ? 'Update Password' :
             isForgotPassword ? 'Send Reset Email' :
             isLogin ? 'Login' : 'Sign Up'}
          </Button>

          {/* OAuth Buttons - Currently disabled, uncomment to enable when OAuth is configured */}
          {/* {!isPasswordReset && !isForgotPassword && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[#5cffb0]/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#1a1f2e] px-2 text-[#B0B0B0]">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full border-[#5cffb0]/50 text-[#B0B0B0] bg-transparent hover:bg-[#5cffb0]/10 hover:text-[#5cffb0]"
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLinkedInSignIn}
                  disabled={loading}
                  className="w-full border-[#5cffb0]/50 text-[#B0B0B0] bg-transparent hover:bg-[#5cffb0]/10 hover:text-[#5cffb0]"
                >
                  <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </Button>
              </div>
            </>
          )} */}

          {isPasswordReset ? (
            <Button
              type="button"
              variant="link"
              className="w-full text-[#5cffb0] hover:text-[#4de89d]"
              onClick={() => {
                setIsPasswordReset(false);
                setIsLogin(true);
                // Clear the reset parameter from URL
                navigate('/auth');
              }}
            >
              Back to Login
            </Button>
          ) : isForgotPassword ? (
            <Button
              type="button"
              variant="link"
              className="w-full text-[#5cffb0] hover:text-[#4de89d]"
              onClick={() => {
                setIsForgotPassword(false);
                setIsLogin(true);
              }}
            >
              Back to Login
            </Button>
          ) : (
            <>
              {isLogin && (
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-sm text-[#B0B0B0] hover:text-[#5cffb0]"
                  onClick={() => setIsForgotPassword(true)}
                >
                  Forgot Password?
                </Button>
              )}
              <Button
                type="button"
                variant="link"
                className="w-full text-[#5cffb0] hover:text-[#4de89d]"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
              </Button>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default AuthForm;
