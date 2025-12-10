
import React, { useState } from 'react';
import { toast } from "sonner";
import FileUploadSection from "./FileUploadSection";
import EmailInput from "./EmailInput";
import MessageInput from "./MessageInput";
import PaymentErrorMessage from "./PaymentErrorMessage";
import ProcessingIndicator from "./ProcessingIndicator";
import ResponseTimeSelector from "./ResponseTimeSelector";
import StripePaymentForm from "./StripePaymentForm";
import { useResponseTimeOptions } from "@/hooks/useResponseTimeOptions";
import { supabase } from "@/integrations/supabase/client";
import { validateEmail, validateMessage, validateFiles, checkRateLimit } from "@/lib/security";

interface PaymentFormProps {
  userId: string;
  price: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}

interface ResponseTimeOption {
  hours: 24 | 48 | 72;
  price: number;
  label: string;
  description: string;
}

const PaymentForm = ({ userId, price, onSuccess, onError }: PaymentFormProps) => {
  const [customerEmail, setCustomerEmail] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [selectedResponseTime, setSelectedResponseTime] = useState<ResponseTimeOption | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | null>(null);

  const { options, loading, error } = useResponseTimeOptions(userId);

  const handleContinueToPayment = async () => {
    // Rate limiting check
    if (!checkRateLimit('payment-form', 3, 60000)) {
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
      toast.error('Please choose a response timeframe');
      return;
    }

    // Upload files if any
    if (attachments.length > 0) {
      setUploadingFiles(true);
      try {
        toast.info(`Uploading ${attachments.length} file(s)...`);
        const urls = await uploadFiles(attachments);
        setAttachmentUrls(urls);
        toast.success(`${urls.length} file(s) uploaded successfully`);
      } catch (error: any) {
        toast.error(error.message || 'Failed to upload files');
        setUploadingFiles(false);
        return;
      }
      setUploadingFiles(false);
    }

    setShowPayment(true);
  };

  const handlePaymentMethodSelect = (method: 'stripe') => {
    setPaymentMethod(method);
  };

  const handlePaymentSuccess = () => {
    setSubmitting(false);
    onSuccess();
  };

  const handlePaymentError = (error: string) => {
    setSubmitting(false);
    setPaymentError(error);
    onError(error);
  };

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

  if (loading) {
    return <ProcessingIndicator />;
  }

  if (error) {
    return <PaymentErrorMessage error={error} />;
  }

  // State for uploaded attachment URLs
  const [attachmentUrls, setAttachmentUrls] = React.useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = React.useState(false);

  const paymentData = {
    userId,
    price: selectedResponseTime?.price || price,
    responseDeadlineHours: selectedResponseTime?.hours || 24,
    senderEmail: customerEmail,
    content: message,
    attachments: attachmentUrls
  };

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      {paymentError && <PaymentErrorMessage error={paymentError} />}

      {!showPayment ? (
        <>
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

          <ResponseTimeSelector
            options={options}
            selectedOption={selectedResponseTime}
            onSelect={setSelectedResponseTime}
          />

          <button
            type="button"
            onClick={handleContinueToPayment}
            disabled={!customerEmail || message.length < 5 || !selectedResponseTime || uploadingFiles}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadingFiles ? (
              <>Uploading files...</>
            ) : (
              <>Continue to payment ({selectedResponseTime?.price.toFixed(2) || price.toFixed(2)}€)</>
            )}
          </button>
          
          {/* Debug info - Remove after test */}
          <div className="text-xs text-gray-500 mt-2">
            Debug: Email={customerEmail ? 'OK' : 'MISSING'}, Message={message.length}chars, Time={selectedResponseTime ? 'OK' : 'MISSING'}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Summary</h3>
            <div className="text-sm space-y-1">
              <div><strong>Response time:</strong> {selectedResponseTime?.label}</div>
              <div><strong>Price:</strong> {selectedResponseTime?.price.toFixed(2)}€</div>
              <div><strong>Email:</strong> {customerEmail}</div>
              {attachmentUrls.length > 0 && (
                <div><strong>Attachments:</strong> {attachmentUrls.length} file(s)</div>
              )}
            </div>
          </div>

          <StripePaymentForm
            paymentData={paymentData}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />

          <button
            type="button"
            onClick={() => {
              setShowPayment(false);
              setPaymentMethod(null);
            }}
            className="w-full text-gray-600 py-2 hover:text-gray-800"
          >
            ← Back to details
          </button>
        </div>
      )}

      {submitting && <ProcessingIndicator />}
    </form>
  );
};

export default PaymentForm;
