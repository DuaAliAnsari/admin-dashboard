// supabase/functions/create-invitation/index.ts
// Deno Edge Function — runs server-side with service-role privileges
// Validates input, verifies caller is the org's admin, creates invitation record.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Parse & validate input ──────────────────────────────────────────
    const body = await req.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return errorResponse('Invalid JSON body', 400)
    }

    const { organization_id, email, role = 'member' } = body as {
      organization_id?: string
      email?: string
      role?: string
    }

    if (!organization_id || typeof organization_id !== 'string') {
      return errorResponse('organization_id is required', 400)
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return errorResponse('A valid email address is required', 400)
    }

    if (!['admin', 'member'].includes(role)) {
      return errorResponse('role must be "admin" or "member"', 400)
    }

    // ── 2. Authenticate the caller ─────────────────────────────────────────
    // The client sends its JWT in the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errorResponse('Missing Authorization header', 401)
    }

    // Create a Supabase client scoped to the calling user
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return errorResponse('Unauthorized', 401)
    }

    // ── 3. Verify caller is the org admin ──────────────────────────────────
    // Use service-role client to bypass RLS for this lookup
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
    )

    const { data: org, error: orgError } = await serviceClient
      .from('organizations')
      .select('id, created_by')
      .eq('id', organization_id)
      .single()

    if (orgError || !org) {
      return errorResponse('Organization not found', 404)
    }

    if (org.created_by !== user.id) {
      return errorResponse('You are not the admin of this organization', 403)
    }

    // ── 4. Check for duplicate invitation ─────────────────────────────────
    const { data: existing } = await serviceClient
      .from('organization_members')
      .select('id, status')
      .eq('organization_id', organization_id)
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (existing) {
      return errorResponse(
        `${email} has already been invited (status: ${existing.status})`,
        409,
      )
    }

    // ── 5. Create the invitation record ───────────────────────────────────
    const { data: member, error: insertError } = await serviceClient
      .from('organization_members')
      .insert({
        organization_id,
        email: email.toLowerCase(),
        role,
        status: 'invited',
        invited_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      // Handle unique constraint violation gracefully
      if (insertError.code === '23505') {
        return errorResponse(`${email} is already a member of this organization`, 409)
      }
      throw insertError
    }

    // ── 6. (TODO) Plug in email delivery here ─────────────────────────────
    // e.g. await sendInvitationEmail({ to: email, orgName: org.name, inviteToken: ... })
    // For now, the record creation is sufficient per spec.

    return new Response(
      JSON.stringify({ success: true, member }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    console.error('[create-invitation] Unexpected error:', err)
    return errorResponse('Internal server error', 500)
  }
})

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}
