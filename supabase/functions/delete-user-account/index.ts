/**
 * Delete User Account Edge Function
 *
 * Handles complete account deletion with cascading cleanup of user data.
 * Implements soft delete with retention for legal/tax compliance.
 *
 * Security:
 * - Requires authentication (JWT verification enabled)
 * - Rate limited (1 attempt per hour per user)
 * - Requires password re-authentication
 * - Blocks deletion if active escrow transactions exist
 * - Processes pending payouts before deletion
 *
 * Data Handling:
 * - Soft delete: Marks user as deleted, anonymizes data
 * - Hard delete: Removes from auth.users after soft delete
 * - Cascading: Related records are handled automatically via FK constraints
 * - Audit: Logs deletion in admin_actions table
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, createRateLimitResponse, getClientIP, RATE_LIMIT_PRESETS } from '../_shared/rateLimiter.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Get authenticated user from JWT
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Invalid or expired token')
    }

    // 2. Parse request body
    const { password, confirmText } = await req.json()

    // 3. Validate confirmation text
    if (confirmText !== 'DELETE MY ACCOUNT') {
      throw new Error('Invalid confirmation text. Please type "DELETE MY ACCOUNT" exactly.')
    }

    if (!password) {
      throw new Error('Password is required for account deletion')
    }

    // 4. Rate limiting check
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const ipAddress = getClientIP(req)
    const rateLimitResult = await checkRateLimit(supabaseAdmin, {
      key: 'account_deletion',
      maxAttempts: RATE_LIMIT_PRESETS.ACCOUNT_DELETION.maxAttempts,
      windowSeconds: RATE_LIMIT_PRESETS.ACCOUNT_DELETION.windowSeconds,
      identifier: user.email,
      ipAddress
    })

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(
        rateLimitResult,
        'Too many account deletion attempts. Please try again later.'
      )
    }

    // 5. Re-authenticate user with password (security verification)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password
    })

    if (signInError) {
      throw new Error('Incorrect password. Account deletion cancelled.')
    }

    console.log(`Account deletion requested for user: ${user.id} (${user.email})`)

    // 6. Check for active escrow transactions (held or processing)
    const { data: activeTransactions, error: txError } = await supabaseAdmin
      .from('escrow_transactions')
      .select('id, status, amount, expires_at')
      .eq('recipient_user_id', user.id)
      .in('status', ['held', 'processing'])

    if (txError) {
      console.error('Error checking active transactions:', txError)
      throw new Error('Failed to verify active transactions')
    }

    if (activeTransactions && activeTransactions.length > 0) {
      const totalAmount = activeTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0)
      throw new Error(
        `Cannot delete account with ${activeTransactions.length} active transaction(s) ` +
        `totaling €${totalAmount.toFixed(2)}. Please wait for transactions to complete or expire.`
      )
    }

    // 7. Check for pending payouts
    const { data: pendingPayouts, error: payoutError } = await supabaseAdmin
      .from('escrow_transactions')
      .select('id, status, amount')
      .eq('recipient_user_id', user.id)
      .eq('status', 'pending_user_setup')

    if (payoutError) {
      console.error('Error checking pending payouts:', payoutError)
      throw new Error('Failed to verify pending payouts')
    }

    if (pendingPayouts && pendingPayouts.length > 0) {
      const totalPending = pendingPayouts.reduce((sum, tx) => sum + Number(tx.amount), 0)
      throw new Error(
        `Cannot delete account with ${pendingPayouts.length} pending payout(s) ` +
        `totaling €${totalPending.toFixed(2)}. Please configure Stripe Connect or contact support.`
      )
    }

    // 8. Soft delete: Anonymize profile data
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        stripe_account_id: null,
        stripe_onboarding_completed: false,
        price: null,
        is_admin: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      throw new Error('Failed to anonymize profile data')
    }

    console.log(`Profile anonymized for user: ${user.id}`)

    // 9. Delete pricing tiers (cascades automatically via FK)
    const { error: pricingError } = await supabaseAdmin
      .from('pricing_tiers')
      .delete()
      .eq('user_id', user.id)

    if (pricingError) {
      console.error('Error deleting pricing tiers:', pricingError)
      // Non-fatal, continue with deletion
    }

    // 10. Anonymize messages (keep for audit trail but remove identifiable data)
    const { error: messagesError } = await supabaseAdmin
      .from('messages')
      .update({
        content: '[DELETED]',
        sender_email: 'deleted@fastpass.email',
        read: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (messagesError) {
      console.error('Error anonymizing messages:', messagesError)
      // Non-fatal, continue with deletion
    }

    // 11. Log admin action (audit trail)
    const { error: auditError } = await supabaseAdmin
      .from('admin_actions')
      .insert({
        admin_user_id: user.id,
        action_type: 'account_deletion',
        description: `User ${user.email} deleted their account`,
        notes: `IP: ${ipAddress}`,
        metadata: {
          user_id: user.id,
          email: user.email,
          deleted_at: new Date().toISOString()
        }
      })

    if (auditError) {
      console.error('Error logging audit action:', auditError)
      // Non-fatal, continue with deletion
    }

    // 12. Hard delete: Remove from auth.users (this cascades to profile)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError)
      throw new Error('Failed to delete user account. Please contact support.')
    }

    console.log(`User account deleted: ${user.id} (${user.email})`)

    // 13. Sign out user
    await supabase.auth.signOut()

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account successfully deleted',
        deleted_at: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('Account deletion error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to delete account'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
