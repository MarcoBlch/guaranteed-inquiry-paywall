import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  sender_email: string;
  created_at: string;
  response_deadline_hours: number;
  escrow_transactions: Array<{
    amount: number;
    expires_at: string;
    status: string;
  }>;
  message_responses: Array<{
    has_response: boolean;
    response_received_at: string | null;
  }>;
}

const ResponsePage = () => {
  const { messageId } = useParams<{ messageId: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState<Message | null>(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (messageId) {
      loadMessage();
    }
  }, [messageId]);

  const loadMessage = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          escrow_transactions (
            amount,
            expires_at,
            status
          ),
          message_responses (
            has_response,
            response_received_at
          )
        `)
        .eq('id', messageId)
        .single();

      if (error) throw error;

      setMessage(data);
      
    } catch (error: any) {
      toast.error('Message non trouvé ou inaccessible');
      console.error('Error loading message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!response.trim()) {
      toast.error('Veuillez saisir une réponse');
      return;
    }

    if (response.length < 10) {
      toast.error('La réponse doit contenir au moins 10 caractères');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Vérifier si déjà répondu
      if (message?.message_responses?.some(r => r.has_response)) {
        toast.error('Vous avez déjà répondu à ce message');
        return;
      }

      // 2. Mettre à jour la réponse dans la base
      const { error: updateError } = await supabase
        .from('message_responses')
        .update({
          has_response: true,
          response_received_at: new Date().toISOString()
        })
        .eq('message_id', messageId);

      if (updateError) throw updateError;

      // 3. Déclencher la libération des fonds escrow
      const { error: releaseError } = await supabase.functions.invoke('mark-response-received', {
        body: { 
          messageId,
          responseReceived: true 
        }
      });

      if (releaseError) {
        console.error('Release funds error:', releaseError);
        toast.error('Réponse sauvegardée mais erreur lors de la libération des fonds');
      }

      // 4. Envoyer la réponse par email (optionnel)
      try {
        await supabase.functions.invoke('send-response-email', {
          body: {
            messageId,
            responseContent: response,
            senderEmail: message?.sender_email
          }
        });
      } catch (emailError) {
        console.warn('Email sending failed:', emailError);
        // Ne pas faire échouer le processus pour ça
      }

      toast.success('🎉 Réponse envoyée avec succès ! Vos fonds arrivent dans quelques minutes.');
      
      // Recharger le message pour voir les changements
      await loadMessage();

    } catch (error: any) {
      toast.error("Erreur lors de l'envoi: " + error.message);
      console.error('Submit response error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTimeLeft = () => {
    const escrow = message?.escrow_transactions?.[0];
    if (!escrow?.expires_at) return null;
    
    const now = new Date().getTime();
    const expiry = new Date(escrow.expires_at).getTime();
    const timeLeft = expiry - now;
    
    if (timeLeft <= 0) return null;
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Chargement du message...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Message non trouvé</h2>
            <p className="text-gray-600 mb-4">
              Ce message n'existe pas ou a été supprimé.
            </p>
            <Button onClick={() => navigate('/')}>
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const timeLeft = calculateTimeLeft();
  const isExpired = !timeLeft;
  const escrow = message.escrow_transactions?.[0];
  const hasResponded = message.message_responses?.some(r => r.has_response);
  const canRespond = !isExpired && !hasResponded && escrow?.status === 'held';
  const earnings = escrow ? escrow.amount * 0.75 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">💰 Message Payé FastPass</CardTitle>
                <CardDescription className="text-blue-100 mt-2">
                  De: <strong>{message.sender_email}</strong>
                </CardDescription>
                <div className="text-sm text-blue-100 mt-1">
                  Reçu le {new Date(message.created_at).toLocaleString('fr-FR')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-300">
                  €{earnings.toFixed(2)}
                </div>
                <div className="text-sm text-blue-200">vos gains (75%)</div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            {/* Statut et Timer */}
            <div className="space-y-3">
              {canRespond && timeLeft && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center">
                        ⏰ <strong className="ml-2">Temps restant:</strong>
                      </span>
                      <Badge className="bg-orange-500">
                        {timeLeft.hours}h {timeLeft.minutes}min
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {isExpired && !hasResponded && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    ❌ <strong>Délai expiré</strong> - Le remboursement automatique a été effectué
                  </AlertDescription>
                </Alert>
              )}

              {hasResponded && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">
                    ✅ <strong>Réponse envoyée !</strong> Vos fonds ont été transférés.
                  </AlertDescription>
                </Alert>
              )}

              {escrow?.status === 'pending_user_setup' && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-800">
                    ⚙️ <strong>Configuration requise</strong> - Complétez votre setup Stripe pour recevoir les fonds
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Message original */}
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  📝 Message reçu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {message.content}
                </p>
                <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
                  <span>Délai demandé: {message.response_deadline_hours}h</span>
                  <span>Montant payé: €{escrow?.amount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Zone de réponse */}
            {canRespond && (
              <Card className="border-green-200">
                <CardHeader>
                  <CardTitle className="text-lg text-green-700">
                    ✍️ Votre réponse
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Label htmlFor="response" className="text-base font-medium">
                    Rédigez votre réponse:
                  </Label>
                  <Textarea
                    id="response"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Tapez votre réponse détaillée ici..."
                    rows={8}
                    className="min-h-[200px]"
                  />
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{response.length}/2000 caractères (minimum 10)</span>
                    <span>Format: Texte libre</span>
                  </div>
                  
                  <Button 
                    onClick={handleSubmitResponse}
                    disabled={submitting || response.length < 10}
                    className="w-full py-6 text-lg bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {submitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Envoi en cours...
                      </div>
                    ) : (
                      `🚀 Envoyer la Réponse et Recevoir €${earnings.toFixed(2)}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Réponse déjà envoyée */}
            {hasResponded && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-lg text-green-700">
                    ✅ Votre réponse envoyée
                  </CardTitle>
                  <CardDescription>
                    Réponse confirmée le {message.message_responses?.find(r => r.response_received_at)?.response_received_at &&
                      new Date(message.message_responses.find(r => r.response_received_at)!.response_received_at!).toLocaleString('fr-FR')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-green-800">
                    Votre réponse a été envoyée avec succès et vos fonds ont été transférés.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Footer informatif */}
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
              <h4 className="font-medium mb-2">💡 Comment ça marche:</h4>
              <ul className="space-y-1">
                <li>• Répondez dans les délais → Vous recevez 75% du montant payé</li>
                <li>• Pas de réponse → Remboursement automatique à l'expéditeur</li>
                <li>• Paiement sécurisé et garanti par Stripe</li>
                <li>• Commission FastPass: 25% (frais de traitement et garantie)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResponsePage;