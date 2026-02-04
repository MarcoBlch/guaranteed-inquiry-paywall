/**
 * Privacy Policy Page
 *
 * Comprehensive GDPR-compliant privacy policy for FastPass.email
 * Covers data collection, usage, cookies, user rights, and third-party services
 */

import { FastPassLogo } from '@/components/ui/FastPassLogo';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* StaticBackground component from App.tsx provides the background */}

      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <header className="p-4 sm:p-6 text-center border-b border-[#5cffb0]/20">
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
            className="mb-6 text-[#5cffb0] hover:text-[#4de89d] hover:bg-[#5cffb0]/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          {/* Title */}
          <h1 className="text-[#5cffb0] text-4xl sm:text-5xl font-bold mb-4">
            Privacy Policy
          </h1>
          <p className="text-[#B0B0B0] text-sm mb-8">
            Last Updated: February 4, 2026
          </p>

          {/* Introduction */}
          <Card className="bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/30 shadow-[0_0_20px_rgba(92,255,176,0.2)] mb-8">
            <CardContent className="p-6 sm:p-8">
              <p className="text-[#B0B0B0] text-base leading-relaxed">
                Welcome to FastPass.email. We are committed to protecting your privacy and ensuring
                transparency about how we collect, use, and safeguard your personal data. This Privacy
                Policy explains our practices in compliance with GDPR and other applicable data protection
                regulations.
              </p>
            </CardContent>
          </Card>

          {/* Section 1: Who We Are */}
          <section className="mb-8">
            <h2 className="text-[#5cffb0] text-2xl sm:text-3xl font-semibold mb-4">
              1. Who We Are
            </h2>
            <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
              <CardContent className="p-6 sm:p-8 space-y-4">
                <p className="text-[#B0B0B0] text-base leading-relaxed">
                  FastPass.email is an escrow-based pay-to-contact platform that enables recipients to
                  monetize their inbox attention while guaranteeing responses to senders who pay upfront.
                </p>
                <div className="space-y-2">
                  <p className="text-[#B0B0B0] text-base">
                    <span className="text-[#5cffb0] font-semibold">Service Name:</span> FastPass.email
                  </p>
                  <p className="text-[#B0B0B0] text-base">
                    <span className="text-[#5cffb0] font-semibold">Contact Email:</span>{' '}
                    <a href="mailto:privacy@fastpass.email" className="text-[#5cffb0] hover:underline">
                      privacy@fastpass.email
                    </a>
                  </p>
                  <p className="text-[#B0B0B0] text-base">
                    <span className="text-[#5cffb0] font-semibold">Data Controller:</span> FastPass Team
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section 2: What Data We Collect */}
          <section className="mb-8">
            <h2 className="text-[#5cffb0] text-2xl sm:text-3xl font-semibold mb-4">
              2. What Data We Collect
            </h2>
            <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
              <CardContent className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-[#5cffb0] text-xl font-semibold mb-3">Account Information</h3>
                  <ul className="list-disc list-inside text-[#B0B0B0] text-base space-y-2 ml-4">
                    <li>Email address (required for authentication and communication)</li>
                    <li>Profile information (name, payment preferences, response timeframes)</li>
                    <li>Stripe Connect account details (for recipient payouts)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-[#5cffb0] text-xl font-semibold mb-3">Transaction Data</h3>
                  <ul className="list-disc list-inside text-[#B0B0B0] text-base space-y-2 ml-4">
                    <li>Payment amounts and timestamps</li>
                    <li>Escrow transaction statuses (held, released, refunded)</li>
                    <li>Message metadata (sender email, recipient, deadline, response status)</li>
                    <li>
                      <strong className="text-[#5cffb0]">Note:</strong> We do NOT store message bodies for
                      privacy protection
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-[#5cffb0] text-xl font-semibold mb-3">Technical Data</h3>
                  <ul className="list-disc list-inside text-[#B0B0B0] text-base space-y-2 ml-4">
                    <li>IP addresses (for security and fraud prevention)</li>
                    <li>Browser type and device information</li>
                    <li>Authentication tokens (stored securely in cookies)</li>
                    <li>Email delivery logs (via Postmark)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-[#5cffb0] text-xl font-semibold mb-3">Usage Data</h3>
                  <ul className="list-disc list-inside text-[#B0B0B0] text-base space-y-2 ml-4">
                    <li>Dashboard activity and feature usage</li>
                    <li>Response times and fulfillment rates</li>
                    <li>Admin actions (for audit trails)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section 3: How We Use Your Data */}
          <section className="mb-8">
            <h2 className="text-[#5cffb0] text-2xl sm:text-3xl font-semibold mb-4">
              3. How We Use Your Data
            </h2>
            <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
              <CardContent className="p-6 sm:p-8">
                <ul className="space-y-4 text-[#B0B0B0] text-base">
                  <li className="flex items-start gap-3">
                    <span className="text-[#5cffb0] text-xl flex-shrink-0">✅</span>
                    <div>
                      <strong className="text-[#5cffb0]">Service Provision:</strong> Process payments,
                      manage escrow, send messages, detect responses, and distribute payouts
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#5cffb0] text-xl flex-shrink-0">✅</span>
                    <div>
                      <strong className="text-[#5cffb0]">Authentication:</strong> Secure login via
                      Supabase Auth with session management
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#5cffb0] text-xl flex-shrink-0">✅</span>
                    <div>
                      <strong className="text-[#5cffb0]">Communication:</strong> Send transaction
                      notifications, deadline reminders, and system updates
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#5cffb0] text-xl flex-shrink-0">✅</span>
                    <div>
                      <strong className="text-[#5cffb0]">Security:</strong> Fraud prevention, abuse
                      detection, and audit logging
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#5cffb0] text-xl flex-shrink-0">✅</span>
                    <div>
                      <strong className="text-[#5cffb0]">Legal Compliance:</strong> Tax reporting (7-year
                      transaction retention), GDPR compliance, dispute resolution
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Section 4: Cookies and Tracking */}
          <section className="mb-8">
            <h2 className="text-[#5cffb0] text-2xl sm:text-3xl font-semibold mb-4">
              4. Cookies and Tracking
            </h2>
            <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
              <CardContent className="p-6 sm:p-8">
                <p className="text-[#B0B0B0] text-base leading-relaxed mb-6">
                  We use cookies to provide secure authentication and enhance your experience. You can
                  manage your preferences in{' '}
                  <a href="/cookie-settings" className="text-[#5cffb0] hover:underline font-medium">
                    Cookie Settings
                  </a>
                  .
                </p>

                {/* Cookie Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[#5cffb0]/30">
                        <th className="text-left py-3 px-4 text-[#5cffb0] font-semibold">Cookie Name</th>
                        <th className="text-left py-3 px-4 text-[#5cffb0] font-semibold">Purpose</th>
                        <th className="text-left py-3 px-4 text-[#5cffb0] font-semibold">Type</th>
                        <th className="text-left py-3 px-4 text-[#5cffb0] font-semibold">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#B0B0B0] text-sm">
                      <tr className="border-b border-[#5cffb0]/10">
                        <td className="py-3 px-4 font-mono">sb-access-token</td>
                        <td className="py-3 px-4">Authentication session</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs">
                            Essential
                          </span>
                        </td>
                        <td className="py-3 px-4">1 hour</td>
                      </tr>
                      <tr className="border-b border-[#5cffb0]/10">
                        <td className="py-3 px-4 font-mono">sb-refresh-token</td>
                        <td className="py-3 px-4">Session renewal</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs">
                            Essential
                          </span>
                        </td>
                        <td className="py-3 px-4">30 days</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-mono">cookie-consent</td>
                        <td className="py-3 px-4">Remember your cookie preferences</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                            Functional
                          </span>
                        </td>
                        <td className="py-3 px-4">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section 5: Third-Party Services */}
          <section className="mb-8">
            <h2 className="text-[#5cffb0] text-2xl sm:text-3xl font-semibold mb-4">
              5. Third-Party Services
            </h2>
            <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
              <CardContent className="p-6 sm:p-8 space-y-6">
                <p className="text-[#B0B0B0] text-base leading-relaxed">
                  We use trusted third-party services to provide our platform. Each service has its own
                  privacy policy:
                </p>

                <div className="space-y-4">
                  <div className="p-4 bg-[#0d2626]/50 rounded-lg border border-[#5cffb0]/10">
                    <h3 className="text-[#5cffb0] text-lg font-semibold mb-2">Supabase (Backend)</h3>
                    <p className="text-[#B0B0B0] text-sm mb-2">
                      Database, authentication, and Edge Functions hosting
                    </p>
                    <a
                      href="https://supabase.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#5cffb0] hover:underline text-sm"
                    >
                      View Supabase Privacy Policy →
                    </a>
                  </div>

                  <div className="p-4 bg-[#0d2626]/50 rounded-lg border border-[#5cffb0]/10">
                    <h3 className="text-[#5cffb0] text-lg font-semibold mb-2">Stripe (Payments)</h3>
                    <p className="text-[#B0B0B0] text-sm mb-2">
                      Payment processing and Stripe Connect for recipient payouts
                    </p>
                    <a
                      href="https://stripe.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#5cffb0] hover:underline text-sm"
                    >
                      View Stripe Privacy Policy →
                    </a>
                  </div>

                  <div className="p-4 bg-[#0d2626]/50 rounded-lg border border-[#5cffb0]/10">
                    <h3 className="text-[#5cffb0] text-lg font-semibold mb-2">Postmark (Email)</h3>
                    <p className="text-[#B0B0B0] text-sm mb-2">
                      Transactional email delivery and inbound email detection
                    </p>
                    <a
                      href="https://postmarkapp.com/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#5cffb0] hover:underline text-sm"
                    >
                      View Postmark Privacy Policy →
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section 6: Your Rights (GDPR) */}
          <section className="mb-8">
            <h2 className="text-[#5cffb0] text-2xl sm:text-3xl font-semibold mb-4">
              6. Your Rights Under GDPR
            </h2>
            <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
              <CardContent className="p-6 sm:p-8">
                <p className="text-[#B0B0B0] text-base leading-relaxed mb-6">
                  Under GDPR, you have the following rights regarding your personal data:
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-[#5cffb0] text-2xl flex-shrink-0">🔍</span>
                    <div>
                      <h3 className="text-[#5cffb0] text-lg font-semibold mb-1">Right to Access</h3>
                      <p className="text-[#B0B0B0] text-sm">
                        Request a copy of all personal data we hold about you
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-[#5cffb0] text-2xl flex-shrink-0">✏️</span>
                    <div>
                      <h3 className="text-[#5cffb0] text-lg font-semibold mb-1">Right to Rectification</h3>
                      <p className="text-[#B0B0B0] text-sm">
                        Correct inaccurate or incomplete data in your profile
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-[#5cffb0] text-2xl flex-shrink-0">🗑️</span>
                    <div>
                      <h3 className="text-[#5cffb0] text-lg font-semibold mb-1">Right to Erasure</h3>
                      <p className="text-[#B0B0B0] text-sm">
                        Request deletion of your data (subject to legal retention requirements)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-[#5cffb0] text-2xl flex-shrink-0">📦</span>
                    <div>
                      <h3 className="text-[#5cffb0] text-lg font-semibold mb-1">Right to Data Portability</h3>
                      <p className="text-[#B0B0B0] text-sm">
                        Export your data in a machine-readable format (JSON)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-[#5cffb0] text-2xl flex-shrink-0">🚫</span>
                    <div>
                      <h3 className="text-[#5cffb0] text-lg font-semibold mb-1">Right to Object</h3>
                      <p className="text-[#B0B0B0] text-sm">
                        Object to certain processing activities (e.g., marketing emails)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-[#5cffb0]/10 border border-[#5cffb0]/30 rounded-lg">
                  <p className="text-[#B0B0B0] text-sm">
                    To exercise any of these rights, contact us at{' '}
                    <a
                      href="mailto:privacy@fastpass.email"
                      className="text-[#5cffb0] hover:underline font-medium"
                    >
                      privacy@fastpass.email
                    </a>
                    . We will respond within 30 days.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section 7: Data Retention */}
          <section className="mb-8">
            <h2 className="text-[#5cffb0] text-2xl sm:text-3xl font-semibold mb-4">
              7. Data Retention
            </h2>
            <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
              <CardContent className="p-6 sm:p-8 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-[#5cffb0] text-xl flex-shrink-0">📅</span>
                  <div>
                    <h3 className="text-[#5cffb0] text-lg font-semibold mb-1">Message Metadata</h3>
                    <p className="text-[#B0B0B0] text-sm">Retained for 90 days after response or expiry</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-[#5cffb0] text-xl flex-shrink-0">📅</span>
                  <div>
                    <h3 className="text-[#5cffb0] text-lg font-semibold mb-1">Transaction Records</h3>
                    <p className="text-[#B0B0B0] text-sm">
                      Retained for 7 years for tax and legal compliance
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-[#5cffb0] text-xl flex-shrink-0">📅</span>
                  <div>
                    <h3 className="text-[#5cffb0] text-lg font-semibold mb-1">Account Data</h3>
                    <p className="text-[#B0B0B0] text-sm">
                      Retained until account deletion (can be deleted immediately upon request)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-[#5cffb0] text-xl flex-shrink-0">📅</span>
                  <div>
                    <h3 className="text-[#5cffb0] text-lg font-semibold mb-1">Audit Logs</h3>
                    <p className="text-[#B0B0B0] text-sm">Retained for 1 year for security monitoring</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section 8: Security Measures */}
          <section className="mb-8">
            <h2 className="text-[#5cffb0] text-2xl sm:text-3xl font-semibold mb-4">
              8. Security Measures
            </h2>
            <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
              <CardContent className="p-6 sm:p-8">
                <p className="text-[#B0B0B0] text-base leading-relaxed mb-4">
                  We implement industry-standard security measures to protect your data:
                </p>

                <ul className="space-y-3 text-[#B0B0B0] text-base">
                  <li className="flex items-start gap-3">
                    <span className="text-[#5cffb0] flex-shrink-0">🔒</span>
                    <span>End-to-end encryption for all data in transit (HTTPS/TLS)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#5cffb0] flex-shrink-0">🔒</span>
                    <span>Row Level Security (RLS) policies on all database tables</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#5cffb0] flex-shrink-0">🔒</span>
                    <span>JWT-based authentication with short-lived access tokens</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#5cffb0] flex-shrink-0">🔒</span>
                    <span>Webhook signature verification (Stripe, Postmark)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#5cffb0] flex-shrink-0">🔒</span>
                    <span>Regular security audits and vulnerability scanning</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#5cffb0] flex-shrink-0">🔒</span>
                    <span>No message body storage (only metadata)</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Section 9: Changes to This Policy */}
          <section className="mb-8">
            <h2 className="text-[#5cffb0] text-2xl sm:text-3xl font-semibold mb-4">
              9. Changes to This Policy
            </h2>
            <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
              <CardContent className="p-6 sm:p-8">
                <p className="text-[#B0B0B0] text-base leading-relaxed">
                  We may update this Privacy Policy from time to time. Significant changes will be
                  communicated via email to registered users. The "Last Updated" date at the top of this
                  page will always reflect the most recent revision. Continued use of our service after
                  changes constitutes acceptance of the updated policy.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Section 10: Contact Us */}
          <section className="mb-12">
            <h2 className="text-[#5cffb0] text-2xl sm:text-3xl font-semibold mb-4">
              10. Contact Us
            </h2>
            <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
              <CardContent className="p-6 sm:p-8">
                <p className="text-[#B0B0B0] text-base leading-relaxed mb-4">
                  If you have questions about this Privacy Policy or wish to exercise your rights, please
                  contact us:
                </p>

                <div className="space-y-2">
                  <p className="text-[#B0B0B0] text-base">
                    <span className="text-[#5cffb0] font-semibold">Email:</span>{' '}
                    <a
                      href="mailto:privacy@fastpass.email"
                      className="text-[#5cffb0] hover:underline"
                    >
                      privacy@fastpass.email
                    </a>
                  </p>
                  <p className="text-[#B0B0B0] text-base">
                    <span className="text-[#5cffb0] font-semibold">Support:</span>{' '}
                    <a
                      href="mailto:support@fastpass.email"
                      className="text-[#5cffb0] hover:underline"
                    >
                      support@fastpass.email
                    </a>
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-[#5cffb0]/20">
                  <p className="text-[#B0B0B0] text-sm">
                    We are committed to resolving any concerns you may have about your privacy and will
                    respond to all requests within 30 days.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* CTA to Cookie Settings */}
          <div className="text-center">
            <Button
              onClick={() => navigate('/cookie-settings')}
              className="bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold py-3 px-8 rounded-xl transition-all duration-300"
            >
              Manage Cookie Preferences
            </Button>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-6 text-white/60 text-sm border-t border-[#5cffb0]/20 mt-12">
          <p>© 2026 FastPass • Guaranteed Response Platform</p>
        </footer>
      </div>
    </div>
  );
};

export default Privacy;
