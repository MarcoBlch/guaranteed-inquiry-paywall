import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailServiceHealth {
  service: 'resend' | 'postmark';
  status: 'healthy' | 'degraded' | 'down';
  deliveryRate: number;
  openRate: number;
  failureRate: number;
  totalSent: number;
  lastEmailSent?: string;
  apiReachable: boolean;
  errorMessage?: string;
}

async function checkResendHealth(): Promise<EmailServiceHealth> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  if (!resendApiKey) {
    return {
      service: 'resend',
      status: 'down',
      deliveryRate: 0,
      openRate: 0,
      failureRate: 100,
      totalSent: 0,
      apiReachable: false,
      errorMessage: 'API key not configured'
    }
  }

  try {
    // Test API reachability
    const response = await fetch('https://api.resend.com/emails', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
      },
    })

    const apiReachable = response.status === 200 || response.status === 401 // 401 means API is reachable but auth issue

    return {
      service: 'resend',
      status: apiReachable ? 'healthy' : 'down',
      deliveryRate: 0, // Will be filled from database stats
      openRate: 0,
      failureRate: 0,
      totalSent: 0,
      apiReachable
    }
  } catch (error) {
    return {
      service: 'resend',
      status: 'down',
      deliveryRate: 0,
      openRate: 0,
      failureRate: 100,
      totalSent: 0,
      apiReachable: false,
      errorMessage: error.message
    }
  }
}

async function checkPostmarkHealth(): Promise<EmailServiceHealth> {
  const postmarkServerToken = Deno.env.get('POSTMARK_SERVER_TOKEN')

  if (!postmarkServerToken) {
    return {
      service: 'postmark',
      status: 'down',
      deliveryRate: 0,
      openRate: 0,
      failureRate: 100,
      totalSent: 0,
      apiReachable: false,
      errorMessage: 'Server token not configured'
    }
  }

  try {
    // Test API reachability with Postmark server info endpoint
    const response = await fetch('https://api.postmarkapp.com/server', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Postmark-Server-Token': postmarkServerToken,
      },
    })

    const apiReachable = response.ok

    return {
      service: 'postmark',
      status: apiReachable ? 'healthy' : 'down',
      deliveryRate: 0, // Will be filled from database stats
      openRate: 0,
      failureRate: 0,
      totalSent: 0,
      apiReachable
    }
  } catch (error) {
    return {
      service: 'postmark',
      status: 'down',
      deliveryRate: 0,
      openRate: 0,
      failureRate: 100,
      totalSent: 0,
      apiReachable: false,
      errorMessage: error.message
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get database stats for both services
    const { data: emailStats, error: statsError } = await supabase
      .from('email_service_stats')
      .select('*')

    if (statsError) {
      console.error('Failed to fetch email stats:', statsError)
    }

    // Check API health in parallel
    const [resendHealth, postmarkHealth] = await Promise.all([
      checkResendHealth(),
      checkPostmarkHealth()
    ])

    // Merge database stats with API health checks
    const resendStats = emailStats?.find(s => s.email_service_provider === 'resend')
    const postmarkStats = emailStats?.find(s => s.email_service_provider === 'postmark')

    if (resendStats) {
      resendHealth.deliveryRate = resendStats.delivery_rate || 0
      resendHealth.openRate = resendStats.open_rate || 0
      resendHealth.failureRate = resendStats.failure_rate || 0
      resendHealth.totalSent = resendStats.total_sent || 0

      // Determine status based on metrics
      if (resendHealth.deliveryRate < 85) {
        resendHealth.status = 'degraded'
      } else if (resendHealth.failureRate > 15) {
        resendHealth.status = 'degraded'
      }
    }

    if (postmarkStats) {
      postmarkHealth.deliveryRate = postmarkStats.delivery_rate || 0
      postmarkHealth.openRate = postmarkStats.open_rate || 0
      postmarkHealth.failureRate = postmarkStats.failure_rate || 0
      postmarkHealth.totalSent = postmarkStats.total_sent || 0

      // Determine status based on metrics
      if (postmarkHealth.deliveryRate < 85) {
        postmarkHealth.status = 'degraded'
      } else if (postmarkHealth.failureRate > 15) {
        postmarkHealth.status = 'degraded'
      }
    }

    // Get response tracking stats
    const { data: responseStats, error: responseError } = await supabase
      .from('response_tracking_stats')
      .select('*')
      .single()

    if (responseError) {
      console.error('Failed to fetch response tracking stats:', responseError)
    }

    // Overall system health
    const overallStatus =
      (resendHealth.status === 'healthy' || postmarkHealth.status === 'healthy')
        ? 'healthy'
        : (resendHealth.status === 'degraded' || postmarkHealth.status === 'degraded')
        ? 'degraded'
        : 'down'

    // Recommendation for which service to use
    let recommendation = 'resend' // Default
    if (postmarkHealth.status === 'healthy' && postmarkHealth.deliveryRate > resendHealth.deliveryRate) {
      recommendation = 'postmark'
    }

    return new Response(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        overallStatus,
        recommendation,
        services: {
          resend: resendHealth,
          postmark: postmarkHealth
        },
        responseTracking: responseStats || {
          total_responses: 0,
          on_time_responses: 0,
          grace_period_responses: 0,
          on_time_percentage: 0,
          avg_quality_score: 0,
          webhook_detected: 0,
          manually_marked: 0,
          grace_period_detected: 0
        },
        alerts: [
          ...(resendHealth.status === 'down' ? ['Resend service is down'] : []),
          ...(postmarkHealth.status === 'down' ? ['Postmark service is down'] : []),
          ...(resendHealth.deliveryRate < 85 ? [`Resend delivery rate low: ${resendHealth.deliveryRate}%`] : []),
          ...(postmarkHealth.deliveryRate < 85 ? [`Postmark delivery rate low: ${postmarkHealth.deliveryRate}%`] : []),
        ]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Health check error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        overallStatus: 'down'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
