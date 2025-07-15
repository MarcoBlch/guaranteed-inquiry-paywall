
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
          <CardTitle>Paiement réussi !</CardTitle>
          <CardDescription>
            Votre message a été envoyé avec succès
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p>
            Le destinataire répondra à votre message dans les délais convenus.
            Si vous ne recevez pas de réponse dans les temps, vous serez automatiquement remboursé intégralement.
          </p>
          <p className="text-sm text-muted-foreground">
            Une confirmation a été envoyée à votre adresse email.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
