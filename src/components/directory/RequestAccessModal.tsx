import React, { useState } from 'react';
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
import { Loader2, CheckCircle, Mail, User } from "lucide-react";

interface RequestAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetName: string;
  targetSlug: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RequestAccessModal: React.FC<RequestAccessModalProps> = ({
  open,
  onOpenChange,
  targetName,
  targetSlug,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');

  const validate = (): boolean => {
    let valid = true;

    if (!name.trim()) {
      setNameError('Full name is required');
      valid = false;
    } else if (name.trim().length > 100) {
      setNameError('Name must be 100 characters or less');
      valid = false;
    } else {
      setNameError('');
    }

    if (!email) {
      setEmailError('Email is required');
      valid = false;
    } else if (!EMAIL_REGEX.test(email.toLowerCase().trim())) {
      setEmailError('Please enter a valid email address');
      valid = false;
    } else {
      setEmailError('');
    }

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('submit-directory-request', {
        body: {
          targetSlug,
          name: name.trim(),
          email: email.toLowerCase().trim(),
        },
      });

      if (error) {
        console.error('Error submitting request:', error);
        toast.error('Failed to submit request. Please try again.');
        return;
      }

      if (data?.success) {
        setSubmitted(true);
        setResponseMessage(data.message || `Thanks! We'll notify you when ${targetName} joins FastPass.`);
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
    setName('');
    setEmail('');
    setNameError('');
    setEmailError('');
    setSubmitted(false);
    setResponseMessage('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-green-500 text-xl font-bold">
            {submitted ? 'Request Submitted!' : `Request Access to ${targetName}`}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            {submitted
              ? responseMessage
              : `Signal demand — we'll invite ${targetName} to join FastPass when enough people request access.`
            }
          </DialogDescription>
        </DialogHeader>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="requester-name" className="text-slate-900 dark:text-slate-100 font-semibold text-sm">
                Full name <span className="text-green-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="requester-name"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(''); }}
                  disabled={loading}
                  maxLength={100}
                  className="pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300 placeholder:text-slate-400 focus:border-green-500"
                  autoFocus
                />
              </div>
              {nameError && <p className="text-red-400 text-sm">{nameError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="requester-email" className="text-slate-900 dark:text-slate-100 font-semibold text-sm">
                Email <span className="text-green-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="requester-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                  disabled={loading}
                  className="pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300 placeholder:text-slate-400 focus:border-green-500"
                  autoComplete="email"
                />
              </div>
              {emailError && <p className="text-red-400 text-sm">{emailError}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-400 text-white font-bold transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Request Access'
              )}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center py-6">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-center text-sm">
              We'll send you an email when {targetName} joins FastPass.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RequestAccessModal;
