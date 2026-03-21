import React, { useState, useEffect } from 'react';
import AdminDirectoryManager from "@/components/admin/AdminDirectoryManager";
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  RefreshCw,
  Users,
  Key,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Crown,
  Activity,
  Clock,
  Mail,
  Send,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FastPassLogo } from "@/components/ui/FastPassLogo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useInvitationRequests } from "@/hooks/useInvitationRequests";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InviteAnalytics {
  overview: {
    total_codes: number;
    used_codes: number;
    available_codes: number;
    redemption_rate: string;
    recent_usage_7d: number;
    invite_only_enabled: boolean;
  };
  by_type: {
    founder: { total: number; used: number; available: number };
    referral: { total: number; used: number; available: number };
  };
  user_tiers: {
    founder: number;
    early_adopter: number;
    standard: number;
    total: number;
  };
  top_referrers: Array<{
    email: string;
    display_name: string;
    referral_count: number;
    tier: string;
    revenue_percentage: string;
  }>;
  recent_codes: Array<{
    code: string;
    code_type: string;
    is_used: boolean;
    is_active: boolean;
    created_at: string;
    used_at: string | null;
  }>;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<InviteAnalytics | null>(null);
  const [inviteOnlyMode, setInviteOnlyMode] = useState(false);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [grantingAdmin, setGrantingAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [codeCount, setCodeCount] = useState(5);

  // Invitation requests state
  const { stats: invitationStats, loading: invitationLoading, sending: sendingInvitations, fetchStats: fetchInvitationStats, sendInvitations } = useInvitationRequests();
  const [batchSize, setBatchSize] = useState(10);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    loadAnalytics();
    fetchInvitationStats();
  }, [fetchInvitationStats]);

  const loadAnalytics = async () => {
    setRefreshing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error('Please login first');
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.functions.invoke('get-invite-analytics', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success && data?.analytics) {
        setAnalytics(data.analytics);
        setInviteOnlyMode(data.analytics.overview.invite_only_enabled);
      } else {
        throw new Error('Invalid analytics response');
      }
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast.error(`Failed to load analytics: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerateCodes = async () => {
    if (codeCount < 1 || codeCount > 20) {
      toast.error('Please enter a count between 1 and 20');
      return;
    }

    setGeneratingCodes(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error('Please login first');
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-invite-codes', {
        body: {
          code_type: 'founder',
          count: codeCount
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Generated ${codeCount} founder code(s) successfully!`);
        setCodeCount(5); // Reset to default
        loadAnalytics(); // Refresh data
      } else {
        throw new Error(data?.error || 'Failed to generate codes');
      }
    } catch (error: any) {
      console.error('Error generating codes:', error);
      toast.error(`Failed to generate codes: ${error.message}`);
    } finally {
      setGeneratingCodes(false);
    }
  };

  const handleToggleInviteMode = async (enabled: boolean) => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error('Please login first');
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.functions.invoke('update-platform-settings', {
        body: {
          setting_key: 'invite_only_mode',
          value: { enabled }
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setInviteOnlyMode(enabled);
        toast.success(`Invite-only mode ${enabled ? 'enabled' : 'disabled'} successfully!`);
        loadAnalytics(); // Refresh data
      } else {
        throw new Error(data?.error || 'Failed to update settings');
      }
    } catch (error: any) {
      console.error('Error toggling invite mode:', error);
      toast.error(`Failed to toggle invite mode: ${error.message}`);
      // Revert the toggle
      setInviteOnlyMode(!enabled);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAdmin = async () => {
    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setGrantingAdmin(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error('Please login first');
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.functions.invoke('grant-quick-admin', {
        body: {
          email: adminEmail.trim()
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Admin privileges granted to ${adminEmail}`);
        setAdminEmail(''); // Clear input
      } else {
        throw new Error(data?.error || 'Failed to grant admin');
      }
    } catch (error: any) {
      console.error('Error granting admin:', error);
      toast.error(`Failed to grant admin: ${error.message}`);
    } finally {
      setGrantingAdmin(false);
    }
  };

  const handleSendInvitations = async () => {
    setShowConfirmDialog(false);
    const result = await sendInvitations(batchSize, false);
    if (result && result.success) {
      // Stats will be refreshed automatically by the hook
      loadAnalytics(); // Also refresh main analytics
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-slate-950">

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-slate-200 dark:border-slate-800 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              {/* Logo and Title */}
              <div className="flex items-center gap-4">
                <FastPassLogo size="sm" />
                <div>
                  <h1 className="text-green-500 text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">Manage invite system & platform settings</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <ThemeToggle />
                <Button
                  onClick={loadAnalytics}
                  disabled={refreshing}
                  className="bg-transparent border border-green-500 text-green-500 hover:bg-green-500/10 flex-1 sm:flex-none"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="bg-transparent border border-green-500 text-green-500 hover:bg-green-500/10 flex-1 sm:flex-none"
                  size="sm"
                >
                  Dashboard
                </Button>
                <Button
                  onClick={handleLogout}
                  className="bg-transparent border border-slate-300 dark:border-green-500/50 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-green-500/10 hover:text-slate-900 dark:hover:text-green-500 flex-1 sm:flex-none"
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
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Loading State */}
            {refreshing && !analytics && (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="h-12 w-12 text-green-500 animate-spin" />
                <span className="ml-4 text-slate-500 dark:text-slate-400 text-lg">Loading analytics...</span>
              </div>
            )}

            {/* Overview Cards */}
            {analytics && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Codes */}
                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Codes</p>
                          <p className="text-3xl font-bold text-green-500 mt-1">
                            {analytics.overview.total_codes}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {analytics.overview.available_codes} available
                          </p>
                        </div>
                        <Key className="w-10 h-10 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Redemption Rate */}
                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Redemption Rate</p>
                          <p className="text-3xl font-bold text-green-500 mt-1">
                            {analytics.overview.redemption_rate}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {analytics.overview.used_codes} used
                          </p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Total Users */}
                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Users</p>
                          <p className="text-3xl font-bold text-green-500 mt-1">
                            {analytics.user_tiers.total}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {analytics.user_tiers.founder} founders
                          </p>
                        </div>
                        <Users className="w-10 h-10 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Last 7 Days</p>
                          <p className="text-3xl font-bold text-green-500 mt-1">
                            {analytics.overview.recent_usage_7d}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">codes redeemed</p>
                        </div>
                        <Activity className="w-10 h-10 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* User Tiers Breakdown */}
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-green-500 text-xl flex items-center gap-2">
                      <Crown className="h-5 w-5" />
                      User Tiers Distribution
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">
                      Breakdown of users by tier level
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <Crown className="h-8 w-8 text-[#FFD700]" />
                          <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Founder</p>
                            <p className="text-2xl font-bold text-green-500">{analytics.user_tiers.founder}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <UserPlus className="h-8 w-8 text-green-500" />
                          <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Early Adopter</p>
                            <p className="text-2xl font-bold text-green-500">{analytics.user_tiers.early_adopter}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <Users className="h-8 w-8 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Standard</p>
                            <p className="text-2xl font-bold text-green-500">{analytics.user_tiers.standard}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Generate Codes */}
                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-green-500 text-lg flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        Generate Codes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="codeCount" className="text-slate-500 dark:text-slate-400">
                          Number of Founder Codes
                        </Label>
                        <Input
                          id="codeCount"
                          type="number"
                          min="1"
                          max="20"
                          value={codeCount}
                          onChange={(e) => setCodeCount(parseInt(e.target.value) || 1)}
                          className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 focus:border-green-500"
                        />
                        <p className="text-xs text-slate-500">
                          Maximum 20 codes per batch
                        </p>
                      </div>
                      <Button
                        onClick={handleGenerateCodes}
                        disabled={generatingCodes || analytics.by_type.founder.total >= 20}
                        className="w-full bg-green-500 hover:bg-green-400 text-white font-bold transition-colors duration-300"
                      >
                        {generatingCodes ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Key className="h-4 w-4 mr-2" />
                            Generate Codes
                          </>
                        )}
                      </Button>
                      {analytics.by_type.founder.total >= 20 && (
                        <div className="bg-orange-500/10 p-3 rounded-md border border-orange-500/30">
                          <p className="text-xs text-orange-400">
                            Founder code limit reached (20/20)
                          </p>
                        </div>
                      )}
                      <div className="bg-green-500/10 p-3 rounded-md border border-green-500/30">
                        <p className="text-xs text-green-500">
                          <strong>Current:</strong> {analytics.by_type.founder.total}/20 founder codes created
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Invite Mode Toggle */}
                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-green-500 text-lg flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5" />
                        Invite-Only Mode
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Registration Status
                          </p>
                          <p className="text-xs text-slate-500">
                            {inviteOnlyMode
                              ? 'Only users with invite codes can register'
                              : 'Public registration is enabled'}
                          </p>
                        </div>
                        <Switch
                          checked={inviteOnlyMode}
                          onCheckedChange={handleToggleInviteMode}
                          disabled={loading}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </div>
                      <div className={`p-3 rounded-md border ${
                        inviteOnlyMode
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-orange-500/10 border-orange-500/30'
                      }`}>
                        <p className={`text-xs font-medium flex items-center gap-2 ${
                          inviteOnlyMode ? 'text-green-500' : 'text-orange-400'
                        }`}>
                          {inviteOnlyMode ? (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Invite-only mode is active
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4" />
                              Public registration is open
                            </>
                          )}
                        </p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          <strong>Kill Switch:</strong> Enable this to restrict platform access to invited users only during beta.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Grant Admin */}
                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-green-500 text-lg flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5" />
                        Grant Admin Access
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="adminEmail" className="text-slate-500 dark:text-slate-400">
                          User Email Address
                        </Label>
                        <Input
                          id="adminEmail"
                          type="email"
                          placeholder="user@example.com"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 focus:border-green-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !grantingAdmin) {
                              handleGrantAdmin();
                            }
                          }}
                        />
                        <p className="text-xs text-slate-500">
                          User must have an existing account
                        </p>
                      </div>
                      <Button
                        onClick={handleGrantAdmin}
                        disabled={grantingAdmin || !adminEmail.trim()}
                        className="w-full bg-green-500 hover:bg-green-400 text-white font-bold transition-colors duration-300"
                      >
                        {grantingAdmin ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Granting...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Grant Admin
                          </>
                        )}
                      </Button>
                      <div className="bg-red-500/10 p-3 rounded-md border border-red-500/30">
                        <p className="text-xs text-red-400">
                          <strong>Warning:</strong> This action grants full admin privileges
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Invitation Requests Panel */}
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-green-500 text-xl flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Invitation Requests
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">
                      Send invitation emails to waitlist users
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {invitationLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-8 w-8 text-green-500 animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Stats Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-slate-500 dark:text-slate-400">Pending Requests</span>
                            </div>
                            <p className="text-2xl font-bold text-green-500">
                              {invitationStats?.pending_count || 0}
                            </p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-2">
                              <Send className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-slate-500 dark:text-slate-400">Invited This Week</span>
                            </div>
                            <p className="text-2xl font-bold text-green-500">
                              {invitationStats?.invited_this_week || 0}
                            </p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-slate-500 dark:text-slate-400">Redemption Rate</span>
                            </div>
                            <p className="text-2xl font-bold text-green-500">
                              {invitationStats?.redemption_rate || 0}%
                            </p>
                          </div>
                        </div>

                        {/* Send Invitations Section */}
                        <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="batchSize" className="text-slate-500 dark:text-slate-400">
                                Batch Size
                              </Label>
                              <Select
                                value={batchSize.toString()}
                                onValueChange={(value) => setBatchSize(parseInt(value))}
                              >
                                <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 focus:border-green-500">
                                  <SelectValue placeholder="Select batch size" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="5">5 invitations</SelectItem>
                                  <SelectItem value="10">10 invitations (default)</SelectItem>
                                  <SelectItem value="20">20 invitations</SelectItem>
                                  <SelectItem value="50">50 invitations</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-slate-500">
                                Number of invitation emails to send from the waitlist (FIFO order)
                              </p>
                            </div>

                            <Button
                              onClick={() => setShowConfirmDialog(true)}
                              disabled={sendingInvitations || (invitationStats?.pending_count || 0) === 0}
                              className="w-full bg-green-500 hover:bg-green-400 text-white font-bold transition-colors duration-300"
                            >
                              {sendingInvitations ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Sending Invitations...
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-2" />
                                  Send Next {Math.min(batchSize, invitationStats?.pending_count || 0)} Invitations
                                </>
                              )}
                            </Button>

                            {(invitationStats?.pending_count || 0) === 0 && (
                              <div className="bg-blue-500/10 p-3 rounded-md border border-blue-500/30">
                                <p className="text-xs text-blue-400">
                                  No pending invitation requests at the moment
                                </p>
                              </div>
                            )}

                            {(invitationStats?.pending_count || 0) > 0 && (
                              <div className="bg-green-500/10 p-3 rounded-md border border-green-500/30">
                                <p className="text-xs text-green-500">
                                  <strong>Ready to send:</strong> {invitationStats?.pending_count} pending requests in queue
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Recent Invitations Table */}
                        {invitationStats?.recent_invitations && invitationStats.recent_invitations.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-slate-400 mb-3">Recent Invitations</h4>
                            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                              <Table>
                                <TableHeader>
                                  <TableRow className="border-slate-200 dark:border-slate-700 hover:bg-green-500/5">
                                    <TableHead className="text-green-500">Email</TableHead>
                                    <TableHead className="text-green-500">Invited</TableHead>
                                    <TableHead className="text-green-500">Code</TableHead>
                                    <TableHead className="text-green-500">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {invitationStats.recent_invitations.map((invitation, index) => (
                                    <TableRow key={index} className="border-slate-200 dark:border-slate-700 hover:bg-green-500/5">
                                      <TableCell className="text-slate-400 font-mono text-sm">
                                        {invitation.email}
                                      </TableCell>
                                      <TableCell className="text-slate-400 text-sm">
                                        {formatDate(invitation.invited_at)}
                                      </TableCell>
                                      <TableCell className="text-green-500 font-mono text-sm">
                                        {invitation.code}
                                      </TableCell>
                                      <TableCell>
                                        {invitation.redeemed ? (
                                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Redeemed
                                          </Badge>
                                        ) : (
                                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                            <Clock className="h-3 w-3 mr-1" />
                                            Pending
                                          </Badge>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Confirmation Dialog */}
                <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                  <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-green-500">
                        Confirm Invitation Send
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
                        You are about to send <strong className="text-green-500">{Math.min(batchSize, invitationStats?.pending_count || 0)} invitation emails</strong> to users in the waitlist.
                        <br /><br />
                        Each user will receive:
                        <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                          <li>A unique founder-tier invitation code</li>
                          <li>Direct signup link with pre-filled code</li>
                          <li>Welcome email with next steps</li>
                        </ul>
                        <br />
                        This action cannot be undone. Continue?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleSendInvitations}
                        className="bg-green-500 hover:bg-green-400 text-white font-bold"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Invitations
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Top Referrers */}
                {analytics.top_referrers.length > 0 && (
                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-green-500 text-xl flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Top Referrers
                      </CardTitle>
                      <CardDescription className="text-slate-500 dark:text-slate-400">
                        Users with the most successful referrals
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-200 dark:border-slate-700 hover:bg-green-500/5">
                              <TableHead className="text-green-500">Rank</TableHead>
                              <TableHead className="text-green-500">User</TableHead>
                              <TableHead className="text-green-500">Email</TableHead>
                              <TableHead className="text-green-500">Tier</TableHead>
                              <TableHead className="text-green-500">Referrals</TableHead>
                              <TableHead className="text-green-500">Revenue %</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {analytics.top_referrers.map((referrer, index) => (
                              <TableRow key={referrer.email} className="border-slate-200 dark:border-slate-700 hover:bg-green-500/5">
                                <TableCell className="text-sm font-bold text-green-500">
                                  {index + 1}
                                </TableCell>
                                <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                                  {referrer.display_name || 'Anonymous'}
                                </TableCell>
                                <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                                  {referrer.email}
                                </TableCell>
                                <TableCell>
                                  <Badge className={`text-xs border ${
                                    referrer.tier === 'founder'
                                      ? 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/50'
                                      : referrer.tier === 'early_adopter'
                                      ? 'bg-green-500/20 text-green-500 border-green-500/50'
                                      : 'bg-slate-500/20 text-slate-400 border-slate-500/50'
                                  }`}>
                                    {referrer.tier}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm font-medium text-green-500">
                                  {referrer.referral_count}
                                </TableCell>
                                <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                                  {referrer.revenue_percentage}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Codes Table */}
                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-green-500 text-xl flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Recent Invite Codes
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">
                      Last 20 generated invite codes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.recent_codes.length === 0 ? (
                      <p className="text-slate-400 text-center py-8">No codes generated yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-200 dark:border-slate-700 hover:bg-green-500/5">
                              <TableHead className="text-green-500">Code</TableHead>
                              <TableHead className="text-green-500">Type</TableHead>
                              <TableHead className="text-green-500">Status</TableHead>
                              <TableHead className="text-green-500">Created</TableHead>
                              <TableHead className="text-green-500">Used</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {analytics.recent_codes.map((code) => (
                              <TableRow key={code.code} className="border-slate-200 dark:border-slate-700 hover:bg-green-500/5">
                                <TableCell className="font-mono text-sm text-green-500">
                                  {code.code}
                                </TableCell>
                                <TableCell>
                                  <Badge className={`text-xs border ${
                                    code.code_type === 'founder'
                                      ? 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/50'
                                      : 'bg-green-500/20 text-green-500 border-green-500/50'
                                  }`}>
                                    {code.code_type}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {code.is_used ? (
                                    <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/50 text-xs border">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Used
                                    </Badge>
                                  ) : code.is_active ? (
                                    <Badge className="bg-green-500/20 text-green-500 border-green-500/50 text-xs border">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-xs border">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Inactive
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                                  {formatDate(code.created_at)}
                                </TableCell>
                                <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                                  {code.used_at ? formatDate(code.used_at) : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Code Type Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-green-500 text-lg">Founder Codes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Generated</span>
                        <span className="font-bold text-green-500">{analytics.by_type.founder.total}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Used</span>
                        <span className="font-bold text-green-500">{analytics.by_type.founder.used}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Available</span>
                        <span className="font-bold text-green-500">{analytics.by_type.founder.available}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-green-500 text-lg">Referral Codes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Generated</span>
                        <span className="font-bold text-green-500">{analytics.by_type.referral.total}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Used</span>
                        <span className="font-bold text-green-500">{analytics.by_type.referral.used}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Available</span>
                        <span className="font-bold text-green-500">{analytics.by_type.referral.available}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Directory Management */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
          <AdminDirectoryManager />
        </div>

        {/* Footer */}
        <footer className="text-center py-6 text-slate-500 text-sm">
          <p>© 2026 FastPass • Guaranteed Response Platform</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminDashboard;
