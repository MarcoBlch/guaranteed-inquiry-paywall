
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';
import { usePageViewTracking } from '@/hooks/usePageViewTracking';
import { useSEO } from '@/hooks/useSEO';
import { InvitationRequestModal } from "@/components/invite/InvitationRequestModal";
import { analytics } from "@/lib/analytics";
import PageNav from '@/components/layout/PageNav';
import PageFooter from '@/components/layout/PageFooter';

const faqItems = [
  {
    question: 'What exactly is a FastPass and why should I register?',
    answer: 'A FastPass lets your audience skip the line to reach you directly. They buy a pass, send you a message, and get a guaranteed reply within 24 hours. It is how creators, founders and experts stay available, without giving away their time.',
  },
  {
    question: 'How do I create my own FastPass link?',
    answer: 'It takes just a few minutes to become a member. Sign up, customize your profile, set your pricing per response (you can even offer different tiers for standard vs. urgent replies), and publish your unique FastPass link. You can then share it on your website, LinkedIn, X (Twitter), Instagram bio, or anywhere else people try to reach you.',
  },
  {
    question: 'Can I control how much people pay and how fast I need to answer?',
    answer: 'Absolutely. You choose your response price and your timeframe (for example: 24h, 72h, 7 days). This gives you full control: charge more for urgent questions, less for general inquiries or even offer free slots if you wish.',
  },
  {
    question: 'What happens once someone uses my FastPass link to contact me?',
    answer: "You'll get a clear notification. The sender has already paid, so you know they are serious. You then reply directly through your dashboard or email, and once the response is delivered, your payout (minus platform fees) is automatically processed.",
  },
  {
    question: "What happens if I don't answer or my answer isn't accepted?",
    answer: "If you don't reply within the timeframe you set, the sender is refunded and no payout is made. If your reply is not satisfying, the sender can protest using the star-grade system or escalate to our support team. To protect both sides, if your grade is consistently too low, we may temporarily suspend your service. FastPass has a fair-use policy: most members give clear, professional answers and never face issues.",
  },
];

const steps = [
  { num: '01', title: 'Set Your Price', desc: 'Decide how much your time is worth and choose your response timeframe.' },
  { num: '02', title: 'Share Your Link', desc: 'Promote your unique FastPass link on your website, socials, or anywhere people try to reach you.' },
  { num: '03', title: 'Answer & Get Paid', desc: 'Reply within your timeframe and automatically earn 75% of the payment.' },
];

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
        mainEntity: faqItems.map(item => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
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
        setInviteOnlyMode(true);
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
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      {/* Nav */}
      <PageNav
        showCTA={authChecked && !isAuthenticated}
        ctaLabel="Get your invitation"
        onCTAClick={handleCTAClick}
      />

      {/* Hero */}
      <section className="px-4 sm:px-6 pt-20 sm:pt-28 pb-16 sm:pb-20 text-center max-w-3xl mx-auto">
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-slate-900 dark:text-slate-100 leading-[1.1] mb-6">
          Create priority access<br />to your inbox
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg sm:text-xl max-w-xl mx-auto mb-8 leading-relaxed">
          The pay-to-reach platform for creators, founders and professionals who value their time.
        </p>
        {authChecked && !isAuthenticated && (
          <Button
            className="bg-green-500 hover:bg-green-400 text-white font-semibold py-3 px-8 text-base rounded-md transition-colors"
            onClick={handleCTAClick}
          >
            Get your invitation
          </Button>
        )}
        {authChecked && isAuthenticated && (
          <Button
            className="bg-green-500 hover:bg-green-400 text-white font-semibold py-3 px-8 text-base rounded-md transition-colors"
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </Button>
        )}
      </section>

      {/* How it works */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl text-slate-900 dark:text-slate-100 text-center mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
            {steps.map((step) => (
              <div key={step.num} className="text-center sm:text-left">
                <span className="font-mono text-sm text-green-500 font-semibold">{step.num}</span>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-2 mb-2">
                  {step.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-center">
            <h2 className="font-display text-3xl sm:text-4xl text-slate-900 dark:text-slate-100 mb-4">
              Keep your inbox exclusive
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg leading-relaxed">
              No spam, no wasted time. With FastPass, you decide who gets priority access to your inbox and you get paid for your attention. Value your time while respecting your audience — when they pay, you commit to delivering a clear and timely answer.
            </p>
          </div>
          <div className="text-center">
            <h2 className="font-display text-3xl sm:text-4xl text-slate-900 dark:text-slate-100 mb-4">
              Stay connected to your audience
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg leading-relaxed">
              FastPass lets you stay close to your community while protecting your time. Engage with intention and reward meaningful interactions. Join a growing movement of professionals who make every connection count.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-md mx-auto text-center">
          {isAuthenticated ? (
            <>
              <h2 className="font-display text-2xl sm:text-3xl text-slate-900 dark:text-slate-100 mb-4">Welcome back!</h2>
              <Button
                className="w-full bg-green-500 hover:bg-green-400 text-white font-semibold py-3 text-base rounded-md transition-colors"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl sm:text-3xl text-slate-900 dark:text-slate-100 mb-3">Ready to get started?</h2>
              <p className="text-slate-500 dark:text-slate-400 text-base mb-6">
                Join professionals who are monetizing their time and expertise.
              </p>
              <Button
                className="w-full bg-green-500 hover:bg-green-400 text-white font-semibold py-3 text-base rounded-md transition-colors"
                onClick={handleCTAClick}
              >
                Get your invitation
              </Button>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                Free to join · No setup fees · 75% revenue share
              </p>
            </>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl text-slate-900 dark:text-slate-100 text-center mb-12">
            Frequently asked questions
          </h2>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {faqItems.map((item, i) => (
              <div key={i} className="py-6">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {item.question}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <PageFooter />

      {/* Invitation Request Modal */}
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
