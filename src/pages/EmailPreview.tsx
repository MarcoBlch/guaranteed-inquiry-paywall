import React, { useState } from 'react';
import { generateMessageEmailTemplate, generateMessageEmailPlainText } from '@/lib/emailTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const EmailPreview = () => {
  const [previewData, setPreviewData] = useState({
    senderEmail: 'entrepreneur@example.com',
    senderMessage: 'Hi! I have an innovative startup idea in the AI space and would love to get your thoughts on the market opportunity. I have a solid technical background and am looking for strategic guidance on go-to-market approach.\n\nWould you be interested in a brief call to discuss potential collaboration or investment opportunities?',
    responseDeadline: '48 hours',
    paymentAmount: 12.00,
    messageId: 'test-123',
  });

  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');

  const handleInputChange = (field: string, value: string | number) => {
    setPreviewData(prev => ({ ...prev, [field]: value }));
  };

  const htmlContent = generateMessageEmailTemplate(previewData);
  const textContent = generateMessageEmailPlainText(previewData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Email Template Preview</h1>
          <p className="text-gray-600">Test the FASTPASS email template design</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Email Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="senderEmail">Sender Email</Label>
                <Input
                  id="senderEmail"
                  value={previewData.senderEmail}
                  onChange={(e) => handleInputChange('senderEmail', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="senderMessage">Sender Message</Label>
                <Textarea
                  id="senderMessage"
                  value={previewData.senderMessage}
                  onChange={(e) => handleInputChange('senderMessage', e.target.value)}
                  rows={6}
                />
              </div>

              <div>
                <Label htmlFor="responseDeadline">Response Deadline</Label>
                <Input
                  id="responseDeadline"
                  value={previewData.responseDeadline}
                  onChange={(e) => handleInputChange('responseDeadline', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="paymentAmount">Payment Amount (€)</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  value={previewData.paymentAmount}
                  onChange={(e) => handleInputChange('paymentAmount', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'html' ? 'default' : 'outline'}
                  onClick={() => setViewMode('html')}
                  className="flex-1"
                >
                  HTML Preview
                </Button>
                <Button
                  variant={viewMode === 'text' ? 'default' : 'outline'}
                  onClick={() => setViewMode('text')}
                  className="flex-1"
                >
                  Plain Text
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Email Preview ({viewMode.toUpperCase()})</CardTitle>
            </CardHeader>
            <CardContent>
              {viewMode === 'html' ? (
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={htmlContent}
                    className="w-full h-96"
                    title="Email Preview"
                    style={{ border: 'none' }}
                  />
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {textContent}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Full Size Preview Button */}
        <div className="mt-6 text-center">
          <Button
            onClick={() => {
              const newWindow = window.open();
              if (newWindow) {
                newWindow.document.write(htmlContent);
                newWindow.document.close();
              }
            }}
          >
            Open Full Size Preview
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmailPreview;