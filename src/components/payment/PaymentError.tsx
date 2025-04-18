
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

interface PaymentErrorProps {
  error: string;
}

const PaymentError = ({ error }: PaymentErrorProps) => {
  const navigate = useNavigate();
  
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-red-500">Error</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{error}</p>
      </CardContent>
      <CardFooter>
        <Button onClick={() => navigate('/')}>Return Home</Button>
      </CardFooter>
    </Card>
  );
};

export default PaymentError;
