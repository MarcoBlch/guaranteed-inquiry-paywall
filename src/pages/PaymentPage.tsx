
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripeEscrowForm from "@/components/payment/StripeEscrowForm";
import PaymentError from "@/components/payment/PaymentError";
import LoadingState from "@/components/payment/LoadingState";
import { usePaymentDetails } from "@/hooks/usePaymentDetails";
import { FastPassLogo } from "@/components/ui/FastPassLogo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { usePageViewTracking } from '@/hooks/usePageViewTracking';
import { CheckCircle, Shield, Clock, Star } from 'lucide-react';

// Load Stripe with publishable key from environment variable
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripeKey) {
  console.error('Missing VITE_STRIPE_PUBLISHABLE_KEY environment variable');
}

const stripePromise = loadStripe(stripeKey, {
  locale: 'en'
});

const PaymentPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  // Supports both /pay/:userId (UUID) and /:slug (short URL) routes
  const identifier = params.userId || params.slug;
  const { details, loading, error, resolvedUserId } = usePaymentDetails(identifier);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Track page view for analytics (use resolved UUID for consistent tracking)
  usePageViewTracking(resolvedUserId ? `/pay/${resolvedUserId}` : '/pay');

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-white dark:bg-slate-950">

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
      <div className="min-h-screen relative overflow-hidden bg-white dark:bg-slate-950">

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
      <div className="min-h-screen relative overflow-hidden bg-white dark:bg-slate-950">

        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header */}
          <header className="p-4 sm:p-6">
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              <FastPassLogo size="xl" />
              <ThemeToggle />
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-2xl">
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardHeader className="text-center p-6 sm:p-8 border-b border-slate-200 dark:border-slate-700">
                  <CardTitle className="font-display italic text-green-500 text-3xl sm:text-4xl lg:text-5xl mb-2">
                    SKIP THE LINE
                  </CardTitle>
                  <CardDescription className="font-body text-slate-500 dark:text-slate-400 text-sm sm:text-base lg:text-lg">
                    Send your message with guaranteed response or full refund
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 lg:p-8">
                  {details && resolvedUserId && (
                    <div className="space-y-4 sm:space-y-6">
                      {details.isLimitReached ? (
                        /* Inbox full — daily limit reached */
                        <div className="text-center space-y-4 py-6">
                          <h2 className="text-green-500 text-xl font-bold">
                            Inbox full for today
                          </h2>
                          <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
                            <span className="font-semibold text-slate-900 dark:text-white">{details.userName}</span> has
                            reached their daily message limit. Check back tomorrow!
                          </p>
                          <p className="text-slate-500 text-sm">
                            Limits reset every day at midnight UTC.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Profile card with avatar + bio quote */}
                          <div className="border border-slate-200 dark:border-slate-700 rounded-md p-4 sm:p-6">
                            <div className="flex items-start gap-4">
                              <Avatar className="h-14 w-14 shrink-0">
                                {details.avatarUrl ? (
                                  <AvatarImage src={details.avatarUrl} alt={details.userName} />
                                ) : null}
                                <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xl font-display">
                                  {details.userName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="font-body text-slate-500 dark:text-slate-400 text-sm sm:text-base leading-relaxed italic">
                                  "{details.bioQuote || 'I receive hundreds of messages every week. FastPass helps me focus on the ones that truly matter. If you want a real answer, or to collaborate, this is the best way to reach me directly.'}"
                                </p>
                                <p className="text-green-500 text-sm font-medium mt-2">
                                  — {details.userName}
                                </p>

                                {/* Star rating */}
                                {details.totalRatings > 0 && (
                                  <div className="flex items-center gap-1.5 mt-2">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                      <Star
                                        key={n}
                                        className={`h-4 w-4 ${
                                          n <= Math.round(details.avgRating || 0)
                                            ? 'text-yellow-400 fill-yellow-400'
                                            : 'text-slate-300 dark:text-slate-600'
                                        }`}
                                      />
                                    ))}
                                    <span className="text-xs text-slate-400 ml-1">
                                      {details.avgRating?.toFixed(1)} ({details.totalRatings})
                                    </span>
                                  </div>
                                )}

                                {/* Response stats */}
                                {(details.responseRate !== null || details.avgResponseHours !== null) && (
                                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                                    {details.responseRate !== null && (
                                      <span className="flex items-center gap-1">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                        {details.responseRate}% response rate
                                      </span>
                                    )}
                                    {details.avgResponseHours !== null && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5 text-green-500" />
                                        ~{details.avgResponseHours < 1 ? '<1h' : `${Math.round(details.avgResponseHours)}h`} avg response
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <StripeEscrowForm
                            userId={resolvedUserId}
                            basePrice={details.price}
                            userName={details.userName}
                            onSuccess={() => navigate('/payment-success')}
                            onError={(message) => setPaymentError(message)}
                          />

                          {/* Trust signals */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                            <div className="flex flex-col items-center gap-1.5 p-3">
                              <CheckCircle className="h-5 w-5 text-green-500" />
                              <span className="text-xs text-slate-500 dark:text-slate-400">Response guaranteed or full refund</span>
                            </div>
                            <div className="flex flex-col items-center gap-1.5 p-3">
                              <Shield className="h-5 w-5 text-green-500" />
                              <span className="text-xs text-slate-500 dark:text-slate-400">Secure payment by Stripe</span>
                            </div>
                            <div className="flex flex-col items-center gap-1.5 p-3">
                              <Clock className="h-5 w-5 text-green-500" />
                              <span className="text-xs text-slate-500 dark:text-slate-400">Timed escrow protection</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <footer className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs sm:text-sm px-4">
            <p>Secure payment &middot; Full refund if no response &middot; 24/7 support</p>
            <p className="mt-2">&copy; {new Date().getFullYear()} FastPass</p>
          </footer>
        </div>
      </div>
    </Elements>
  );
};

export default PaymentPage;
