import React, { useState, useEffect } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
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
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/lib/supabase";
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
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [stripeOnboarded, setStripeOnboarded] = useState(false);
  const [pendingFunds, setPendingFunds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [responseText, setResponseText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkAuth();
    
    // Vérifier si retour de Stripe onboarding
    if (searchParams.get('setup') === 'complete') {
      toast.success('Configuration Stripe terminée !');
      // Attendre un peu puis recharger les données
      setTimeout(() => {
        checkAuth();
      }, 1000);
    }
  }, [navigate, searchParams]);

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
      loadTransactions()
    ]);
    setRefreshing(false);
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
      .select('stripe_account_id, stripe_onboarding_completed, price')
      .eq('id', user.id)
      .single();
      
    if (profile) {
      setStripeAccountId(profile.stripe_account_id || '');
      setStripeOnboarded(profile.stripe_onboarding_completed || false);
      setPrice(profile.price || 10);
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
      
      // Ouvrir Stripe dans un nouvel onglet
      window.open(data.onboarding_url, '_blank');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
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
    <div className="min-h-screen p-6 bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Gérez vos messages et transactions escrow</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={refreshData}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="messages" onValueChange={(value) => {
          if (value === 'messages') loadMessages();
          if (value === 'transactions') loadTransactions();
        }}>
          <TabsList className="mb-4">
            <TabsTrigger value="messages">
              <Mail className="h-4 w-4 mr-2" />
              Messages ({messages.filter(m => !m.read).length})
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <Euro className="h-4 w-4 mr-2" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
            <TabsTrigger value="payments">Lien de paiement</TabsTrigger>
            <TabsTrigger value="stripe">Stripe</TabsTrigger>
          </TabsList>
          
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Messages</CardTitle>
                <CardDescription>
                  Consultez et répondez aux messages payés reçus
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Messages Reçus</h3>
                    <Badge variant="outline">{messages.length} total</Badge>
                  </div>

                  {messages.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <p className="text-gray-500">Aucun message reçu pour le moment</p>
                        <p className="text-sm text-gray-400 mt-2">
                          Partagez votre lien de paiement pour recevoir des messages garantis
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
                          if (!escrow) return <Badge variant="secondary">Aucun paiement</Badge>;

                          switch (escrow.status) {
                            case 'held':
                              if (hasResponse) {
                                return <Badge className="bg-green-500">Répondu - Paiement en cours</Badge>;
                              }
                              const timeLeft = new Date(escrow.expires_at).getTime() - Date.now();
                              if (timeLeft > 0) {
                                const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                                return <Badge className="bg-orange-500">En attente - {hoursLeft}h restantes</Badge>;
                              } else {
                                return <Badge className="bg-yellow-500">Expiré - Remboursement</Badge>;
                              }
                            case 'released':
                              return <Badge className="bg-green-600">Payé - €{(escrow.amount * 0.75).toFixed(2)} reçus</Badge>;
                            case 'refunded':
                              return <Badge variant="destructive">Remboursé - Pas de réponse</Badge>;
                            case 'pending_user_setup':
                              return <Badge className="bg-blue-500">En attente - Config Stripe requise</Badge>;
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
                                    De: {message.sender_email}
                                  </CardTitle>
                                  <CardDescription>
                                    {new Date(message.created_at).toLocaleString('fr-FR')}
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
                                {/* Message original */}
                                <div className="bg-gray-50 p-3 rounded-md">
                                  <h4 className="font-medium text-sm mb-2">📝 Message:</h4>
                                  <p className="text-sm">{message.content}</p>
                                </div>

                                {/* Réponse si existe */}
                                {hasResponse && (
                                  <div className="bg-green-50 p-3 rounded-md border-l-4 border-green-500">
                                    <h4 className="font-medium text-sm mb-2 text-green-800">
                                      ✅ Réponse envoyée le {message.message_responses
                                        .find(r => r.response_received_at)?.response_received_at &&
                                        new Date(message.message_responses
                                          .find(r => r.response_received_at)!.response_received_at!)
                                          .toLocaleDateString('fr-FR')}
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
                                          🚀 Répondre (€{(escrow.amount * 0.75).toFixed(2)})
                                        </Button>
                                      ) : (
                                        <Button variant="outline" disabled>
                                          ⏰ Délai expiré
                                        </Button>
                                      )}
                                    </>
                                  )}
                                  
                                  {escrow?.status === 'pending_user_setup' && (
                                    <Button variant="outline" className="border-blue-500 text-blue-600" onClick={handleStripeOnboarding}>
                                      ⚙️ Configurer Stripe pour recevoir €{(escrow.amount * 0.75).toFixed(2)}
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

                  {/* Zone de réponse si message sélectionné */}
                  {selectedMessage && (
                    <Card className="mt-6">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Send className="h-5 w-5" />
                          Répondre au message
                        </CardTitle>
                        <CardDescription>
                          De: {selectedMessage.sender_email} • 
                          Montant: €{selectedMessage.amount_paid.toFixed(2)} • 
                          Délai: {selectedMessage.response_deadline_hours}h
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Message original */}
                          <div className="bg-muted p-3 rounded-lg">
                            <p className="text-sm font-medium mb-1">Message original:</p>
                            <p className="text-sm whitespace-pre-wrap">
                              {selectedMessage.content}
                            </p>
                          </div>

                          {/* Zone de réponse */}
                          <div className="space-y-2">
                            <Label htmlFor="response">Votre réponse:</Label>
                            <Textarea
                              id="response"
                              placeholder="Rédigez votre réponse ici..."
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              rows={6}
                            />
                          </div>

                          {/* Status */}
                          {selectedMessage.message_responses.some(r => r.has_response) ? (
                            <div className="bg-green-50 p-3 rounded-lg">
                              <p className="text-green-800 text-sm">
                                ✅ Réponse déjà envoyée le {
                                  selectedMessage.message_responses
                                    .find(r => r.response_received_at)?.response_received_at &&
                                  new Date(selectedMessage.message_responses
                                    .find(r => r.response_received_at)!.response_received_at!)
                                    .toLocaleDateString()
                                }
                              </p>
                            </div>
                          ) : (
                            <Button 
                              onClick={sendResponse} 
                              disabled={loading || !responseText.trim()}
                              className="w-full"
                            >
                              {loading ? 'Envoi en cours...' : 'Envoyer la réponse'}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Historique des transactions escrow
                </CardTitle>
                <CardDescription>
                  Suivez l'état de tous vos paiements reçus
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucune transaction pour le moment
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Expéditeur</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Expire le</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => {
                          const isExpired = new Date(transaction.expires_at) < new Date();
                          const statusMap = {
                            'pending': 'En attente',
                            'pending_user_setup': 'Config. Stripe requise',
                            'completed': 'Terminé',
                            'expired': 'Expiré',
                            'refunded': 'Remboursé'
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
            <Card>
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
                    <p><strong>Vos gains (75%):</strong> €{(price * 0.75).toFixed(2)} - €{(price * 1.5 * 0.75).toFixed(2)}</p>
                    <p><strong>Commission plateforme (25%):</strong> €{(price * 0.25).toFixed(2)} - €{(price * 1.5 * 0.25).toFixed(2)}</p>
                  </div>
                </div>
                
                <Button onClick={handleSaveSettings} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="payments">
            <Card>
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
                      <strong>💰 {pendingFunds.toFixed(2)}€ en attente</strong> de configuration Stripe
                    </p>
                    <Button 
                      onClick={handleStripeOnboarding} 
                      size="sm" 
                      className="mt-2"
                    >
                      Configurer Stripe pour recevoir vos fonds
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stripe">
            <Card>
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
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;