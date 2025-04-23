
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
}

const EmailInput = ({ value, onChange }: EmailInputProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="email">Your Email</Label>
      <Input
        id="email"
        type="email"
        placeholder="Your email for the response"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </div>
  );
};

export default EmailInput;
