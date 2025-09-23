import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MessagesTabProps {
  userId: string;
}

const MessagesTab: React.FC<MessagesTabProps> = ({ userId }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadMessages();
    }
  }, [userId]);

  const loadMessages = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading messages for user:', userId);

      // ✅ Requête simplifiée et sécurisée
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_email,
          created_at,
          response_deadline_hours,
          amount_paid
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (messagesError) {
        console.error('Error loading messages:', messagesError);
        throw messagesError;
      }

      console.log('Messages loaded:', messagesData);

      // ✅ Charger les données d'escrow séparément pour éviter les JOIN complexes
      const messageIds = messagesData?.map(m => m.id) || [];
      
      let escrowData = [];
      let responseData = [];

      if (messageIds.length > 0) {
        // Charger escrow transactions
        const { data: escrowTransactions } = await supabase
          .from('escrow_transactions')
          .select('*')
          .in('message_id', messageIds);

        // Charger message responses
        const { data: messageResponses } = await supabase
          .from('message_responses')
          .select('*')
          .in('message_id', messageIds);

        escrowData = escrowTransactions || [];
        responseData = messageResponses || [];
      }

      // ✅ Combiner les données côté client
      const enrichedMessages = messagesData?.map(message => {
        const escrow = escrowData.find(e => e.message_id === message.id);
        const response = responseData.find(r => r.message_id === message.id);

        return {
          ...message,
          escrow_transactions: escrow,
          message_responses: response
        };
      }) || [];

      setMessages(enrichedMessages);
      console.log('Enriched messages:', enrichedMessages);

    } catch (error: any) {
      console.error('Error in loadMessages:', error);
      setError(error.message || 'Loading error');
      toast.error('Loading error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (message: any) => {
    const escrow = message.escrow_transactions;
    const response = message.message_responses;

    if (!escrow) {
      return <Badge variant="secondary">No payment</Badge>;
    }

    switch (escrow.status) {
      case 'held':
        if (response?.has_response) {
          return <Badge className="bg-green-500">Responded - Payment processing</Badge>;
        }
        const timeLeft = new Date(escrow.expires_at).getTime() - Date.now();
        if (timeLeft > 0) {
          const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
          return <Badge className="bg-orange-500">Waiting - {hoursLeft}h remaining</Badge>;
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
    // Ouvrir dans un nouvel onglet
    window.open(`/respond/${messageId}`, '_blank');
  };

  const handleRefresh = () => {
    loadMessages();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading messages...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Loading error</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm" 
            className="mt-3"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Received Messages</h3>
        <div className="flex gap-2">
          <Badge variant="outline">{messages.length} total</Badge>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            🔄 Refresh
          </Button>
        </div>
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
          {messages.map((message) => (
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
                    {getStatusBadge(message)}
                    {message.escrow_transactions && (
                      <div className="text-sm text-gray-500 mt-1">
                        €{message.escrow_transactions.amount.toFixed(2)}
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
                  {message.message_responses?.has_response && (
                    <div className="bg-green-50 p-3 rounded-md border-l-4 border-green-500">
                      <h4 className="font-medium text-sm mb-2 text-green-800">
                        ✅ Your response (sent on {new Date(message.message_responses.response_sent_at).toLocaleDateString('en-US')})
                      </h4>
                      <p className="text-sm text-green-700">
                        {message.message_responses.response_content}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {message.escrow_transactions?.status === 'held' && !message.message_responses?.has_response && (
                      <>
                        {new Date(message.escrow_transactions.expires_at) > new Date() ? (
                          <Button 
                            onClick={() => handleRespond(message.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            🚀 Respond (€{(message.escrow_transactions.amount * 0.75).toFixed(2)})
                          </Button>
                        ) : (
                          <Button variant="outline" disabled>
                            ⏰ Deadline expired
                          </Button>
                        )}
                      </>
                    )}
                    
                    {message.escrow_transactions?.status === 'pending_user_setup' && (
                      <Button variant="outline" className="border-blue-500 text-blue-600">
                        ⚙️ Configure Stripe to receive €{(message.escrow_transactions.amount * 0.75).toFixed(2)}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessagesTab;