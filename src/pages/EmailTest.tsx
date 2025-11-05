import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FastPassLogo } from '@/components/ui/FastPassLogo';

const EmailTest = () => {
  const [testData, setTestData] = useState({
    senderEmail: 'test-sender@example.com',
    senderMessage: 'Hello! This is a test message from the new email system. I want to see how the template looks when received via email.',
    responseDeadline: '48 hours',
    paymentAmount: 15.00,
    messageId: `test-${Date.now()}`,
    recipientEmail: 'your-email@example.com', // Enter any email address
  });

  const [sending, setSending] = useState(false);

  const handleInputChange = (field: string, value: string | number) => {
    setTestData(prev => ({ ...prev, [field]: value }));
  };

  const sendTestEmail = async () => {
    setSending(true);
    try {
      console.log('Sending test email...', testData);

      const { data, error } = await supabase.functions.invoke('send-message-email', {
        body: testData
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log('Email sent successfully:', data);
      toast.success('Test email sent successfully! Check your inbox.');
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast.error(`Failed to send email: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* StaticBackground component from App.tsx provides the background */}

      <div className="relative z-10 min-h-screen p-4">
        {/* Header */}
        <header className="p-4 text-center mb-8">
          <div className="flex flex-col items-center gap-2">
            <FastPassLogo size="md" />
            <h1 className="text-3xl font-bold text-[#5cffb0] mb-2">Email System Test</h1>
            <p className="text-[#B0B0B0]">Test the FastPass email sending system</p>
          </div>
        </header>

        <div className="max-w-4xl mx-auto">
          <Card className="bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/20">
            <CardHeader>
              <CardTitle className="text-[#5cffb0]">Test Email Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="senderEmail" className="text-[#5cffb0]">Sender Email</Label>
                  <Input
                    id="senderEmail"
                    value={testData.senderEmail}
                    onChange={(e) => handleInputChange('senderEmail', e.target.value)}
                    className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0]"
                  />
                </div>

                <div>
                  <Label htmlFor="recipientEmail" className="text-[#5cffb0]">Recipient Email (Your Email)</Label>
                  <Input
                    id="recipientEmail"
                    value={testData.recipientEmail}
                    onChange={(e) => handleInputChange('recipientEmail', e.target.value)}
                    placeholder="your-email@example.com"
                    className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0]"
                  />
                </div>

                <div>
                  <Label htmlFor="responseDeadline" className="text-[#5cffb0]">Response Deadline</Label>
                  <Input
                    id="responseDeadline"
                    value={testData.responseDeadline}
                    onChange={(e) => handleInputChange('responseDeadline', e.target.value)}
                    className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0]"
                  />
                </div>

                <div>
                  <Label htmlFor="paymentAmount" className="text-[#5cffb0]">Payment Amount (€)</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    value={testData.paymentAmount}
                    onChange={(e) => handleInputChange('paymentAmount', parseFloat(e.target.value) || 0)}
                    className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0]"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="senderMessage" className="text-[#5cffb0]">Test Message</Label>
                <Textarea
                  id="senderMessage"
                  value={testData.senderMessage}
                  onChange={(e) => handleInputChange('senderMessage', e.target.value)}
                  rows={6}
                  className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0]"
                />
              </div>

              <div className="bg-[#5cffb0]/10 border border-[#5cffb0]/30 rounded-lg p-4">
                <h3 className="font-medium text-[#5cffb0] mb-2">✅ Email System Ready:</h3>
                <ul className="text-sm text-[#B0B0B0] space-y-1">
                  <li>• fastpass.email domain is verified and ready</li>
                  <li>• You can send emails to any recipient address</li>
                  <li>• Check spam folder if you don't see the email</li>
                  <li>• This sends real emails using the production template</li>
                </ul>
              </div>

              <Button
                onClick={sendTestEmail}
                disabled={sending || !testData.recipientEmail.includes('@')}
                className="w-full bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold transition-all duration-300"
                size="lg"
              >
                {sending ? 'Sending Email...' : 'Send Test Email'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmailTest;
