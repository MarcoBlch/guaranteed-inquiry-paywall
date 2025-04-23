import React, { useState } from 'react';
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import FileUploadSection from "./FileUploadSection";
import PriceBreakdown from "./PriceBreakdown";
import EmailInput from "./EmailInput";
import MessageInput from "./MessageInput";
import PaymentSection from "./PaymentSection";
import PaymentErrorMessage from "./PaymentErrorMessage";
import ProcessingIndicator from "./ProcessingIndicator";

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

  const createOrder = async () => {
    if (!customerEmail || message.length < 10) {
      toast.error('Please fill in all required fields');
      return;
    }

    setPaymentError(null);

    try {
      console.log('Creating PayPal order for price:', price);

      const { data, error } = await supabase.functions.invoke('create-paypal-order', {
        body: { price },
      });

      if (error || data.error) {
        throw new Error(error?.message || data.error || 'Failed to create payment order');
      }

      console.log('PayPal order created:', data.id);
      return data.id;
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
    console.log('Payment approved, order ID:', data.orderID);

    try {
      // Try to ensure storage bucket exists
      let bucketExists = false;
      try {
        const { data: bucket } = await supabase.storage.getBucket('message_attachments');
        bucketExists = !!bucket;
      } catch (err) {
        console.log('Error checking bucket:', err);
      }
      
      // Create bucket if needed
      if (!bucketExists) {
        try {
          console.log('Creating message_attachments bucket');
          const { error: bucketError } = await supabase.storage.createBucket('message_attachments', {
            public: true
          });
          if (bucketError) {
            console.error('Error creating bucket:', bucketError);
          }
        } catch (storageError: any) {
          console.log('Storage error:', storageError.message);
        }
      }

      // Handle file uploads
      const fileUrls: string[] = [];
      for (const file of attachments) {
        try {
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
        } catch (fileError: any) {
          console.error('File upload error:', fileError);
        }
      }

      // Store message
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

      toast.success('Your message has been sent!');
      onSuccess();
    } catch (err: any) {
      console.error('Payment processing error:', err);
      setSubmitting(false);
      toast.error(err.message || 'Error processing payment');
      setPaymentError(err.message || 'Error processing payment');
      onError(err.message || 'Error processing payment');
    }
  };

  const handlePayPalError = (err: any) => {
    console.error('PayPal error:', err);
    
    if (err?.message === 'INVALID_RESOURCE_ID') {
      toast.warning('Running in sandbox mode. In production, real PayPal accounts would be used.');
      setTimeout(() => {
        onApprove({ orderID: `SIMULATED_${Date.now()}` });
      }, 1500);
      return;
    }
    
    setPaymentError('PayPal payment failed. Please try again.');
    toast.error('PayPal payment failed. Please try again.');
    onError('PayPal payment failed. Please try again.');
  };

  return (
    <form className="space-y-4">
      {paymentError && <PaymentErrorMessage error={paymentError} />}

      <EmailInput 
        value={customerEmail}
        onChange={setCustomerEmail}
      />

      <MessageInput 
        value={message}
        onChange={setMessage}
      />

      <FileUploadSection
        attachments={attachments}
        setAttachments={setAttachments}
      />

      <PriceBreakdown price={price} />

      <PaymentSection
        price={price}
        disabled={submitting}
        onCreateOrder={createOrder}
        onApprove={onApprove}
        onError={handlePayPalError}
      />

      {submitting && <ProcessingIndicator />}
    </form>
  );
};

export default PaymentForm;
