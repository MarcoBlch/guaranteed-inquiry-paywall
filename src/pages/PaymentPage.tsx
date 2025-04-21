
import React from 'react';
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
  
  // Debug logs to trace the issue
  console.log('Payment page rendering with:', { userId, details, loading, error });
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <LoadingState />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <PaymentError error={error} />
      </div>
    );
  }
  
  return (
    <PayPalScriptProvider options={{ 
      clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb', // Use sandbox 'sb' as fallback
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
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PayPalScriptProvider>
  );
};

export default PaymentPage;
