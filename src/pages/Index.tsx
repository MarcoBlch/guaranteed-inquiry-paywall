
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FastPassLogo } from "@/components/ui/FastPassLogo";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';
import { usePageViewTracking } from '@/hooks/usePageViewTracking';
import { useSEO } from '@/hooks/useSEO';
import { InvitationRequestModal } from "@/components/invite/InvitationRequestModal";
import { analytics } from "@/lib/analytics";

const PaywallPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [invitationModalOpen, setInvitationModalOpen] = useState(false);
  const [inviteOnlyMode, setInviteOnlyMode] = useState<boolean | null>(null);
  const navigate = useNavigate();

  // Track page view for analytics
  usePageViewTracking('/');

  useSEO({
    title: 'FastPass – Get Paid to Answer Messages | Monetize Your Inbox',
    description: 'FastPass lets busy professionals get paid to respond to messages. Senders pay upfront for a guaranteed reply — or they get a full refund. Control your inbox. Earn what your time is worth.',
    keywords: ['pay to reach', 'inbox monetization', 'guaranteed response', 'monetize attention', 'paid messages', 'creator economy', 'professional inbox', 'fastpass'],
    canonicalUrl: 'https://fastpass.email/',
    ogImage: 'https://fastpass.email/logo-final-optimized-final.png',
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'FastPass',
        url: 'https://fastpass.email',
        logo: 'https://fastpass.email/logo-final-optimized-final.png',
        description: 'FastPass is a pay-to-reach platform that lets professionals monetize their inbox attention. Senders guarantee a response by paying upfront.',
        contactPoint: { '@type': 'ContactPoint', email: 'support@fastpass.email', contactType: 'customer support' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'FastPass',
        url: 'https://fastpass.email',
        description: 'Get paid to answer messages. Senders pay upfront for a guaranteed reply or a full refund.',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What exactly is a FastPass and why should I register?',
            acceptedAnswer: { '@type': 'Answer', text: 'A FastPass lets your audience skip the line to reach you directly. They buy a pass, send you a message, and get a guaranteed reply within 24 hours. It is how creators, founders and experts stay available, without giving away their time.' },
          },
          {
            '@type': 'Question',
            name: 'How do I create my own FastPass link?',
            acceptedAnswer: { '@type': 'Answer', text: 'It takes just a few minutes to become a member. Sign up, customize your profile, set your pricing per response, and publish your unique FastPass link. You can then share it on your website, LinkedIn, X (Twitter), Instagram bio, or anywhere else people try to reach you.' },
          },
          {
            '@type': 'Question',
            name: 'Can I control how much people pay and how fast I need to answer?',
            acceptedAnswer: { '@type': 'Answer', text: 'Absolutely. You choose your response price and your timeframe (for example: 24h, 72h, 7 days). This gives you full control: charge more for urgent questions, less for general inquiries.' },
          },
          {
            '@type': 'Question',
            name: 'What happens once someone uses my FastPass link to contact me?',
            acceptedAnswer: { '@type': 'Answer', text: "You'll get a clear notification. The sender has already paid, so you know they are serious. You then reply directly through your dashboard or email, and once the response is delivered, your payout (minus platform fees) is automatically processed." },
          },
          {
            '@type': 'Question',
            name: "What happens if I don't answer or my answer isn't accepted?",
            acceptedAnswer: { '@type': 'Answer', text: "If you don't reply within the timeframe you set, the sender is refunded and no payout is made. FastPass has a fair-use policy: most members give clear, professional answers and never face issues." },
          },
        ],
      },
    ],
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setAuthChecked(true);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const checkInviteMode = async () => {
      try {
        const { data } = await supabase.functions.invoke('get-platform-settings');
        setInviteOnlyMode(data?.settings?.invite_only_mode?.enabled ?? true);
      } catch (error) {
        console.error('Error checking invite mode:', error);
        setInviteOnlyMode(true); // Default to true for safety
      }
    };
    checkInviteMode();
  }, []);

  const handleCTAClick = () => {
    if (inviteOnlyMode) {
      setInvitationModalOpen(true);
      analytics.invitationModalOpened();
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 sm:p-6 text-center">
          <div className="flex flex-col items-center">
            <FastPassLogo size="xl" />
            <p className="text-white/80 text-xs sm:text-sm font-medium tracking-wider -mt-16 sm:-mt-20">TIME IS MONEY</p>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center">
          {/* Hero Text */}
          <div className="mb-8 sm:mb-12 max-w-2xl w-full">
            <h1 className="text-green-500 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              CREATE PRIORITY ACCESS<br />TO YOUR INBOX
            </h1>
            <p className="text-slate-400 text-base sm:text-lg md:text-xl font-normal mb-6 sm:mb-8 leading-relaxed px-2">
              The best pay-to-reach service
            </p>
            {/* CTA Button below hero text - Only show for non-authenticated users */}
            {authChecked && !isAuthenticated && (
              <div className="flex justify-center">
                <Button
                  className="bg-green-500 hover:bg-green-400 text-white font-bold py-4 px-8 text-lg rounded-md transition-all duration-300 hover:scale-[1.02]"
                  onClick={handleCTAClick}
                >
                  Get your invitation
                </Button>
              </div>
            )}
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 w-full max-w-4xl mb-8 sm:mb-12">
            <Card className="bg-white dark:bg-slate-900 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-white">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center text-xl sm:text-2xl">
                  💰
                </div>
                <h3 className="font-semibold mb-2 text-lg sm:text-xl text-green-500">Set Your Price</h3>
                <p className="text-slate-400 text-sm sm:text-base font-normal leading-relaxed">Decide how much your time is worth and choose your response timeframe.</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-white">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center text-xl sm:text-2xl">
                  ✉️
                </div>
                <h3 className="font-semibold mb-2 text-lg sm:text-xl text-green-500">Share Your Link</h3>
                <p className="text-slate-400 text-sm sm:text-base font-normal leading-relaxed">Promote your unique FastPass link.</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-white sm:col-span-2 lg:col-span-1">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center text-xl sm:text-2xl">
                  ⚡
                </div>
                <h3 className="font-semibold mb-2 text-lg sm:text-xl text-green-500">Answer & Get Paid</h3>
                <p className="text-slate-400 text-sm sm:text-base font-normal leading-relaxed">Reply fast and automatically earn 75%.</p>
              </CardContent>
            </Card>
          </div>

          {/* Brand Messaging Section */}
          <div className="w-full max-w-3xl mx-4 mb-12 sm:mb-16 space-y-8">
            <h2 className="text-green-500 text-2xl sm:text-3xl font-semibold text-center mb-6">
              Keep your inbox exclusive and rewarding
            </h2>

            <p className="text-slate-400 text-base sm:text-lg font-normal leading-relaxed text-center px-4">
              No spam, no wasted time. With FastPass, you decide who gets priority access to your inbox and you get paid for your attention. Value your time while respecting your audience, when they pay you commit to delivering a clear and timely answer. It is a smarter way to monetize your expertise and guarantee real engagement.
            </p>

            <h2 className="text-green-500 text-2xl sm:text-3xl font-semibold text-center mt-8 mb-4">
              Keep the link with your audience
            </h2>

            <p className="text-slate-400 text-base sm:text-lg font-normal leading-relaxed text-center px-4">
              FastPass lets you stay close to your community while protecting your time. Engage with intention and reward meaningful interactions. Join a growing movement of creators, founders and professionals who value their attention and make every connection count.
            </p>
          </div>

          {/* CTA Section */}
          <Card className="w-full max-w-md mx-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 mb-12 sm:mb-16">
            <CardContent className="p-6 sm:p-8">
              {isAuthenticated ? (
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold text-green-500 mb-4">Welcome back!</h2>
                  <Button
                    className="w-full bg-green-500 hover:bg-green-400 text-white font-bold py-4 px-8 text-lg rounded-md transition-colors duration-300"
                    onClick={() => navigate('/dashboard')}
                  >
                    Go to Dashboard
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold text-green-500 mb-2">Ready to get started?</h2>
                  <p className="text-slate-400 text-lg font-normal mb-6 leading-relaxed">Join professionals who are monetizing their time and expertise</p>
                  <Button
                    className="w-full bg-green-500 hover:bg-green-400 text-white font-bold py-4 px-8 text-lg rounded-md transition-colors duration-300"
                    onClick={handleCTAClick}
                  >
                    Start Earning Today
                  </Button>
                  <p className="text-xs text-slate-500 text-center">Free to join • No setup fees • 75% revenue share</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <div className="w-full max-w-4xl mx-4 mb-12 sm:mb-16">
            <h2 className="text-green-500 text-3xl sm:text-4xl font-semibold text-center mb-10 sm:mb-12">
              FAQ
            </h2>

            {/* FAQ Cards */}
            <div className="space-y-6">
              {/* Q1 */}
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardContent className="p-6 sm:p-8">
                  <div className="mb-4">
                    <h3 className="text-green-500 text-lg sm:text-xl font-semibold mb-3">
                      ❓ Q1: What exactly is a FastPass and why should I register?
                    </h3>
                    <div className="flex items-start gap-3">
                      <span className="text-green-500 text-xl flex-shrink-0">💡</span>
                      <p className="text-slate-400 text-base font-normal leading-relaxed">
                        A FastPass lets your audience skip the line to reach you directly. They buy a pass, send you a message, and get a guaranteed reply within 24 hours. It is how creators, founders and experts stay available, without giving away their time.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Q2 */}
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardContent className="p-6 sm:p-8">
                  <div className="mb-4">
                    <h3 className="text-green-500 text-lg sm:text-xl font-semibold mb-3">
                      ❓ Q2: How do I create my own FastPass link?
                    </h3>
                    <div className="flex items-start gap-3">
                      <span className="text-green-500 text-xl flex-shrink-0">💡</span>
                      <p className="text-slate-400 text-base font-normal leading-relaxed">
                        It takes just a few minutes to become a member. Sign up, customize your profile, set your pricing per response (you can even offer different tiers for standard vs. urgent replies), and publish your unique FastPass link. You can then share it on your website, LinkedIn, X (Twitter), Instagram bio, or anywhere else people try to reach you.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Q3 */}
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardContent className="p-6 sm:p-8">
                  <div className="mb-4">
                    <h3 className="text-green-500 text-lg sm:text-xl font-semibold mb-3">
                      ❓ Q3: Can I control how much people pay and how fast I need to answer?
                    </h3>
                    <div className="flex items-start gap-3">
                      <span className="text-green-500 text-xl flex-shrink-0">💡</span>
                      <p className="text-slate-400 text-base font-normal leading-relaxed">
                        Absolutely. You choose your response price and your timeframe (for example: 24h, 72h, 7 days). This gives you full control: charge more for urgent questions, less for general inquiries or even offer free slots if you wish.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Q4 */}
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardContent className="p-6 sm:p-8">
                  <div className="mb-4">
                    <h3 className="text-green-500 text-lg sm:text-xl font-semibold mb-3">
                      ❓ Q4: What happens once someone uses my FastPass link to contact me?
                    </h3>
                    <div className="flex items-start gap-3">
                      <span className="text-green-500 text-xl flex-shrink-0">💡</span>
                      <p className="text-slate-400 text-base font-normal leading-relaxed">
                        You'll get a clear notification. The sender has already paid, so you know they are serious. You then reply directly through your dashboard or email, and once the response is delivered, your payout (minus platform fees) is automatically processed.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Q5 */}
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardContent className="p-6 sm:p-8">
                  <div className="mb-4">
                    <h3 className="text-green-500 text-lg sm:text-xl font-semibold mb-3">
                      ❓ Q5: What happens if I don't answer or my answer isn't accepted?
                    </h3>
                    <div className="flex items-start gap-3">
                      <span className="text-green-500 text-xl flex-shrink-0">💡</span>
                      <p className="text-slate-400 text-base font-normal leading-relaxed">
                        If you don't reply within the timeframe you set, the sender is refunded and no payout is made. If your reply is not satisfying, the sender can protest using the star-grade system or escalate to our support team. To protect both sides, if your grade is consistently too low, we may temporarily suspend your service. FastPass has a fair-use policy: most members give clear, professional answers and never face issues.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-8 text-white/60 text-sm border-t border-slate-700">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <a
              href="/privacy"
              className="text-green-500 hover:text-green-400 hover:underline transition-colors"
            >
              Privacy Policy
            </a>
            <span className="hidden sm:inline text-white/40">•</span>
            <a
              href="/terms"
              className="text-green-500 hover:text-green-400 hover:underline transition-colors"
            >
              Terms & Conditions
            </a>
            <span className="hidden sm:inline text-white/40">•</span>
            <a
              href="/cookie-settings"
              className="text-green-500 hover:text-green-400 hover:underline transition-colors"
            >
              Cookie Settings
            </a>
            <span className="hidden sm:inline text-white/40">•</span>
            <a
              href="mailto:support@fastpass.email"
              className="text-green-500 hover:text-green-400 hover:underline transition-colors"
            >
              Contact Us
            </a>
          </div>
          <p>© 2026 FastPass • Guaranteed Response Platform</p>
        </footer>
      </div>

      {/* Invitation Request Modal - Only show when invite_only_mode is enabled */}
      {inviteOnlyMode && (
        <InvitationRequestModal
          open={invitationModalOpen}
          onOpenChange={setInvitationModalOpen}
        />
      )}
    </div>
  );
};

export default PaywallPage;
