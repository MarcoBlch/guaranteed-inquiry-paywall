
import React from "react";

interface PriceBreakdownProps {
  price: number;
}

const PriceBreakdown = ({ price }: PriceBreakdownProps) => {
  return (
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
  );
};

export default PriceBreakdown;
