import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  User,
  Lock,
  Mail,
  AlertTriangle,
  Shield,
  CheckCircle,
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { FastPassLogo } from "@/components/ui/FastPassLogo";

const AccountSettings = () => {
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Profile state
  const [userEmail, setUserEmail] = useState('');
  const [accountCreatedAt, setAccountCreatedAt] = useState('');
  const [lastSignInAt, setLastSignInAt] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [emailChangePassword, setEmailChangePassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Account deletion state
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Please login first');
      navigate('/auth');
      return;
    }

    if (user) {
      loadUserData();
    }
  }, [user, authLoading, navigate]);

  const loadUserData = async () => {
    if (!user) return;

    // Set user data from auth context
    setUserEmail(user.email || '');
    setAccountCreatedAt(user.created_at || '');
    setLastSignInAt(user.last_sign_in_at || '');

    // Load profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profile) {
      setIsAdmin(profile.is_admin || false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);

    try {
      // Validation
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }

      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      if (!currentPassword) {
        throw new Error('Please enter your current password');
      }

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      toast.success('Password updated successfully!');

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password change error:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);

    try {
      // Validation
      if (!newEmail || !newEmail.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      if (newEmail === userEmail) {
        throw new Error('New email must be different from current email');
      }

      if (!emailChangePassword) {
        throw new Error('Please enter your password to confirm');
      }

      // Verify password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: emailChangePassword
      });

      if (signInError) {
        throw new Error('Password is incorrect');
      }

      // Update email (Supabase will send confirmation to new email)
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (updateError) throw updateError;

      toast.success('Confirmation email sent to new address. Please check your inbox.');

      // Clear form
      setNewEmail('');
      setEmailChangePassword('');
    } catch (error: any) {
      console.error('Email change error:', error);
      toast.error(error.message || 'Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleAccountDeletion = async () => {
    if (!user) return;

    setDeleteLoading(true);

    try {
      // Validation
      if (!deletePassword) {
        throw new Error('Please enter your password to confirm deletion');
      }

      if (deleteConfirmText !== 'DELETE MY ACCOUNT') {
        throw new Error('Please type "DELETE MY ACCOUNT" exactly to confirm');
      }

      // Call Edge Function
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        body: {
          password: deletePassword,
          confirmText: deleteConfirmText
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete account');
      }

      toast.success('Account deleted successfully. Goodbye!');

      // Sign out and redirect
      await supabase.auth.signOut();
      setTimeout(() => navigate('/'), 2000);

    } catch (error: any) {
      console.error('Account deletion error:', error);
      toast.error(error.message || 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const getPasswordStrength = (password: string): { strength: string; color: string } => {
    if (password.length === 0) return { strength: '', color: '' };
    if (password.length < 8) return { strength: 'Weak', color: 'text-red-400' };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score >= 4) return { strength: 'Strong', color: 'text-[#5cffb0]' };
    if (score >= 2) return { strength: 'Medium', color: 'text-yellow-400' };
    return { strength: 'Weak', color: 'text-red-400' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-4">
                <FastPassLogo size="sm" />
                <div>
                  <h1 className="text-[#5cffb0] text-2xl sm:text-3xl font-bold">Account Settings</h1>
                  <p className="text-[#B0B0B0] text-sm sm:text-base">Manage your account and security</p>
                </div>
              </div>

              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="bg-transparent border border-[#5cffb0]/50 text-[#B0B0B0] hover:bg-[#5cffb0]/10 hover:text-[#5cffb0] flex-1 sm:flex-none"
                  size="sm"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleLogout}
                  className="bg-transparent border border-[#5cffb0]/50 text-[#B0B0B0] hover:bg-[#5cffb0]/10 hover:text-[#5cffb0] flex-1 sm:flex-none"
                  size="sm"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 px-4 sm:px-6 pb-8">
          <div className="max-w-4xl mx-auto">
            <Tabs defaultValue="profile">
              <TabsList className="mb-6 bg-transparent backdrop-blur-sm border border-[#5cffb0]/30 p-1">
                <TabsTrigger
                  value="profile"
                  className="text-[#B0B0B0] data-[state=active]:bg-[#5cffb0]/20 data-[state=active]:text-[#5cffb0] border border-transparent data-[state=active]:border-[#5cffb0]/50"
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger
                  value="security"
                  className="text-[#B0B0B0] data-[state=active]:bg-[#5cffb0]/20 data-[state=active]:text-[#5cffb0] border border-transparent data-[state=active]:border-[#5cffb0]/50"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Security
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile">
                <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                  <CardHeader>
                    <CardTitle className="text-[#5cffb0] text-xl sm:text-2xl flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Profile Information
                    </CardTitle>
                    <CardDescription className="text-[#B0B0B0]">
                      View your account details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Email Display */}
                    <div className="space-y-2">
                      <Label className="text-[#5cffb0]">Email Address</Label>
                      <div className="flex items-center gap-2 p-3 bg-[#1a1f2e]/50 rounded-md border border-[#5cffb0]/10">
                        <Mail className="h-4 w-4 text-[#B0B0B0]" />
                        <span className="text-[#B0B0B0]">{userEmail}</span>
                        {user?.email_confirmed_at && (
                          <CheckCircle className="h-4 w-4 text-[#5cffb0] ml-auto" />
                        )}
                      </div>
                    </div>

                    {/* Account Created */}
                    <div className="space-y-2">
                      <Label className="text-[#5cffb0]">Account Created</Label>
                      <div className="p-3 bg-[#1a1f2e]/50 rounded-md border border-[#5cffb0]/10">
                        <span className="text-[#B0B0B0]">
                          {accountCreatedAt ? new Date(accountCreatedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Last Sign In */}
                    <div className="space-y-2">
                      <Label className="text-[#5cffb0]">Last Sign In</Label>
                      <div className="p-3 bg-[#1a1f2e]/50 rounded-md border border-[#5cffb0]/10">
                        <span className="text-[#B0B0B0]">
                          {lastSignInAt ? new Date(lastSignInAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Admin Badge */}
                    {isAdmin && (
                      <div className="bg-[#5cffb0]/10 p-4 rounded-md border border-[#5cffb0]/30">
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-[#5cffb0]" />
                          <span className="text-[#5cffb0] font-semibold">Administrator Account</span>
                        </div>
                        <p className="text-[#B0B0B0] text-sm mt-1">
                          You have admin privileges on this platform
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security">
                <div className="space-y-6">
                  {/* Change Password */}
                  <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                    <CardHeader>
                      <CardTitle className="text-[#5cffb0] text-xl flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Change Password
                      </CardTitle>
                      <CardDescription className="text-[#B0B0B0]">
                        Update your password to keep your account secure
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword" className="text-[#5cffb0]">
                            Current Password
                          </Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0] focus:border-[#5cffb0]"
                            placeholder="Enter your current password"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newPassword" className="text-[#5cffb0]">
                            New Password
                          </Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={8}
                            className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0] focus:border-[#5cffb0]"
                            placeholder="Enter new password (min 8 characters)"
                          />
                          {newPassword && (
                            <p className={`text-sm ${passwordStrength.color}`}>
                              Strength: {passwordStrength.strength}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword" className="text-[#5cffb0]">
                            Confirm New Password
                          </Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={8}
                            className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0] focus:border-[#5cffb0]"
                            placeholder="Confirm new password"
                          />
                        </div>

                        <div className="bg-blue-500/10 p-3 rounded-md border border-blue-500/30">
                          <p className="text-sm text-blue-400">
                            Password requirements: At least 8 characters. For stronger security, use a mix of uppercase, lowercase, numbers, and special characters.
                          </p>
                        </div>

                        <Button
                          type="submit"
                          disabled={passwordLoading}
                          className="w-full bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold transition-colors duration-300"
                        >
                          {passwordLoading ? 'Updating...' : 'Update Password'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Change Email */}
                  <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                    <CardHeader>
                      <CardTitle className="text-[#5cffb0] text-xl flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Change Email Address
                      </CardTitle>
                      <CardDescription className="text-[#B0B0B0]">
                        Update your email address (requires confirmation)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleEmailChange} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="newEmail" className="text-[#5cffb0]">
                            New Email Address
                          </Label>
                          <Input
                            id="newEmail"
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            required
                            className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0] focus:border-[#5cffb0]"
                            placeholder="Enter new email address"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="emailChangePassword" className="text-[#5cffb0]">
                            Confirm Password
                          </Label>
                          <Input
                            id="emailChangePassword"
                            type="password"
                            value={emailChangePassword}
                            onChange={(e) => setEmailChangePassword(e.target.value)}
                            required
                            className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0] focus:border-[#5cffb0]"
                            placeholder="Enter your password to confirm"
                          />
                        </div>

                        <div className="bg-yellow-500/10 p-3 rounded-md border border-yellow-500/30">
                          <p className="text-sm text-yellow-400">
                            A confirmation email will be sent to your new email address. You must click the link to complete the change.
                          </p>
                        </div>

                        <Button
                          type="submit"
                          disabled={emailLoading}
                          className="w-full bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold transition-colors duration-300"
                        >
                          {emailLoading ? 'Sending...' : 'Update Email'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Danger Zone */}
                  <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                    <CardHeader>
                      <CardTitle className="text-red-400 text-xl flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Danger Zone
                      </CardTitle>
                      <CardDescription className="text-[#B0B0B0]">
                        Irreversible actions - proceed with caution
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-red-500/10 p-4 rounded-md border border-red-500/30">
                        <h3 className="text-red-400 font-semibold mb-2">Delete Account</h3>
                        <p className="text-[#B0B0B0] text-sm mb-4">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <ul className="text-[#B0B0B0] text-sm mb-4 space-y-1 list-disc list-inside">
                          <li>All your messages will be anonymized</li>
                          <li>Your profile and settings will be deleted</li>
                          <li>Active transactions must be completed first</li>
                          <li>Pending payouts must be resolved first</li>
                        </ul>
                        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                            >
                              Delete Account
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[#1a1f2e]/95 border border-red-500/30 max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-red-400">Delete Your Account?</AlertDialogTitle>
                              <AlertDialogDescription className="text-[#B0B0B0]">
                                This action cannot be undone. All your data will be permanently deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="deletePassword" className="text-[#5cffb0]">
                                  Confirm Password
                                </Label>
                                <Input
                                  id="deletePassword"
                                  type="password"
                                  value={deletePassword}
                                  onChange={(e) => setDeletePassword(e.target.value)}
                                  placeholder="Enter your password"
                                  className="bg-[#1a1f2e]/50 border-red-500/30 text-[#B0B0B0] focus:border-red-500"
                                  disabled={deleteLoading}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="deleteConfirm" className="text-[#5cffb0]">
                                  Type "DELETE MY ACCOUNT" to confirm
                                </Label>
                                <Input
                                  id="deleteConfirm"
                                  type="text"
                                  value={deleteConfirmText}
                                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                                  placeholder="DELETE MY ACCOUNT"
                                  className="bg-[#1a1f2e]/50 border-red-500/30 text-[#B0B0B0] focus:border-red-500"
                                  disabled={deleteLoading}
                                />
                              </div>

                              <div className="bg-yellow-500/10 p-3 rounded-md border border-yellow-500/30">
                                <p className="text-sm text-yellow-400">
                                  <strong>Warning:</strong> You cannot delete your account if you have active escrow transactions or pending payouts.
                                </p>
                              </div>
                            </div>

                            <AlertDialogFooter>
                              <AlertDialogCancel
                                className="bg-transparent border-[#5cffb0]/50 text-[#B0B0B0] hover:bg-[#5cffb0]/10"
                                disabled={deleteLoading}
                              >
                                Cancel
                              </AlertDialogCancel>
                              <Button
                                onClick={handleAccountDeletion}
                                disabled={deleteLoading || deleteConfirmText !== 'DELETE MY ACCOUNT' || !deletePassword}
                                className="bg-red-500 hover:bg-red-600 text-white"
                              >
                                {deleteLoading ? 'Deleting...' : 'Delete Account'}
                              </Button>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
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

export default AccountSettings;
