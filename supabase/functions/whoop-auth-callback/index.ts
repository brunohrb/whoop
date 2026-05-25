import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const WHOOP_CLIENT_ID = Deno.env.get("WHOOP_CLIENT_ID")!
const WHOOP_CLIENT_SECRET = Deno.env.get("WHOOP_CLIENT_SECRET")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const APP_URL = Deno.env.get("APP_URL") || "https://brunohrb.github.io/whoop"
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/whoop-auth-callback`

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const userId = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  if (error) {
    return Response.redirect(`${APP_URL}/configuracoes?whoop_error=${encodeURIComponent(error)}`)
  }

  if (!code || !userId) {
    return Response.redirect(`${APP_URL}/configuracoes?whoop_error=parametros_invalidos`)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Validar que o userId existe no Supabase
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
  if (userError || !userData?.user) {
    console.error("User ID inválido:", userId, userError)
    return Response.redirect(`${APP_URL}/configuracoes?whoop_error=usuario_invalido`)
  }

  // Trocar código por tokens WHOOP
  const tokenRes = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: WHOOP_CLIENT_ID,
      client_secret: WHOOP_CLIENT_SECRET,
      redirect_uri: CALLBACK_URL,
    }),
  })

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text()
    console.error("Troca de token falhou:", errBody)
    return Response.redirect(`${APP_URL}/configuracoes?whoop_error=troca_token_falhou`)
  }

  const tokens = await tokenRes.json()
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString()

  // Buscar perfil do WHOOP
  let whoopProfile: Record<string, unknown> | null = null
  try {
    const profileRes = await fetch("https://api.prod.whoop.com/developer/v1/user/profile/basic", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (profileRes.ok) whoopProfile = await profileRes.json()
  } catch (e) { console.error("Erro ao buscar perfil:", e) }

  let bodyData: Record<string, unknown> | null = null
  try {
    const bodyRes = await fetch("https://api.prod.whoop.com/developer/v1/user/measurement/body", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (bodyRes.ok) bodyData = await bodyRes.json()
  } catch (e) { console.error("Erro ao buscar medidas:", e) }

  const tokenRow = {
    user_id: userId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    token_type: tokens.token_type ?? "Bearer",
    expires_at: expiresAt,
    scope: tokens.scope ?? null,
    whoop_user_id: whoopProfile?.user_id != null ? Number(whoopProfile.user_id) : null,
  }

  // Check if row exists, then update or insert (avoids upsert quirks with non-public schemas)
  const { data: existing } = await supabase
    .schema("whoop")
    .from("user_tokens")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()

  let tokenSaveErr
  if (existing) {
    const { error } = await supabase
      .schema("whoop")
      .from("user_tokens")
      .update({
        access_token: tokenRow.access_token,
        refresh_token: tokenRow.refresh_token,
        token_type: tokenRow.token_type,
        expires_at: tokenRow.expires_at,
        scope: tokenRow.scope,
        whoop_user_id: tokenRow.whoop_user_id,
      })
      .eq("user_id", userId)
    tokenSaveErr = error
  } else {
    const { error } = await supabase
      .schema("whoop")
      .from("user_tokens")
      .insert(tokenRow)
    tokenSaveErr = error
  }

  if (tokenSaveErr) {
    console.error("Erro ao salvar tokens:", JSON.stringify(tokenSaveErr))
    return Response.redirect(
      `${APP_URL}/configuracoes?whoop_error=${encodeURIComponent(`erro_salvar_tokens:${tokenSaveErr.code}:${tokenSaveErr.message}`)}`
    )
  }

  if (whoopProfile) {
    const { error: profileErr } = await supabase
      .schema("whoop")
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          whoop_user_id: whoopProfile.user_id != null ? Number(whoopProfile.user_id) : null,
          email: whoopProfile.email ?? null,
          first_name: whoopProfile.first_name ?? null,
          last_name: whoopProfile.last_name ?? null,
          height_meter: bodyData?.height_meter ?? null,
          weight_kilogram: bodyData?.weight_kilogram ?? null,
          max_heart_rate: bodyData?.max_heart_rate ?? null,
        },
        { onConflict: "user_id" }
      )
    if (profileErr) console.error("Erro ao salvar perfil:", JSON.stringify(profileErr))
  }

  return Response.redirect(`${APP_URL}/configuracoes?whoop_connected=true`)
})
