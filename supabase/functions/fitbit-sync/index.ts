import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const FITBIT_CLIENT_ID = Deno.env.get("FITBIT_CLIENT_ID")!
const FITBIT_CLIENT_SECRET = Deno.env.get("FITBIT_CLIENT_SECRET")!
const FITBIT_API = "https://api.fitbit.com"

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

  const { data: tokenData, error: tokenError } = await supabase
    .schema("fitbit")
    .from("user_tokens")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (tokenError || !tokenData) {
    return new Response(JSON.stringify({ error: "Fitbit não conectado" }), {
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
      const basicAuth = btoa(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`)
      const refreshRes = await fetch(`${FITBIT_API}/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokenData.refresh_token,
        }),
      })

      if (refreshRes.ok) {
        const newTokens = await refreshRes.json()
        accessToken = newTokens.access_token
        await supabase.schema("fitbit").from("user_tokens").update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token ?? tokenData.refresh_token,
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

  const headers = { Authorization: `Bearer ${accessToken}` }

  // Datas dos últimos 90 dias
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 90)
  const startStr = startDate.toISOString().split("T")[0]
  const endStr = endDate.toISOString().split("T")[0]

  let syncedActivities = 0
  let syncedSleeps = 0
  let syncedWorkouts = 0
  let syncedRecoveries = 0
  const errors: Record<string, string> = {}

  try {
    // ── Sincronizar sono ────────────────────────────────────────────────────────
    // Fitbit permite até 100 dias por chamada
    try {
      const sleepRes = await fetch(
        `${FITBIT_API}/1.2/user/-/sleep/dateRange/${startStr}/${endStr}.json`,
        { headers }
      )
      if (sleepRes.ok) {
        const sleepData = await sleepRes.json()
        const sleepLogs: Record<string, unknown>[] = sleepData.sleep ?? []
        if (sleepLogs.length > 0) {
          const rows = sleepLogs.map(s => {
            const levels = (s.levels as Record<string, unknown>)?.summary as Record<string, unknown> | null
            const deep = (levels?.deep as Record<string, unknown>)?.minutes ?? 0
            const light = (levels?.light as Record<string, unknown>)?.minutes ?? 0
            const rem = (levels?.rem as Record<string, unknown>)?.minutes ?? 0
            const wake = (levels?.wake as Record<string, unknown>)?.minutes ?? 0
            return {
              user_id: user.id,
              fitbit_sleep_id: String(s.logId),
              start_time: s.startTime,
              end_time: s.endTime ?? null,
              timezone: null,
              nap: s.isMainSleep === false,
              score_state: "SCORED",
              total_in_bed_time_milli: Number(s.timeInBed ?? 0) * 60000,
              total_awake_time_milli: Number(wake) * 60000,
              total_light_sleep_time_milli: Number(light) * 60000,
              total_slow_wave_sleep_time_milli: Number(deep) * 60000,
              total_rem_sleep_time_milli: Number(rem) * 60000,
              total_no_data_time_milli: null,
              sleep_cycle_count: null,
              disturbance_count: null,
              sleep_needed_baseline_milli: null,
              sleep_needed_from_sleep_debt_milli: null,
              sleep_needed_from_recent_strain_milli: null,
              sleep_needed_from_recent_nap_milli: null,
              respiratory_rate: (s.levels as Record<string, unknown>)?.data
                ? null // detailed respiratory rate not in basic sleep API
                : null,
              sleep_performance_percentage: s.efficiency ?? null,
              sleep_consistency_percentage: null,
              sleep_efficiency_percentage: s.efficiency ?? null,
            }
          })
          const { error: sleepErr } = await supabase.schema("fitbit").from("sleep").upsert(
            rows,
            { onConflict: "fitbit_sleep_id", ignoreDuplicates: false }
          )
          if (sleepErr) console.error("Erro upsert sleep:", JSON.stringify(sleepErr))
          else syncedSleeps += rows.length
        }
      } else {
        errors.sleep = `HTTP ${sleepRes.status}`
      }
    } catch (e) {
      errors.sleep = String(e)
    }

    // ── HRV e FC repouso (últimos 30 dias — limite da API) ──────────────────
    // Fazemos 3 blocos de 30 dias para cobrir 90 dias
    const dateRanges: [string, string][] = []
    for (let i = 0; i < 3; i++) {
      const rangeEnd = new Date(endDate)
      rangeEnd.setDate(rangeEnd.getDate() - i * 30)
      const rangeStart = new Date(rangeEnd)
      rangeStart.setDate(rangeStart.getDate() - 29)
      if (rangeStart < startDate) rangeStart.setTime(startDate.getTime())
      dateRanges.push([
        rangeStart.toISOString().split("T")[0],
        rangeEnd.toISOString().split("T")[0],
      ])
    }

    const hrvMap: Record<string, { hrv: number | null; rhr: number | null; spo2: number | null }> = {}

    for (const [rs, re] of dateRanges) {
      // HRV
      try {
        const hrvRes = await fetch(`${FITBIT_API}/1/user/-/hrv/date/${rs}/${re}.json`, { headers })
        if (hrvRes.ok) {
          const hrvData = await hrvRes.json()
          for (const entry of (hrvData.hrv ?? [])) {
            const date = entry.dateTime as string
            const rmssd = (entry.value as Record<string, unknown>)?.dailyRmssd as number | null
            if (!hrvMap[date]) hrvMap[date] = { hrv: null, rhr: null, spo2: null }
            hrvMap[date].hrv = rmssd ?? null
          }
        }
      } catch (e) { console.error("Erro HRV:", e) }

      // FC de repouso via heart rate summary
      try {
        const hrRes = await fetch(
          `${FITBIT_API}/1/user/-/activities/heart/date/${rs}/${re}/1d.json`,
          { headers }
        )
        if (hrRes.ok) {
          const hrData = await hrRes.json()
          for (const entry of (hrData["activities-heart"] ?? [])) {
            const date = entry.dateTime as string
            const rhr = (entry.value as Record<string, unknown>)?.restingHeartRate as number | null
            if (!hrvMap[date]) hrvMap[date] = { hrv: null, rhr: null, spo2: null }
            hrvMap[date].rhr = rhr ?? null
          }
        }
      } catch (e) { console.error("Erro RHR:", e) }

      // SpO2
      try {
        const spo2Res = await fetch(`${FITBIT_API}/1/user/-/spo2/date/${rs}/${re}.json`, { headers })
        if (spo2Res.ok) {
          const spo2Data = await spo2Res.json()
          for (const entry of (spo2Data ?? [])) {
            const date = (entry as Record<string, unknown>).dateTime as string
            const avg = ((entry as Record<string, unknown>).value as Record<string, unknown>)?.avg as number | null
            if (!hrvMap[date]) hrvMap[date] = { hrv: null, rhr: null, spo2: null }
            hrvMap[date].spo2 = avg ?? null
          }
        }
      } catch (e) { console.error("Erro SpO2:", e) }

      await new Promise(r => setTimeout(r, 300))
    }

    // ── Atividades diárias (equivalente a "cycles") ─────────────────────────
    // Usamos heart rate + activities summary por data
    try {
      const actRes = await fetch(
        `${FITBIT_API}/1/user/-/activities/heart/date/${startStr}/${endStr}/1d.json`,
        { headers }
      )
      if (actRes.ok) {
        const actData = await actRes.json()
        const entries: Record<string, unknown>[] = actData["activities-heart"] ?? []
        const rows = entries.map(e => {
          const date = e.dateTime as string
          const val = e.value as Record<string, unknown>
          const zones: Record<string, unknown>[] = (val.heartRateZones as Record<string, unknown>[]) ?? []
          const fatBurnZone = zones.find(z => z.name === "Fat Burn")
          const cardioZone = zones.find(z => z.name === "Cardio")
          const peakZone = zones.find(z => z.name === "Peak")

          const azm = zones.reduce((acc, z) => acc + (Number((z as Record<string, unknown>).minutes) || 0), 0)

          return {
            user_id: user.id,
            fitbit_activity_id: date.replace(/-/g, ""),
            start_time: `${date}T00:00:00`,
            end_time: `${date}T23:59:59`,
            timezone: null,
            score_state: "SCORED",
            strain: azm > 0 ? Math.min(azm / 10, 21) : null, // AZM → escala 0-21
            kilojoule: null,
            average_heart_rate: val.restingHeartRate ? Number(val.restingHeartRate) : null,
            max_heart_rate: peakZone ? Number((peakZone as Record<string, unknown>).max ?? 0) : null,
          }
        })
        const { error: actErr } = await supabase.schema("fitbit").from("cycles").upsert(
          rows,
          { onConflict: "fitbit_activity_id", ignoreDuplicates: false }
        )
        if (actErr) console.error("Erro upsert cycles:", JSON.stringify(actErr))
        else syncedActivities += rows.length

        // Salvar recovery para cada data usando HRV map
        if (Object.keys(hrvMap).length > 0) {
          const recovRows = rows.map(r => {
            const date = (r.start_time as string).split("T")[0]
            const hrv = hrvMap[date]
            return {
              user_id: user.id,
              cycle_id: r.fitbit_activity_id,
              sleep_id: null,
              score_state: "SCORED",
              recovery_score: hrv?.hrv
                ? Math.min(100, Math.round((hrv.hrv / 80) * 100))
                : null,
              resting_heart_rate: hrv?.rhr ?? r.average_heart_rate,
              hrv_rmssd_milli: hrv?.hrv ?? null,
              spo2_percentage: hrv?.spo2 ?? null,
              skin_temp_celsius: null,
            }
          }).filter(r => r.hrv_rmssd_milli != null || r.resting_heart_rate != null)

          if (recovRows.length > 0) {
            const { error: recovErr } = await supabase.schema("fitbit").from("recovery").upsert(
              recovRows,
              { onConflict: "cycle_id", ignoreDuplicates: false }
            )
            if (recovErr) console.error("Erro upsert recovery:", JSON.stringify(recovErr))
            else syncedRecoveries += recovRows.length
          }
        }
      } else {
        errors.activity = `HTTP ${actRes.status}`
      }
    } catch (e) {
      errors.activity = String(e)
    }

    // ── Treinos (activity log) ──────────────────────────────────────────────
    try {
      let offset = 0
      let hasMore = true
      while (hasMore && offset < 200) {
        const wRes = await fetch(
          `${FITBIT_API}/1/user/-/activities/list.json?afterDate=${startStr}&sort=asc&limit=20&offset=${offset}`,
          { headers }
        )
        if (!wRes.ok) {
          errors.workout = `HTTP ${wRes.status}`
          break
        }
        const wData = await wRes.json()
        const activities: Record<string, unknown>[] = wData.activities ?? []

        if (activities.length === 0) {
          hasMore = false
          break
        }

        const rows = activities.map(w => {
          const hrZones: Record<string, unknown>[] = (w.heartRateZones as Record<string, unknown>[]) ?? []
          const zone = (name: string) => hrZones.find(z => z.name === name)
          return {
            user_id: user.id,
            fitbit_workout_id: String(w.logId),
            start_time: w.startTime,
            end_time: w.startTime
              ? new Date(new Date(w.startTime as string).getTime() + Number(w.duration ?? 0)).toISOString()
              : null,
            timezone: null,
            sport_id: Number(w.activityTypeId ?? -1),
            score_state: "SCORED",
            strain: null,
            average_heart_rate: w.averageHeartRate ?? null,
            max_heart_rate: null,
            kilojoule: w.calories ? Math.round(Number(w.calories) * 4.184) : null,
            percent_recorded: null,
            zone_zero_milli: zone("Out of Range") ? Number((zone("Out of Range") as Record<string, unknown>).minutes ?? 0) * 60000 : null,
            zone_one_milli: zone("Fat Burn") ? Number((zone("Fat Burn") as Record<string, unknown>).minutes ?? 0) * 60000 : null,
            zone_two_milli: zone("Cardio") ? Number((zone("Cardio") as Record<string, unknown>).minutes ?? 0) * 60000 : null,
            zone_three_milli: zone("Peak") ? Number((zone("Peak") as Record<string, unknown>).minutes ?? 0) * 60000 : null,
            zone_four_milli: null,
            zone_five_milli: null,
          }
        })

        const { error: workoutErr } = await supabase.schema("fitbit").from("workouts").upsert(
          rows,
          { onConflict: "fitbit_workout_id", ignoreDuplicates: false }
        )
        if (workoutErr) console.error("Erro upsert workout:", JSON.stringify(workoutErr))
        else syncedWorkouts += rows.length

        offset += activities.length
        hasMore = wData.pagination?.next != null && activities.length === 20
        if (hasMore) await new Promise(r => setTimeout(r, 300))
      }
    } catch (e) {
      errors.workout = String(e)
    }

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
