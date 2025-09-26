import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Email System Test</h1>
          <p className="text-gray-600">Test the FASTPASS email sending system</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Email Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="senderEmail">Sender Email</Label>
                <Input
                  id="senderEmail"
                  value={testData.senderEmail}
                  onChange={(e) => handleInputChange('senderEmail', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="recipientEmail">Recipient Email (Your Email)</Label>
                <Input
                  id="recipientEmail"
                  value={testData.recipientEmail}
                  onChange={(e) => handleInputChange('recipientEmail', e.target.value)}
                  placeholder="your-email@example.com"
                />
              </div>

              <div>
                <Label htmlFor="responseDeadline">Response Deadline</Label>
                <Input
                  id="responseDeadline"
                  value={testData.responseDeadline}
                  onChange={(e) => handleInputChange('responseDeadline', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="paymentAmount">Payment Amount (€)</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  value={testData.paymentAmount}
                  onChange={(e) => handleInputChange('paymentAmount', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="senderMessage">Test Message</Label>
              <Textarea
                id="senderMessage"
                value={testData.senderMessage}
                onChange={(e) => handleInputChange('senderMessage', e.target.value)}
                rows={6}
              />
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-800 mb-2">✅ Email System Ready:</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• fastpass.email domain is verified and ready</li>
                <li>• You can send emails to any recipient address</li>
                <li>• Check spam folder if you don't see the email</li>
                <li>• This sends real emails using the production template</li>
              </ul>
            </div>

            <Button
              onClick={sendTestEmail}
              disabled={sending || !testData.recipientEmail.includes('@')}
              className="w-full"
              size="lg"
            >
              {sending ? 'Sending Email...' : 'Send Test Email'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailTest;