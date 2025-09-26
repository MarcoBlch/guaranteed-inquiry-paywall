
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// SECURITY FIX: Restrict CORS in production
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ENVIRONMENT') === 'production' 
    ? 'https://your-domain.com' 
    : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

// Rate limiting storage (basic in-memory)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (clientIP: string, maxRequests = 10, windowMs = 60000): boolean => {
  const now = Date.now();
  const key = `payment_${clientIP}`;
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // SECURITY FIX: Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: 'Trop de tentatives. Veuillez réessayer dans une minute.' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429 
        }
      );
    }

    console.log('Starting create-stripe-payment function');
    const requestBody = await req.json();
    
    const { price, responseDeadlineHours, userId } = requestBody;
    
    // SECURITY FIX: Comprehensive input validation
    if (!price || !responseDeadlineHours || !userId) {
      throw new Error('Paramètres requis manquants')
    }
    
    // Validate price
    if (typeof price !== 'number' || price <= 0 || price > 100000) {
      throw new Error('Prix invalide (doit être entre 0 et 100 000€)')
    }
    
    // Validate response deadline
    if (typeof responseDeadlineHours !== 'number' || 
        responseDeadlineHours < 1 || 
        responseDeadlineHours > 168) {
      throw new Error('Invalid response deadline (must be between 1 and 168 hours)')
    }
    
    // Validate userId format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (typeof userId !== 'string' || !uuidRegex.test(userId)) {
      throw new Error('ID utilisateur invalide')
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    console.log('Stripe key found:', stripeSecretKey ? 'YES' : 'NO');
    console.log('Stripe key prefix:', stripeSecretKey ? stripeSecretKey.substring(0, 10) + '...' : 'NONE');
    
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured')
    }

    if (!stripeSecretKey.startsWith('sk_')) {
      throw new Error('Invalid Stripe secret key format - must start with sk_')
    }

    // Create Stripe payment intent with escrow hold
    const paymentIntentResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: Math.round(price * 100).toString(), // Convert to cents
        currency: 'eur',
        capture_method: 'manual', // Hold funds without capturing
        'metadata[responseDeadlineHours]': responseDeadlineHours.toString(),
        'metadata[recipientUserId]': userId,
        'metadata[escrowType]': 'guaranteed_response'
      }),
    })

    if (!paymentIntentResponse.ok) {
      const error = await paymentIntentResponse.text()
      throw new Error(`Stripe API error: ${error}`)
    }

    const paymentIntent = await paymentIntentResponse.json()

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        status: 'created'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('Error creating Stripe payment:', error)
    
    // SECURITY FIX: Sanitize error messages to prevent information leakage
    let errorMessage = 'Une erreur interne s\'est produite';
    let statusCode = 500;
    
    if (error.message?.includes('invalide') || error.message?.includes('manquants')) {
      errorMessage = error.message; // Safe validation errors
      statusCode = 400;
    } else if (error.message?.includes('Stripe API error')) {
      errorMessage = 'Erreur de paiement. Veuillez réessayer.';
      statusCode = 400;
    } else if (error.message?.includes('not configured')) {
      errorMessage = 'Service temporairement indisponible';
      statusCode = 503;
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode
      }
    )
  }
})
