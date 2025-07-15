
import React, { useState } from 'react';
import { toast } from "sonner";
import FileUploadSection from "./FileUploadSection";
import EmailInput from "./EmailInput";
import MessageInput from "./MessageInput";
import PaymentErrorMessage from "./PaymentErrorMessage";
import ProcessingIndicator from "./ProcessingIndicator";
import ResponseTimeSelector from "./ResponseTimeSelector";
import StripePaymentForm from "./StripePaymentForm";
import PaymentSection from "./PaymentSection";
import { useResponseTimeOptions } from "@/hooks/useResponseTimeOptions";
import { supabase } from "@/integrations/supabase/client";

interface PaymentFormProps {
  userId: string;
  price: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}

interface ResponseTimeOption {
  hours: 24 | 48 | 72;
  price: number;
  label: string;
  description: string;
}

const PaymentForm = ({ userId, price, onSuccess, onError }: PaymentFormProps) => {
  const [customerEmail, setCustomerEmail] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [selectedResponseTime, setSelectedResponseTime] = useState<ResponseTimeOption | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | null>(null);

  const { options, loading, error } = useResponseTimeOptions(userId);

  const handleContinueToPayment = () => {
    if (!customerEmail || message.length < 5 || !selectedResponseTime) {
      toast.error('Veuillez remplir tous les champs requis et choisir un délai de réponse');
      return;
    }
    setShowPayment(true);
  };

  const handlePaymentMethodSelect = (method: 'stripe' | 'paypal') => {
    setPaymentMethod(method);
  };

  // PayPal handlers
  const handleCreateOrder = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-paypal-order', {
        body: {
          price: selectedResponseTime?.price || price,
          responseDeadlineHours: selectedResponseTime?.hours || 24,
          userId
        }
      });
      
      if (error) throw error;
      return data.orderID;
    } catch (error: any) {
      toast.error('Erreur lors de la création de la commande PayPal');
      console.error('PayPal order creation error:', error);
      throw error;
    }
  };

  const handleApprove = async (data: any) => {
    try {
      const currentPaymentData = {
        userId,
        price: selectedResponseTime?.price || price,
        responseDeadlineHours: selectedResponseTime?.hours || 24,
        senderEmail: customerEmail,
        content: message,
        attachments: []
      };

      const { error } = await supabase.functions.invoke('process-escrow-payment', {
        body: {
          orderID: data.orderID,
          messageData: currentPaymentData
        }
      });

      if (error) throw error;
      
      toast.success('Paiement PayPal réussi ! Votre message a été envoyé.');
      onSuccess();
    } catch (error: any) {
      toast.error('Erreur lors du traitement du paiement PayPal');
      onError(error.message || 'Erreur PayPal');
    }
  };

  const handlePayPalError = (err: any) => {
    console.error('PayPal error:', err);
    toast.error('Erreur PayPal: ' + (err.message || 'Erreur inconnue'));
  };

  const handlePaymentSuccess = () => {
    setSubmitting(false);
    onSuccess();
  };

  const handlePaymentError = (error: string) => {
    setSubmitting(false);
    setPaymentError(error);
    onError(error);
  };

  if (loading) {
    return <ProcessingIndicator />;
  }

  if (error) {
    return <PaymentErrorMessage error={error} />;
  }

  const paymentData = {
    userId,
    price: selectedResponseTime?.price || price,
    responseDeadlineHours: selectedResponseTime?.hours || 24,
    senderEmail: customerEmail,
    content: message,
    attachments: [] // TODO: Upload files to storage first
  };

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      {paymentError && <PaymentErrorMessage error={paymentError} />}

      {!showPayment ? (
        <>
          <EmailInput 
            value={customerEmail}
            onChange={setCustomerEmail}
          />

          <MessageInput 
            value={message}
            onChange={setMessage}
          />

          <FileUploadSection
            attachments={attachments}
            setAttachments={setAttachments}
          />

          <ResponseTimeSelector
            options={options}
            selectedOption={selectedResponseTime}
            onSelect={setSelectedResponseTime}
          />

          <button
            type="button"
            onClick={handleContinueToPayment}
            disabled={!customerEmail || message.length < 5 || !selectedResponseTime}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuer vers le paiement ({selectedResponseTime?.price.toFixed(2) || price.toFixed(2)}€)
          </button>
          
          {/* Debug info - À supprimer après test */}
          <div className="text-xs text-gray-500 mt-2">
            Debug: Email={customerEmail ? 'OK' : 'MANQUE'}, Message={message.length}chars, Délai={selectedResponseTime ? 'OK' : 'MANQUE'}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Récapitulatif</h3>
            <div className="text-sm space-y-1">
              <div><strong>Délai:</strong> {selectedResponseTime?.label}</div>
              <div><strong>Prix:</strong> {selectedResponseTime?.price.toFixed(2)}€</div>
              <div><strong>Email:</strong> {customerEmail}</div>
            </div>
          </div>

          {!paymentMethod ? (
            <div className="space-y-3">
              <h3 className="font-medium text-center">Choisissez votre méthode de paiement</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handlePaymentMethodSelect('stripe')}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
                >
                  <div className="text-center">
                    <div className="font-medium">💳 Stripe</div>
                    <div className="text-sm text-gray-600">Carte bancaire</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentMethodSelect('paypal')}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
                >
                  <div className="text-center">
                    <div className="font-medium">🅿️ PayPal</div>
                    <div className="text-sm text-gray-600">PayPal & cartes</div>
                  </div>
                </button>
              </div>
            </div>
          ) : paymentMethod === 'stripe' ? (
            <StripePaymentForm
              paymentData={paymentData}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          ) : (
            <PaymentSection
              price={selectedResponseTime?.price || price}
              disabled={submitting}
              onCreateOrder={handleCreateOrder}
              onApprove={handleApprove}
              onError={handlePayPalError}
            />
          )}

          <button
            type="button"
            onClick={() => {
              setShowPayment(false);
              setPaymentMethod(null);
            }}
            className="w-full text-gray-600 py-2 hover:text-gray-800"
          >
            ← Retour aux détails
          </button>
        </div>
      )}

      {submitting && <ProcessingIndicator />}
    </form>
  );
};

export default PaymentForm;
