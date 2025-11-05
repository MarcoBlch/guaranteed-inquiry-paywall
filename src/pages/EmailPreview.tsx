import React, { useState } from 'react';
import { generateMessageEmailTemplate, generateMessageEmailPlainText } from '@/lib/emailTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FastPassLogo } from '@/components/ui/FastPassLogo';

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
    <div className="min-h-screen relative overflow-hidden">
      {/* StaticBackground component from App.tsx provides the background */}

      <div className="relative z-10 min-h-screen p-4">
        {/* Header */}
        <header className="p-4 text-center mb-8">
          <div className="flex flex-col items-center gap-2">
            <FastPassLogo size="md" />
            <h1 className="text-3xl font-bold text-[#5cffb0] mb-2">Email Template Preview</h1>
            <p className="text-[#B0B0B0]">Test the FastPass email template design</p>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <Card className="bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/20">
            <CardHeader>
              <CardTitle className="text-[#5cffb0]">Email Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="senderEmail" className="text-[#5cffb0]">Sender Email</Label>
                <Input
                  id="senderEmail"
                  value={previewData.senderEmail}
                  onChange={(e) => handleInputChange('senderEmail', e.target.value)}
                  className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0]"
                />
              </div>

              <div>
                <Label htmlFor="senderMessage" className="text-[#5cffb0]">Sender Message</Label>
                <Textarea
                  id="senderMessage"
                  value={previewData.senderMessage}
                  onChange={(e) => handleInputChange('senderMessage', e.target.value)}
                  rows={6}
                  className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0]"
                />
              </div>

              <div>
                <Label htmlFor="responseDeadline" className="text-[#5cffb0]">Response Deadline</Label>
                <Input
                  id="responseDeadline"
                  value={previewData.responseDeadline}
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
                  value={previewData.paymentAmount}
                  onChange={(e) => handleInputChange('paymentAmount', parseFloat(e.target.value) || 0)}
                  className="bg-[#1a1f2e]/50 border-[#5cffb0]/30 text-[#B0B0B0]"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'html' ? 'default' : 'outline'}
                  onClick={() => setViewMode('html')}
                  className={viewMode === 'html' ? "flex-1 bg-gradient-to-r from-[#5cffb0] to-[#2C424C] text-[#0a0e1a]" : "flex-1 border-[#5cffb0]/50 text-[#5cffb0] bg-transparent"}
                >
                  HTML Preview
                </Button>
                <Button
                  variant={viewMode === 'text' ? 'default' : 'outline'}
                  onClick={() => setViewMode('text')}
                  className={viewMode === 'text' ? "flex-1 bg-gradient-to-r from-[#5cffb0] to-[#2C424C] text-[#0a0e1a]" : "flex-1 border-[#5cffb0]/50 text-[#5cffb0] bg-transparent"}
                >
                  Plain Text
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/20">
            <CardHeader>
              <CardTitle className="text-[#5cffb0]">Email Preview ({viewMode.toUpperCase()})</CardTitle>
            </CardHeader>
            <CardContent>
              {viewMode === 'html' ? (
                <div className="border border-[#5cffb0]/30 rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={htmlContent}
                    className="w-full h-96"
                    title="Email Preview"
                    style={{ border: 'none' }}
                  />
                </div>
              ) : (
                <div className="bg-[#0a0e1a] p-4 rounded-lg border border-[#5cffb0]/30">
                  <pre className="text-sm whitespace-pre-wrap font-mono text-[#B0B0B0]">
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
            className="bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold"
          >
            Open Full Size Preview
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default EmailPreview;