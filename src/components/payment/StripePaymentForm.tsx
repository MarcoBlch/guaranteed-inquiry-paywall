
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  throw new Error('Missing Stripe publishable key. Please check your .env file.');
}

const stripePromise = loadStripe(stripePublishableKey);

interface PaymentFormData {
  userId: string;
  price: number;
  responseDeadlineHours: 24 | 48 | 72;
  senderEmail: string;
  content: string;
  attachments: string[];
}

interface CheckoutFormProps {
  paymentData: PaymentFormData;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const CheckoutForm = ({ paymentData, onSuccess, onError }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    try {
      // Create payment intent
      const { data: paymentResponse, error } = await supabase.functions.invoke('create-stripe-payment', {
        body: {
          price: paymentData.price,
          responseDeadlineHours: paymentData.responseDeadlineHours,
          userId: paymentData.userId
        }
      });

      if (error) throw error;

      // Confirm payment
      const { error: confirmError } = await stripe.confirmCardPayment(
        paymentResponse.clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
            billing_details: {
              email: paymentData.senderEmail,
            },
          }
        }
      );

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      // Capture the payment after successful confirmation
      const { error: captureError } = await supabase.functions.invoke('capture-stripe-payment', {
        body: {
          paymentIntentId: paymentResponse.paymentIntentId
        }
      });

      if (captureError) throw captureError;

      // Process the escrow payment and create message
      const { error: processError } = await supabase.functions.invoke('process-escrow-payment', {
        body: {
          paymentIntentId: paymentResponse.paymentIntentId,
          messageData: paymentData
        }
      });

      if (processError) throw processError;

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }}
        />
      </div>
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || processing}
      >
        {processing ? 'Traitement...' : `Payer ${paymentData.price.toFixed(2)}€`}
      </Button>
    </form>
  );
};

interface StripePaymentFormProps {
  paymentData: PaymentFormData;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const StripePaymentForm = ({ paymentData, onSuccess, onError }: StripePaymentFormProps) => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm 
        paymentData={paymentData}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
};

export default StripePaymentForm;
