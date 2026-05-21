import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { WhoopCycle, WhoopRecovery, WhoopSleep, WhoopWorkout, WhoopProfile, SyncStatus } from '../types'

interface WhoopData {
  latestCycle: WhoopCycle | null
  latestRecovery: WhoopRecovery | null
  latestSleep: WhoopSleep | null
  recentWorkouts: WhoopWorkout[]
  recentCycles: WhoopCycle[]
  recentRecoveries: WhoopRecovery[]
  recentSleeps: WhoopSleep[]
  recentNaps: WhoopSleep[]
  profile: WhoopProfile | null
  syncStatus: SyncStatus | null
  whoopConnected: boolean
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useWhoopData(): WhoopData {
  const [data, setData] = useState<Omit<WhoopData, 'refresh'>>({
    latestCycle: null,
    latestRecovery: null,
    latestSleep: null,
    recentWorkouts: [],
    recentCycles: [],
    recentRecoveries: [],
    recentSleeps: [],
    recentNaps: [],
    profile: null,
    syncStatus: null,
    whoopConnected: false,
    loading: true,
    error: null,
  })

  const fetch = useCallback(async () => {
    setData(d => ({ ...d, loading: true, error: null }))
    try {
      const [
        { data: tokenData },
        { data: profileData },
        { data: cyclesData },
        { data: workoutsData },
        { data: sleepsData },
        { data: syncData },
      ] = await Promise.all([
        supabase.schema('whoop').from('user_tokens').select('whoop_user_id').single(),
        supabase.schema('whoop').from('profiles').select('*').single(),
        supabase.schema('whoop').from('cycles').select('*').order('start_time', { ascending: false }).limit(30),
        supabase.schema('whoop').from('workouts').select('*').order('start_time', { ascending: false }).limit(20),
        supabase.schema('whoop').from('sleep').select('*').order('start_time', { ascending: false }).limit(60),
        supabase.schema('whoop').from('sync_status').select('*').single(),
      ])

      const cycles = cyclesData ?? []
      const allSleeps = sleepsData ?? []
      const sleeps = allSleeps.filter(s => !s.nap)
      const naps = allSleeps.filter(s => s.nap)

      const latestCycle = cycles[0] ?? null
      const latestSleep = sleeps[0] ?? null

      let latestRecovery: WhoopRecovery | null = null
      let recentRecoveries: WhoopRecovery[] = []

      if (cycles.length > 0) {
        const cycleIds = cycles.map(c => c.whoop_cycle_id)
        const { data: recoveryData } = await supabase
          .schema('whoop')
          .from('recovery')
          .select('*')
          .in('cycle_id', cycleIds)
          .order('cycle_id', { ascending: false })
          .limit(30)

        recentRecoveries = recoveryData ?? []
        latestRecovery = recentRecoveries[0] ?? null
      }

      setData({
        latestCycle,
        latestRecovery,
        latestSleep,
        recentWorkouts: workoutsData ?? [],
        recentCycles: cycles,
        recentRecoveries,
        recentSleeps: sleeps,
        recentNaps: naps,
        profile: profileData,
        syncStatus: syncData,
        whoopConnected: !!tokenData?.whoop_user_id,
        loading: false,
        error: null,
      })
    } catch (err) {
      setData(d => ({
        ...d,
        loading: false,
        error: err instanceof Error ? err.message : 'Erro ao carregar dados',
      }))
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { ...data, refresh: fetch }
}
