import React, { useState, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface InviteCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidation: (isValid: boolean, codeDetails?: { code: string; code_type: string; invite_code_id: string }) => void;
  disabled?: boolean;
  className?: string;
}

export const InviteCodeInput: React.FC<InviteCodeInputProps> = ({
  value,
  onChange,
  onValidation,
  disabled = false,
  className
}) => {
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const validateCode = useCallback(async (code: string) => {
    if (!code || code.length < 3) {
      setValidationState('idle');
      setErrorMessage('');
      onValidation(false);
      return;
    }

    setValidationState('validating');
    setErrorMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('validate-invite-code', {
        body: { code: code.toUpperCase().trim() }
      });

      if (error) {
        throw error;
      }

      if (data?.valid) {
        setValidationState('valid');
        setErrorMessage('');
        onValidation(true, {
          code: data.code,
          code_type: data.code_type,
          invite_code_id: data.invite_code_id
        });
      } else {
        setValidationState('invalid');
        setErrorMessage(data?.error || 'Invalid invite code');
        onValidation(false);
      }
    } catch (error) {
      console.error('Error validating invite code:', error);
      setValidationState('invalid');
      setErrorMessage('Failed to validate code');
      onValidation(false);
    }
  }, [onValidation]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    onChange(newValue);

    // Reset validation when typing
    if (validationState !== 'idle') {
      setValidationState('idle');
      setErrorMessage('');
    }
  };

  const handleBlur = () => {
    if (value && value.length >= 3) {
      validateCode(value);
    }
  };

  const getInputBorderClass = () => {
    switch (validationState) {
      case 'valid':
        return 'border-green-500 focus:border-green-500';
      case 'invalid':
        return 'border-red-500 focus:border-red-500';
      default:
        return 'border-[#5cffb0]/30 focus:border-[#5cffb0]';
    }
  };

  const renderValidationIcon = () => {
    switch (validationState) {
      case 'validating':
        return <Loader2 className="h-4 w-4 animate-spin text-[#5cffb0]" />;
      case 'valid':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'invalid':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="inviteCode" className="text-[#5cffb0]">
        Invite Code <span className="text-red-400">*</span>
      </Label>
      <div className="relative">
        <Input
          id="inviteCode"
          type="text"
          placeholder="FP-XXXXXXXX"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          maxLength={20}
          className={cn(
            "bg-[#1a1f2e]/50 text-[#B0B0B0] placeholder:text-[#B0B0B0]/50 pr-10 uppercase tracking-wider font-mono",
            getInputBorderClass()
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {renderValidationIcon()}
        </div>
      </div>
      {errorMessage && (
        <p className="text-red-400 text-sm">{errorMessage}</p>
      )}
      {validationState === 'valid' && (
        <p className="text-green-400 text-sm">Valid invite code!</p>
      )}
    </div>
  );
};

export default InviteCodeInput;
