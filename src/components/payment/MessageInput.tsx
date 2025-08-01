
import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { validateMessage } from "@/lib/security";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
}

const MessageInput = ({ value, onChange }: MessageInputProps) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      const validation = validateMessage(value);
      setError(validation.isValid ? null : validation.error || null);
    } else {
      setError(null);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Character limit check
    if (newValue.length > 10000) {
      setError('Message trop long (maximum 10 000 caractères)');
      return;
    }

    // Word count check (optional soft limit)
    const words = newValue.split(/\s+/).filter(Boolean);
    if (words.length > 2000) {
      setError('Message trop long (maximum 2000 mots)');
      return;
    }

    onChange(newValue);
  };

  const wordCount = value.split(/\s+/).filter(Boolean).length;
  const charCount = value.length;

  return (
    <div className="space-y-2">
      <Label htmlFor="message">Your Message</Label>
      <Textarea
        id="message"
        placeholder="Write your message here... (minimum 10 characters)"
        value={value}
        onChange={handleChange}
        className={`min-h-32 ${error ? "border-red-500" : ""}`}
        required
        maxLength={10000}
      />
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{wordCount}/2000 words</span>
        <span>{charCount}/10000 characters</span>
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default MessageInput;
