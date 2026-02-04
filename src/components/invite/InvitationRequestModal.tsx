import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, Mail } from "lucide-react";
import { analytics } from "@/lib/analytics";

interface InvitationRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Email validation (matches backend)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const InvitationRequestModal: React.FC<InvitationRequestModalProps> = ({
  open,
  onOpenChange
}) => {
  const navigate = useNavigate();

  // Form state
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Validation state
  const [emailError, setEmailError] = useState('');

  const validateEmail = (value: string): boolean => {
    if (!value) {
      setEmailError('Email is required');
      return false;
    }

    if (!EMAIL_REGEX.test(value.toLowerCase().trim())) {
      setEmailError('Please enter a valid email address');
      return false;
    }

    setEmailError('');
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) {
      setEmailError(''); // Clear error on typing
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    if (!validateEmail(email)) {
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('submit-invitation-request', {
        body: {
          email: email.toLowerCase().trim(),
          request_source: 'landing_page'
        }
      });

      if (error) {
        console.error('Error submitting invitation request:', error);
        toast.error('Failed to submit request. Please try again.');
        return;
      }

      if (data?.success) {
        setSubmitted(true);
        analytics.invitationRequestSubmitted();
        toast.success("Thanks! We'll send you an invitation code soon.");
      } else {
        toast.error(data?.error || 'Failed to submit request.');
      }

    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setEmail('');
    setEmailError('');
    setSubmitted(false);
    onOpenChange(false);
  };

  const handleGoToAuth = () => {
    handleClose();
    navigate('/auth');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/20">
        <DialogHeader>
          <DialogTitle className="text-[#5cffb0] text-2xl font-bold">
            {submitted ? 'Request Received!' : 'Get Your Exclusive Invitation'}
          </DialogTitle>
          <DialogDescription className="text-[#B0B0B0]">
            {submitted
              ? "We'll review your request and send you an invitation code soon."
              : "Fastpass is reserved for selected creators."
            }
          </DialogDescription>
        </DialogHeader>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#5cffb0]">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#B0B0B0]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={handleEmailChange}
                  disabled={loading}
                  className="pl-10 bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0] placeholder:text-[#B0B0B0]/50 focus:border-[#5cffb0]"
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {emailError && (
                <p className="text-red-400 text-sm">{emailError}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold transition-colors duration-300"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Request Invitation'
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#5cffb0]/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#1a1f2e] px-2 text-[#B0B0B0]">
                  Already have a code?
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoToAuth}
              className="w-full border-[#5cffb0]/50 text-[#B0B0B0] bg-transparent hover:bg-[#5cffb0]/10 hover:text-[#5cffb0]"
            >
              Sign Up or Login
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6">
              <CheckCircle className="h-16 w-16 text-[#5cffb0] mb-4" />
              <p className="text-[#B0B0B0] text-center mb-2">
                Check your email inbox for your invitation code.
              </p>
              <p className="text-[#B0B0B0]/70 text-sm text-center">
                It may take a few days during our beta period.
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#5cffb0]/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#1a1f2e] px-2 text-[#B0B0B0]">
                  Already have a code?
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGoToAuth}
              className="w-full bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold transition-colors duration-300"
            >
              Sign Up or Login
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InvitationRequestModal;
