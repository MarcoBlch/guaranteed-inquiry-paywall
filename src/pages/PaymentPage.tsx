import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";

const PaymentPage = () => {
  const { userId } = useParams();
  const [userName, setUserName] = useState('');
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!userId) {
        setError('Invalid payment link');
        setLoading(false);
        return;
      }
      
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('price, paypal_email')
          .eq('id', userId)
          .single();
          
        if (profileError || !profile) {
          throw new Error('Could not find user');
        }
        
        if (!profile.price || !profile.paypal_email) {
          throw new Error('This user has not set up payment options yet');
        }
        
        setPrice(profile.price);
        setUserName(profile.paypal_email.split('@')[0] || 'this user');
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };
    
    loadUserProfile();
  }, [userId]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Limit to 2 attachments
      const selectedFiles = Array.from(e.target.files).slice(0, 2);
      setAttachments(selectedFiles);
    }
  };

  const createOrder = async () => {
    if (!customerEmail || message.length < 10) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    return fetch('/api/create-paypal-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price: price,
      }),
    })
    .then((response) => response.json())
    .then((order) => order.id);
  };

  const onApprove = async (data: any) => {
    if (!userId) return;
    
    setSubmitting(true);
    
    try {
      // Upload attachments if any
      const fileUrls: string[] = [];
      
      for (const file of attachments) {
        const fileName = `${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('message_attachments')
          .upload(`${userId}/${fileName}`, file);
          
        if (uploadError) throw uploadError;
        
        if (uploadData) {
          const { data: { publicUrl } } = supabase
            .storage
            .from('message_attachments')
            .getPublicUrl(`${userId}/${fileName}`);
            
          fileUrls.push(publicUrl);
        }
      }
      
      // Store the message
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          user_id: userId,
          sender_email: customerEmail,
          content: message,
          attachments: fileUrls,
          amount_paid: price
        });
        
      if (insertError) throw insertError;
      
      // Success - redirect to thank you page
      navigate('/payment-success');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <p>Loading payment details...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
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
      </div>
    );
  }
  
  return (
    <PayPalScriptProvider options={{ 
      clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
      currency: "USD",
      intent: "capture"
    }}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Send a Message to {userName}</CardTitle>
            <CardDescription>
              Your message will be delivered with a guaranteed response within 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Your Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Your email for the response"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Your Message (up to 250 words)</Label>
                <Textarea
                  id="message"
                  placeholder="Write your message here..."
                  value={message}
                  onChange={(e) => {
                    // Limit to approx 250 words
                    const words = e.target.value.split(/\s+/);
                    if (words.length <= 250) {
                      setMessage(e.target.value);
                    }
                  }}
                  className="min-h-32"
                  required
                />
                <p className="text-sm text-right text-muted-foreground">
                  {message.split(/\s+/).filter(Boolean).length}/250 words
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="attachments">Attachments (up to 2 files)</Label>
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                />
                {attachments.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Selected files: {attachments.map(f => f.name).join(', ')}
                  </div>
                )}
              </div>
              
              <div className="py-4">
                <div className="flex justify-between items-center">
                  <span>Price:</span>
                  <span className="font-medium">${price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Platform fee (20%):</span>
                  <span>${(price * 0.2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Recipient receives:</span>
                  <span>${(price * 0.8).toFixed(2)}</span>
                </div>
              </div>
              
              <PayPalButtons 
                createOrder={createOrder}
                onApprove={onApprove}
                style={{ layout: "horizontal" }}
              />
            </form>
          </CardContent>
        </Card>
      </div>
    </PayPalScriptProvider>
  );
};

export default PaymentPage;
