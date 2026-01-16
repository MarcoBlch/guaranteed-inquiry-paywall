import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Check, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReferralProgressProps {
  referralCount: number;
  targetCount?: number;
  revenuePercentage: number;
  className?: string;
}

export const ReferralProgress: React.FC<ReferralProgressProps> = ({
  referralCount,
  targetCount = 3,
  revenuePercentage,
  className
}) => {
  const progressPercentage = Math.min((referralCount / targetCount) * 100, 100);
  const isComplete = referralCount >= targetCount;

  return (
    <Card className={cn("bg-[#1a1f2e]/95 border-[#5cffb0]/20", className)}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isComplete ? (
              <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-500" />
              </div>
            ) : (
              <div className="h-8 w-8 rounded-full bg-[#5cffb0]/20 flex items-center justify-center">
                <Gift className="h-5 w-5 text-[#5cffb0]" />
              </div>
            )}
            <div>
              <p className="font-semibold text-white">
                {isComplete ? '85% Revenue Share Active' : 'Earn 85% Revenue Share'}
              </p>
              <p className="text-sm text-[#B0B0B0]">
                {isComplete
                  ? 'You\'re earning the maximum rate!'
                  : `Invite ${targetCount - referralCount} more friend${targetCount - referralCount !== 1 ? 's' : ''} to unlock`
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={cn(
              "text-2xl font-bold",
              isComplete ? "text-green-400" : "text-[#5cffb0]"
            )}>
              {(revenuePercentage * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-[#B0B0B0]">Your rate</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#B0B0B0]">Referral Progress</span>
            <span className="text-[#5cffb0] font-medium">{referralCount}/{targetCount}</span>
          </div>
          <Progress
            value={progressPercentage}
            className="h-2 bg-[#0a0e1a]"
          />
        </div>

        <div className="mt-4 flex items-center gap-4">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={cn(
                "flex-1 flex flex-col items-center gap-1",
                referralCount >= step ? "opacity-100" : "opacity-40"
              )}
            >
              <div
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold",
                  referralCount >= step
                    ? "bg-green-500 text-white"
                    : "bg-[#0a0e1a] text-[#B0B0B0] border border-[#5cffb0]/30"
                )}
              >
                {referralCount >= step ? <Check className="h-3 w-3" /> : step}
              </div>
              <span className="text-xs text-[#B0B0B0]">
                {step === 3 ? '85%' : `${75 + (step * 3)}%`}
              </span>
            </div>
          ))}
        </div>

        {!isComplete && (
          <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-[#5cffb0]/10 to-transparent border border-[#5cffb0]/20">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#5cffb0]" />
              <p className="text-sm text-[#B0B0B0]">
                Earn <span className="text-[#5cffb0] font-semibold">+10%</span> more on every payment when you reach 3 referrals
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralProgress;
