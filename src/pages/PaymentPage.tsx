
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripeEscrowForm from "@/components/payment/StripeEscrowForm";
import PaymentError from "@/components/payment/PaymentError";
import LoadingState from "@/components/payment/LoadingState";
import { usePaymentDetails } from "@/hooks/usePaymentDetails";
import { FastPassLogo } from "@/components/ui/FastPassLogo";
import { usePageViewTracking } from '@/hooks/usePageViewTracking';

// Load Stripe with publishable key from environment variable
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripeKey) {
  console.error('Missing VITE_STRIPE_PUBLISHABLE_KEY environment variable');
}

const stripePromise = loadStripe(stripeKey, {
  locale: 'en'
});

const PaymentPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { details, loading, error } = usePaymentDetails(userId);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Track page view for analytics (includes userId in path for conversion tracking)
  usePageViewTracking(userId ? `/pay/${userId}` : '/pay');

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* StaticBackground component from App.tsx provides the background */}

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <Card className="bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_20px_rgba(92,255,176,0.2)]">
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
      <div className="min-h-screen relative overflow-hidden">
        {/* StaticBackground component from App.tsx provides the background */}

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <Card className="bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_20px_rgba(92,255,176,0.2)]">
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
      <div className="min-h-screen relative overflow-hidden">
        {/* StaticBackground component from App.tsx provides the background */}

        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header */}
          <header className="p-4 sm:p-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <FastPassLogo size="lg" />
              <p className="text-white/80 text-xs sm:text-sm font-medium tracking-wider -mt-4 sm:-mt-5">
                SKIP THE LINE
              </p>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-2xl">
              <Card className="bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_20px_rgba(92,255,176,0.2)]">
                <CardHeader className="text-center p-6 sm:p-8 border-b border-[#5cffb0]/20">
                  <CardTitle className="text-[#5cffb0] text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                    Guaranteed Response Message
                  </CardTitle>
                  <CardDescription className="text-[#B0B0B0] text-sm sm:text-base lg:text-lg">
                    Send your message with guaranteed response or full refund
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 lg:p-8">
                  {details && userId && (
                    <div className="space-y-4 sm:space-y-6">
                      {/* Personal Message from Recipient */}
                      <div className="bg-[#5cffb0]/10 border border-[#5cffb0]/30 rounded-lg p-4 sm:p-6">
                        <div className="mb-3">
                          <p className="text-[#B0B0B0] text-sm sm:text-base leading-relaxed italic">
                            "I receive hundreds of messages every week. FastPass helps me focus on the ones that truly matter. If you want a real answer, or to collaborate, this is the best way to reach me directly."
                          </p>
                        </div>
                        <p className="text-[#5cffb0] text-sm sm:text-base font-semibold">
                          — {details.userName}
                        </p>
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
          <footer className="text-center py-6 text-[#B0B0B0]/60 text-xs sm:text-sm px-4">
            <p>Secure payment • Full refund if no response • 24/7 support</p>
            <p className="mt-2">© 2025 FastPass • Guaranteed Response Platform</p>
          </footer>
        </div>
      </div>
    </Elements>
  );
};

export default PaymentPage;
