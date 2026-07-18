import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function useSync(onComplete?: () => void) {
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const sync = async () => {
    setSyncing(true)
    setError(null)
    setLastResult(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('fitbit-sync')
      if (fnError) throw fnError
      const activities = data?.synced_activities ?? 0
      const sleeps = data?.synced_sleeps ?? 0
      const workouts = data?.synced_workouts ?? 0
      const recoveries = data?.synced_recoveries ?? 0
      const errors = data?.errors ?? {}

      const httpErrors = [errors.sleep, errors.recovery, errors.workout, errors.activity].filter(Boolean)
      if (httpErrors.length > 0) {
        setError(`Erro da API Fitbit: ${httpErrors[0]}`)
      } else {
        setLastResult(`✓ ${activities} atividades · ${sleeps} sonos · ${recoveries} recuperações · ${workouts} treinos`)
      }
      onComplete?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  return { sync, syncing, error, lastResult }
}
