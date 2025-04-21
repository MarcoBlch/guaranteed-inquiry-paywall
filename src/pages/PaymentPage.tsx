
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import PaymentForm from "@/components/payment/PaymentForm";
import PaymentError from "@/components/payment/PaymentError";
import LoadingState from "@/components/payment/LoadingState";
import { usePaymentDetails } from "@/hooks/usePaymentDetails";

const PaymentPage = () => {
  const { userId } = useParams();
  const { details, loading, error } = usePaymentDetails(userId);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Debug logs to trace the issue
  console.log('Payment page rendering with:', { userId, details, loading, error, paymentError });
  
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
    <PayPalScriptProvider options={{ 
      clientId: 'sb', // Using sandbox 'sb' as the default client ID
      currency: "USD",
      intent: "capture"
    }}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Send a Message to {details?.userName || 'User'}</CardTitle>
            <CardDescription>
              Your message will be delivered with a guaranteed response within 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            {details && userId && (
              <PaymentForm 
                userId={userId} 
                price={details.price} 
                onSuccess={() => window.location.href = '/payment-success'} 
                onError={(message) => setPaymentError(message)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PayPalScriptProvider>
  );
};

export default PaymentPage;
