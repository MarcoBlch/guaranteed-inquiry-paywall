import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useResponseTimeOptions } from "@/hooks/useResponseTimeOptions";

interface StripeEscrowFormProps {
  userId: string;
  basePrice: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export const StripeEscrowForm = ({ userId, basePrice, onSuccess, onError }: StripeEscrowFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [customerEmail, setCustomerEmail] = useState('');
  const [message, setMessage] = useState('');
  const [selectedResponseTime, setSelectedResponseTime] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  const { options, loading, error } = useResponseTimeOptions(userId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || processing) return;
    
    if (!customerEmail || !message || !selectedResponseTime) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    if (message.length < 10) {
      toast.error('Le message doit contenir au moins 10 caractères');
      return;
    }

    setProcessing(true);

    try {
      // 1. Créer PaymentIntent avec escrow
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-stripe-payment', {
        body: {
          price: selectedResponseTime.price,
          responseDeadlineHours: selectedResponseTime.hours,
          userId: userId
        }
      });

      if (paymentError) throw paymentError;

      // 2. Confirmer le paiement (autorisation seulement, pas de capture)
      const { error: confirmError } = await stripe.confirmCardPayment(
        paymentData.clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
            billing_details: { 
              email: customerEmail 
            }
          }
        }
      );

      if (confirmError) throw new Error(confirmError.message);

      // 3. Créer message et transaction escrow
      const { error: escrowError } = await supabase.functions.invoke('process-escrow-payment', {
        body: {
          paymentIntentId: paymentData.paymentIntentId,
          messageData: {
            userId,
            senderEmail: customerEmail,
            content: message,
            price: selectedResponseTime.price,
            responseDeadlineHours: selectedResponseTime.hours,
            attachments: []
          }
        }
      });

      if (escrowError) throw escrowError;

      toast.success('Paiement réussi ! Votre message a été envoyé.');
      onSuccess();

    } catch (err: any) {
      console.error('Payment error:', err);
      toast.error(err.message || 'Erreur lors du paiement');
      onError(err.message || 'Erreur lors du paiement');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Chargement des options...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-800">Erreur: {error}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Votre email *</Label>
        <Input
          id="email"
          type="email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          placeholder="votre@email.com"
          required
        />
        <p className="text-xs text-gray-500">
          Vous recevrez la réponse à cette adresse
        </p>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label htmlFor="message">Votre message *</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Décrivez votre demande en détail..."
          minLength={10}
          rows={4}
          required
        />
        <p className="text-xs text-gray-500">
          {message.length}/2000 caractères (minimum 10)
        </p>
      </div>

      {/* Response Time Options */}
      <div className="space-y-3">
        <Label>Délai de réponse garantie *</Label>
        <div className="grid gap-3">
          {options.map((option) => (
            <Card 
              key={option.hours}
              className={`cursor-pointer transition-all border-2 ${
                selectedResponseTime?.hours === option.hours 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedResponseTime(option)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-lg">{option.label}</h3>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-blue-600">
                      {option.price.toFixed(2)}€
                    </div>
                    <div className="text-xs text-gray-500">Garantie ou remboursé</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {!selectedResponseTime && (
          <p className="text-xs text-red-500">Sélectionnez un délai de réponse</p>
        )}
      </div>

      {/* Stripe Card Element */}
      <div className="space-y-2">
        <Label>Informations de paiement *</Label>
        <div className="p-4 border-2 border-gray-200 rounded-md bg-white focus-within:border-blue-500">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
        <p className="text-xs text-gray-500">
          Paiement sécurisé par Stripe. Vos données sont protégées.
        </p>
      </div>

      {/* Summary */}
      {selectedResponseTime && (
        <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
          <h3 className="font-medium mb-3 text-blue-900">Récapitulatif</h3>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span>Délai de réponse:</span>
              <span className="font-medium">{selectedResponseTime.label}</span>
            </div>
            <div className="flex justify-between">
              <span>Prix total:</span>
              <span className="font-medium">{selectedResponseTime.price.toFixed(2)}€</span>
            </div>
            <div className="border-t border-blue-200 pt-2 mt-2">
              <div className="flex justify-between text-base font-medium">
                <span>À payer maintenant:</span>
                <span className="text-blue-600">{selectedResponseTime.price.toFixed(2)}€</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full py-6 text-lg" 
        disabled={!stripe || processing || !selectedResponseTime || !customerEmail || !message}
        size="lg"
      >
        {processing ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Traitement en cours...
          </div>
        ) : (
          `Payer ${selectedResponseTime?.price?.toFixed(2) || basePrice.toFixed(2)}€`
        )}
      </Button>

      {/* Disclaimer */}
      <div className="text-xs text-gray-500 text-center space-y-1">
        <p>
          ✅ <strong>Garantie:</strong> Réponse dans les délais ou remboursement intégral automatique
        </p>
        <p>
          🔒 <strong>Sécurisé:</strong> Paiement traité par Stripe, leader mondial des paiements
        </p>
      </div>
    </form>
  );
};

export default StripeEscrowForm;