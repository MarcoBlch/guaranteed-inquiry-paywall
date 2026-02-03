import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InvitationStats {
  pending_count: number;
  invited_this_week: number;
  total_invited: number;
  redemption_rate: number;
  recent_invitations: Array<{
    email: string;
    invited_at: string;
    code: string;
    redeemed: boolean;
    redeemed_at: string | null;
  }>;
}

export interface SendInvitationsResult {
  success: boolean;
  message: string;
  sent_count: number;
  failed_count: number;
  results: Array<{
    email: string;
    success: boolean;
    code?: string;
    error?: string;
  }>;
}

export const useInvitationRequests = () => {
  const [stats, setStats] = useState<InvitationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch invitation statistics from the backend
   */
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Authentication required');
      }

      const { data, error: invokeError } = await supabase.functions.invoke('get-invitation-stats', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        }
      });

      if (invokeError) {
        console.error('Error fetching invitation stats:', invokeError);
        throw invokeError;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch invitation stats');
      }

      setStats(data.data);
      return data.data;

    } catch (err: any) {
      console.error('Error in fetchStats:', err);
      const errorMessage = err.message || 'Failed to load invitation statistics';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Send invitation emails to a batch of waitlist users
   */
  const sendInvitations = useCallback(async (
    batchSize: number = 10,
    dryRun: boolean = false
  ): Promise<SendInvitationsResult | null> => {
    setSending(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Authentication required');
      }

      const { data, error: invokeError } = await supabase.functions.invoke('send-invitation-emails', {
        body: {
          batch_size: batchSize,
          code_type: 'founder',
          dry_run: dryRun
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        }
      });

      if (invokeError) {
        console.error('Error sending invitations:', invokeError);
        throw invokeError;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to send invitations');
      }

      // Show success toast
      if (dryRun) {
        toast.info(`Preview: Would send ${data.preview?.length || 0} invitations`);
      } else {
        toast.success(`Successfully sent ${data.sent_count} invitations!`, {
          description: data.failed_count > 0
            ? `${data.failed_count} failed to send`
            : 'All invitations sent successfully'
        });

        // Refresh stats after sending
        await fetchStats();
      }

      return {
        success: data.success,
        message: data.message,
        sent_count: data.sent_count || 0,
        failed_count: data.failed_count || 0,
        results: data.results || []
      };

    } catch (err: any) {
      console.error('Error in sendInvitations:', err);
      const errorMessage = err.message || 'Failed to send invitations';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setSending(false);
    }
  }, [fetchStats]);

  return {
    stats,
    loading,
    sending,
    error,
    fetchStats,
    sendInvitations
  };
};
