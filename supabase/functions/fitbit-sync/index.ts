import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!
const FITNESS_API = "https://www.googleapis.com/fitness/v1/users/me"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// Nanoseconds helpers
const msToNano = (ms: number) => (ms * 1_000_000).toString()
const nanoToMs = (ns: string | number) => Math.round(Number(ns) / 1_000_000)

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

  const { data: tokenData, error: tokenError } = await supabase
    .schema("fitbit")
    .from("user_tokens")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (tokenError || !tokenData) {
    return new Response(JSON.stringify({ error: "Google Health não conectado" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }

  // Renovar token se expirado (Google tokens duram 1h)
  let accessToken = tokenData.access_token
  const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null
  const needsRefresh = !expiresAt || expiresAt.getTime() - Date.now() < 5 * 60 * 1000

  if (needsRefresh && tokenData.refresh_token) {
    try {
      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokenData.refresh_token,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
        }),
      })

      if (refreshRes.ok) {
        const newTokens = await refreshRes.json()
        accessToken = newTokens.access_token
        await supabase.schema("fitbit").from("user_tokens").update({
          access_token: newTokens.access_token,
          expires_at: new Date(Date.now() + (newTokens.expires_in ?? 3600) * 1000).toISOString(),
        }).eq("user_id", user.id)
      }
    } catch (e) {
      console.error("Erro ao renovar token:", e)
    }
  }

  await supabase.schema("fitbit").from("sync_status").upsert(
    { user_id: user.id, syncing: true, sync_error: null },
    { onConflict: "user_id" }
  )

  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }

  // Janela de tempo: últimos 90 dias em nanosegundos
  const now = Date.now()
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000
  const startNano = msToNano(ninetyDaysAgo)
  const endNano = msToNano(now)

  let syncedActivities = 0
  let syncedSleeps = 0
  let syncedWorkouts = 0
  let syncedRecoveries = 0
  const errors: Record<string, string> = {}

  // Helper para agregar data points da Google Fit
  const aggregate = async (dataTypeName: string, bucketDurationMs: number) => {
    const res = await fetch(`${FITNESS_API}/dataset:aggregate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        aggregateBy: [{ dataTypeName }],
        bucketByTime: { durationMillis: bucketDurationMs.toString() },
        startTimeMillis: ninetyDaysAgo.toString(),
        endTimeMillis: now.toString(),
      }),
    })
    if (!res.ok) throw new Error(`aggregate ${dataTypeName}: HTTP ${res.status}`)
    return res.json()
  }

  try {
    // ── Frequência Cardíaca de Repouso ──────────────────────────────────────
    const rhrMap: Record<string, number> = {}
    try {
      const rhrData = await aggregate("com.google.heart_rate.bpm", 86_400_000) // 1 dia
      for (const bucket of (rhrData.bucket ?? [])) {
        const date = new Date(Number(bucket.startTimeMillis)).toISOString().split("T")[0]
        const points = bucket.dataset?.[0]?.point ?? []
        if (points.length > 0) {
          // pegar o mínimo (proxy para FC de repouso)
          const vals = points.map((p: Record<string, unknown>) =>
            (p.value as Record<string, unknown>[])?.[0]?.fpVal ?? 0
          ).filter((v: number) => v > 0)
          if (vals.length > 0) rhrMap[date] = Math.round(Math.min(...vals))
        }
      }
    } catch (e) { errors.rhr = String(e) }

    // ── SpO₂ ────────────────────────────────────────────────────────────────
    const spo2Map: Record<string, number> = {}
    try {
      const spo2Data = await aggregate("com.google.oxygen_saturation", 86_400_000)
      for (const bucket of (spo2Data.bucket ?? [])) {
        const date = new Date(Number(bucket.startTimeMillis)).toISOString().split("T")[0]
        const points = bucket.dataset?.[0]?.point ?? []
        if (points.length > 0) {
          const vals = points.map((p: Record<string, unknown>) =>
            (p.value as Record<string, unknown>[])?.[0]?.fpVal ?? 0
          ).filter((v: number) => v > 0)
          if (vals.length > 0) {
            spo2Map[date] = parseFloat((vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1))
          }
        }
      }
    } catch (e) { errors.spo2 = String(e) }

    // ── Sono ────────────────────────────────────────────────────────────────
    try {
      const sleepRes = await fetch(
        `${FITNESS_API}/sessions?startTime=${new Date(ninetyDaysAgo).toISOString()}&endTime=${new Date(now).toISOString()}&activityType=72`,
        { headers }
      )
      if (sleepRes.ok) {
        const sleepData = await sleepRes.json()
        const sessions: Record<string, unknown>[] = sleepData.session ?? []

        if (sessions.length > 0) {
          const sleepRows = sessions.map(s => {
            const startMs = Number(s.startTimeMillis)
            const endMs = Number(s.endTimeMillis)
            const durationMs = endMs - startMs
            return {
              user_id: user.id,
              fitbit_sleep_id: String(s.id),
              start_time: new Date(startMs).toISOString(),
              end_time: new Date(endMs).toISOString(),
              timezone: null,
              nap: durationMs < 3 * 3600_000, // < 3h = soneca
              score_state: "SCORED",
              total_in_bed_time_milli: durationMs,
              total_awake_time_milli: null,
              total_light_sleep_time_milli: null,
              total_slow_wave_sleep_time_milli: null,
              total_rem_sleep_time_milli: null,
              total_no_data_time_milli: null,
              sleep_cycle_count: null,
              disturbance_count: null,
              sleep_needed_baseline_milli: null,
              sleep_needed_from_sleep_debt_milli: null,
              sleep_needed_from_recent_strain_milli: null,
              sleep_needed_from_recent_nap_milli: null,
              respiratory_rate: null,
              sleep_performance_percentage: null,
              sleep_consistency_percentage: null,
              sleep_efficiency_percentage: null,
            }
          })

          // Buscar detalhes de estágios de sono para cada sessão
          for (const row of sleepRows) {
            try {
              const startNs = msToNano(new Date(row.start_time as string).getTime())
              const endNs = msToNano(new Date(row.end_time as string).getTime())
              const stagesRes = await fetch(
                `${FITNESS_API}/dataSources/derived:com.google.sleep.segment:com.google.android.gms:merged/datasets/${startNs}-${endNs}`,
                { headers }
              )
              if (stagesRes.ok) {
                const stagesData = await stagesRes.json()
                let light = 0, deep = 0, rem = 0, awake = 0
                for (const point of (stagesData.point ?? [])) {
                  const stageType = (point.value as Record<string, unknown>[])?.[0]?.intVal ?? 0
                  const dur = nanoToMs(Number(point.endTimeNanos) - Number(point.startTimeNanos))
                  // Google Fit sleep stages: 1=awake, 2=sleep, 3=out-of-bed, 4=light, 5=deep, 6=REM
                  if (stageType === 1) awake += dur
                  else if (stageType === 4) light += dur
                  else if (stageType === 5) deep += dur
                  else if (stageType === 6) rem += dur
                }
                const totalSleep = light + deep + rem
                if (totalSleep > 0) {
                  row.total_awake_time_milli = awake
                  row.total_light_sleep_time_milli = light
                  row.total_slow_wave_sleep_time_milli = deep
                  row.total_rem_sleep_time_milli = rem
                  const inBed = row.total_in_bed_time_milli as number
                  row.sleep_efficiency_percentage = inBed > 0 ? Math.round((totalSleep / inBed) * 100) : null
                  row.sleep_performance_percentage = row.sleep_efficiency_percentage
                }
              }
            } catch { /* estágios opcionais */ }
          }

          const { error: sleepErr } = await supabase.schema("fitbit").from("sleep").upsert(
            sleepRows,
            { onConflict: "fitbit_sleep_id", ignoreDuplicates: false }
          )
          if (sleepErr) console.error("Erro upsert sleep:", JSON.stringify(sleepErr))
          else syncedSleeps += sleepRows.length
        }
      } else {
        errors.sleep = `HTTP ${sleepRes.status}`
      }
    } catch (e) { errors.sleep = String(e) }

    // ── Atividades diárias (1 bucket por dia) ───────────────────────────────
    try {
      const actData = await aggregate("com.google.active_minutes", 86_400_000)
      const caloriesData = await aggregate("com.google.calories.expended", 86_400_000)
      const calMap: Record<string, number> = {}
      for (const bucket of (caloriesData.bucket ?? [])) {
        const date = new Date(Number(bucket.startTimeMillis)).toISOString().split("T")[0]
        const pts = bucket.dataset?.[0]?.point ?? []
        calMap[date] = pts.reduce((acc: number, p: Record<string, unknown>) =>
          acc + ((p.value as Record<string, unknown>[])?.[0]?.fpVal ?? 0), 0)
      }

      const actRows = (actData.bucket ?? []).map((bucket: Record<string, unknown>) => {
        const date = new Date(Number(bucket.startTimeMillis)).toISOString().split("T")[0]
        const pts = (bucket.dataset as Record<string, unknown>[])?.[0]?.point as Record<string, unknown>[] ?? []
        const azm = pts.reduce((acc: number, p: Record<string, unknown>) =>
          acc + ((p.value as Record<string, unknown>[])?.[0]?.intVal ?? 0), 0)
        const kcal = calMap[date] ?? 0
        const rhr = rhrMap[date] ?? null

        return {
          user_id: user.id,
          fitbit_activity_id: date.replace(/-/g, ""),
          start_time: `${date}T00:00:00`,
          end_time: `${date}T23:59:59`,
          timezone: null,
          score_state: "SCORED",
          strain: azm > 0 ? Math.min(Math.round(azm / 5 * 10) / 10, 21) : null,
          kilojoule: kcal > 0 ? Math.round(kcal * 4.184) : null,
          average_heart_rate: rhr,
          max_heart_rate: null,
        }
      }).filter((r: Record<string, unknown>) => r.fitbit_activity_id)

      if (actRows.length > 0) {
        const { error: actErr } = await supabase.schema("fitbit").from("cycles").upsert(
          actRows, { onConflict: "fitbit_activity_id", ignoreDuplicates: false }
        )
        if (actErr) console.error("Erro upsert cycles:", JSON.stringify(actErr))
        else syncedActivities += actRows.length

        // Recuperação: HRV não disponível diretamente via Google Fit REST
        // Usamos RHR + SpO₂ para estimar
        const recovRows = actRows
          .filter((r: Record<string, unknown>) => rhrMap[String(r.fitbit_activity_id).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')] != null)
          .map((r: Record<string, unknown>) => {
            const date = String(r.fitbit_activity_id).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
            const rhr = rhrMap[date] ?? null
            const spo2 = spo2Map[date] ?? null
            // Score estimado: quanto menor RHR e maior SpO₂, melhor recuperação
            let score: number | null = null
            if (rhr != null) {
              // Normalizar RHR (40 bpm = 100%, 80 bpm = 0%)
              score = Math.max(0, Math.min(100, Math.round(100 - ((rhr - 40) / 40) * 100)))
            }
            return {
              user_id: user.id,
              cycle_id: r.fitbit_activity_id,
              sleep_id: null,
              score_state: "SCORED",
              recovery_score: score,
              resting_heart_rate: rhr,
              hrv_rmssd_milli: null,
              spo2_percentage: spo2,
              skin_temp_celsius: null,
            }
          })

        if (recovRows.length > 0) {
          const { error: recovErr } = await supabase.schema("fitbit").from("recovery").upsert(
            recovRows, { onConflict: "cycle_id", ignoreDuplicates: false }
          )
          if (recovErr) console.error("Erro upsert recovery:", JSON.stringify(recovErr))
          else syncedRecoveries += recovRows.length
        }
      }
    } catch (e) { errors.activity = String(e) }

    // ── Treinos ─────────────────────────────────────────────────────────────
    try {
      const workoutRes = await fetch(
        `${FITNESS_API}/sessions?startTime=${new Date(ninetyDaysAgo).toISOString()}&endTime=${new Date(now).toISOString()}`,
        { headers }
      )
      if (workoutRes.ok) {
        const workoutData = await workoutRes.json()
        const sessions: Record<string, unknown>[] = (workoutData.session ?? [])
          .filter((s: Record<string, unknown>) => Number(s.activityType) !== 72) // excluir sono

        const rows = sessions.map(s => ({
          user_id: user.id,
          fitbit_workout_id: String(s.id),
          start_time: new Date(Number(s.startTimeMillis)).toISOString(),
          end_time: new Date(Number(s.endTimeMillis)).toISOString(),
          timezone: null,
          sport_id: Number(s.activityType ?? -1),
          score_state: "SCORED",
          strain: null,
          average_heart_rate: null,
          max_heart_rate: null,
          kilojoule: null,
          percent_recorded: null,
          zone_zero_milli: null,
          zone_one_milli: null,
          zone_two_milli: null,
          zone_three_milli: null,
          zone_four_milli: null,
          zone_five_milli: null,
        }))

        if (rows.length > 0) {
          const { error: workoutErr } = await supabase.schema("fitbit").from("workouts").upsert(
            rows, { onConflict: "fitbit_workout_id", ignoreDuplicates: false }
          )
          if (workoutErr) console.error("Erro upsert workout:", JSON.stringify(workoutErr))
          else syncedWorkouts += rows.length
        }
      } else {
        errors.workout = `HTTP ${workoutRes.status}`
      }
    } catch (e) { errors.workout = String(e) }

    await supabase.schema("fitbit").from("sync_status").upsert(
      { user_id: user.id, last_sync_at: new Date().toISOString(), syncing: false, sync_error: null },
      { onConflict: "user_id" }
    )

    return new Response(
      JSON.stringify({
        success: true,
        synced_activities: syncedActivities,
        synced_recoveries: syncedRecoveries,
        synced_sleeps: syncedSleeps,
        synced_workouts: syncedWorkouts,
        errors,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido"
    await supabase.schema("fitbit").from("sync_status").upsert(
      { user_id: user.id, syncing: false, sync_error: msg },
      { onConflict: "user_id" }
    )
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }
})
