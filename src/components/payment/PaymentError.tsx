
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
import { AlertTriangleIcon, RefreshCwIcon, HomeIcon } from "lucide-react";

interface PaymentErrorProps {
  error: string;
}

const PaymentError = ({ error }: PaymentErrorProps) => {
  const navigate = useNavigate();
  
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-red-500 flex items-center gap-2">
          <AlertTriangleIcon className="h-5 w-5" /> Error Loading Payment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Payment Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <p className="text-sm text-muted-foreground mb-4">
          This could be due to an invalid link, a connection issue, or the payment option being unavailable.
        </p>
      </CardContent>
      <CardFooter className="flex gap-2 justify-between">
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="flex items-center gap-1"
        >
          <RefreshCwIcon className="h-4 w-4" /> Refresh
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
