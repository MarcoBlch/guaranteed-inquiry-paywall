
import React from 'react';
import { PayPalButtons } from "@paypal/react-paypal-js";
import { toast } from "sonner";

interface PaymentSectionProps {
  price: number;
  disabled: boolean;
  onCreateOrder: () => Promise<string>;
  onApprove: (data: any) => Promise<void>;
  onError: (err: any) => void;
}

const PaymentSection = ({
  price,
  disabled,
  onCreateOrder,
  onApprove,
  onError
}: PaymentSectionProps) => {
  return (
    <PayPalButtons
      createOrder={onCreateOrder}
      onApprove={onApprove}
      onError={onError}
      style={{ layout: "horizontal" }}
      disabled={disabled}
    />
  );
};

export default PaymentSection;
