import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';
import { usePageViewTracking } from '@/hooks/usePageViewTracking';
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

const FAQ = () => {
  const navigate = useNavigate();

  usePageViewTracking('/faq');

  useSEO({
    title: 'Frequently Asked Questions | FastPass',
    description: 'Common questions about FastPass — how it works, pricing, response guarantees, and refund policies.',
    keywords: ['FastPass FAQ', 'how FastPass works', 'pay to reach FAQ', 'guaranteed response questions'],
    canonicalUrl: 'https://fastpass.email/faq',
    ogImage: 'https://fastpass.email/logo-final-optimized-final.png',
    structuredData: [
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

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <PageNav />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="sm"
            className="mb-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </Button>

          <h1 className="font-display text-4xl sm:text-5xl text-slate-900 dark:text-slate-100 mb-10">
            Frequently asked questions
          </h1>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {faqItems.map((item, i) => (
              <div key={i} className="py-6">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {item.question}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <PageFooter />
    </div>
  );
};

export default FAQ;
