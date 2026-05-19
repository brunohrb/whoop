import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const WHOOP_CLIENT_ID = Deno.env.get("WHOOP_CLIENT_ID")!
const WHOOP_CLIENT_SECRET = Deno.env.get("WHOOP_CLIENT_SECRET")!
const WHOOP_BASE = "https://api.prod.whoop.com/developer/v1"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS })

  const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
  if (userError || !user) return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Buscar tokens do usuário
  const { data: tokenData, error: tokenError } = await supabase
    .schema("whoop")
    .from("user_tokens")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (tokenError || !tokenData) {
    return new Response(JSON.stringify({ error: "WHOOP não conectado" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }

  // Renovar token se expirado (ou faltando menos de 5 min)
  let accessToken = tokenData.access_token
  const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null
  const needsRefresh = !expiresAt || expiresAt.getTime() - Date.now() < 5 * 60 * 1000

  if (needsRefresh && tokenData.refresh_token) {
    try {
      const refreshRes = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokenData.refresh_token,
          client_id: WHOOP_CLIENT_ID,
          client_secret: WHOOP_CLIENT_SECRET,
        }),
      })

      if (refreshRes.ok) {
        const newTokens = await refreshRes.json()
        accessToken = newTokens.access_token
        await supabase.schema("whoop").from("user_tokens").update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token ?? tokenData.refresh_token,
          expires_at: new Date(Date.now() + (newTokens.expires_in ?? 3600) * 1000).toISOString(),
        }).eq("user_id", user.id)
      }
    } catch (e) {
      console.error("Erro ao renovar token:", e)
    }
  }

  // Marcar como sincronizando
  await supabase.schema("whoop").from("sync_status").upsert(
    { user_id: user.id, syncing: true, sync_error: null },
    { onConflict: "user_id" }
  )

  const headers = { Authorization: `Bearer ${accessToken}` }

  // Data de início: 90 dias atrás
  const start = new Date()
  start.setDate(start.getDate() - 90)
  const startIso = start.toISOString()

  let syncedCycles = 0
  let syncedSleeps = 0
  let syncedWorkouts = 0
  let syncedRecoveries = 0
  let apiRecoveryCount = 0

  try {
    // ── Sincronizar ciclos ─────────────────────────────────────────────────
    await paginateAndSync<Record<string, unknown>>(
      `${WHOOP_BASE}/cycle?start=${startIso}&limit=25`,
      headers,
      async (records) => {
        if (!records.length) return
        const rows = records.map(c => ({
          user_id: user.id,
          whoop_cycle_id: c.id,
          start_time: c.start,
          end_time: c.end ?? null,
          timezone: c.timezone_offset ?? null,
          score_state: c.score_state ?? null,
          strain: c.score?.strain ?? null,
          kilojoule: c.score?.kilojoule ?? null,
          average_heart_rate: c.score?.average_heart_rate ?? null,
          max_heart_rate: c.score?.max_heart_rate ?? null,
        }))
        await supabase.schema("whoop").from("cycles").upsert(rows, { onConflict: "whoop_cycle_id", ignoreDuplicates: false })
        syncedCycles += rows.length
      }
    )

    // ── Sincronizar recuperação ────────────────────────────────────────────
    await paginateAndSync<Record<string, unknown>>(
      `${WHOOP_BASE}/recovery?start=${startIso}&limit=25`,
      headers,
      async (records) => {
        if (!records.length) return
        apiRecoveryCount += records.length
        const rows = records.map(r => ({
          user_id: user.id,
          cycle_id: r.cycle_id,
          sleep_id: r.sleep_id ?? null,
          score_state: r.score_state ?? null,
          recovery_score: r.score?.recovery_score ?? null,
          resting_heart_rate: r.score?.resting_heart_rate ?? null,
          hrv_rmssd_milli: r.score?.hrv_rmssd_milli ?? null,
          spo2_percentage: r.score?.spo2_percentage ?? null,
          skin_temp_celsius: r.score?.skin_temp_celsius ?? null,
        }))
        const { error: recErr } = await supabase.schema("whoop").from("recovery").upsert(rows, { onConflict: "cycle_id", ignoreDuplicates: false })
        if (recErr) console.error("Erro upsert recovery:", JSON.stringify(recErr))
        else syncedRecoveries += rows.length
      }
    )

    // ── Sincronizar sono ───────────────────────────────────────────────────
    await paginateAndSync<Record<string, unknown>>(
      `${WHOOP_BASE}/activity/sleep?start=${startIso}&limit=25`,
      headers,
      async (records) => {
        if (!records.length) return
        const rows = records.map(s => ({
          user_id: user.id,
          whoop_sleep_id: s.id,
          start_time: s.start,
          end_time: s.end ?? null,
          timezone: s.timezone_offset ?? null,
          nap: s.nap ?? false,
          score_state: s.score_state ?? null,
          total_in_bed_time_milli: s.score?.stage_summary?.total_in_bed_time_milli ?? null,
          total_awake_time_milli: s.score?.stage_summary?.total_awake_time_milli ?? null,
          total_light_sleep_time_milli: s.score?.stage_summary?.total_light_sleep_time_milli ?? null,
          total_slow_wave_sleep_time_milli: s.score?.stage_summary?.total_slow_wave_sleep_time_milli ?? null,
          total_rem_sleep_time_milli: s.score?.stage_summary?.total_rem_sleep_time_milli ?? null,
          disturbance_count: s.score?.stage_summary?.disturbance_count ?? null,
          sleep_needed_baseline_milli: s.score?.sleep_needed?.baseline_milli ?? null,
          sleep_performance_percentage: s.score?.sleep_performance_percentage ?? null,
          sleep_consistency_percentage: s.score?.sleep_consistency_percentage ?? null,
          sleep_efficiency_percentage: s.score?.sleep_efficiency_percentage ?? null,
        }))
        await supabase.schema("whoop").from("sleep").upsert(rows, { onConflict: "whoop_sleep_id", ignoreDuplicates: false })
        syncedSleeps += rows.length
      }
    )

    // ── Sincronizar treinos ────────────────────────────────────────────────
    await paginateAndSync<Record<string, unknown>>(
      `${WHOOP_BASE}/activity/workout?start=${startIso}&limit=25`,
      headers,
      async (records) => {
        if (!records.length) return
        const rows = records.map(w => ({
          user_id: user.id,
          whoop_workout_id: w.id,
          start_time: w.start,
          end_time: w.end ?? null,
          timezone: w.timezone_offset ?? null,
          sport_id: w.sport_id ?? null,
          score_state: w.score_state ?? null,
          strain: w.score?.strain ?? null,
          average_heart_rate: w.score?.average_heart_rate ?? null,
          max_heart_rate: w.score?.max_heart_rate ?? null,
          kilojoule: w.score?.kilojoule ?? null,
          percent_recorded: w.score?.percent_recorded ?? null,
          zone_zero_milli: w.score?.zone_duration?.zone_zero_milli ?? null,
          zone_one_milli: w.score?.zone_duration?.zone_one_milli ?? null,
          zone_two_milli: w.score?.zone_duration?.zone_two_milli ?? null,
          zone_three_milli: w.score?.zone_duration?.zone_three_milli ?? null,
          zone_four_milli: w.score?.zone_duration?.zone_four_milli ?? null,
          zone_five_milli: w.score?.zone_duration?.zone_five_milli ?? null,
        }))
        await supabase.schema("whoop").from("workouts").upsert(rows, { onConflict: "whoop_workout_id", ignoreDuplicates: false })
        syncedWorkouts += rows.length
      }
    )

    // Atualizar status de sincronização
    await supabase.schema("whoop").from("sync_status").upsert(
      {
        user_id: user.id,
        last_sync_at: new Date().toISOString(),
        syncing: false,
        sync_error: null,
      },
      { onConflict: "user_id" }
    )

    return new Response(
      JSON.stringify({ success: true, synced_cycles: syncedCycles, synced_recoveries: syncedRecoveries, api_recovery_count: apiRecoveryCount, synced_sleeps: syncedSleeps, synced_workouts: syncedWorkouts }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido"
    await supabase.schema("whoop").from("sync_status").upsert(
      { user_id: user.id, syncing: false, sync_error: msg },
      { onConflict: "user_id" }
    )
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }
})

async function paginateAndSync<T>(
  url: string,
  headers: Record<string, string>,
  handler: (records: T[]) => Promise<void>
) {
  let nextToken: string | null = null
  let page = 0

  do {
    const pageUrl = nextToken ? `${url}&nextToken=${encodeURIComponent(nextToken)}` : url
    const res = await fetch(pageUrl, { headers })

    if (!res.ok) {
      if (res.status === 429) {
        // Rate limit: aguardar e tentar novamente
        await new Promise(r => setTimeout(r, 2000))
        continue
      }
      console.error(`Erro na requisição (${res.status}): ${await res.text()}`)
      break
    }

    const json = await res.json()
    const records: T[] = json.records ?? []

    if (records.length > 0) await handler(records)

    nextToken = json.next_token ?? null
    page++

    // Pausa para respeitar rate limit (100 req/min)
    if (page % 10 === 0) await new Promise(r => setTimeout(r, 700))
  } while (nextToken && page < 50)
}
