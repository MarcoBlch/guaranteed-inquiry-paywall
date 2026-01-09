import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PageViewData {
  page_path: string;
  page_title?: string;
  session_id?: string;
  referrer?: string;
  user_agent?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for RLS bypass
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parse request body
    const data: PageViewData = await req.json();

    // Validate required fields
    if (!data.page_path) {
      return new Response(
        JSON.stringify({ error: 'page_path is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract user ID from authorization header if present
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
        }
      } catch (error) {
        // Silent fail - anonymous tracking is OK
        console.log('Failed to extract user from token:', error);
      }
    }

    // Insert page view record
    const { data: pageView, error: insertError } = await supabase
      .from('page_views')
      .insert({
        page_path: data.page_path,
        page_title: data.page_title || null,
        user_id: userId,
        session_id: data.session_id || null,
        referrer: data.referrer || null,
        user_agent: data.user_agent || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting page view:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to record page view' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Return success (minimal response for performance)
    return new Response(
      JSON.stringify({ success: true, id: pageView.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Page view tracking error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
