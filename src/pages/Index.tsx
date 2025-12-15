
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FastPassLogo } from "@/components/ui/FastPassLogo";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';

const PaywallPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* StaticBackground component from App.tsx provides the background */}
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 sm:p-6 text-center">
          <div className="flex flex-col items-center">
            <FastPassLogo size="xl" />
            <p className="text-white/80 text-xs sm:text-sm font-medium tracking-wider -mt-3 sm:-mt-4">TIME IS MONEY</p>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center">
          {/* Hero Text */}
          <div className="mb-8 sm:mb-12 max-w-2xl w-full">
            {/* H1: Main Headline - Neon Vert, Bold, text-5xl */}
            <h1 className="text-[#5cffb0] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              CREATE PRIORITY ACCESS<br />TO YOUR INBOX
            </h1>
            {/* Body Text (Primary) - Light Gray, Regular, text-base/text-lg */}
            <p className="text-[#B0B0B0] text-base sm:text-lg md:text-xl font-normal mb-6 sm:mb-8 leading-relaxed px-2">
              The best pay-to-reach service
            </p>
            {/* CTA Button below hero text - Only show for non-authenticated users */}
            {!isAuthenticated && (
              <div className="flex justify-center">
                <Button
                  className="bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold py-4 px-8 text-lg rounded-xl transition-all duration-300 hover:shadow-[0_0_25px_rgba(92,255,176,0.5)] hover:scale-[1.02]"
                  onClick={() => navigate('/auth')}
                >
                  Get your invitation
                </Button>
              </div>
            )}
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 w-full max-w-4xl mb-8 sm:mb-12">
            <Card className="bg-transparent backdrop-blur-sm border border-[#5cffb0] text-white shadow-[0_0_15px_rgba(92,255,176,0.3)]">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center text-xl sm:text-2xl">
                  💰
                </div>
                {/* H3: Feature/Card Title - Neon Vert, Semibold, text-xl */}
                <h3 className="font-semibold mb-2 text-lg sm:text-xl text-[#5cffb0]">Set Your Price</h3>
                {/* Body Text (Primary) - Light Gray, Regular, text-base */}
                <p className="text-[#B0B0B0] text-sm sm:text-base font-normal leading-relaxed">Decide how much your time is worth and choose your response timeframe.</p>
              </CardContent>
            </Card>

            <Card className="bg-transparent backdrop-blur-sm border border-[#5cffb0] text-white shadow-[0_0_15px_rgba(92,255,176,0.3)]">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center text-xl sm:text-2xl">
                  ✉️
                </div>
                {/* H3: Feature/Card Title - Neon Vert, Semibold, text-xl */}
                <h3 className="font-semibold mb-2 text-lg sm:text-xl text-[#5cffb0]">Share Your Link</h3>
                {/* Body Text (Primary) - Light Gray, Regular, text-base */}
                <p className="text-[#B0B0B0] text-sm sm:text-base font-normal leading-relaxed">Promote your unique FastPass contact link and let people reach you directly.</p>
              </CardContent>
            </Card>

            <Card className="bg-transparent backdrop-blur-sm border border-[#5cffb0] text-white sm:col-span-2 lg:col-span-1 shadow-[0_0_15px_rgba(92,255,176,0.3)]">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center text-xl sm:text-2xl">
                  ⚡
                </div>
                {/* H3: Feature/Card Title - Neon Vert, Semibold, text-xl */}
                <h3 className="font-semibold mb-2 text-lg sm:text-xl text-[#5cffb0]">Answer & Get Paid</h3>
                {/* Body Text (Primary) - Light Gray, Regular, text-base */}
                <p className="text-[#B0B0B0] text-sm sm:text-base font-normal leading-relaxed">Reply when it suits you and automatically earn 75% of every payout.</p>
              </CardContent>
            </Card>
          </div>

          {/* Brand Messaging Section */}
          <div className="w-full max-w-3xl mx-4 mb-12 sm:mb-16 space-y-8">
            {/* H2: Section Title */}
            <h2 className="text-[#5cffb0] text-2xl sm:text-3xl font-semibold text-center mb-6">
              Keep your inbox exclusive and rewarding
            </h2>

            {/* Body paragraphs */}
            <p className="text-[#B0B0B0] text-base sm:text-lg font-normal leading-relaxed text-center px-4">
              No spam, no wasted time. With FastPass, you decide who gets priority access to your inbox and you get paid for your attention. Value your time while respecting your audience, when they pay you commit to delivering a clear and timely answer. It is a smarter way to monetize your expertise and guarantee real engagement.
            </p>

            {/* H2: Second Section Title */}
            <h2 className="text-[#5cffb0] text-2xl sm:text-3xl font-semibold text-center mt-8 mb-4">
              Keep the link with your audience
            </h2>

            <p className="text-[#B0B0B0] text-base sm:text-lg font-normal leading-relaxed text-center px-4">
              FastPass lets you stay close to your community while protecting your time. Engage with intention and reward meaningful interactions. Join a growing movement of creators, founders and professionals who value their attention and make every connection count.
            </p>
          </div>

          {/* CTA Section */}
          <Card className="w-full max-w-md mx-4 bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/30 shadow-[0_0_20px_rgba(92,255,176,0.2)] mb-12 sm:mb-16">
            <CardContent className="p-6 sm:p-8">
              {isAuthenticated ? (
                <div className="space-y-4">
                  {/* H2: Section Title - Neon Vert, Semibold, text-2xl */}
                  <h2 className="text-2xl font-semibold text-[#5cffb0] mb-4">Welcome back!</h2>
                  <Button
                    className="w-full bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold py-4 px-8 text-lg rounded-xl transition-colors duration-300"
                    onClick={() => navigate('/dashboard')}
                  >
                    Go to Dashboard
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* CTA Subtitle - Use appropriate color for dark background */}
                  <h2 className="text-2xl font-semibold text-[#5cffb0] mb-2">Ready to get started?</h2>
                  {/* Body Text (Primary) - Light Gray, Regular, text-lg */}
                  <p className="text-[#B0B0B0] text-lg font-normal mb-6 leading-relaxed">Join professionals who are monetizing their time and expertise</p>
                  <Button
                    className="w-full bg-gradient-to-r from-[#5cffb0] to-[#2C424C] hover:from-[#4de89d] hover:to-[#253740] text-[#0a0e1a] hover:text-white font-bold py-4 px-8 text-lg rounded-xl transition-colors duration-300"
                    onClick={() => navigate('/auth')}
                  >
                    Start Earning Today
                  </Button>
                  <p className="text-xs text-[#B0B0B0]/80 text-center">Free to join • No setup fees • 75% revenue share</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <div className="w-full max-w-4xl mx-4 mb-12 sm:mb-16">
            {/* FAQ Title */}
            <h2 className="text-[#5cffb0] text-3xl sm:text-4xl font-semibold text-center mb-10 sm:mb-12">
              FAQ
            </h2>

            {/* FAQ Cards */}
            <div className="space-y-6">
              {/* Q1 */}
              <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                <CardContent className="p-6 sm:p-8">
                  <div className="mb-4">
                    <h3 className="text-[#5cffb0] text-lg sm:text-xl font-semibold mb-3">
                      ❓ Q1: What exactly is a FastPass and why should I register?
                    </h3>
                    <div className="flex items-start gap-3">
                      <span className="text-[#5cffb0] text-xl flex-shrink-0">💡</span>
                      <p className="text-[#B0B0B0] text-base font-normal leading-relaxed">
                        A FastPass lets your audience skip the line to reach you directly. They buy a pass, send you a message, and get a guaranteed reply within 24 hours. It is how creators, founders and experts stay available, without giving away their time.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Q2 */}
              <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                <CardContent className="p-6 sm:p-8">
                  <div className="mb-4">
                    <h3 className="text-[#5cffb0] text-lg sm:text-xl font-semibold mb-3">
                      ❓ Q2: How do I create my own FastPass link?
                    </h3>
                    <div className="flex items-start gap-3">
                      <span className="text-[#5cffb0] text-xl flex-shrink-0">💡</span>
                      <p className="text-[#B0B0B0] text-base font-normal leading-relaxed">
                        It takes just a few minutes to become a member. Sign up, customize your profile, set your pricing per response (you can even offer different tiers for standard vs. urgent replies), and publish your unique FastPass link. You can then share it on your website, LinkedIn, X (Twitter), Instagram bio, or anywhere else people try to reach you.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Q3 */}
              <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                <CardContent className="p-6 sm:p-8">
                  <div className="mb-4">
                    <h3 className="text-[#5cffb0] text-lg sm:text-xl font-semibold mb-3">
                      ❓ Q3: Can I control how much people pay and how fast I need to answer?
                    </h3>
                    <div className="flex items-start gap-3">
                      <span className="text-[#5cffb0] text-xl flex-shrink-0">💡</span>
                      <p className="text-[#B0B0B0] text-base font-normal leading-relaxed">
                        Absolutely. You choose your response price and your timeframe (for example: 24h, 72h, 7 days). This gives you full control: charge more for urgent questions, less for general inquiries or even offer free slots if you wish.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Q4 */}
              <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                <CardContent className="p-6 sm:p-8">
                  <div className="mb-4">
                    <h3 className="text-[#5cffb0] text-lg sm:text-xl font-semibold mb-3">
                      ❓ Q4: What happens once someone uses my FastPass link to contact me?
                    </h3>
                    <div className="flex items-start gap-3">
                      <span className="text-[#5cffb0] text-xl flex-shrink-0">💡</span>
                      <p className="text-[#B0B0B0] text-base font-normal leading-relaxed">
                        You'll get a clear notification. The sender has already paid, so you know they are serious. You then reply directly through your dashboard or email, and once the response is delivered, your payout (minus platform fees) is automatically processed.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Q5 */}
              <Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
                <CardContent className="p-6 sm:p-8">
                  <div className="mb-4">
                    <h3 className="text-[#5cffb0] text-lg sm:text-xl font-semibold mb-3">
                      ❓ Q5: What happens if I don't answer or my answer isn't accepted?
                    </h3>
                    <div className="flex items-start gap-3">
                      <span className="text-[#5cffb0] text-xl flex-shrink-0">💡</span>
                      <p className="text-[#B0B0B0] text-base font-normal leading-relaxed">
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
        <footer className="text-center py-8 text-white/60 text-sm border-t border-[#5cffb0]/20">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <a
              href="/privacy"
              className="text-[#5cffb0] hover:text-[#4de89d] hover:underline transition-colors"
            >
              Privacy Policy
            </a>
            <span className="hidden sm:inline text-white/40">•</span>
            <a
              href="/cookie-settings"
              className="text-[#5cffb0] hover:text-[#4de89d] hover:underline transition-colors"
            >
              Cookie Settings
            </a>
            <span className="hidden sm:inline text-white/40">•</span>
            <a
              href="mailto:support@fastpass.email"
              className="text-[#5cffb0] hover:text-[#4de89d] hover:underline transition-colors"
            >
              Contact Us
            </a>
          </div>
          <p>© 2025 FastPass • Guaranteed Response Platform</p>
        </footer>
      </div>
    </div>
  );
};

export default PaywallPage;

