import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify JWT and admin status
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create client with user's token to check auth
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'list': {
        const { data, error } = await supabase
          .from('directory_requests')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true, entries: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'create': {
        const { target_name, target_slug, target_description, target_avatar_url, target_category } = body

        if (!target_name || typeof target_name !== 'string') {
          return new Response(
            JSON.stringify({ success: false, error: 'Target name is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const slug = target_slug || slugify(target_name)

        // Check slug uniqueness
        const { data: existing } = await supabase
          .from('directory_requests')
          .select('id')
          .eq('target_slug', slug)
          .maybeSingle()

        if (existing) {
          return new Response(
            JSON.stringify({ success: false, error: `Slug "${slug}" already exists` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase
          .from('directory_requests')
          .insert({
            target_name: target_name.trim(),
            target_slug: slug,
            target_description: target_description?.trim() || null,
            target_avatar_url: target_avatar_url?.trim() || null,
            target_category: target_category || null,
          })
          .select()
          .single()

        if (error) throw error

        console.log(`✅ Admin created directory entry: ${target_name} (${slug})`)

        return new Response(
          JSON.stringify({ success: true, entry: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update': {
        const { id, ...fields } = body
        if (!id) {
          return new Response(
            JSON.stringify({ success: false, error: 'Entry ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Only allow safe fields
        const allowedFields: Record<string, any> = {}
        if (fields.target_name) allowedFields.target_name = fields.target_name.trim()
        if (fields.target_slug) allowedFields.target_slug = fields.target_slug.trim()
        if (fields.target_description !== undefined) allowedFields.target_description = fields.target_description?.trim() || null
        if (fields.target_avatar_url !== undefined) allowedFields.target_avatar_url = fields.target_avatar_url?.trim() || null
        if (fields.target_category !== undefined) allowedFields.target_category = fields.target_category || null
        if (fields.status) allowedFields.status = fields.status

        const { data, error } = await supabase
          .from('directory_requests')
          .update(allowedFields)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true, entry: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'remove': {
        const { id } = body
        if (!id) {
          return new Response(
            JSON.stringify({ success: false, error: 'Entry ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabase
          .from('directory_requests')
          .update({ status: 'removed' })
          .eq('id', id)

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'requesters': {
        const { id } = body
        if (!id) {
          return new Response(
            JSON.stringify({ success: false, error: 'Entry ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase
          .from('directory_request_emails')
          .select('id, requester_name, email, created_at')
          .eq('directory_request_id', id)
          .order('created_at', { ascending: false })

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true, requesters: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error: any) {
    console.error('Admin directory error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
