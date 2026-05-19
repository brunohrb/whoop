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
  const userId = url.searchParams.get("state") // state = supabase user_id
  const error = url.searchParams.get("error")

  if (error) {
    return Response.redirect(`${APP_URL}/configuracoes?whoop_error=${encodeURIComponent(error)}`)
  }

  if (!code || !userId) {
    return Response.redirect(`${APP_URL}/configuracoes?whoop_error=parametros_invalidos`)
  }

  // Validar que o userId existe no Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
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

  // Salvar tokens (service_role bypassa RLS)
  const { error: tokenSaveErr } = await supabase
    .schema("whoop")
    .from("user_tokens")
    .upsert(
      {
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_type: tokens.token_type ?? "Bearer",
        expires_at: expiresAt,
        scope: tokens.scope ?? null,
        whoop_user_id: whoopProfile?.user_id ?? null,
      },
      { onConflict: "user_id" }
    )

  if (tokenSaveErr) {
    console.error("Erro ao salvar tokens:", tokenSaveErr)
    return Response.redirect(`${APP_URL}/configuracoes?whoop_error=erro_salvar_tokens`)
  }

  if (whoopProfile) {
    await supabase
      .schema("whoop")
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          whoop_user_id: whoopProfile.user_id ?? null,
          email: whoopProfile.email ?? null,
          first_name: whoopProfile.first_name ?? null,
          last_name: whoopProfile.last_name ?? null,
          height_meter: bodyData?.height_meter ?? null,
          weight_kilogram: bodyData?.weight_kilogram ?? null,
          max_heart_rate: bodyData?.max_heart_rate ?? null,
        },
        { onConflict: "user_id" }
      )
  }

  return Response.redirect(`${APP_URL}/configuracoes?whoop_connected=true`)
})
