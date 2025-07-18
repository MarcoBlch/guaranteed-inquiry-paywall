
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripeEscrowForm from "@/components/payment/StripeEscrowForm";
import PaymentError from "@/components/payment/PaymentError";
import LoadingState from "@/components/payment/LoadingState";
import { usePaymentDetails } from "@/hooks/usePaymentDetails";

// ✅ STRIPE UNIQUEMENT - clé publique (pk_test_ pour test, pk_live_ pour production)
const stripePromise = loadStripe('pk_test_51RiErSRrgEEFpaiMJoUVf3rWAiACX9gBaB89pQZVHADw19wCkfSZXE9xrYqsbwDy4iLE65LlB9WEe7W07BHWxqnM00euXQsJ19');

const PaymentPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { details, loading, error } = usePaymentDetails(userId);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <LoadingState />
      </div>
    );
  }
  
  if (error || paymentError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <PaymentError error={paymentError || error || 'Payment error'} />
      </div>
    );
  }
  
  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Message avec Réponse Garantie</CardTitle>
            <CardDescription className="text-lg">
              Envoyez votre message avec garantie de réponse dans les délais choisis ou remboursement intégral
            </CardDescription>
          </CardHeader>
          <CardContent>
            {details && userId && (
              <StripeEscrowForm 
                userId={userId} 
                basePrice={details.price} 
                onSuccess={() => navigate('/payment-success')} 
                onError={(message) => setPaymentError(message)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </Elements>
  );
};

export default PaymentPage;
