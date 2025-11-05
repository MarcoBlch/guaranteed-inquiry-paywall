
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
            <p className="text-white/80 text-xs sm:text-sm font-medium tracking-wider -mt-3 sm:-mt-4">GUARANTEED RESPONSES</p>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center">
          {/* Hero Text */}
          <div className="mb-8 sm:mb-12 max-w-2xl w-full">
            {/* H1: Main Headline - Neon Vert, Bold, text-5xl */}
            <h1 className="text-[#5cffb0] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              GET PAID<br />TO ANSWER FAST
            </h1>
            {/* Body Text (Primary) - Light Gray, Regular, text-base/text-lg */}
            <p className="text-[#B0B0B0] text-base sm:text-lg md:text-xl font-normal mb-6 sm:mb-8 leading-relaxed px-2">
              Monetize your priority inbox NOW
            </p>
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
              Keep Your Inbox Clean and Valuable
            </h2>

            {/* Body paragraphs */}
            <p className="text-[#B0B0B0] text-base sm:text-lg font-normal leading-relaxed text-center px-4">
              No more spam, no more wasted time, with FastPass you decide who gets priority access to your inbox. Value your time while respecting your audience: when they pay, you pledge to deliver a clear and timely answer. It's a simple way to monetize your expertise and guarantee real engagement.
            </p>

            {/* H2: Second Section Title */}
            <h2 className="text-[#5cffb0] text-2xl sm:text-3xl font-semibold text-center mt-8 mb-4">
              A Commitment to Peace of Mind
            </h2>

            <p className="text-[#B0B0B0] text-base sm:text-lg font-normal leading-relaxed text-center px-4">
              A FastPass is more than just a tool—it's a commitment. By setting your own price and response time, you stay in control while giving your audience the attention they deserve.
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
                  <Button
                    variant="outline"
                    className="w-full border-[#5cffb0] text-[#5cffb0] hover:bg-[#5cffb0]/10 hover:text-[#5cffb0]"
                    onClick={() => navigate('/pay/b706cf3e-8d0b-47ed-af50-502b288510a8')}
                  >
                    🧪 Test Payment (Demo)
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
                      ❓ Q1: What exactly is FastPass and why should I register?
                    </h3>
                    <div className="flex items-start gap-3">
                      <span className="text-[#5cffb0] text-xl flex-shrink-0">💡</span>
                      <div className="text-[#B0B0B0] text-base font-normal leading-relaxed space-y-2">
                        <p>
                          FastPass is a smart paywall service that lets you monetize your inbox.
                        </p>
                        <p>
                          Instead of being overwhelmed by messages, you decide who can reach you, when, and at what cost.
                        </p>
                        <p>
                          By registering, you create your own FastPass link that:
                        </p>
                        <ul className="list-disc list-inside ml-4">
                          <li>Filters out the noise</li>
                          <li>Ensures you only get serious requests</li>
                          <li>Rewards you financially for your time and expertise</li>
                        </ul>
                      </div>
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
        <footer className="text-center py-6 text-white/60 text-sm">
          <p>© 2025 FastPass • Guaranteed Response Platform</p>
        </footer>
      </div>
    </div>
  );
};

export default PaywallPage;

