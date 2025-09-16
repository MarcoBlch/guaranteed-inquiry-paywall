
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

interface ResponseTimeOption {
  hours: 24 | 48 | 72;
  price: number;
  label: string;
  description: string;
}

export const useResponseTimeOptions = (userId: string | undefined) => {
  const [options, setOptions] = useState<ResponseTimeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPricingOptions = async () => {
      if (!userId) {
        setError('Invalid user ID');
        setLoading(false);
        return;
      }

      try {
        // First check if user has custom pricing tiers
        const { data: pricingTiers, error: pricingError } = await supabase
          .from('pricing_tiers')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true);

        if (pricingError) throw pricingError;

        if (pricingTiers && pricingTiers.length > 0) {
          // Use custom pricing
          const customOptions = pricingTiers.map(tier => ({
            hours: tier.deadline_hours as 24 | 48 | 72,
            price: Number(tier.price),
            label: getTimeLabel(tier.deadline_hours),
            description: getTimeDescription(tier.deadline_hours)
          }));
          setOptions(customOptions);
        } else {
          // Fall back to user's general price for all tiers
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('price')
            .eq('id', userId)
            .single();

          if (profileError) throw profileError;

          const basePrice = Number(profile.price) || 10;
          const defaultOptions: ResponseTimeOption[] = [
            {
              hours: 24,
              price: basePrice * 1.5, // 50% premium for fastest
              label: '24 heures',
              description: 'Réponse rapide garantie'
            },
            {
              hours: 48,
              price: basePrice * 1.2, // 20% premium for medium
              label: '48 heures',
              description: 'Réponse sous 2 jours'
            },
            {
              hours: 72,
              price: basePrice, // Base price for longest
              label: '72 heures',
              description: 'Réponse sous 3 jours'
            }
          ];
          setOptions(defaultOptions);
        }
      } catch (err: any) {
        console.error('Error loading pricing options:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPricingOptions();
  }, [userId]);

  return { options, loading, error };
};

const getTimeLabel = (hours: number): string => {
  switch (hours) {
    case 24: return '24 heures';
    case 48: return '48 heures';
    case 72: return '72 heures';
    default: return `${hours} heures`;
  }
};

const getTimeDescription = (hours: number): string => {
  switch (hours) {
    case 24: return 'Réponse rapide garantie';
    case 48: return 'Réponse sous 2 jours';
    case 72: return 'Réponse sous 3 jours';
    default: return `Réponse sous ${Math.ceil(hours / 24)} jour(s)`;
  }
};
