
import React from 'react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
}

const MessageInput = ({ value, onChange }: MessageInputProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const words = e.target.value.split(/\s+/);
    if (words.length <= 250) {
      onChange(e.target.value);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="message">Your Message (up to 250 words)</Label>
      <Textarea
        id="message"
        placeholder="Write your message here..."
        value={value}
        onChange={handleChange}
        className="min-h-32"
        required
      />
      <p className="text-sm text-right text-muted-foreground">
        {value.split(/\s+/).filter(Boolean).length}/250 words
      </p>
    </div>
  );
};

export default MessageInput;
