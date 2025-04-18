
import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";

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
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('price, paypal_email')
          .eq('id', userId)
          .single();
          
        if (profileError || !profile) {
          throw new Error('Could not find user');
        }
        
        if (!profile.price || !profile.paypal_email) {
          throw new Error('This user has not set up payment options yet');
        }
        
        setDetails({
          price: profile.price,
          userName: profile.paypal_email.split('@')[0] || 'this user'
        });
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };
    
    loadUserProfile();
  }, [userId]);
  
  return { details, loading, error };
};
