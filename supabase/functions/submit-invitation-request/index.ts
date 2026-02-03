import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequestBody {
  email: string;
  request_source?: string;
}

// Email validation regex (basic RFC 5322)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: InvitationRequestBody = await req.json();

    // Validate email exists
    if (!body.email || typeof body.email !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email is required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Normalize email
    const normalizedEmail = body.email.toLowerCase().trim();

    // Validate email format
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid email format'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client (service role for RLS bypass)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check for duplicate (case-insensitive)
    const { data: existingRequest, error: lookupError } = await supabase
      .from('invitation_email_requests')
      .select('id, created_at')
      .eq('email', normalizedEmail)
      .single();

    // If email already exists, silently succeed (prevent email enumeration)
    if (existingRequest) {
      console.log(`Duplicate invitation request for: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Thanks! We'll send you an invitation code soon."
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Insert new request
    const { data: newRequest, error: insertError } = await supabase
      .from('invitation_email_requests')
      .insert({
        email: normalizedEmail,
        request_source: body.request_source || 'landing_page',
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting invitation request:', insertError);

      // Check if it's a unique constraint violation (race condition)
      if (insertError.code === '23505') {
        // Silently succeed on race condition
        return new Response(
          JSON.stringify({
            success: true,
            message: "Thanks! We'll send you an invitation code soon."
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Other errors - generic message (don't leak internal errors)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to submit request. Please try again.'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`New invitation request: ${normalizedEmail} (ID: ${newRequest.id})`);

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: "Thanks! We'll send you an invitation code soon."
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Invitation request error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'An error occurred. Please try again.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
