
import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { validateEmail } from "@/lib/security";

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
}

const EmailInput = ({ value, onChange }: EmailInputProps) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      const validation = validateEmail(value);
      setError(validation.isValid ? null : validation.error || null);
    } else {
      setError(null);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="email">Your Email</Label>
      <Input
        id="email"
        type="email"
        placeholder="Your email for the response"
        value={value}
        onChange={handleChange}
        required
        className={error ? "border-red-500" : ""}
        maxLength={254}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default EmailInput;
