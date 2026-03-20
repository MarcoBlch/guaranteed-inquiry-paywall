
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { FastPassLogo } from "@/components/ui/FastPassLogo";
import { usePageViewTracking } from '@/hooks/usePageViewTracking';

const PaymentSuccess = () => {
  const navigate = useNavigate();

  // Track successful payment conversion
  usePageViewTracking('/payment-success');

  return (
    <div className="min-h-screen relative overflow-hidden">

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 sm:p-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <FastPassLogo size="lg" />
            <p className="text-white/80 text-xs sm:text-sm font-medium tracking-wider -mt-4 sm:-mt-5">
              GUARANTEED RESPONSES
            </p>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <CheckCircle className="h-20 w-20 text-green-500 animate-pulse" />
                </div>
              </div>
              <CardTitle className="text-green-500 text-2xl sm:text-3xl font-bold">
                Message Sent Successfully!
              </CardTitle>
              <CardDescription className="text-slate-400 text-base sm:text-lg">
                Your message has been sent and payment processed
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-slate-400">
                The recipient will respond to your message within the agreed timeframe.
                If you don't receive a response within the deadline, you will be automatically refunded in full.
              </p>
              <p className="text-sm text-slate-500">
                You will receive the response directly via email.
              </p>
              <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-md">
                <p className="text-sm text-slate-400">
                  <strong className="text-green-500">What happens next:</strong><br/>
                  <span className="text-green-500">•</span> The recipient gets notified via email<br/>
                  <span className="text-green-500">•</span> They respond directly to your email address<br/>
                  <span className="text-green-500">•</span> You receive their response in your inbox
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button
                onClick={() => navigate('/')}
                className="bg-green-500 hover:bg-green-400 text-white font-bold transition-all duration-300 hover:scale-[1.02]"
              >
                Explore FastPass
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Footer */}
        <footer className="text-center py-6 text-slate-500 text-xs sm:text-sm px-4">
          <p>© 2026 FastPass • Guaranteed Response Platform</p>
        </footer>
      </div>
    </div>
  );
};

export default PaymentSuccess;
