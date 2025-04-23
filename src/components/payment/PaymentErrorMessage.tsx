
import React from 'react';

interface PaymentErrorMessageProps {
  error: string;
}

const PaymentErrorMessage = ({ error }: PaymentErrorMessageProps) => {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
      <p className="text-sm font-medium">Payment Error: {error}</p>
      <p className="text-xs mt-1">Please try again or contact support if the problem persists.</p>
    </div>
  );
};

export default PaymentErrorMessage;

