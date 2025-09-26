
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
          <CardTitle>Message Sent Successfully!</CardTitle>
          <CardDescription>
            Your message has been sent and payment processed
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p>
            The recipient will respond to your message within the agreed timeframe.
            If you don't receive a response within the deadline, you will be automatically refunded in full.
          </p>
          <p className="text-sm text-muted-foreground">
            You will receive the response directly via email.
          </p>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>What happens next:</strong><br/>
              • The recipient gets notified via email<br/>
              • They respond directly to your email address<br/>
              • You receive their response in your inbox
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
