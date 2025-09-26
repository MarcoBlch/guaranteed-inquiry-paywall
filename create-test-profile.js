import { createClient } from '@supabase/supabase-js';

// Supabase configuration - replace with your actual values
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestProfile() {
  const testUserId = '1a20e70f-86e6-406d-a09f-b4959b3cc0d0';

  try {
    // Create a test profile
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: testUserId,
        email: 'test-receiver@fastpass.email',
        price: 10.00,
        stripe_onboarding_completed: true,
        stripe_account_id: 'acct_test_123', // Mock Stripe account for testing
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error creating profile:', error);
    } else {
      console.log('Test profile created successfully:', data);
      console.log(`Payment URL should now work: https://www.fastpass.email/pay/${testUserId}`);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

createTestProfile();