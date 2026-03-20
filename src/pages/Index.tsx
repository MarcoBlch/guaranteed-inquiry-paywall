
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

/* ─── Tension Strip items (duplicated for seamless loop) ─── */
const tensionItems = [
  '91% of cold emails ignored',
  '4.2s avg. email attention',
  '$5 changes everything',
  '75% goes to you',
  '100% refund if no reply',
];

const PaywallPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [invitationModalOpen, setInvitationModalOpen] = useState(false);
  const [inviteOnlyMode, setInviteOnlyMode] = useState<boolean | null>(null);
  const navigate = useNavigate();

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
      {/* ── Nav ── */}
      <PageNav
        links={[
          { label: 'How it works', href: '#how' },
          { label: 'Pricing', href: '#pricing' },
          { label: 'Log in', href: '/auth' },
        ]}
        showCTA={authChecked && !isAuthenticated}
        ctaLabel="Get your invitation"
        onCTAClick={handleCTAClick}
      />

      {/* ══════════════════════════════════════════════════════
          HERO
         ══════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 pt-20 sm:pt-28 pb-16 sm:pb-20 text-center max-w-3xl mx-auto">
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-slate-900 dark:text-slate-100 leading-[1.1] mb-6">
          Everyone wants your attention.<br />Make them prove it.
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg sm:text-xl max-w-xl mx-auto mb-8 leading-relaxed">
          FastPass is a pay-to-reach platform for creators, founders and professionals. Senders pay upfront for a guaranteed response — or they get a full refund.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
          {authChecked && !isAuthenticated && (
            <Button
              className="bg-green-500 hover:bg-green-400 text-white font-semibold py-3 px-8 text-base rounded-md transition-colors"
              onClick={handleCTAClick}
            >
              Get your invitation&nbsp;&rarr;
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
          <Button
            variant="ghost"
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-sm"
            onClick={() => document.querySelector('#demo')?.scrollIntoView({ behavior: 'smooth' })}
          >
            See the sender experience
          </Button>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500">
          Stripe-secured&nbsp;&middot;&nbsp;USD, EUR, GBP&nbsp;&middot;&nbsp;2 min setup&nbsp;&middot;&nbsp;Free to create
        </p>
      </section>

      {/* ══════════════════════════════════════════════════════
          TENSION STRIP
         ══════════════════════════════════════════════════════ */}
      <div className="border-y border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 overflow-hidden py-3">
        <div className="flex animate-scroll whitespace-nowrap">
          {[...tensionItems, ...tensionItems].map((item, i) => (
            <span
              key={i}
              className="font-mono text-xs text-slate-500 dark:text-slate-400 mx-6 sm:mx-10 shrink-0"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          PROBLEM – "Your inbox is broken"
         ══════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl text-slate-900 dark:text-slate-100 text-center mb-12">
            Your inbox is broken
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="font-mono text-3xl font-bold text-red-500">347</span>
              <p className="text-slate-900 dark:text-slate-100 font-semibold mt-2">Recruiter emails per month</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">0 worth your time</p>
            </div>
            {/* Card 2 */}
            <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="font-mono text-3xl font-bold text-red-500">23</span>
              <p className="text-slate-900 dark:text-slate-100 font-semibold mt-2">"Quick question" DMs</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Still unanswered</p>
            </div>
            {/* Card 3 */}
            <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="font-mono text-3xl font-bold text-green-500">1</span>
              <p className="text-slate-900 dark:text-slate-100 font-semibold mt-2">Genuine message</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Buried under everything else</p>
            </div>
            {/* Punch card */}
            <div className="p-6 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30">
              <p className="font-mono text-sm text-green-600 dark:text-green-400 font-semibold">
                A $5 price tag separates signal from noise.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          HOW IT WORKS
         ══════════════════════════════════════════════════════ */}
      <section id="how" className="scroll-mt-16 px-4 sm:px-6 py-16 sm:py-20 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl text-slate-900 dark:text-slate-100 text-center mb-12">
            How it works
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {/* Step 01 */}
            <div>
              <span className="font-mono text-sm text-green-500 font-semibold">01</span>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-2 mb-2">
                Set your price and deadline
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-3">
                Choose between $1–$100 per response and set a reply window of 24–72 hours. You keep 75% of every payment.
              </p>
              <span className="inline-block font-mono text-xs bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 px-2 py-1 rounded">
                $10&nbsp;&middot;&nbsp;24h&nbsp;&middot;&nbsp;$7.50 for you
              </span>
            </div>
            {/* Step 02 */}
            <div>
              <span className="font-mono text-sm text-green-500 font-semibold">02</span>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-2 mb-2">
                Share your FastPass link
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-3">
                Add it to your bio, email signature, website — anywhere people try to reach you.
              </p>
              <span className="inline-block font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                fastpass.email/you
              </span>
            </div>
            {/* Step 03 */}
            <div>
              <span className="font-mono text-sm text-green-500 font-semibold">03</span>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-2 mb-2">
                Respond and earn. Or don't.
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-3">
                Reply within your window and get paid automatically. Miss the deadline? The sender is refunded. No penalty.
              </p>
              <span className="inline-block font-mono text-xs bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 px-2 py-1 rounded">
                75% payout&nbsp;&middot;&nbsp;automatic
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          BOTH SIDES – "What they see. What you see."
         ══════════════════════════════════════════════════════ */}
      <section id="demo" className="scroll-mt-16 px-4 sm:px-6 py-16 sm:py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl text-slate-900 dark:text-slate-100 text-center mb-4">
            What they see. What you see.
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-12 max-w-lg mx-auto">
            The sender gets a clean pay page. You get a dashboard that pays you.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* ── Sender side ── */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6">
              <p className="font-mono text-xs text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-wider">Sender view</p>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Sarah Reynolds</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <span className="text-yellow-500">&#9733;&#9733;&#9733;&#9733;&#9734;</span>&nbsp;4.8
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-5">
                {[
                  { time: '24h', price: '$150' },
                  { time: '48h', price: '$120' },
                  { time: '72h', price: '$100' },
                ].map((tier) => (
                  <div
                    key={tier.time}
                    className="flex items-center justify-between px-3 py-2 rounded border border-slate-100 dark:border-slate-800 text-sm"
                  >
                    <span className="text-slate-600 dark:text-slate-300 font-mono">{tier.time}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{tier.price}</span>
                  </div>
                ))}
              </div>

              <div className="bg-green-500 text-white text-center py-2.5 rounded-md text-sm font-semibold">
                Pay $120 &amp; Send&nbsp;&rarr;
              </div>
            </div>

            {/* ── Receiver side ── */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6">
              <p className="font-mono text-xs text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-wider">Your dashboard</p>

              <div className="mb-5">
                <p className="text-xs text-slate-400 dark:text-slate-500">Total earnings</p>
                <p className="font-mono text-2xl font-bold text-green-500">$1,247.50</p>
              </div>

              <div className="space-y-2">
                {[
                  { from: 'Alex M.', subject: 'Partnership opportunity', amount: '$25', timeLeft: '18h left' },
                  { from: 'Jordan K.', subject: 'Technical question', amount: '$10', timeLeft: '6h left' },
                  { from: 'Taylor S.', subject: 'Hiring inquiry', amount: '$50', timeLeft: '42h left' },
                ].map((msg) => (
                  <div
                    key={msg.from}
                    className="flex items-center justify-between px-3 py-2 rounded border border-slate-100 dark:border-slate-800 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-900 dark:text-slate-100 font-medium truncate">{msg.from}</p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs truncate">{msg.subject}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-mono text-green-500 font-semibold text-sm">{msg.amount}</p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs">{msg.timeLeft}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          RATING SYSTEM
         ══════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl text-slate-900 dark:text-slate-100 text-center mb-4">
            Every response gets rated.
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-12 max-w-lg mx-auto">
            Transparency builds trust. Senders see your track record before they pay.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-6 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">&#9733; 4.8</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Public rating</p>
            </div>
            <div className="text-center p-6 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">97%</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Response rate</p>
            </div>
            <div className="text-center p-6 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">4.2h</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Avg. response time</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          REFUND MECHANIC
         ══════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl text-slate-900 dark:text-slate-100 text-center mb-4">
            Nobody risks anything.
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-12 max-w-lg mx-auto">
            The escrow model protects both sides. Money moves only when value is delivered.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* If you respond */}
            <div className="p-6 rounded-lg border border-green-200 dark:border-green-900 bg-white dark:bg-slate-950">
              <p className="font-mono text-xs text-green-500 uppercase tracking-wider mb-4">If you respond</p>
              <div className="space-y-3 text-sm">
                <p className="text-slate-600 dark:text-slate-300">
                  Sender pays <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">$20</span>
                </p>
                <p className="text-slate-400 dark:text-slate-500">&darr;</p>
                <p className="text-slate-600 dark:text-slate-300">
                  You reply within deadline
                </p>
                <p className="text-slate-400 dark:text-slate-500">&darr;</p>
                <p className="text-slate-600 dark:text-slate-300">
                  You receive <span className="font-mono font-semibold text-green-500">$15</span> &middot; Platform keeps <span className="font-mono text-slate-500">$5</span>
                </p>
              </div>
            </div>

            {/* If you don't */}
            <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <p className="font-mono text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">If you don't</p>
              <div className="space-y-3 text-sm">
                <p className="text-slate-600 dark:text-slate-300">
                  Sender pays <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">$20</span>
                </p>
                <p className="text-slate-400 dark:text-slate-500">&darr;</p>
                <p className="text-slate-600 dark:text-slate-300">
                  Deadline expires
                </p>
                <p className="text-slate-400 dark:text-slate-500">&darr;</p>
                <p className="text-slate-600 dark:text-slate-300">
                  Sender refunded <span className="font-mono font-semibold text-green-500">$20</span> &middot; Automatic
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          WHO IT'S FOR – Personas
         ══════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl text-slate-900 dark:text-slate-100 text-center mb-12">
            Who it's for
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Developer */}
            <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="font-mono text-xs text-green-500 font-semibold mb-3">Developer</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4">
                347 recruiter emails per month. Zero worth your time — until they put $10 behind it.
              </p>
              <div className="space-y-1 text-xs font-mono text-slate-600 dark:text-slate-300">
                <p>$10&nbsp;&middot;&nbsp;24h deadline</p>
                <p className="text-green-500">Avg. $187/mo earned</p>
              </div>
            </div>

            {/* Creator */}
            <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="font-mono text-xs text-green-500 font-semibold mb-3">Creator</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4">
                2,400 DMs, 90% "collab?" — a $5 filter shows who's serious.
              </p>
              <div className="space-y-1 text-xs font-mono text-slate-600 dark:text-slate-300">
                <p>$5&nbsp;&middot;&nbsp;48h deadline</p>
                <p className="text-green-500">Avg. $340/mo earned</p>
              </div>
            </div>

            {/* Founder */}
            <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="font-mono text-xs text-green-500 font-semibold mb-3">Founder</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4">
                12 "pick your brain" requests per week. Charge &pound;25 and turn noise into income.
              </p>
              <div className="space-y-1 text-xs font-mono text-slate-600 dark:text-slate-300">
                <p>&pound;25&nbsp;&middot;&nbsp;72h deadline</p>
                <p className="text-green-500">Avg. &pound;420/mo earned</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          PRICING
         ══════════════════════════════════════════════════════ */}
      <section id="pricing" className="scroll-mt-16 px-4 sm:px-6 py-16 sm:py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl text-slate-900 dark:text-slate-100 text-center mb-12">
            Pricing
          </h2>

          <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            {[
              { label: 'Create your FastPass', value: '$0', highlight: true },
              { label: 'Receive & respond', value: '$0', highlight: true },
              { label: 'FastPass commission', value: '25% per payment', highlight: false },
              { label: 'Stripe processing', value: 'Standard Stripe fees', highlight: false },
              { label: 'Currencies supported', value: 'USD, EUR, GBP', highlight: false },
              { label: 'No-response refund', value: 'Automatic · 100%', highlight: true },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-950"
              >
                <span className="text-sm text-slate-600 dark:text-slate-300">{row.label}</span>
                <span className={`text-sm font-mono font-semibold ${row.highlight ? 'text-green-500' : 'text-slate-900 dark:text-slate-100'}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FINAL CTA
         ══════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 border-t border-slate-100 dark:border-slate-800">
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
              <h2 className="font-display text-2xl sm:text-3xl text-slate-900 dark:text-slate-100 mb-3">
                Stop ignoring everyone.<br />Start filtering.
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-base mb-6">
                Create your FastPass in 2 minutes. Free forever — you earn when people pay.
              </p>
              <Button
                className="w-full bg-green-500 hover:bg-green-400 text-white font-semibold py-3 text-base rounded-md transition-colors"
                onClick={handleCTAClick}
              >
                Get your invitation&nbsp;&rarr;
              </Button>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                Free to join&nbsp;&middot;&nbsp;No setup fees&nbsp;&middot;&nbsp;75% revenue share
              </p>
            </>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <PageFooter />

      {/* ── Invitation Request Modal ── */}
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
