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
      const { data, error: fnError } = await supabase.functions.invoke('whoop-sync')
      if (fnError) throw fnError
      const cycles = data?.synced_cycles ?? 0
      const sleeps = data?.synced_sleeps ?? 0
      const workouts = data?.synced_workouts ?? 0
      const recoveries = data?.synced_recoveries ?? 0

      const apiSleeps = data?.api_sleep_count ?? 0
      const apiWorkouts = data?.api_workout_count ?? 0
      const apiRecoveries = data?.api_recovery_count ?? 0

      if (cycles > 0 && apiSleeps === 0 && apiRecoveries === 0 && apiWorkouts === 0) {
        setError('⚠️ WHOOP retornou 0 registros de sono/recuperação/treino. Desconecte e reconecte o WHOOP para atualizar permissões.')
      } else {
        setLastResult(`✓ ${cycles} ciclos · ${sleeps} sonos · ${recoveries} recuperações · ${workouts} treinos`)
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
