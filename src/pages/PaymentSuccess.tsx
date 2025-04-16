
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

const PaymentSuccess = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle>Payment Successful!</CardTitle>
          <CardDescription>
            Your message has been sent successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p>
            The recipient will respond to your message within 24 hours.
            If you don't receive a response, you'll automatically get a full refund.
          </p>
          <p className="text-sm text-muted-foreground">
            A confirmation has been sent to your email.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => navigate('/')}>Return Home</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
