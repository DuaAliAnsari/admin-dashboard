// supabase/functions/create-organization/index.ts
// Optional server-side org creation with re-validation of Zod rules.
// The client can also insert directly (RLS ensures created_by = caller).
// This function is here to demonstrate server-side re-validation.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ORG_TYPES = ['school', 'nonprofit', 'business', 'government', 'healthcare']

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => null)
    if (!body) return errorResponse('Invalid JSON', 400)

    const { name, type, description, school_district, nonprofit_ein, ...rest } = body

    // ── Server-side validation (mirrors Zod schema) ────────────────────────
    if (!name || typeof name !== 'string' || name.length < 2 || name.length > 100) {
      return errorResponse('name must be 2–100 characters', 400)
    }
    if (!type || !ORG_TYPES.includes(type)) {
      return errorResponse(`type must be one of: ${ORG_TYPES.join(', ')}`, 400)
    }
    if (type === 'school' && !school_district) {
      return errorResponse('school_district is required for School organizations', 400)
    }
    if (type === 'nonprofit') {
      if (!nonprofit_ein) return errorResponse('nonprofit_ein is required', 400)
      if (!/^\d{2}-\d{7}$/.test(nonprofit_ein)) {
        return errorResponse('nonprofit_ein must match format XX-XXXXXXX', 400)
      }
    }

    // ── Authenticate ───────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return errorResponse('Unauthorized', 401)

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return errorResponse('Unauthorized', 401)

    // ── Insert ─────────────────────────────────────────────────────────────
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: org, error: insertError } = await serviceClient
      .from('organizations')
      .insert({
        name: name.trim(),
        type,
        description: description?.trim() || null,
        created_by: user.id,
        school_district: school_district || null,
        nonprofit_ein: nonprofit_ein || null,
        business_registration: rest.business_registration || null,
        government_jurisdiction: rest.government_jurisdiction || null,
        healthcare_license: rest.healthcare_license || null,
      })
      .select()
      .single()

    if (insertError) throw insertError

    return new Response(JSON.stringify({ success: true, org }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[create-organization] error:', err)
    return errorResponse('Internal server error', 500)
  }
})

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
