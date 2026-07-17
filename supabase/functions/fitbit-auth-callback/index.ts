import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const FITBIT_CLIENT_ID = Deno.env.get("FITBIT_CLIENT_ID")!
const FITBIT_CLIENT_SECRET = Deno.env.get("FITBIT_CLIENT_SECRET")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const APP_URL = Deno.env.get("APP_URL") || "https://brunohrb.github.io/saude-bhr"
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/fitbit-auth-callback`

const FITBIT_TOKEN_URL = "https://api.fitbit.com/oauth2/token"
const FITBIT_PROFILE_URL = "https://api.fitbit.com/1/user/-/profile.json"

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const userId = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  if (error) {
    return Response.redirect(`${APP_URL}/configuracoes?fitbit_error=${encodeURIComponent(error)}`)
  }

  if (!code || !userId) {
    return Response.redirect(`${APP_URL}/configuracoes?fitbit_error=parametros_invalidos`)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
  if (userError || !userData?.user) {
    console.error("User ID inválido:", userId, userError)
    return Response.redirect(`${APP_URL}/configuracoes?fitbit_error=usuario_invalido`)
  }

  // Trocar código por tokens Fitbit (Basic auth obrigatório)
  const basicAuth = btoa(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`)
  const tokenRes = await fetch(FITBIT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: CALLBACK_URL,
    }),
  })

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text()
    console.error("Troca de token falhou:", errBody)
    return Response.redirect(`${APP_URL}/configuracoes?fitbit_error=troca_token_falhou`)
  }

  const tokens = await tokenRes.json()
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString()

  // Buscar perfil do Fitbit
  let fitbitProfile: Record<string, unknown> | null = null
  try {
    const profileRes = await fetch(FITBIT_PROFILE_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (profileRes.ok) {
      const body = await profileRes.json()
      fitbitProfile = body.user ?? null
    }
  } catch (e) { console.error("Erro ao buscar perfil:", e) }

  const tokenRow = {
    user_id: userId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    token_type: tokens.token_type ?? "Bearer",
    expires_at: expiresAt,
    scope: tokens.scope ?? null,
    fitbit_user_id: tokens.user_id ?? fitbitProfile?.encodedId ?? null,
  }

  const { data: existing } = await supabase
    .schema("fitbit")
    .from("user_tokens")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()

  let tokenSaveErr
  if (existing) {
    const { error } = await supabase
      .schema("fitbit")
      .from("user_tokens")
      .update({
        access_token: tokenRow.access_token,
        refresh_token: tokenRow.refresh_token,
        token_type: tokenRow.token_type,
        expires_at: tokenRow.expires_at,
        scope: tokenRow.scope,
        fitbit_user_id: tokenRow.fitbit_user_id,
      })
      .eq("user_id", userId)
    tokenSaveErr = error
  } else {
    const { error } = await supabase
      .schema("fitbit")
      .from("user_tokens")
      .insert(tokenRow)
    tokenSaveErr = error
  }

  if (tokenSaveErr) {
    console.error("Erro ao salvar tokens:", JSON.stringify(tokenSaveErr))
    return Response.redirect(
      `${APP_URL}/configuracoes?fitbit_error=${encodeURIComponent(`erro_salvar_tokens:${tokenSaveErr.code}:${tokenSaveErr.message}`)}`
    )
  }

  if (fitbitProfile) {
    const { error: profileErr } = await supabase
      .schema("fitbit")
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          fitbit_user_id: fitbitProfile.encodedId ?? null,
          email: fitbitProfile.topBadges ? null : null, // Fitbit doesn't expose email via API
          first_name: fitbitProfile.firstName ?? null,
          last_name: fitbitProfile.lastName ?? null,
          height_meter: fitbitProfile.height ? Number(fitbitProfile.height) / 100 : null,
          weight_kilogram: fitbitProfile.weight ?? null,
          max_heart_rate: null, // Not provided in basic profile
        },
        { onConflict: "user_id" }
      )
    if (profileErr) console.error("Erro ao salvar perfil:", JSON.stringify(profileErr))
  }

  return Response.redirect(`${APP_URL}/configuracoes?fitbit_connected=true`)
})
