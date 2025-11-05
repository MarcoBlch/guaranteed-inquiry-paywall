import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Mail,
  Euro,
  CheckCircle,
  RefreshCw,
  Settings,
  Link as LinkIcon,
  BarChart3,
  CreditCard
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { FastPassLogo } from "@/components/ui/FastPassLogo";

interface Message {
  id: string;
  sender_email: string;
  content: string;
  amount_paid: number;
  response_deadline_hours: number;
  created_at: string;
  read: boolean;
  escrow_transactions: Array<{
    id: string;
    amount: number;
    status: string;
    expires_at: string;
  }>;
  message_responses: Array<{
    id: string;
    has_response: boolean;
    response_received_at: string | null;
  }>;
}

interface EscrowTransaction {
  id: string;
  amount: number;
  status: string;
  sender_email: string;
  created_at: string;
  expires_at: string;
  message_id: string;
  messages: {
    content: string;
    sender_email: string;
  };
}

const Dashboard = () => {
  const [price, setPrice] = useState(10);
  const [stripeOnboarded, setStripeOnboarded] = useState(false);
  const [pendingFunds, setPendingFunds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [responseText, setResponseText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userFilter, setUserFilter] = useState('');
  const [dateRange, setDateRange] = useState('30');
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    console.log('Dashboard mounted, searchParams:', Object.fromEntries(searchParams));
    console.log('Current user:', user?.id);
    console.log('Session:', session?.access_token?.substring(0, 20) + '...');
    console.log('Auth loading:', authLoading);

    // Only run setup logic once when auth loading completes and not yet initialized
    if (!authLoading && !hasInitialized) {
      setHasInitialized(true);

      // Run checkAuth when auth context has finished loading
      checkAuth();

      // Handle Stripe return flow
      const setupStatus = searchParams.get('setup');
      if (setupStatus === 'complete') {
        toast.success('Stripe configuration completed!');

        // Clean up URL parameters immediately
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('setup');
        newSearchParams.delete('auth');
        navigate({ search: newSearchParams.toString() }, { replace: true });

        // Refresh profile data to update onboarding status
        setTimeout(() => {
          if (user) {
            checkAuth();
          }
        }, 1000);
      } else if (setupStatus === 'refresh') {
        toast.info('Stripe configuration in progress...');
      }
    } else if (authLoading) {
      console.log('Auth still loading, waiting...');
    }
  }, [navigate, searchParams, authLoading, hasInitialized]);

  // Reset initialization flag when route changes
  useEffect(() => {
    setHasInitialized(false);
  }, [searchParams.get('setup')]);

  const loadMessages = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          escrow_transactions(*),
          message_responses(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      toast.error('Error loading messages: ' + error.message);
    }
  };

  const loadTransactions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select(`
          *,
          messages(content, sender_email)
        `)
        .eq('recipient_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      toast.error('Error loading transactions: ' + error.message);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([
      checkAuth(),
      loadMessages(),
      loadTransactions(),
      loadAnalytics()
    ]);
    setRefreshing(false);
  };

  const loadAnalytics = async () => {
    if (!user) return;
    setLoadingAnalytics(true);

    try {
      // Get revenue metrics
      let revenueQuery = supabase
        .from('escrow_transactions')
        .select('amount, created_at, status, recipient_user_id');

      if (!isAdmin) {
        revenueQuery = revenueQuery.eq('recipient_user_id', user.id);
      }

      const { data: revenueData } = await revenueQuery;

      // Get message metrics
      let messageQuery = supabase
        .from('messages')
        .select(`
          id,
          created_at,
          user_id,
          message_responses (
            has_response,
            response_received_at
          )
        `);

      if (!isAdmin) {
        messageQuery = messageQuery.eq('user_id', user.id);
      }

      const { data: messageData } = await messageQuery;

      // Calculate KPIs
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - parseInt(dateRange) * 24 * 60 * 60 * 1000);

      const recentRevenue = revenueData?.filter(t =>
        new Date(t.created_at) >= thirtyDaysAgo && t.status === 'released'
      ) || [];

      const recentMessages = messageData?.filter(m =>
        new Date(m.created_at) >= thirtyDaysAgo
      ) || [];

      const respondedMessages = recentMessages.filter(m =>
        m.message_responses && m.message_responses.length > 0 && m.message_responses[0].has_response
      );

      const analytics = {
        totalRevenue: isAdmin
          ? revenueData?.filter(t => t.status === 'released').reduce((sum, t) => sum + (t.amount * 0.25), 0) || 0
          : revenueData?.filter(t => t.status === 'released').reduce((sum, t) => sum + (t.amount * 0.75), 0) || 0,
        monthlyRevenue: isAdmin
          ? recentRevenue.reduce((sum, t) => sum + (t.amount * 0.25), 0)
          : recentRevenue.reduce((sum, t) => sum + (t.amount * 0.75), 0),
        totalMessages: messageData?.length || 0,
        monthlyMessages: recentMessages.length,
        responseRate: recentMessages.length > 0 ? (respondedMessages.length / recentMessages.length * 100) : 0,
        averageTransactionValue: recentRevenue.length > 0 ? recentRevenue.reduce((sum, t) => sum + t.amount, 0) / recentRevenue.length : 0,
        pendingTransactions: revenueData?.filter(t => t.status === 'held').length || 0,
        refundedTransactions: revenueData?.filter(t => t.status === 'refunded').length || 0,
        totalUsers: isAdmin ? new Set(messageData?.map(m => m.user_id)).size : 1,
        isAdmin: isAdmin
      };

      setAnalytics(analytics);
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, read: true } : msg
      ));
    } catch (error: any) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendResponse = async () => {
    if (!selectedMessage || !responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-response-email', {
        body: {
          messageId: selectedMessage.id,
          responseContent: responseText.trim()
        }
      });

      if (error) throw error;

      toast.success('Response sent successfully!');
      setResponseText('');
      setSelectedMessage(null);
      await refreshData();
    } catch (error: any) {
      toast.error('Error sending: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    if (!user) {
      toast.error('Please login first');
      navigate('/auth');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_completed, price, is_admin')
      .eq('id', user.id)
      .single();

    if (profile) {
      setStripeOnboarded(profile.stripe_onboarding_completed || false);
      setPrice(profile.price || 10);
      setIsAdmin(profile.is_admin || false);
    }

    const { data: pendingTransactions } = await supabase
      .from('escrow_transactions')
      .select('amount')
      .eq('recipient_user_id', user.id)
      .eq('status', 'pending_user_setup');

    if (pendingTransactions) {
      const total = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);
      setPendingFunds(total);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ price: price })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Settings saved successfully!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStripeOnboarding = async () => {
    if (!user) {
      toast.error('Please login first');
      navigate('/auth');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-account', {
        body: { userId: user.id }
      });

      if (error) throw error;

      window.location.href = data.onboarding_url;

    } catch (error: any) {
      console.error('Stripe setup error:', error);
      toast.error(error.message);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const generatePaymentLink = () => {
    if (!user) return '';

    const baseUrl = window.location.origin;
    return `${baseUrl}/pay/${user.id}`;
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* StaticBackground component from App.tsx provides the background */}

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              {/* Logo and Title */}
              <div className="flex items-center gap-4">
                <FastPassLogo size="sm" />
                <div>
                  <h1 className="text-[#5cffb0] text-2xl sm:text-3xl font-bold">Dashboard</h1>
                  <p className="text-[#B0B0B0] text-sm sm:text-base">Manage your inbox earnings</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  onClick={refreshData}
                  disabled={refreshing}
                  className="bg-transparent border border-[#5cffb0] text-[#5cffb0] hover:bg-[#5cffb0]/10 flex-1 sm:flex-none"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
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
          <div className="max-w-6xl mx-auto">
            <Tabs defaultValue="messages" onValueChange={(value) => {
              if (value === 'messages') loadMessages();
              if (value === 'transactions') loadTransactions();
              if (value === 'analytics') loadAnalytics();
            }}>
              <TabsList className="mb-6 bg-transparent backdrop-blur-sm border border-[#5cffb0]/30 p-1 flex-wrap gap-2">
                <TabsTrigger
                  value="messages"
                  className="text-[#B0B0B0] data-[state=active]:bg-[#5cffb0]/20 data-[state=active]:text-[#5cffb0] border border-transparent data-[state=active]:border-[#5cffb0]/50"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Messages ({messages.filter(m => !m.read).length})
                </TabsTrigger>
                <TabsTrigger
                  value="transactions"
                  className="text-[#B0B0B0] data-[state=active]:bg-[#5cffb0]/20 data-[state=active]:text-[#5cffb0] border border-transparent data-[state=active]:border-[#5cffb0]/50"
                >
                  <Euro className="h-4 w-4 mr-2" />
                  Transactions
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="text-[#B0B0B0] data-[state=active]:bg-[#5cffb0]/20 data-[state=active]:text-[#5cffb0] border border-transparent data-[state=active]:border-[#5cffb0]/50"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
                <TabsTrigger
                  value="payments"
                  className="text-[#B0B0B0] data-[state=active]:bg-[#5cffb0]/20 data-[state=active]:text-[#5cffb0] border border-transparent data-[state=active]:border-[#5cffb0]/50"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Payment Link
                </TabsTrigger>
                <TabsTrigger
                  value="stripe"
                  className="text-[#B0B0B0] data-[state=active]:bg-[#5cffb0]/20 data-[state=active]:text-[#5cffb0] border border-transparent data-[state=active]:border-[#5cffb0]/50"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Stripe
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger
                    value="analytics"
                    className="text-[#B0B0B0] data-[state=active]:bg-[#5cffb0]/20 data-[state=active]:text-[#5cffb0] border border-transparent data-[state=active]:border-[#5cffb0]/50"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="messages">
                <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                  <CardHeader>
                    <CardTitle className="text-[#5cffb0] text-xl sm:text-2xl">Message Management</CardTitle>
                    <CardDescription className="text-[#B0B0B0]">
                      View and respond to paid messages received
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-[#5cffb0] text-lg font-semibold">Messages Received</h3>
                        <Badge className="bg-[#5cffb0]/20 text-[#5cffb0] border border-[#5cffb0]/50">
                          {messages.length} total
                        </Badge>
                      </div>

                      {messages.length === 0 ? (
                        <Card className="bg-transparent backdrop-blur-sm border border-[#5cffb0]/30">
                          <CardContent className="p-8 text-center">
                            <p className="text-[#B0B0B0] text-lg">No messages received yet</p>
                            <p className="text-[#B0B0B0]/80 text-sm mt-2">
                              Share your payment link to receive guaranteed messages
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-4">
                          {messages.map((message) => {
                            const hasResponse = message.message_responses.some(r => r.has_response);
                            const escrow = message.escrow_transactions[0];
                            const isExpired = escrow && new Date(escrow.expires_at) < new Date();

                            const getStatusBadge = () => {
                              if (!escrow) return (
                                <Badge className="bg-[#B0B0B0]/20 text-[#B0B0B0]">No payment</Badge>
                              );

                              switch (escrow.status) {
                                case 'held':
                                  if (hasResponse) {
                                    return <Badge className="bg-[#5cffb0]/20 text-[#5cffb0] border border-[#5cffb0]">
                                      Responded - Processing
                                    </Badge>;
                                  }
                                  const timeLeft = new Date(escrow.expires_at).getTime() - Date.now();
                                  if (timeLeft > 0) {
                                    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                                    return <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/50">
                                      Pending - {hoursLeft}h left
                                    </Badge>;
                                  } else {
                                    return <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50">
                                      Expired - Refunding
                                    </Badge>;
                                  }
                                case 'released':
                                  return <Badge className="bg-[#5cffb0]/20 text-[#5cffb0] border border-[#5cffb0]">
                                    Paid - €{(escrow.amount * 0.75).toFixed(2)}
                                  </Badge>;
                                case 'refunded':
                                  return <Badge className="bg-red-500/20 text-red-400 border border-red-500/50">
                                    Refunded
                                  </Badge>;
                                case 'pending_user_setup':
                                  return <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/50">
                                    Setup Required
                                  </Badge>;
                                default:
                                  return <Badge className="bg-[#B0B0B0]/20 text-[#B0B0B0]">
                                    {escrow.status}
                                  </Badge>;
                              }
                            };

                            const handleRespond = (messageId: string) => {
                              navigate(`/respond/${messageId}`);
                            };

                            return (
                              <Card
                                key={message.id}
                                className="bg-transparent backdrop-blur-sm border border-[#5cffb0]/30 shadow-[0_0_15px_rgba(92,255,176,0.1)] hover:shadow-[0_0_20px_rgba(92,255,176,0.2)] transition-all"
                              >
                                <CardHeader>
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <CardTitle className="text-[#5cffb0] text-base">
                                        From: {message.sender_email}
                                      </CardTitle>
                                      <CardDescription className="text-[#B0B0B0]/80">
                                        {new Date(message.created_at).toLocaleString('en-US')}
                                      </CardDescription>
                                    </div>
                                    <div className="text-right">
                                      {getStatusBadge()}
                                      {escrow && (
                                        <div className="text-sm text-[#5cffb0] mt-1">
                                          €{escrow.amount.toFixed(2)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardHeader>

                                <CardContent>
                                  <div className="space-y-4">
                                    {/* Original message */}
                                    <div className="bg-[#1a1f2e]/50 p-3 rounded-md border border-[#5cffb0]/10">
                                      <h4 className="font-medium text-sm mb-2 text-[#5cffb0]">📝 Message:</h4>
                                      <p className="text-sm text-[#B0B0B0]">{message.content}</p>
                                    </div>

                                    {/* Response if exists */}
                                    {hasResponse && (
                                      <div className="bg-[#5cffb0]/10 p-3 rounded-md border-l-4 border-[#5cffb0]">
                                        <h4 className="font-medium text-sm mb-2 text-[#5cffb0]">
                                          ✅ Response sent on {message.message_responses
                                            .find(r => r.response_received_at)?.response_received_at &&
                                            new Date(message.message_responses
                                              .find(r => r.response_received_at)!.response_received_at!)
                                              .toLocaleDateString('en-US')}
                                        </h4>
                                      </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                      {escrow?.status === 'held' && !hasResponse && (
                                        <>
                                          {!isExpired ? (
                                            <Button
                                              onClick={() => handleRespond(message.id)}
                                              className="bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold transition-colors duration-300"
                                            >
                                              🚀 Respond (€{(escrow.amount * 0.75).toFixed(2)})
                                            </Button>
                                          ) : (
                                            <Button
                                              disabled
                                              className="bg-[#B0B0B0]/20 text-[#B0B0B0] cursor-not-allowed"
                                            >
                                              ⏰ Time expired
                                            </Button>
                                          )}
                                        </>
                                      )}

                                      {escrow?.status === 'pending_user_setup' && (
                                        <Button
                                          onClick={handleStripeOnboarding}
                                          className="border border-[#5cffb0] text-[#5cffb0] bg-transparent hover:bg-[#5cffb0]/10"
                                        >
                                          ⚙️ Setup Stripe (€{(escrow.amount * 0.75).toFixed(2)})
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transactions">
                <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                  <CardHeader>
                    <CardTitle className="text-[#5cffb0] text-xl sm:text-2xl flex items-center gap-2">
                      <Euro className="h-5 w-5" />
                      Escrow Transaction History
                    </CardTitle>
                    <CardDescription className="text-[#B0B0B0]">
                      Track the status of all your received payments
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {transactions.length === 0 ? (
                      <p className="text-[#B0B0B0] text-center py-8">
                        No transactions yet
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-[#5cffb0]/20 hover:bg-[#5cffb0]/5">
                              <TableHead className="text-[#5cffb0]">Date</TableHead>
                              <TableHead className="text-[#5cffb0]">Sender</TableHead>
                              <TableHead className="text-[#5cffb0]">Message</TableHead>
                              <TableHead className="text-[#5cffb0]">Amount</TableHead>
                              <TableHead className="text-[#5cffb0]">Status</TableHead>
                              <TableHead className="text-[#5cffb0]">Expires</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transactions.map((transaction) => {
                              const isExpired = new Date(transaction.expires_at) < new Date();
                              const statusMap = {
                                'pending': 'Pending',
                                'pending_user_setup': 'Stripe setup required',
                                'completed': 'Completed',
                                'expired': 'Expired',
                                'refunded': 'Refunded'
                              };

                              const statusColor = {
                                'pending': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
                                'pending_user_setup': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
                                'completed': 'bg-[#5cffb0]/20 text-[#5cffb0] border-[#5cffb0]/50',
                                'expired': 'bg-red-500/20 text-red-400 border-red-500/50',
                                'refunded': 'bg-[#B0B0B0]/20 text-[#B0B0B0] border-[#B0B0B0]/50',
                                'held': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
                                'released': 'bg-[#5cffb0]/20 text-[#5cffb0] border-[#5cffb0]/50'
                              };

                              return (
                                <TableRow key={transaction.id} className="border-[#5cffb0]/10 hover:bg-[#5cffb0]/5">
                                  <TableCell className="text-sm text-[#B0B0B0]">
                                    {new Date(transaction.created_at).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell className="text-sm text-[#B0B0B0]">
                                    {transaction.sender_email}
                                  </TableCell>
                                  <TableCell className="text-sm text-[#B0B0B0] max-w-xs truncate">
                                    {transaction.messages?.content || 'N/A'}
                                  </TableCell>
                                  <TableCell className="text-sm font-medium text-[#5cffb0]">
                                    €{transaction.amount.toFixed(2)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={`${statusColor[transaction.status as keyof typeof statusColor]} text-xs border`}>
                                      {statusMap[transaction.status as keyof typeof statusMap] || transaction.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-[#B0B0B0]">
                                    <span className={isExpired ? 'text-red-400 font-medium' : ''}>
                                      {new Date(transaction.expires_at).toLocaleDateString()}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                  <CardHeader>
                    <CardTitle className="text-[#5cffb0] text-xl sm:text-2xl">Response Pricing</CardTitle>
                    <CardDescription className="text-[#B0B0B0]">
                      Configure your guaranteed response pricing
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-[#5cffb0]">Base Price (€)</Label>
                      <Input
                        id="price"
                        type="number"
                        min="5"
                        max="500"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0] focus:border-[#5cffb0]"
                      />
                      <div className="text-sm text-[#B0B0B0] space-y-1 mt-3">
                        <p>• 24h response: €{(price * 1.5).toFixed(2)} (premium)</p>
                        <p>• 48h response: €{(price * 1.2).toFixed(2)} (standard)</p>
                        <p>• 72h response: €{price.toFixed(2)} (basic)</p>
                      </div>
                      <div className="bg-[#5cffb0]/10 p-4 rounded-md text-sm border border-[#5cffb0]/30 mt-4">
                        <p className="text-[#5cffb0]"><strong>Your earnings (75%):</strong> €{(price * 0.75).toFixed(2)} - €{(price * 1.5 * 0.75).toFixed(2)}</p>
                        <p className="text-[#B0B0B0] mt-1"><strong>Platform commission (25%):</strong> €{(price * 0.25).toFixed(2)} - €{(price * 1.5 * 0.25).toFixed(2)}</p>
                      </div>
                    </div>

                    <Button
                      onClick={handleSaveSettings}
                      disabled={loading}
                      className="bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold transition-colors duration-300"
                    >
                      {loading ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments">
                <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                  <CardHeader>
                    <CardTitle className="text-[#5cffb0] text-xl sm:text-2xl">Your Payment Link</CardTitle>
                    <CardDescription className="text-[#B0B0B0]">
                      Share this link to receive guaranteed response requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-[#1a1f2e]/50 rounded-md flex items-center justify-between border border-[#5cffb0]/30">
                      <code className="text-sm text-[#5cffb0] break-all">{generatePaymentLink()}</code>
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(generatePaymentLink());
                          toast.success('Link copied to clipboard!');
                        }}
                        className="ml-3 border border-[#5cffb0] text-[#5cffb0] bg-transparent hover:bg-[#5cffb0]/10"
                      >
                        Copy
                      </Button>
                    </div>

                    {!stripeOnboarded && (
                      <div className="bg-yellow-500/10 p-4 rounded-md border border-yellow-500/30">
                        <p className="text-yellow-400">
                          <strong>⚠️ Setup Required:</strong> Complete Stripe setup to receive payments
                        </p>
                      </div>
                    )}

                    {pendingFunds > 0 && (
                      <div className="bg-[#5cffb0]/10 p-4 rounded-md border border-[#5cffb0]/30">
                        <p className="text-[#5cffb0]">
                          <strong>💰 €{pendingFunds.toFixed(2)} pending</strong> - Complete Stripe setup
                        </p>
                        <Button
                          onClick={handleStripeOnboarding}
                          size="sm"
                          className="mt-3 bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold"
                        >
                          Setup Stripe to receive your funds
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stripe">
                <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                  <CardHeader>
                    <CardTitle className="text-[#5cffb0] text-xl sm:text-2xl">Stripe Payment Setup</CardTitle>
                    <CardDescription className="text-[#B0B0B0]">
                      Configure your Stripe account to receive payments
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!stripeOnboarded ? (
                      <div className="space-y-3">
                        <div className="bg-yellow-500/10 p-4 rounded-md border border-yellow-500/30">
                          <p className="text-yellow-400">
                            ⚠️ Complete Stripe setup to receive 75% of payments immediately
                          </p>
                        </div>
                        <p className="text-sm text-[#B0B0B0]">
                          Without Stripe setup, your earnings will be held until you complete the configuration.
                        </p>
                        <Button
                          onClick={handleStripeOnboarding}
                          disabled={loading}
                          className="w-full bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold transition-colors duration-300"
                        >
                          {loading ? 'Setting up...' : 'Complete Stripe Setup'}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-[#5cffb0]/10 p-4 rounded-md border border-[#5cffb0]/30">
                          <p className="text-[#5cffb0]">✅ Stripe account configured successfully!</p>
                          <p className="text-sm text-[#B0B0B0] mt-1">You can now receive payments immediately.</p>
                        </div>
                        <Button
                          onClick={handleStripeOnboarding}
                          className="border border-[#5cffb0] text-[#5cffb0] bg-transparent hover:bg-[#5cffb0]/10"
                        >
                          Update Stripe Settings
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics">
                <div className="grid gap-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {loadingAnalytics ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20">
                          <CardContent className="p-6">
                            <div className="animate-pulse">
                              <div className="h-4 bg-[#5cffb0]/20 rounded w-1/2 mb-2"></div>
                              <div className="h-8 bg-[#5cffb0]/20 rounded w-3/4"></div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : analytics ? (
                      <>
                        <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-[#B0B0B0]">
                                  {isAdmin ? 'Platform Revenue (25%)' : 'Total Revenue'}
                                </p>
                                <p className="text-2xl font-bold text-[#5cffb0]">
                                  €{analytics.totalRevenue.toFixed(2)}
                                </p>
                              </div>
                              <Euro className="w-8 h-8 text-[#5cffb0]" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-[#B0B0B0]">
                                  Last {dateRange} Days
                                </p>
                                <p className="text-2xl font-bold text-[#5cffb0]">
                                  €{analytics.monthlyRevenue.toFixed(2)}
                                </p>
                              </div>
                              <Euro className="w-8 h-8 text-[#5cffb0]" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-[#B0B0B0]">Response Rate</p>
                                <p className="text-2xl font-bold text-[#5cffb0]">
                                  {analytics.responseRate.toFixed(1)}%
                                </p>
                              </div>
                              <CheckCircle className="w-8 h-8 text-[#5cffb0]" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-[#B0B0B0]">
                                  {isAdmin ? 'Active Users' : 'Total Messages'}
                                </p>
                                <p className="text-2xl font-bold text-[#5cffb0]">
                                  {isAdmin ? analytics.totalUsers : analytics.totalMessages}
                                </p>
                              </div>
                              <Mail className="w-8 h-8 text-[#5cffb0]" />
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    ) : null}
                  </div>

                  {/* Admin Controls */}
                  {isAdmin && (
                    <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                      <CardHeader>
                        <CardTitle className="text-[#5cffb0] text-xl">Admin Controls</CardTitle>
                        <CardDescription className="text-[#B0B0B0]">
                          Platform-wide analytics and filtering options
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="dateRange" className="text-[#5cffb0]">Date Range</Label>
                            <select
                              id="dateRange"
                              value={dateRange}
                              onChange={(e) => {
                                setDateRange(e.target.value);
                                loadAnalytics();
                              }}
                              className="w-full p-2 border border-[#5cffb0]/30 rounded-md bg-[#1a1f2e]/50 text-[#B0B0B0]"
                            >
                              <option value="7">Last 7 days</option>
                              <option value="30">Last 30 days</option>
                              <option value="90">Last 90 days</option>
                              <option value="365">Last year</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="userFilter" className="text-[#5cffb0]">Filter by User Email</Label>
                            <Input
                              id="userFilter"
                              placeholder="user@example.com"
                              value={userFilter}
                              onChange={(e) => setUserFilter(e.target.value)}
                              className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0]"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[#5cffb0]">Actions</Label>
                            <Button
                              onClick={loadAnalytics}
                              disabled={loadingAnalytics}
                              className="w-full bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold"
                            >
                              <RefreshCw className={`h-4 w-4 mr-2 ${loadingAnalytics ? 'animate-spin' : ''}`} />
                              Refresh Data
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Performance Metrics */}
                  {analytics && !loadingAnalytics && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                        <CardHeader>
                          <CardTitle className="text-[#5cffb0] text-xl">Performance Metrics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-[#1a1f2e]/50 rounded-lg border border-[#5cffb0]/10">
                            <span className="text-sm font-medium text-[#B0B0B0]">
                              {isAdmin ? `Messages (${dateRange} days)` : 'Monthly Messages'}
                            </span>
                            <span className="font-bold text-[#5cffb0]">{analytics.monthlyMessages}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-[#1a1f2e]/50 rounded-lg border border-[#5cffb0]/10">
                            <span className="text-sm font-medium text-[#B0B0B0]">Avg. Transaction Value</span>
                            <span className="font-bold text-[#5cffb0]">€{analytics.averageTransactionValue.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-[#1a1f2e]/50 rounded-lg border border-[#5cffb0]/10">
                            <span className="text-sm font-medium text-[#B0B0B0]">Pending Transactions</span>
                            <span className="font-bold text-orange-400">{analytics.pendingTransactions}</span>
                          </div>
                          {isAdmin && analytics.refundedTransactions !== undefined && (
                            <div className="flex justify-between items-center p-3 bg-[#1a1f2e]/50 rounded-lg border border-[#5cffb0]/10">
                              <span className="text-sm font-medium text-[#B0B0B0]">Refunded Transactions</span>
                              <span className="font-bold text-red-400">{analytics.refundedTransactions}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                        <CardHeader>
                          <CardTitle className="text-[#5cffb0] text-xl">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Button
                            onClick={refreshData}
                            disabled={refreshing}
                            className="w-full bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold transition-colors duration-300"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh All Data
                          </Button>
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(generatePaymentLink());
                              toast.success('Link copied!');
                            }}
                            className="w-full border border-[#5cffb0] text-[#5cffb0] bg-transparent hover:bg-[#5cffb0]/10"
                          >
                            📋 Copy Payment Link
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-6 text-[#B0B0B0]/60 text-sm">
          <p>© 2025 FastPass • Guaranteed Response Platform</p>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
