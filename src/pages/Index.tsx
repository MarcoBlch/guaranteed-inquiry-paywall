import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";

const PaywallPage = () => {
  const [email, setEmail] = useState('');
  const [price, setPrice] = useState(10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('Please login first');
      return;
    }
    
    console.log('Submitted', { email, price });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Guaranteed Response Paywall</CardTitle>
          <CardDescription>Get a guaranteed response within 24 hours or get a full refund</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Your Email</Label>
              <Input 
                type="email" 
                placeholder="Enter your email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Set Your Price ($)</Label>
              <Input 
                type="number" 
                min="5" 
                max="500" 
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                placeholder="Set your desired price" 
              />
              <p className="text-sm text-muted-foreground">
                Platform takes 20% commission: ${(price * 0.2).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                You receive: ${(price * 0.8).toFixed(2)}
              </p>
            </div>
            <div className="flex flex-col space-y-2">
              <Button type="submit" className="w-full">
                Proceed to Payment
              </Button>
              <Button type="button" variant="outline" onClick={() => window.location.href = '/auth'}>
                Login / Sign Up
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaywallPage;
