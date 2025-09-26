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
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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
        toast.success('Configuration Stripe terminée !');

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
        toast.info('Configuration Stripe en cours...');
      }
    } else if (authLoading) {
      console.log('Auth still loading, waiting...');
    }
  }, [navigate, searchParams, authLoading, hasInitialized]); // Include all dependencies

  // Reset initialization flag when route changes
  useEffect(() => {
    setHasInitialized(false);
  }, [searchParams.get('setup')]); // Reset only when relevant search params change

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
          ? revenueData?.filter(t => t.status === 'released').reduce((sum, t) => sum + (t.amount * 0.25), 0) || 0 // Platform commission
          : revenueData?.filter(t => t.status === 'released').reduce((sum, t) => sum + (t.amount * 0.75), 0) || 0, // User share
        monthlyRevenue: isAdmin 
          ? recentRevenue.reduce((sum, t) => sum + (t.amount * 0.25), 0) // Platform commission
          : recentRevenue.reduce((sum, t) => sum + (t.amount * 0.75), 0), // User share
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
      
      // Mettre à jour l'état local
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, read: true } : msg
      ));
    } catch (error: any) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendResponse = async () => {
    if (!selectedMessage || !responseText.trim()) {
      toast.error('Veuillez saisir une réponse');
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

      toast.success('Réponse envoyée avec succès !');
      setResponseText('');
      setSelectedMessage(null);
      await refreshData();
    } catch (error: any) {
      toast.error('Erreur lors de l\'envoi: ' + error.message);
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
    
    // Load profile data
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

    // Calculer fonds en attente
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

      // Navigate in same tab instead of opening new tab
      // This preserves the session and eliminates cross-tab sync issues
      window.location.href = data.onboarding_url;
      
    } catch (error: any) {
      console.error('Stripe setup error:', error);
      toast.error(error.message);
      setLoading(false); // Only reset loading on error since successful case navigates away
    }
    // Note: Don't reset loading on success since we're navigating away from the page
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
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-white/10 rounded-full blur-xl" />
      </div>

      <div className="relative z-10 min-h-screen p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 sm:px-6 py-3 sm:py-4 w-full sm:w-auto">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Dashboard</h1>
              <p className="text-white/80 text-sm sm:text-base">Manage your messages and escrow transactions</p>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <Button 
                variant="secondary" 
                onClick={refreshData}
                disabled={refreshing}
                className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 flex-1 sm:flex-none"
                size="sm"
              >
                <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">↻</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 flex-1 sm:flex-none"
                size="sm"
              >
                <span className="text-xs sm:text-sm">Logout</span>
              </Button>
            </div>
          </div>
        
        <Tabs defaultValue="messages" onValueChange={(value) => {
          if (value === 'messages') loadMessages();
          if (value === 'transactions') loadTransactions();
          if (value === 'analytics') loadAnalytics();
        }}>
          <TabsList className="mb-4 sm:mb-6 bg-white/20 backdrop-blur-sm border-white/30 p-1 h-auto min-h-[3rem] flex-wrap sm:flex-nowrap gap-1 sm:gap-0">
            <TabsTrigger value="messages" className="text-white data-[state=active]:bg-white data-[state=active]:text-gray-900 font-medium text-xs sm:text-sm px-2 sm:px-3 py-2 flex-1 sm:flex-none min-w-0">
              <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Msgs ({messages.filter(m => !m.read).length})</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-white data-[state=active]:bg-white data-[state=active]:text-gray-900 font-medium text-xs sm:text-sm px-2 sm:px-3 py-2 flex-1 sm:flex-none">
              <Euro className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="hidden sm:inline">Transactions</span>
              <span className="sm:hidden">Trans</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-white data-[state=active]:bg-white data-[state=active]:text-gray-900 font-medium text-xs sm:text-sm px-2 sm:px-3 py-2 flex-1 sm:flex-none">
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Set</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-white data-[state=active]:bg-white data-[state=active]:text-gray-900 font-medium text-xs sm:text-sm px-2 sm:px-3 py-2 flex-1 sm:flex-none">
              <span className="hidden sm:inline">Payment Link</span>
              <span className="sm:hidden">Pay</span>
            </TabsTrigger>
            <TabsTrigger value="stripe" className="text-white data-[state=active]:bg-white data-[state=active]:text-gray-900 font-medium text-xs sm:text-sm px-2 sm:px-3 py-2 flex-1 sm:flex-none">
              Stripe
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="analytics" className="text-white data-[state=active]:bg-white data-[state=active]:text-gray-900 font-medium text-xs sm:text-sm px-2 sm:px-3 py-2 flex-1 sm:flex-none">
                <span className="hidden sm:inline">Admin Analytics</span>
                <span className="sm:hidden">📊</span>
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="messages">
            <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle>Message Management</CardTitle>
                <CardDescription>
                  View and respond to paid messages received
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Messages Received</h3>
                    <Badge variant="outline">{messages.length} total</Badge>
                  </div>

                  {messages.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <p className="text-gray-500">No messages received yet</p>
                        <p className="text-sm text-gray-400 mt-2">
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
                          if (!escrow) return <Badge variant="secondary">No payment</Badge>;

                          switch (escrow.status) {
                            case 'held':
                              if (hasResponse) {
                                return <Badge className="bg-green-500">Responded - Payment processing</Badge>;
                              }
                              const timeLeft = new Date(escrow.expires_at).getTime() - Date.now();
                              if (timeLeft > 0) {
                                const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                                return <Badge className="bg-orange-500">Pending - {hoursLeft}h remaining</Badge>;
                              } else {
                                return <Badge className="bg-yellow-500">Expired - Refunding</Badge>;
                              }
                            case 'released':
                              return <Badge className="bg-green-600">Paid - €{(escrow.amount * 0.75).toFixed(2)} received</Badge>;
                            case 'refunded':
                              return <Badge variant="destructive">Refunded - No response</Badge>;
                            case 'pending_user_setup':
                              return <Badge className="bg-blue-500">Pending - Stripe setup required</Badge>;
                            default:
                              return <Badge variant="secondary">{escrow.status}</Badge>;
                          }
                        };

                        const handleRespond = (messageId: string) => {
                          navigate(`/respond/${messageId}`);
                        };
                        
                        return (
                          <Card key={message.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-base">
                                    From: {message.sender_email}
                                  </CardTitle>
                                  <CardDescription>
                                    {new Date(message.created_at).toLocaleString('en-US')}
                                  </CardDescription>
                                </div>
                                <div className="text-right">
                                  {getStatusBadge()}
                                  {escrow && (
                                    <div className="text-sm text-gray-500 mt-1">
                                      €{escrow.amount.toFixed(2)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            
                            <CardContent>
                              <div className="space-y-4">
                                {/* Original message */}
                                <div className="bg-gray-50 p-3 rounded-md">
                                  <h4 className="font-medium text-sm mb-2">📝 Message:</h4>
                                  <p className="text-sm">{message.content}</p>
                                </div>

                                {/* Response if exists */}
                                {hasResponse && (
                                  <div className="bg-green-50 p-3 rounded-md border-l-4 border-green-500">
                                    <h4 className="font-medium text-sm mb-2 text-green-800">
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
                                          className="bg-green-600 hover:bg-green-700"
                                        >
                                          🚀 Respond (€{(escrow.amount * 0.75).toFixed(2)})
                                        </Button>
                                      ) : (
                                        <Button variant="outline" disabled>
                                          ⏰ Time expired
                                        </Button>
                                      )}
                                    </>
                                  )}
                                  
                                  {escrow?.status === 'pending_user_setup' && (
                                    <Button variant="outline" className="border-blue-500 text-blue-600" onClick={handleStripeOnboarding}>
                                      ⚙️ Setup Stripe to receive €{(escrow.amount * 0.75).toFixed(2)}
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
            <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Escrow Transaction History
                </CardTitle>
                <CardDescription>
                  Track the status of all your received payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No transactions yet
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Sender</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Expires</TableHead>
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
                            'pending': 'bg-yellow-100 text-yellow-800',
                            'pending_user_setup': 'bg-orange-100 text-orange-800',
                            'completed': 'bg-green-100 text-green-800',
                            'expired': 'bg-red-100 text-red-800',
                            'refunded': 'bg-gray-100 text-gray-800'
                          };

                          return (
                            <TableRow key={transaction.id}>
                              <TableCell className="text-sm">
                                {new Date(transaction.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-sm">
                                {transaction.sender_email}
                              </TableCell>
                              <TableCell className="text-sm max-w-xs truncate">
                                {transaction.messages?.content || 'N/A'}
                              </TableCell>
                              <TableCell className="text-sm font-medium">
                                €{transaction.amount.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge className={`${statusColor[transaction.status as keyof typeof statusColor]} text-xs`}>
                                  {statusMap[transaction.status as keyof typeof statusMap] || transaction.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                <span className={isExpired ? 'text-red-600 font-medium' : ''}>
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
            <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle>Response Pricing</CardTitle>
                <CardDescription>
                  Configure your guaranteed response pricing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Base Price (€)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="5"
                    max="500"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  />
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• 24h response: €{(price * 1.5).toFixed(2)} (premium)</p>
                    <p>• 48h response: €{(price * 1.2).toFixed(2)} (standard)</p>
                    <p>• 72h response: €{price.toFixed(2)} (basic)</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-md text-sm">
                    <p><strong>Your earnings (75%):</strong> €{(price * 0.75).toFixed(2)} - €{(price * 1.5 * 0.75).toFixed(2)}</p>
                    <p><strong>Platform commission (25%):</strong> €{(price * 0.25).toFixed(2)} - €{(price * 1.5 * 0.25).toFixed(2)}</p>
                  </div>
                </div>
                
                <Button onClick={handleSaveSettings} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="payments">
            <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle>Your Payment Link</CardTitle>
                <CardDescription>
                  Share this link to receive guaranteed response requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted rounded-md flex items-center justify-between">
                  <code className="text-sm break-all">{generatePaymentLink()}</code>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      navigator.clipboard.writeText(generatePaymentLink());
                      toast.success('Link copied to clipboard!');
                    }}
                  >
                    Copy
                  </Button>
                </div>
                
                {!stripeOnboarded && (
                  <div className="bg-yellow-50 p-3 rounded-md">
                    <p className="text-yellow-800">
                      <strong>⚠️ Setup Required:</strong> Complete Stripe setup to receive payments
                    </p>
                  </div>
                )}

                {pendingFunds > 0 && (
                  <div className="bg-green-50 p-3 rounded-md">
                    <p className="text-green-800">
                      <strong>💰 {pendingFunds.toFixed(2)}€ pending</strong> Stripe setup
                    </p>
                    <Button 
                      onClick={handleStripeOnboarding} 
                      size="sm" 
                      className="mt-2"
                    >
                      Setup Stripe to receive your funds
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stripe">
            <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle>Stripe Payment Setup</CardTitle>
                <CardDescription>Configure your Stripe account to receive payments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!stripeOnboarded ? (
                  <div className="space-y-3">
                    <div className="bg-yellow-50 p-3 rounded-md">
                      <p className="text-yellow-800">
                        ⚠️ Complete Stripe setup to receive 75% of payments immediately
                      </p>
                    </div>
                    <p className="text-sm">
                      Without Stripe setup, your earnings will be held until you complete the configuration.
                    </p>
                    <Button onClick={handleStripeOnboarding} disabled={loading} className="w-full">
                      {loading ? 'Setting up...' : 'Complete Stripe Setup'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-green-50 p-3 rounded-md">
                      <p className="text-green-800">✅ Stripe account configured successfully!</p>
                      <p className="text-sm text-green-600 mt-1">You can now receive payments immediately.</p>
                    </div>
                    <Button variant="outline" onClick={handleStripeOnboarding}>
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
                  // Loading skeleton
                  Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg">
                      <CardContent className="p-6">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : analytics ? (
                  <>
                    <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">
                              {isAdmin ? 'Platform Revenue (25%)' : 'Total Revenue'}
                            </p>
                            <p className="text-2xl font-bold text-green-600">
                              €{analytics.totalRevenue.toFixed(2)}
                            </p>
                          </div>
                          <Euro className="w-8 h-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">
                              Last {dateRange} Days
                            </p>
                            <p className="text-2xl font-bold text-blue-600">
                              €{analytics.monthlyRevenue.toFixed(2)}
                            </p>
                          </div>
                          <Euro className="w-8 h-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Response Rate</p>
                            <p className="text-2xl font-bold text-purple-600">
                              {analytics.responseRate.toFixed(1)}%
                            </p>
                          </div>
                          <CheckCircle className="w-8 h-8 text-purple-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">
                              {isAdmin ? 'Active Users' : 'Total Messages'}
                            </p>
                            <p className="text-2xl font-bold text-orange-600">
                              {isAdmin ? analytics.totalUsers : analytics.totalMessages}
                            </p>
                          </div>
                          <Mail className="w-8 h-8 text-orange-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : null}
              </div>

              {/* Admin Controls */}
              {isAdmin && (
                <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg">
                  <CardHeader>
                    <CardTitle>Admin Controls</CardTitle>
                    <CardDescription>Platform-wide analytics and filtering options</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dateRange">Date Range</Label>
                        <select
                          id="dateRange"
                          value={dateRange}
                          onChange={(e) => {
                            setDateRange(e.target.value);
                            loadAnalytics();
                          }}
                          className="w-full p-2 border rounded-md bg-white"
                        >
                          <option value="7">Last 7 days</option>
                          <option value="30">Last 30 days</option>
                          <option value="90">Last 90 days</option>
                          <option value="365">Last year</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="userFilter">Filter by User Email</Label>
                        <Input
                          id="userFilter"
                          placeholder="user@example.com"
                          value={userFilter}
                          onChange={(e) => setUserFilter(e.target.value)}
                          className="bg-white"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Actions</Label>
                        <Button 
                          onClick={loadAnalytics}
                          disabled={loadingAnalytics}
                          className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
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
                  <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg">
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">
                          {isAdmin ? `Messages (${dateRange} days)` : 'Monthly Messages'}
                        </span>
                        <span className="font-bold text-blue-600">{analytics.monthlyMessages}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">Avg. Transaction Value</span>
                        <span className="font-bold text-green-600">€{analytics.averageTransactionValue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">Pending Transactions</span>
                        <span className="font-bold text-orange-600">{analytics.pendingTransactions}</span>
                      </div>
                      {isAdmin && analytics.refundedTransactions !== undefined && (
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium">Refunded Transactions</span>
                          <span className="font-bold text-red-600">{analytics.refundedTransactions}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg">
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button 
                        onClick={refreshData}
                        disabled={refreshing}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh All Data
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(generatePaymentLink())}
                        className="w-full"
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
    </div>
  );
};

export default Dashboard;