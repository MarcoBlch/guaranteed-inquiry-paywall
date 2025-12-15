import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useResponseTimeOptions } from "@/hooks/useResponseTimeOptions";
import { validateEmail, validateMessage, validateFiles, checkRateLimit, sanitizeText } from "@/lib/security";
import FileUploadSection from "./FileUploadSection";

interface StripeEscrowFormProps {
  userId: string;
  basePrice: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export const StripeEscrowForm = ({ userId, basePrice, onSuccess, onError }: StripeEscrowFormProps) => {
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5cffb0]"></div>
        <span className="ml-2 text-[#B0B0B0]">Loading options...</span>
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
        <Label htmlFor="email" className="text-[#5cffb0]">Your email *</Label>
        <Input
          id="email"
          type="email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0] placeholder:text-[#B0B0B0]/50 focus:border-[#5cffb0]"
        />
        <p className="text-xs text-[#B0B0B0]/70">
          You will receive the response at this address
        </p>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label htmlFor="message" className="text-[#5cffb0]">Your message *</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your request in detail..."
          minLength={10}
          rows={4}
          required
          className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0] placeholder:text-[#B0B0B0]/50 focus:border-[#5cffb0]"
        />
        <p className="text-xs text-[#B0B0B0]/70">
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
        <Label className="text-[#5cffb0]">Guaranteed response time *</Label>
        <div className="grid gap-3">
          {options.map((option) => (
            <Card
              key={option.hours}
              className={`cursor-pointer transition-all border-2 ${
                selectedResponseTime?.hours === option.hours
                  ? 'border-[#5cffb0] bg-[#5cffb0]/10 shadow-[0_0_10px_rgba(92,255,176,0.3)]'
                  : 'border-[#5cffb0]/20 bg-transparent hover:border-[#5cffb0]/40 hover:bg-[#5cffb0]/5'
              }`}
              onClick={() => setSelectedResponseTime(option)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-lg text-[#5cffb0]">{option.label}</h3>
                    <p className="text-sm text-[#B0B0B0]">{option.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-[#5cffb0]">
                      {option.price.toFixed(2)}€
                    </div>
                    <div className="text-xs text-[#B0B0B0]/70">Guaranteed or refunded</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {!selectedResponseTime && (
          <p className="text-xs text-red-400">Select a response time</p>
        )}
      </div>

      {/* Stripe Card Element */}
      <div className="space-y-2">
        <Label className="text-[#5cffb0]">Payment information *</Label>
        <div className="p-4 border-2 border-[#5cffb0]/30 rounded-md bg-[#1a1f2e]/50 focus-within:border-[#5cffb0]">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#B0B0B0',
                  fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                  '::placeholder': {
                    color: '#B0B0B080',
                  },
                },
                invalid: {
                  color: '#ff6b6b',
                },
              },
            }}
          />
        </div>
        <p className="text-xs text-[#B0B0B0]/70">
          Secure payment by Stripe. Your data is protected.
        </p>
      </div>

      {/* Summary */}
      {selectedResponseTime && (
        <div className="bg-[#5cffb0]/10 p-4 rounded-md border border-[#5cffb0]/30">
          <h3 className="font-medium mb-3 text-[#5cffb0]">Summary</h3>
          <div className="text-sm space-y-2 text-[#B0B0B0]">
            <div className="flex justify-between">
              <span>Response time:</span>
              <span className="font-medium text-[#5cffb0]">{selectedResponseTime.label}</span>
            </div>
            <div className="flex justify-between">
              <span>Total price:</span>
              <span className="font-medium text-[#5cffb0]">{selectedResponseTime.price.toFixed(2)}€</span>
            </div>
            <div className="border-t border-[#5cffb0]/30 pt-2 mt-2">
              <div className="flex justify-between text-base font-medium">
                <span>Pay now:</span>
                <span className="text-[#5cffb0] text-lg">{selectedResponseTime.price.toFixed(2)}€</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full py-6 text-lg bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold transition-all duration-300 hover:shadow-[0_0_25px_rgba(92,255,176,0.5)] hover:scale-[1.02]"
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
          `Pay ${selectedResponseTime?.price?.toFixed(2) || basePrice.toFixed(2)}€`
        )}
      </Button>

      {/* Disclaimer */}
      <div className="text-xs text-[#B0B0B0]/70 text-center space-y-1">
        <p>
          ✅ <strong className="text-[#5cffb0]">Guarantee:</strong> Response within deadline or automatic full refund
        </p>
        <p>
          🔒 <strong className="text-[#5cffb0]">Secure:</strong> Payment processed by Stripe, global payment leader
        </p>
      </div>
    </form>
  );
};

export default StripeEscrowForm;