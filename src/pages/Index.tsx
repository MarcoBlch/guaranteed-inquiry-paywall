
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';

const PaywallPage = () => {
  const [email, setEmail] = useState('');
  const [price, setPrice] = useState(10);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    
    checkAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please login first');
      return;
    }
    
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Guaranteed Response Paywall</CardTitle>
          <CardDescription>Get a guaranteed response within 24 hours or get a full refund</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">How it works:</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Set your desired price for guaranteed responses</li>
                <li>People pay to send you messages with attachments</li>
                <li>You receive the messages in your email</li>
                <li>Respond within 24 hours or they get refunded</li>
              </ol>
            </div>
            
            {isAuthenticated ? (
              <Button 
                className="w-full" 
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/auth')}
              >
                Login / Sign Up
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaywallPage;

