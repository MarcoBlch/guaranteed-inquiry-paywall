
import { useState, useEffect } from 'react';

interface PaymentDetails {
  userName: string;
  avatarUrl: string | null;
  bioQuote: string | null;
  avgRating: number | null;
  totalRatings: number;
  responseRate: number | null;
  avgResponseHours: number | null;
  price: number;
  dailyLimit: number;
  messagesReceivedToday: number;
  isLimitReached: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const usePaymentDetails = (identifier: string | undefined) => {
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!identifier) {
        setError('Invalid payment link');
        setLoading(false);
        return;
      }

      try {
        // Detect whether identifier is a UUID or a slug
        const isUuid = UUID_REGEX.test(identifier);
        const queryParam = isUuid
          ? `userId=${encodeURIComponent(identifier)}`
          : `slug=${encodeURIComponent(identifier.toLowerCase())}`;

        console.log(`Fetching profile by ${isUuid ? 'userId' : 'slug'}:`, identifier);

        // Use Edge Function to get profile information (bypasses RLS for anonymous users)
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const functionUrl = `${supabaseUrl}/functions/v1/get-payment-profile?${queryParam}`;
        const response = await fetch(functionUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Edge function response:', data);

        if (!data?.success) {
          console.error('Edge function returned error:', data?.error);
          throw new Error(data?.error || 'Failed to load profile');
        }

        const profile = data.profile;

        console.log('Profile details from function:', {
          price: profile.price,
          stripeOnboardingCompleted: profile.stripeOnboardingCompleted,
          userName: profile.userName
        });

        // Store the resolved UUID for downstream payment functions
        setResolvedUserId(profile.userId);

        setDetails({
          price: profile.price,
          userName: profile.userName,
          avatarUrl: profile.avatarUrl ?? null,
          bioQuote: profile.bioQuote ?? null,
          avgRating: profile.avgRating ?? null,
          totalRatings: profile.totalRatings ?? 0,
          responseRate: profile.responseRate ?? null,
          avgResponseHours: profile.avgResponseHours ?? null,
          dailyLimit: profile.dailyLimit ?? 5,
          messagesReceivedToday: profile.messagesReceivedToday ?? 0,
          isLimitReached: profile.isLimitReached ?? false,
        });

      } catch (err: any) {
        console.error('Payment details error:', err);
        setError(err.message || 'Failed to load payment details');
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [identifier]);

  return { details, loading, error, resolvedUserId };
};
