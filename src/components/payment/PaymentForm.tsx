
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

  const handleContinueToPayment = () => {
    // Rate limiting check
    if (!checkRateLimit('payment-form', 3, 60000)) {
      toast.error('Trop de tentatives. Veuillez attendre avant de réessayer.');
      return;
    }

    // Validate inputs with security checks
    const emailValidation = validateEmail(customerEmail);
    if (!emailValidation.isValid) {
      toast.error(emailValidation.error || 'Email invalide');
      return;
    }

    const messageValidation = validateMessage(message);
    if (!messageValidation.isValid) {
      toast.error(messageValidation.error || 'Message invalide');
      return;
    }

    const fileValidation = validateFiles(attachments);
    if (!fileValidation.isValid) {
      toast.error(`Fichiers invalides: ${fileValidation.errors?.join(', ')}`);
      return;
    }

    if (!selectedResponseTime) {
      toast.error('Veuillez choisir un délai de réponse');
      return;
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

  if (loading) {
    return <ProcessingIndicator />;
  }

  if (error) {
    return <PaymentErrorMessage error={error} />;
  }

  const paymentData = {
    userId,
    price: selectedResponseTime?.price || price,
    responseDeadlineHours: selectedResponseTime?.hours || 24,
    senderEmail: customerEmail,
    content: message,
    attachments: [] // TODO: Upload files to storage first
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
            disabled={!customerEmail || message.length < 5 || !selectedResponseTime}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to payment ({selectedResponseTime?.price.toFixed(2) || price.toFixed(2)}€)
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
            ← Retour aux détails
          </button>
        </div>
      )}

      {submitting && <ProcessingIndicator />}
    </form>
  );
};

export default PaymentForm;
