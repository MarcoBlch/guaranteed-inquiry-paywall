/**
 * Terms and Conditions Page
 *
 * Comprehensive terms of service for FastPass.email covering:
 * - Service description and user roles (senders / recipients)
 * - Payment, escrow, refund mechanics
 * - Acceptable use policy
 * - Intellectual property
 * - Limitation of liability
 * - GDPR-aligned data processing references
 */

import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';
import PageNav from '@/components/layout/PageNav';
import PageFooter from '@/components/layout/PageFooter';

const Terms = () => {
  const navigate = useNavigate();

  useSEO({
    title: 'Terms and Conditions | FastPass',
    description: 'Read the terms and conditions governing the use of FastPass.email, the escrow-based pay-to-contact platform for guaranteed email responses.',
    keywords: ['FastPass terms', 'terms of service', 'terms and conditions', 'pay to reach terms'],
    canonicalUrl: 'https://fastpass.email/terms',
  });

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <PageNav />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          {/* Back */}
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="sm"
            className="mb-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </Button>

          {/* Title */}
          <h1 className="font-display text-4xl sm:text-5xl text-slate-900 dark:text-slate-100 mb-2">
            Terms and Conditions
          </h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-10">
            Last Updated: March 12, 2026
          </p>

          {/* Intro */}
          <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-10 pb-10 border-b border-slate-100 dark:border-slate-800">
            Welcome to FastPass.email ("FastPass", "we", "us", "our"). By accessing or using our
            platform, you agree to be bound by these Terms and Conditions ("Terms"). If you do not
            agree to these Terms, please do not use our service. These Terms apply to all users,
            including Senders and Recipients as defined below.
          </p>

          <div className="space-y-10">
            {/* Section 1 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                1. Definitions
              </h2>
              <div className="space-y-3 text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                <p>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">"Sender"</span> — any person who uses
                  FastPass to send a message and makes a payment for a guaranteed response.
                </p>
                <p>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">"Recipient"</span> — any registered
                  user who receives messages through FastPass and earns payouts by responding.
                </p>
                <p>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">"Escrow"</span> — the temporary holding
                  of a Sender's payment until the Recipient responds or the deadline expires.
                </p>
                <p>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">"FastPass Link"</span> — the unique URL
                  assigned to each Recipient through which Senders can initiate contact.
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                2. Service Description
              </h2>
              <div className="space-y-4 text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                <p>
                  FastPass is an escrow-based pay-to-contact platform. Senders pay upfront for a
                  guaranteed email response from a Recipient. Funds are held in escrow until the
                  Recipient responds or the response deadline expires.
                </p>
                <ul className="list-disc list-outside ml-5 space-y-2">
                  <li>If the Recipient responds within the agreed timeframe, the payment is distributed: <strong className="text-slate-900 dark:text-slate-200">75% to the Recipient</strong> and 25% platform fee.</li>
                  <li>If the Recipient does not respond within the deadline (plus a 15-minute grace period), the Sender receives a <strong className="text-slate-900 dark:text-slate-200">full automatic refund</strong>.</li>
                  <li>Recipients set their own price and response timeframe.</li>
                </ul>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                3. Account Registration
              </h2>
              <div className="space-y-4 text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                <p>
                  <strong className="text-slate-900 dark:text-slate-200">Senders</strong> do not need an account. The
                  payment flow is fully anonymous and requires only a valid email address for
                  communication purposes.
                </p>
                <p>
                  <strong className="text-slate-900 dark:text-slate-200">Recipients</strong> must create an account and
                  connect a Stripe Connect account to receive payouts. You are responsible for
                  maintaining the confidentiality of your account credentials and for all activities
                  under your account.
                </p>
                <p>
                  You must be at least 18 years old to use FastPass. By registering, you represent
                  that you are of legal age.
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                4. Payments, Escrow, and Refunds
              </h2>
              <div className="space-y-4 text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                <p>
                  All payments are processed securely through <strong className="text-slate-900 dark:text-slate-200">Stripe</strong>.
                  FastPass does not store credit card information.
                </p>
                <ul className="list-disc list-outside ml-5 space-y-2">
                  <li>Payments are captured immediately and held in escrow.</li>
                  <li>Refunds are processed automatically if the Recipient does not respond within the
                    deadline plus the 15-minute grace period.</li>
                  <li>Refunds are issued to the original payment method and may take 5-10 business days
                    to appear, depending on the Sender's bank.</li>
                  <li>Recipients receive payouts via Stripe Connect. Payout timing depends on the
                    Recipient's Stripe account settings.</li>
                  <li>FastPass retains a 25% platform fee on all successfully completed transactions.</li>
                </ul>
                <p>
                  The revenue share percentage may vary for Recipients on special tier plans. The
                  applicable rate is displayed in the Recipient's dashboard settings.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                5. Acceptable Use Policy
              </h2>
              <div className="space-y-4 text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                <p>You agree not to use FastPass to:</p>
                <ul className="list-disc list-outside ml-5 space-y-2">
                  <li>Send threatening, harassing, defamatory, or illegal content</li>
                  <li>Impersonate another person or misrepresent your identity</li>
                  <li>Send unsolicited bulk messages or use automated tools to spam Recipients</li>
                  <li>Attempt to manipulate the escrow or refund system fraudulently</li>
                  <li>Violate any applicable laws, regulations, or third-party rights</li>
                  <li>Distribute malware, phishing links, or other harmful content</li>
                </ul>
                <p>
                  Recipients agree to provide genuine, professional responses to paid messages. Failure
                  to maintain a reasonable response quality may result in account suspension.
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                6. Intellectual Property
              </h2>
              <div className="space-y-4 text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                <p>
                  The FastPass name, logo, design, and all associated intellectual property are owned
                  by FastPass. You may not use our branding without prior written consent.
                </p>
                <p>
                  Content you send through FastPass (messages, responses) remains your intellectual
                  property. FastPass does not store message bodies and does not claim ownership of
                  your communications.
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                7. Privacy and Data Protection
              </h2>
              <div className="space-y-4 text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                <p>
                  Your use of FastPass is also governed by our{' '}
                  <a href="/privacy" className="text-green-500 hover:underline font-medium">
                    Privacy Policy
                  </a>
                  , which details how we collect, use, and protect your personal data in compliance
                  with GDPR and other applicable regulations.
                </p>
                <p>
                  We do not store the content of messages sent through FastPass. Only metadata
                  (sender email, recipient, timestamps, payment status) is retained for operational
                  and legal purposes.
                </p>
              </div>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                8. Limitation of Liability
              </h2>
              <div className="space-y-4 text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                <p>
                  FastPass is provided "as is" without warranties of any kind, express or implied. To
                  the fullest extent permitted by law:
                </p>
                <ul className="list-disc list-outside ml-5 space-y-2">
                  <li>We are not liable for the content of messages exchanged between Senders and
                    Recipients.</li>
                  <li>We are not liable for delays in payment processing caused by third-party services
                    (Stripe, banks).</li>
                  <li>Our total liability for any claim arising from your use of FastPass shall not
                    exceed the amount you paid to us in the 12 months preceding the claim.</li>
                  <li>We are not liable for indirect, incidental, consequential, or punitive damages.</li>
                </ul>
              </div>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                9. Termination
              </h2>
              <div className="space-y-4 text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                <p>
                  You may close your account at any time by contacting{' '}
                  <a href="mailto:support@fastpass.email" className="text-green-500 hover:underline">
                    support@fastpass.email
                  </a>
                  . Pending transactions will be processed or refunded before account closure.
                </p>
                <p>
                  We reserve the right to suspend or terminate accounts that violate these Terms, with
                  or without notice. In cases of suspension, pending payouts may be withheld pending
                  investigation.
                </p>
              </div>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                10. Governing Law and Disputes
              </h2>
              <div className="space-y-4 text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                <p>
                  These Terms are governed by and construed in accordance with the laws of France. Any
                  dispute arising from or relating to these Terms shall be submitted to the exclusive
                  jurisdiction of the courts of Paris, France.
                </p>
                <p>
                  For EU consumers: you retain the right to bring proceedings in the courts of your
                  country of residence, in accordance with applicable EU consumer protection laws.
                </p>
              </div>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                11. Changes to These Terms
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                We may update these Terms from time to time. Material changes will be communicated
                via email to registered Recipients. The "Last Updated" date at the top of this page
                will always reflect the most recent revision. Continued use of FastPass after changes
                constitutes acceptance of the updated Terms.
              </p>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                12. Contact Us
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-4">
                If you have questions about these Terms, please contact us:
              </p>
              <div className="space-y-1 text-sm">
                <p className="text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-900 dark:text-slate-200">Email:</span>{' '}
                  <a href="mailto:support@fastpass.email" className="text-green-500 hover:underline">
                    support@fastpass.email
                  </a>
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-900 dark:text-slate-200">Privacy inquiries:</span>{' '}
                  <a href="mailto:privacy@fastpass.email" className="text-green-500 hover:underline">
                    privacy@fastpass.email
                  </a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <PageFooter />
    </div>
  );
};

export default Terms;
