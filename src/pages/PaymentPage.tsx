
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

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
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

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
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

        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header */}
          <header className="p-4 sm:p-6 text-center">
            <div className="flex flex-col items-center">
              <FastPassLogo size="xl" />
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-2xl">
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardHeader className="text-center p-6 sm:p-8 border-b border-slate-200 dark:border-slate-700">
                  <CardTitle className="text-green-500 text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">
                    SKIP THE LINE
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-sm sm:text-base lg:text-lg">
                    Send your message with guaranteed response or full refund
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 lg:p-8">
                  {details && userId && (
                    <div className="space-y-4 sm:space-y-6">
                      {details.isLimitReached ? (
                        /* Inbox full — daily limit reached */
                        <div className="text-center space-y-4 py-6">
                          <div className="text-5xl">📬</div>
                          <h2 className="text-green-500 text-xl font-bold">
                            Inbox full for today
                          </h2>
                          <p className="text-slate-400 text-base leading-relaxed">
                            <span className="font-semibold text-white">{details.userName}</span> has
                            reached their daily message limit. Check back tomorrow!
                          </p>
                          <p className="text-slate-500 text-sm">
                            Limits reset every day at midnight UTC.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Personal Message from Recipient */}
                          <div className="bg-green-500/10 border border-green-500/30 rounded-md p-4 sm:p-6">
                            <div className="mb-3">
                              <p className="text-slate-400 text-sm sm:text-base leading-relaxed italic">
                                "I receive hundreds of messages every week. FastPass helps me focus on the ones that truly matter. If you want a real answer, or to collaborate, this is the best way to reach me directly."
                              </p>
                            </div>
                            <p className="text-green-500 text-sm sm:text-base font-semibold">
                              — {details.userName}
                            </p>
                          </div>

                          <StripeEscrowForm
                            userId={userId}
                            basePrice={details.price}
                            onSuccess={() => navigate('/payment-success')}
                            onError={(message) => setPaymentError(message)}
                          />
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <footer className="text-center py-6 text-slate-500 text-xs sm:text-sm px-4">
            <p>Secure payment • Full refund if no response • 24/7 support</p>
            <p className="mt-2">© 2026 FastPass • Guaranteed Response Platform</p>
          </footer>
        </div>
      </div>
    </Elements>
  );
};

export default PaymentPage;
