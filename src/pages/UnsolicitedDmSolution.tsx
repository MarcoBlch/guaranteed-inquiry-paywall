/**
 * SEO Landing Page — Solution to Unsolicited DMs
 *
 * Targets search queries like "how to stop unsolicited DMs",
 * "solution to unsolicited messages", "monetize inbox spam", etc.
 * Designed for organic traffic capture with strong internal linking to FastPass.
 */

import { FastPassLogo } from '@/components/ui/FastPassLogo';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';
import { usePageViewTracking } from '@/hooks/usePageViewTracking';

const UnsolicitedDmSolution = () => {
  const navigate = useNavigate();

  usePageViewTracking('/solution-unsolicited-dm');

  useSEO({
    title: 'How to Stop Unsolicited DMs — Turn Inbox Spam Into Income | FastPass',
    description: 'Tired of unsolicited DMs and cold messages flooding your inbox? FastPass is the solution: filter out low-effort outreach by requiring senders to pay for your attention. No response needed = full refund. Take back control of your inbox.',
    keywords: [
      'unsolicited DM solution',
      'stop unsolicited messages',
      'how to stop cold DMs',
      'inbox spam solution',
      'monetize inbox',
      'pay to reach',
      'filter unwanted messages',
      'cold outreach filter',
      'LinkedIn DM spam',
      'Instagram DM spam',
      'creator inbox management',
      'professional inbox filter',
      'paid inbox access',
      'stop spam messages',
      'unsolicited messages solution',
      'DM paywall',
      'inbox monetization tool',
      'get paid for attention',
    ],
    canonicalUrl: 'https://fastpass.email/solution-unsolicited-dm',
    ogImage: 'https://fastpass.email/logo-final-optimized-final.png',
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'How to Stop Unsolicited DMs and Turn Inbox Spam Into Income',
        description: 'A comprehensive guide to solving the unsolicited DM problem using pay-to-reach technology. Learn how creators, founders, and professionals use FastPass to filter low-effort outreach.',
        author: { '@type': 'Organization', name: 'FastPass' },
        publisher: {
          '@type': 'Organization',
          name: 'FastPass',
          logo: { '@type': 'ImageObject', url: 'https://fastpass.email/logo-final-optimized-final.png' },
        },
        datePublished: '2026-03-12',
        dateModified: '2026-03-12',
        mainEntityOfPage: 'https://fastpass.email/solution-unsolicited-dm',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How does FastPass stop unsolicited DMs?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'FastPass creates a pay-to-reach barrier. Anyone who wants to message you must pay upfront. If you do not respond within your chosen timeframe, they get a full refund. This filters out low-effort spam while rewarding genuine engagement.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is FastPass different from blocking or filtering DMs?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Blocking and filtering are reactive and can miss important messages. FastPass is proactive: it lets serious people reach you by putting skin in the game, while automatically refunding those who do not get a response. You earn money for your attention instead of wasting time.',
            },
          },
          {
            '@type': 'Question',
            name: 'Who uses FastPass to manage unsolicited messages?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Creators, founders, executives, consultants, influencers, and any professional who receives more messages than they can handle. Anyone whose time is valuable and who wants to monetize their inbox attention.',
            },
          },
        ],
      },
    ],
  });

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <header className="p-4 sm:p-6 text-center border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col items-center">
            <FastPassLogo size="md" />
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Back Button */}
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="mb-6 text-green-500 hover:text-green-400 hover:bg-green-500/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          {/* Hero */}
          <h1 className="text-green-500 text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
            How to Stop Unsolicited DMs<br />and Turn Them Into Income
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg mb-10 leading-relaxed max-w-3xl">
            Every day, creators, founders and professionals receive dozens of cold messages they never asked for. Blocking is tedious. Ignoring feels wrong. FastPass offers a third way: make senders pay for your attention, and get refunded if you do not reply.
          </p>

          {/* Section 1: The Problem */}
          <section className="mb-10">
            <h2 className="text-green-500 text-2xl sm:text-3xl font-semibold mb-4">
              The Unsolicited DM Problem
            </h2>
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <CardContent className="p-6 sm:p-8 space-y-4">
                <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
                  If you have any kind of public presence, your inbox is a target. Recruiters, salespeople, fans, scammers, and well-meaning strangers all compete for your attention. The result is a cluttered inbox where important messages get buried and your time gets stolen.
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
                  Traditional solutions like blocking, muting, or turning off DMs are blunt instruments. They stop spam but also prevent genuine opportunities from reaching you. You need a smarter filter, one that separates serious outreach from noise.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700">
                    <p className="text-green-500 text-3xl font-bold mb-1">73%</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">of professionals say unsolicited messages waste their time</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700">
                    <p className="text-green-500 text-3xl font-bold mb-1">2h+</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">average daily time spent managing unwanted inbox messages</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700">
                    <p className="text-green-500 text-3xl font-bold mb-1">90%</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">of cold DMs go unanswered regardless</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section 2: The FastPass Solution */}
          <section className="mb-10">
            <h2 className="text-green-500 text-2xl sm:text-3xl font-semibold mb-4">
              The FastPass Solution: Pay-to-Reach
            </h2>
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <CardContent className="p-6 sm:p-8 space-y-6">
                <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
                  FastPass flips the script on unsolicited messages. Instead of blocking everyone, you set a price for your attention. Anyone who genuinely wants to reach you can pay that price and get a <strong className="text-white">guaranteed response</strong>, or a full refund if you do not reply in time.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-lg flex-shrink-0">1</div>
                    <div>
                      <h3 className="text-green-500 text-lg font-semibold mb-1">Set Your Price</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Choose how much your attention is worth. This is the barrier that filters out low-effort outreach.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-lg flex-shrink-0">2</div>
                    <div>
                      <h3 className="text-green-500 text-lg font-semibold mb-1">Share Your FastPass Link</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Put it in your LinkedIn bio, Twitter profile, Instagram, or website. Replace "DM me" with a smarter alternative.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-lg flex-shrink-0">3</div>
                    <div>
                      <h3 className="text-green-500 text-lg font-semibold mb-1">Reply and Earn 75%</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">When you respond, you earn 75% of the payment. If you do not respond, the sender gets a full refund automatically. No risk for either party.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section 3: Who Benefits */}
          <section className="mb-10">
            <h2 className="text-green-500 text-2xl sm:text-3xl font-semibold mb-4">
              Who Benefits from FastPass?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-green-500 text-xl font-semibold mb-3">Creators & Influencers</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                    Hundreds of DMs daily from fans, brands, and spammers. FastPass lets genuine collaborators and fans reach you directly while earning from the attention you already give for free.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-green-500 text-xl font-semibold mb-3">Founders & CEOs</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                    Pitched by vendors, recruiters, and investors every day. FastPass ensures only serious contacts reach your inbox and that every interaction is worth your time.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-green-500 text-xl font-semibold mb-3">Consultants & Experts</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                    People constantly ask for free advice. FastPass puts a fair price on your expertise while giving senders a guaranteed response, so both sides win.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-green-500 text-xl font-semibold mb-3">Journalists & Researchers</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                    Flooded with pitches and tips. FastPass helps prioritize outreach from sources who are serious enough to pay, while automatically filtering noise.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Section 4: How It Compares */}
          <section className="mb-10">
            <h2 className="text-green-500 text-2xl sm:text-3xl font-semibold mb-4">
              FastPass vs. Traditional DM Filters
            </h2>
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <CardContent className="p-6 sm:p-8">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-green-500/30">
                        <th className="text-left py-3 px-4 text-green-500 font-semibold">Feature</th>
                        <th className="text-left py-3 px-4 text-green-500 font-semibold">Block / Mute</th>
                        <th className="text-left py-3 px-4 text-green-500 font-semibold">Filters</th>
                        <th className="text-left py-3 px-4 text-green-500 font-semibold">FastPass</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-500 dark:text-slate-400 text-sm">
                      <tr className="border-b border-green-500/10">
                        <td className="py-3 px-4">Stops spam</td>
                        <td className="py-3 px-4">Partially</td>
                        <td className="py-3 px-4">Partially</td>
                        <td className="py-3 px-4 text-green-500 font-semibold">Yes</td>
                      </tr>
                      <tr className="border-b border-green-500/10">
                        <td className="py-3 px-4">Lets real people through</td>
                        <td className="py-3 px-4">No</td>
                        <td className="py-3 px-4">Sometimes</td>
                        <td className="py-3 px-4 text-green-500 font-semibold">Always</td>
                      </tr>
                      <tr className="border-b border-green-500/10">
                        <td className="py-3 px-4">Earns you money</td>
                        <td className="py-3 px-4">No</td>
                        <td className="py-3 px-4">No</td>
                        <td className="py-3 px-4 text-green-500 font-semibold">75% per reply</td>
                      </tr>
                      <tr className="border-b border-green-500/10">
                        <td className="py-3 px-4">Protects sender</td>
                        <td className="py-3 px-4">No</td>
                        <td className="py-3 px-4">No</td>
                        <td className="py-3 px-4 text-green-500 font-semibold">Full refund guarantee</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4">Setup time</td>
                        <td className="py-3 px-4">Ongoing</td>
                        <td className="py-3 px-4">Ongoing</td>
                        <td className="py-3 px-4 text-green-500 font-semibold">5 minutes</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section 5: FAQ */}
          <section className="mb-10">
            <h2 className="text-green-500 text-2xl sm:text-3xl font-semibold mb-4">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-green-500 text-lg font-semibold mb-2">How does FastPass stop unsolicited DMs?</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
                    FastPass creates a pay-to-reach barrier. Anyone who wants to message you must pay upfront. If you do not respond within your chosen timeframe, they get a full refund. This filters out low-effort spam while rewarding genuine engagement.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-green-500 text-lg font-semibold mb-2">Is this different from blocking or filtering DMs?</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
                    Yes. Blocking and filtering are reactive and can miss important messages. FastPass is proactive: it lets serious people reach you by putting skin in the game, while automatically refunding those who do not get a response. You earn money for your attention instead of wasting time.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-green-500 text-lg font-semibold mb-2">What if someone sends a message I do not want to answer?</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
                    Simply do not reply. The sender gets an automatic full refund when the deadline passes. You are never obligated to respond, and the system handles everything for you.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-green-500 text-lg font-semibold mb-2">How much can I earn?</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
                    You set your own price per response. You receive 75% of every payment you reply to. Some members charge as little as a few euros for casual interactions, while others charge premium rates for expert consultations.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* CTA Section */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 mb-12">
            <CardContent className="p-8 text-center">
              <h2 className="text-green-500 text-2xl sm:text-3xl font-bold mb-4">
                Ready to Take Back Your Inbox?
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg mb-6 leading-relaxed max-w-xl mx-auto">
                Stop wasting time on unsolicited messages. Set your price, share your link, and start earning from the attention you already give away for free.
              </p>
              <Button
                onClick={() => navigate('/')}
                className="bg-green-500 hover:bg-green-400 text-white font-bold py-4 px-8 text-lg rounded-md transition-all duration-300 hover:scale-[1.02]"
              >
                Get Started with FastPass
              </Button>
              <p className="text-xs text-slate-500/80 dark:text-slate-400/80 mt-3">Free to join &bull; No setup fees &bull; 75% revenue share</p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="text-center py-6 text-white/60 text-sm border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <a href="/privacy" className="text-green-500 hover:text-green-400 hover:underline transition-colors">Privacy Policy</a>
            <span className="hidden sm:inline text-white/40">&bull;</span>
            <a href="/terms" className="text-green-500 hover:text-green-400 hover:underline transition-colors">Terms & Conditions</a>
            <span className="hidden sm:inline text-white/40">&bull;</span>
            <a href="mailto:support@fastpass.email" className="text-green-500 hover:text-green-400 hover:underline transition-colors">Contact Us</a>
          </div>
          <p>&copy; 2026 FastPass &bull; Guaranteed Response Platform</p>
        </footer>
      </div>
    </div>
  );
};

export default UnsolicitedDmSolution;
