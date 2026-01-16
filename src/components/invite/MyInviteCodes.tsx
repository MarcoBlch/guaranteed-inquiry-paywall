import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Twitter, Linkedin, Mail, Gift, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface InviteCode {
  id: string;
  code: string;
  code_type: string;
  is_active: boolean;
  used_by_user_id: string | null;
  used_at: string | null;
  created_at: string;
}

export const MyInviteCodes: React.FC = () => {
  const { user } = useAuth();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchMyCodes();
    }
  }, [user]);

  const fetchMyCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('created_by_user_id', user?.id)
        .eq('code_type', 'referral')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error('Error fetching invite codes:', error);
      toast.error('Failed to load your invite codes');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  const getInviteUrl = (code: string) => {
    return `${window.location.origin}/auth?invite=${code}`;
  };

  const shareOnTwitter = (code: string) => {
    const text = `Join me on FastPass - monetize your inbox with guaranteed email responses! 💰

Use my invite code: ${code}

${getInviteUrl(code)}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareOnLinkedIn = (code: string) => {
    const url = getInviteUrl(code);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareByEmail = (code: string) => {
    const subject = "You're invited to FastPass beta";
    const body = `Hey!

I'm testing FastPass - a platform that lets you monetize your inbox with guaranteed responses.

Here's how it works:
- Set your price and response deadline
- Senders pay upfront (held in escrow)
- You respond, you get paid (75%+ of payment)
- No response = automatic refund

Use my invite code to join: ${code}

Sign up here: ${getInviteUrl(code)}`;

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const usedCount = codes.filter(c => c.used_by_user_id).length;
  const totalCodes = codes.length;

  if (loading) {
    return (
      <Card className="bg-[#1a1f2e]/95 border-[#5cffb0]/20">
        <CardContent className="py-8 text-center">
          <p className="text-[#B0B0B0]">Loading your invite codes...</p>
        </CardContent>
      </Card>
    );
  }

  if (codes.length === 0) {
    return (
      <Card className="bg-[#1a1f2e]/95 border-[#5cffb0]/20">
        <CardContent className="py-8 text-center">
          <Gift className="h-12 w-12 text-[#5cffb0] mx-auto mb-4" />
          <p className="text-[#B0B0B0]">You'll receive invite codes after completing your profile setup.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1a1f2e]/95 border-[#5cffb0]/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[#5cffb0] flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Invite Codes
            </CardTitle>
            <CardDescription className="text-[#B0B0B0]">
              Invite friends and earn 85% revenue share when 3 join!
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={usedCount >= 3 ? 'border-green-500 text-green-500' : 'border-[#5cffb0] text-[#5cffb0]'}
          >
            {usedCount}/{totalCodes} used
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {codes.map((code) => (
          <div
            key={code.id}
            className={`p-4 rounded-lg border ${
              code.used_by_user_id
                ? 'bg-green-900/20 border-green-500/30'
                : 'bg-[#0a0e1a]/50 border-[#5cffb0]/20'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <code className="font-mono text-lg tracking-wider text-white bg-[#0a0e1a] px-3 py-1 rounded">
                  {code.code}
                </code>
                {code.used_by_user_id ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    Used
                  </Badge>
                ) : (
                  <Badge className="bg-[#5cffb0]/20 text-[#5cffb0] border-[#5cffb0]/30">
                    Available
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(code.code)}
                disabled={!!code.used_by_user_id}
                className="text-[#5cffb0] hover:text-white hover:bg-[#5cffb0]/20"
              >
                {copiedCode === code.code ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {!code.used_by_user_id && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => shareOnTwitter(code.code)}
                  className="flex-1 border-[#5cffb0]/30 text-[#B0B0B0] hover:text-[#5cffb0] hover:bg-[#5cffb0]/10"
                >
                  <Twitter className="h-4 w-4 mr-2" />
                  Twitter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => shareOnLinkedIn(code.code)}
                  className="flex-1 border-[#5cffb0]/30 text-[#B0B0B0] hover:text-[#5cffb0] hover:bg-[#5cffb0]/10"
                >
                  <Linkedin className="h-4 w-4 mr-2" />
                  LinkedIn
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => shareByEmail(code.code)}
                  className="flex-1 border-[#5cffb0]/30 text-[#B0B0B0] hover:text-[#5cffb0] hover:bg-[#5cffb0]/10"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              </div>
            )}
          </div>
        ))}

        {usedCount >= 3 && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-green-900/30 to-[#5cffb0]/10 border border-green-500/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-green-400">85% Revenue Share Unlocked!</p>
                <p className="text-sm text-[#B0B0B0]">
                  You now earn 85% on every paid message you receive.
                </p>
              </div>
            </div>
          </div>
        )}

        {usedCount < 3 && (
          <div className="p-4 rounded-lg bg-[#0a0e1a]/50 border border-[#5cffb0]/20">
            <p className="text-sm text-[#B0B0B0]">
              <span className="text-[#5cffb0] font-semibold">{3 - usedCount} more invite{3 - usedCount !== 1 ? 's' : ''}</span> needed
              to unlock <span className="text-[#5cffb0]">85% revenue share</span> (instead of 75%)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MyInviteCodes;
