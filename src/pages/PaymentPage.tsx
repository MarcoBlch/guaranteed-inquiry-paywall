
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripeEscrowForm from "@/components/payment/StripeEscrowForm";
import PaymentError from "@/components/payment/PaymentError";
import LoadingState from "@/components/payment/LoadingState";
import { usePaymentDetails } from "@/hooks/usePaymentDetails";

// Stripe publishable key - safe to store in code
const stripePromise = loadStripe('pk_test_51RiErSRrgEEFpaiMLBBwEwv3hzswFpxx99iToSwtF1R0ouwbFHQygddjv7ABOuKELDjgO0e7tL9DkZiYVINdStjS00OQpDFGqR');

const PaymentPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { details, loading, error } = usePaymentDetails(userId);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 flex items-center justify-center p-4">
        <div className="relative">
          <div className="absolute inset-0 bg-black/20 rounded-2xl" />
          <Card className="bg-white/95 backdrop-blur-sm relative z-10">
            <CardContent className="p-8 text-center">
              <LoadingState />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (error || paymentError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 flex items-center justify-center p-4">
        <div className="relative">
          <div className="absolute inset-0 bg-black/20 rounded-2xl" />
          <Card className="bg-white/95 backdrop-blur-sm relative z-10">
            <CardContent className="p-8">
              <PaymentError error={paymentError || error || 'Payment error'} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          <div className="absolute bottom-20 right-10 w-24 h-24 bg-white/10 rounded-full blur-xl" />
        </div>

        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header */}
          <header className="p-4 sm:p-6 text-center">
            <div className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2">
              <h1 className="text-white font-bold text-lg sm:text-xl tracking-wide">FASTPASS</h1>
              <p className="text-white/80 text-xs sm:text-sm font-medium">GUARANTEED RESPONSE</p>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="w-full max-w-2xl">
              <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-2xl">
                <CardHeader className="text-center bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-lg p-4 sm:p-6">
                  <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Guaranteed Response Message</CardTitle>
                  <CardDescription className="text-white/90 text-sm sm:text-base lg:text-lg font-medium">
                    Send your message with guaranteed response or full refund
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 lg:p-8">
                  {details && userId && (
                    <div className="space-y-4 sm:space-y-6">
                      {/* Recipient Info */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 sm:p-6">
                        <h3 className="font-bold text-gray-900 mb-2 text-lg sm:text-xl">Sending message to professional</h3>
                        <p className="text-gray-600 text-sm sm:text-base">Your message will be delivered with payment guarantee for timely response</p>
                      </div>
                      
                      <StripeEscrowForm 
                        userId={userId} 
                        basePrice={details.price} 
                        onSuccess={() => navigate('/payment-success')} 
                        onError={(message) => setPaymentError(message)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <footer className="text-center py-4 sm:py-6 text-white/60 text-xs sm:text-sm px-4">
            <p>Secure payment • Full refund if no response • 24/7 support</p>
          </footer>
        </div>
      </div>
    </Elements>
  );
};

export default PaymentPage;
