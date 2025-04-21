
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { supabase } from "@/lib/supabase";

interface PaymentFormProps {
  userId: string;
  price: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}

const PaymentForm = ({ userId, price, onSuccess, onError }: PaymentFormProps) => {
  const [customerEmail, setCustomerEmail] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
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
    
    setPaymentError(null);
    
    try {
      console.log('Creating PayPal order for price:', price);
      
      const response = await fetch('https://znncfayiwfamujvrprvf.supabase.co/functions/v1/create-paypal-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price: price,
        }),
      });
      
      console.log('PayPal order response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error creating order:', errorData);
        throw new Error(errorData.error || 'Failed to create payment order');
      }
      
      const order = await response.json();
      console.log('PayPal order created:', order.id);
      return order.id;
    } catch (error: any) {
      console.error('Error creating order:', error);
      setPaymentError(error.message || 'Error creating payment order');
      onError(error.message || 'Error creating payment order');
      toast.error(error.message || 'Error creating payment order');
      throw error;
    }
  };

  const onApprove = async (data: any) => {
    if (!userId) return;
    
    setSubmitting(true);
    
    try {
      console.log('Payment approved, order ID:', data.orderID);
      
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
      
      // Success - call onSuccess callback
      onSuccess();
    } catch (err: any) {
      setSubmitting(false);
      toast.error(err.message || 'Error processing payment');
      setPaymentError(err.message || 'Error processing payment');
      onError(err.message || 'Error processing payment');
    }
  };

  // Renamed from onError to handlePayPalError to avoid naming conflict
  const handlePayPalError = (err: any) => {
    console.error('PayPal error:', err);
    setPaymentError('PayPal payment failed. Please try again.');
    toast.error('PayPal payment failed. Please try again.');
  };
  
  return (
    <form className="space-y-4">
      {paymentError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          <p className="text-sm font-medium">Payment Error: {paymentError}</p>
          <p className="text-xs mt-1">Please try again or contact support if the problem persists.</p>
        </div>
      )}
      
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
        onError={handlePayPalError}
        style={{ layout: "horizontal" }}
        disabled={submitting}
      />
      
      {submitting && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Processing payment...</p>
        </div>
      )}
    </form>
  );
};

export default PaymentForm;
