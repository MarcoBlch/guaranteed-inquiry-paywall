
import { useState, useEffect } from 'react';

interface PaymentDetails {
  userName: string;
  price: number;
}

export const usePaymentDetails = (userId: string | undefined) => {
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!userId) {
        setError('Invalid payment link');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching profile for userId:', userId);

        // Use Edge Function to get profile information (bypasses RLS for anonymous users)
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const functionUrl = `${supabaseUrl}/functions/v1/get-payment-profile?userId=${encodeURIComponent(userId)}`;
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

        setDetails({
          price: profile.price,
          userName: profile.userName
        });

      } catch (err: any) {
        console.error('Payment details error:', err);
        setError(err.message || 'Failed to load payment details');
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [userId]);

  return { details, loading, error };
};
