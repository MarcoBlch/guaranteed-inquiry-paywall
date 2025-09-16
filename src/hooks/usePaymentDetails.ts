
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

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
        
        // Create message_attachments bucket if it doesn't exist
        try {
          const { data: buckets } = await supabase.storage.listBuckets();
          if (!buckets?.find(b => b.name === 'message_attachments')) {
            console.log('Creating message_attachments bucket');
            await supabase.storage.createBucket('message_attachments', {
              public: true
            });
          }
        } catch (storageError) {
          console.log('Storage bucket check error, continuing anyway');
          // Continue even if this fails
        }
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('price, stripe_account_id, stripe_onboarding_completed')
          .eq('id', userId)
          .maybeSingle();
          
        console.log('Profile query result:', { profile, profileError });
        
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          throw new Error('Could not find user');
        }
        
        if (!profile) {
          throw new Error('User not found');
        }
        
        if (!profile.price || !profile.stripe_onboarding_completed) {
          throw new Error('This user has not completed Stripe setup yet');
        }
        
        setDetails({
          price: profile.price,
          userName: 'this user'
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
