import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useResponseTimeOptions } from "@/hooks/useResponseTimeOptions";
import { validateEmail, validateMessage, validateFiles, checkRateLimit, sanitizeText } from "@/lib/security";
import FileUploadSection from "./FileUploadSection";

interface StripeEscrowFormProps {
  userId: string;
  basePrice: number;
  userName?: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export const StripeEscrowForm = ({ userId, basePrice, userName, onSuccess, onError }: StripeEscrowFormProps) => {
  const stripe = useStripe();
  const elements = useElements();

  const [customerEmail, setCustomerEmail] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedResponseTime, setSelectedResponseTime] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  const { options, loading, error } = useResponseTimeOptions(userId);

  // Upload files to Supabase Storage and return public URLs
  const uploadFiles = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) {
      return [];
    }

    try {
      // Create FormData with all files
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });

      // Call upload Edge Function
      const { data, error } = await supabase.functions.invoke('upload-message-attachment', {
        body: formData
      });

      if (error) {
        throw new Error(error.message || 'Failed to upload files');
      }

      if (!data?.success || !data?.urls) {
        throw new Error(data?.error || 'File upload failed');
      }

      console.log(`Successfully uploaded ${data.urls.length} files`);
      return data.urls;

    } catch (error: any) {
      console.error('Error uploading files:', error);
      throw new Error(`Failed to upload attachments: ${error.message}`);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || processing || uploadingFiles) return;

    // Rate limiting check
    if (!checkRateLimit('stripe-payment', 3, 60000)) {
      toast.error('Too many attempts. Please wait before trying again.');
      return;
    }

    // Validate inputs with security checks
    const emailValidation = validateEmail(customerEmail);
    if (!emailValidation.isValid) {
      toast.error(emailValidation.error || 'Invalid email');
      return;
    }

    const messageValidation = validateMessage(message);
    if (!messageValidation.isValid) {
      toast.error(messageValidation.error || 'Invalid message');
      return;
    }

    const fileValidation = validateFiles(attachments);
    if (!fileValidation.isValid) {
      toast.error(`Invalid files: ${fileValidation.errors?.join(', ')}`);
      return;
    }

    if (!selectedResponseTime) {
      toast.error('Please select a response timeframe');
      return;
    }

    setProcessing(true);

    try {
      // 1. Upload files if any
      let uploadedUrls: string[] = [];
      if (attachments.length > 0) {
        setUploadingFiles(true);
        toast.info(`Uploading ${attachments.length} file(s)...`);
        try {
          uploadedUrls = await uploadFiles(attachments);
          setAttachmentUrls(uploadedUrls);
          toast.success(`${uploadedUrls.length} file(s) uploaded successfully`);
        } catch (uploadError: any) {
          toast.error(uploadError.message || 'Failed to upload files');
          setProcessing(false);
          setUploadingFiles(false);
          return;
        }
        setUploadingFiles(false);
      }

      // 2. Create PaymentIntent with escrow
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-stripe-payment', {
        body: {
          price: selectedResponseTime.price,
          responseDeadlineHours: selectedResponseTime.hours,
          userId: userId
        }
      });

      if (paymentError) throw paymentError;

      console.log('Payment data received:', paymentData);
      console.log('Client secret:', paymentData.clientSecret);
      console.log('Payment intent ID:', paymentData.paymentIntentId);

      if (!paymentData?.clientSecret) {
        throw new Error('No client secret received from server');
      }

      // 3. Confirm payment (authorization only, no capture)
      const { error: confirmError } = await stripe.confirmCardPayment(
        paymentData.clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
            billing_details: {
              email: customerEmail
            }
          }
        }
      );

      if (confirmError) throw new Error(confirmError.message);

      // 4. Create message and escrow transaction
      const { error: escrowError } = await supabase.functions.invoke('process-escrow-payment', {
        body: {
          paymentIntentId: paymentData.paymentIntentId,
          messageData: {
            userId,
            senderEmail: sanitizeText(customerEmail),
            content: messageValidation.sanitized || sanitizeText(message),
            price: selectedResponseTime.price,
            responseDeadlineHours: selectedResponseTime.hours,
            attachments: uploadedUrls
          }
        }
      });

      if (escrowError) throw escrowError;

      toast.success('Payment successful! Your message has been sent.');
      onSuccess();

    } catch (err: any) {
      console.error('Payment error:', err);
      toast.error(err.message || 'Payment error');
      onError(err.message || 'Payment error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        <span className="ml-2 text-slate-500 dark:text-slate-400">Loading options...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 p-4 rounded-md border border-red-500/30">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-900 dark:text-slate-100 font-semibold text-sm">Your email <span className="text-green-500">*</span></Label>
        <Input
          id="email"
          type="email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300 placeholder:text-slate-400 focus:border-green-500 font-mono"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          You will receive the response at this address
        </p>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label htmlFor="message" className="text-slate-900 dark:text-slate-100 font-semibold text-sm">Your message <span className="text-green-500">*</span></Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your request in detail..."
          minLength={10}
          rows={4}
          required
          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300 placeholder:text-slate-400 focus:border-green-500"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {message.length}/2000 characters (minimum 10)
        </p>
      </div>

      {/* File Attachments */}
      <FileUploadSection
        attachments={attachments}
        setAttachments={setAttachments}
      />

      {/* Response Time Options */}
      <div className="space-y-3">
        <Label className="text-slate-900 dark:text-slate-100 font-semibold text-sm">Guaranteed response time <span className="text-green-500">*</span></Label>
        <div className="grid gap-0 border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden">
          {options.map((option, index) => {
            const isSelected = selectedResponseTime?.hours === option.hours;
            return (
              <div
                key={option.hours}
                className={`cursor-pointer transition-colors p-4 flex items-center gap-3 ${
                  isSelected
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-500'
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                } ${index > 0 ? 'border-t border-slate-200 dark:border-slate-700' : ''}`}
                onClick={() => setSelectedResponseTime(option)}
              >
                {/* Radio dot */}
                <div className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                  isSelected ? 'border-green-500' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {isSelected && <div className="h-2 w-2 rounded-full bg-green-500" />}
                </div>
                {/* Content */}
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <h3 className={`font-medium text-base ${isSelected ? 'text-green-500' : 'text-slate-900 dark:text-slate-100'}`}>{option.label}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{option.description}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold font-mono ${isSelected ? 'text-green-500' : 'text-slate-900 dark:text-slate-100'}`}>
                      {option.price.toFixed(2)}€
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Guaranteed</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* 75/25 split line */}
        {selectedResponseTime && userName && (
          <p className="font-mono text-xs text-slate-400 dark:text-slate-500 text-center">
            {selectedResponseTime.price.toFixed(2)}€ paid &middot; {(selectedResponseTime.price * 0.75).toFixed(2)}€ to {userName} &middot; {(selectedResponseTime.price * 0.25).toFixed(2)}€ platform fee
          </p>
        )}
        {!selectedResponseTime && (
          <p className="text-xs text-red-400">Select a response time</p>
        )}
      </div>

      {/* Stripe Card Element */}
      <div className="space-y-2">
        <Label className="text-slate-900 dark:text-slate-100 font-semibold text-sm">Payment information <span className="text-green-500">*</span></Label>
        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900 focus-within:border-green-500">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#94a3b8',
                  fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                  '::placeholder': {
                    color: '#94a3b880',
                  },
                },
                invalid: {
                  color: '#ff6b6b',
                },
              },
            }}
          />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Secure payment by Stripe. Your data is protected.
        </p>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full py-6 text-lg bg-green-500 hover:bg-green-400 text-white font-bold transition-colors"
        disabled={!stripe || processing || uploadingFiles || !selectedResponseTime || !customerEmail || !message}
        size="lg"
      >
        {uploadingFiles ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Uploading files...
          </div>
        ) : processing ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Processing payment...
          </div>
        ) : (
          <>Pay {selectedResponseTime?.price?.toFixed(2) || basePrice.toFixed(2)}€ & Send</>
        )}
      </Button>
    </form>
  );
};

export default StripeEscrowForm;
