import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users } from 'lucide-react';

interface DirectoryCardProps {
  targetName: string;
  targetSlug: string;
  targetDescription: string | null;
  targetAvatarUrl: string | null;
  targetCategory: string | null;
  requestCount: number;
  onRequestAccess: (targetName: string, targetSlug: string) => void;
}

const DirectoryCard: React.FC<DirectoryCardProps> = ({
  targetName,
  targetSlug,
  targetDescription,
  targetAvatarUrl,
  targetCategory,
  requestCount,
  onRequestAccess,
}) => {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-md p-4 sm:p-5 bg-white dark:bg-slate-900 flex flex-col gap-3">
      {/* Header: avatar + name + category */}
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 shrink-0">
          {targetAvatarUrl ? (
            <AvatarImage src={targetAvatarUrl} alt={targetName} />
          ) : null}
          <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-lg font-display">
            {targetName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base truncate">
            {targetName}
          </h3>
          {targetCategory && (
            <span className="inline-block text-xs font-mono text-green-500 bg-green-500/10 rounded px-1.5 py-0.5 mt-0.5">
              {targetCategory}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {targetDescription && (
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
          {targetDescription}
        </p>
      )}

      {/* Demand signal */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
        <Users className="h-3.5 w-3.5" />
        <span>{requestCount} {requestCount === 1 ? 'person wants' : 'people want'} access</span>
      </div>

      {/* CTA */}
      <Button
        variant="outline"
        className="w-full mt-auto border-green-500/50 text-green-500 hover:bg-green-500/10 hover:text-green-500 font-medium"
        onClick={() => onRequestAccess(targetName, targetSlug)}
      >
        Request Access
      </Button>
    </div>
  );
};

export default DirectoryCard;
