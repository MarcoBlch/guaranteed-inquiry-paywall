
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangleIcon, RefreshCwIcon, HomeIcon, HelpCircleIcon } from "lucide-react";

interface PaymentErrorProps {
  error: string;
}

const PaymentError = ({ error }: PaymentErrorProps) => {
  const navigate = useNavigate();
  
  // Check if this is a Stripe setup error
  const isStripeSetupError = error && error.includes('not completed Stripe setup');
  
  // Clean the error message for display
  const displayError = error && error.includes('Error:') 
    ? error 
    : `Error: ${error}`;
  
  const troubleshootingSteps = isStripeSetupError 
    ? [
        "The recipient is still setting up their payment system",
        "Please try again in a few minutes",
        "This is a one-time setup process",
        "Your message will be available once setup is complete"
      ]
    : [
        "Check your internet connection",
        "Ensure your payment method is valid", 
        "Try using a different browser or device",
        "The recipient may not have properly configured payment settings"
      ];
  
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-red-500 flex items-center gap-2">
          <AlertTriangleIcon className="h-5 w-5" /> Payment Error
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant={isStripeSetupError ? "default" : "destructive"} className="mb-4">
          <AlertTitle>{isStripeSetupError ? "Setup In Progress" : "Payment Error"}</AlertTitle>
          <AlertDescription>
            {isStripeSetupError 
              ? "This professional is still configuring their FASTPASS payment system. Please check back in a few minutes."
              : displayError
            }
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This could be due to an invalid link, a connection issue, or the payment option being unavailable.
          </p>
          
          <div className="bg-slate-50 p-3 rounded-md">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <HelpCircleIcon className="h-4 w-4" /> Troubleshooting Steps
            </h4>
            <ul className="text-xs space-y-1 text-muted-foreground">
              {troubleshootingSteps.map((step, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-1">•</span> {step}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 justify-between">
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="flex items-center gap-1"
        >
          <RefreshCwIcon className="h-4 w-4" /> Try Again
        </Button>
        <Button 
          onClick={() => navigate('/')}
          className="flex items-center gap-1"
        >
          <HomeIcon className="h-4 w-4" /> Return Home
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PaymentError;
