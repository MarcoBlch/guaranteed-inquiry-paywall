/**
 * Privacy Policy Page
 *
 * Comprehensive GDPR-compliant privacy policy for FastPass.email
 * Covers data collection, usage, cookies, user rights, and third-party services
 */

import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageNav from '@/components/layout/PageNav';
import PageFooter from '@/components/layout/PageFooter';

const Privacy = () => {
  const navigate = useNavigate();

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
            Privacy Policy
          </h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-10">
            Last Updated: February 4, 2026
          </p>

          {/* Intro */}
          <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-10 pb-10 border-b border-slate-100 dark:border-slate-800">
            Welcome to FastPass.email. We are committed to protecting your privacy and ensuring
            transparency about how we collect, use, and safeguard your personal data. This Privacy
            Policy explains our practices in compliance with GDPR and other applicable data protection
            regulations.
          </p>

          <div className="space-y-10">
            {/* Section 1 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                1. Who We Are
              </h2>
              <div className="space-y-4 text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                <p>
                  FastPass.email is an escrow-based pay-to-contact platform that enables recipients to
                  monetize their inbox attention while guaranteeing responses to senders who pay upfront.
                </p>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium text-slate-900 dark:text-slate-200">Service Name:</span> FastPass.email</p>
                  <p>
                    <span className="font-medium text-slate-900 dark:text-slate-200">Contact Email:</span>{' '}
                    <a href="mailto:privacy@fastpass.email" className="text-green-500 hover:underline">privacy@fastpass.email</a>
                  </p>
                  <p><span className="font-medium text-slate-900 dark:text-slate-200">Data Controller:</span> FastPass Team</p>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                2. What Data We Collect
              </h2>
              <div className="space-y-6 text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-200 mb-2">Account Information</h3>
                  <ul className="list-disc list-outside ml-5 space-y-1 text-sm">
                    <li>Email address (required for authentication and communication)</li>
                    <li>Profile information (name, payment preferences, response timeframes)</li>
                    <li>Stripe Connect account details (for recipient payouts)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-200 mb-2">Transaction Data</h3>
                  <ul className="list-disc list-outside ml-5 space-y-1 text-sm">
                    <li>Payment amounts and timestamps</li>
                    <li>Escrow transaction statuses (held, released, refunded)</li>
                    <li>Message metadata (sender email, recipient, deadline, response status)</li>
                    <li><strong className="text-slate-900 dark:text-slate-200">Note:</strong> We do NOT store message bodies for privacy protection</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-200 mb-2">Technical Data</h3>
                  <ul className="list-disc list-outside ml-5 space-y-1 text-sm">
                    <li>IP addresses (for security and fraud prevention)</li>
                    <li>Browser type and device information</li>
                    <li>Authentication tokens (stored securely in cookies)</li>
                    <li>Email delivery logs (via Postmark)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-200 mb-2">Usage Data</h3>
                  <ul className="list-disc list-outside ml-5 space-y-1 text-sm">
                    <li>Dashboard activity and feature usage</li>
                    <li>Response times and fulfillment rates</li>
                    <li>Admin actions (for audit trails)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                3. How We Use Your Data
              </h2>
              <ul className="space-y-3 text-slate-600 dark:text-slate-400 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
                  <span><strong className="text-slate-900 dark:text-slate-200">Service Provision:</strong> Process payments, manage escrow, send messages, detect responses, and distribute payouts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
                  <span><strong className="text-slate-900 dark:text-slate-200">Authentication:</strong> Secure login via Supabase Auth with session management</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
                  <span><strong className="text-slate-900 dark:text-slate-200">Communication:</strong> Send transaction notifications, deadline reminders, and system updates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
                  <span><strong className="text-slate-900 dark:text-slate-200">Security:</strong> Fraud prevention, abuse detection, and audit logging</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
                  <span><strong className="text-slate-900 dark:text-slate-200">Legal Compliance:</strong> Tax reporting (7-year transaction retention), GDPR compliance, dispute resolution</span>
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                4. Cookies and Tracking
              </h2>
              <div className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                <p className="mb-6">
                  We use cookies to provide secure authentication and enhance your experience. You can
                  manage your preferences in{' '}
                  <a href="/cookie-settings" className="text-green-500 hover:underline font-medium">
                    Cookie Settings
                  </a>.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2.5 pr-4 font-medium text-slate-900 dark:text-slate-200">Cookie</th>
                        <th className="text-left py-2.5 pr-4 font-medium text-slate-900 dark:text-slate-200">Purpose</th>
                        <th className="text-left py-2.5 pr-4 font-medium text-slate-900 dark:text-slate-200">Type</th>
                        <th className="text-left py-2.5 font-medium text-slate-900 dark:text-slate-200">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-500 dark:text-slate-400">
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2.5 pr-4 font-mono text-xs">sb-access-token</td>
                        <td className="py-2.5 pr-4">Authentication session</td>
                        <td className="py-2.5 pr-4">
                          <span className="px-1.5 py-0.5 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded text-xs">Essential</span>
                        </td>
                        <td className="py-2.5">1 hour</td>
                      </tr>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2.5 pr-4 font-mono text-xs">sb-refresh-token</td>
                        <td className="py-2.5 pr-4">Session renewal</td>
                        <td className="py-2.5 pr-4">
                          <span className="px-1.5 py-0.5 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded text-xs">Essential</span>
                        </td>
                        <td className="py-2.5">30 days</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-4 font-mono text-xs">cookie-consent</td>
                        <td className="py-2.5 pr-4">Cookie preferences</td>
                        <td className="py-2.5 pr-4">
                          <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded text-xs">Functional</span>
                        </td>
                        <td className="py-2.5">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                5. Third-Party Services
              </h2>
              <div className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                <p className="mb-4">
                  We use trusted third-party services to provide our platform. Each service has its own
                  privacy policy:
                </p>
                <div className="space-y-3">
                  {[
                    { name: 'Supabase', role: 'Backend', desc: 'Database, authentication, and Edge Functions hosting', url: 'https://supabase.com/privacy' },
                    { name: 'Stripe', role: 'Payments', desc: 'Payment processing and Stripe Connect for recipient payouts', url: 'https://stripe.com/privacy' },
                    { name: 'Postmark', role: 'Email', desc: 'Transactional email delivery and inbound email detection', url: 'https://postmarkapp.com/privacy-policy' },
                  ].map(svc => (
                    <div key={svc.name} className="p-4 rounded-md border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                      <p className="font-medium text-slate-900 dark:text-slate-200 text-sm">
                        {svc.name} <span className="font-normal text-slate-400 dark:text-slate-500">({svc.role})</span>
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{svc.desc}</p>
                      <a
                        href={svc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-500 hover:underline text-xs mt-1 inline-block"
                      >
                        View Privacy Policy
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                6. Your Rights Under GDPR
              </h2>
              <div className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                <p className="mb-4">Under GDPR, you have the following rights regarding your personal data:</p>
                <div className="space-y-3 text-sm">
                  {[
                    { title: 'Right to Access', desc: 'Request a copy of all personal data we hold about you' },
                    { title: 'Right to Rectification', desc: 'Correct inaccurate or incomplete data in your profile' },
                    { title: 'Right to Erasure', desc: 'Request deletion of your data (subject to legal retention requirements)' },
                    { title: 'Right to Data Portability', desc: 'Export your data in a machine-readable format (JSON)' },
                    { title: 'Right to Object', desc: 'Object to certain processing activities (e.g., marketing emails)' },
                  ].map(right => (
                    <div key={right.title} className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">&#8594;</span>
                      <div>
                        <span className="font-medium text-slate-900 dark:text-slate-200">{right.title}</span>
                        <span className="text-slate-500 dark:text-slate-400"> — {right.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    To exercise any of these rights, contact us at{' '}
                    <a href="mailto:privacy@fastpass.email" className="text-green-500 hover:underline font-medium">
                      privacy@fastpass.email
                    </a>. We will respond within 30 days.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                7. Data Retention
              </h2>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Message Metadata', period: 'Retained for 90 days after response or expiry' },
                  { label: 'Transaction Records', period: 'Retained for 7 years for tax and legal compliance' },
                  { label: 'Account Data', period: 'Retained until account deletion (can be deleted immediately upon request)' },
                  { label: 'Audit Logs', period: 'Retained for 1 year for security monitoring' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-2">
                    <span className="text-slate-300 dark:text-slate-600 mt-0.5 flex-shrink-0">&#8226;</span>
                    <div>
                      <span className="font-medium text-slate-900 dark:text-slate-200">{item.label}</span>
                      <span className="text-slate-500 dark:text-slate-400"> — {item.period}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                8. Security Measures
              </h2>
              <div className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                <p className="mb-3">We implement industry-standard security measures to protect your data:</p>
                <ul className="list-disc list-outside ml-5 space-y-1 text-sm">
                  <li>End-to-end encryption for all data in transit (HTTPS/TLS)</li>
                  <li>Row Level Security (RLS) policies on all database tables</li>
                  <li>JWT-based authentication with short-lived access tokens</li>
                  <li>Webhook signature verification (Stripe, Postmark)</li>
                  <li>Regular security audits and vulnerability scanning</li>
                  <li>No message body storage (only metadata)</li>
                </ul>
              </div>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                9. Changes to This Policy
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                We may update this Privacy Policy from time to time. Significant changes will be
                communicated via email to registered users. The "Last Updated" date at the top of this
                page will always reflect the most recent revision. Continued use of our service after
                changes constitutes acceptance of the updated policy.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100 mb-4">
                10. Contact Us
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-4">
                If you have questions about this Privacy Policy or wish to exercise your rights:
              </p>
              <div className="space-y-1 text-sm">
                <p className="text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-900 dark:text-slate-200">Email:</span>{' '}
                  <a href="mailto:privacy@fastpass.email" className="text-green-500 hover:underline">privacy@fastpass.email</a>
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-900 dark:text-slate-200">Support:</span>{' '}
                  <a href="mailto:support@fastpass.email" className="text-green-500 hover:underline">support@fastpass.email</a>
                </p>
              </div>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-4">
                We are committed to resolving any concerns and will respond to all requests within 30 days.
              </p>
            </section>
          </div>

          {/* Cookie Settings CTA */}
          <div className="text-center mt-12 pt-10 border-t border-slate-100 dark:border-slate-800">
            <Button
              onClick={() => navigate('/cookie-settings')}
              className="bg-green-500 hover:bg-green-400 text-white font-semibold py-2.5 px-6 rounded-md transition-colors"
            >
              Manage Cookie Preferences
            </Button>
          </div>
        </div>
      </main>

      <PageFooter />
    </div>
  );
};

export default Privacy;
