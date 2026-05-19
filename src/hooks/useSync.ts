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
      const msg = `Sincronizado: ${data?.synced_cycles ?? 0} ciclos, ${data?.synced_sleeps ?? 0} sonos, ${data?.synced_workouts ?? 0} treinos`
      setLastResult(msg)
      onComplete?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  return { sync, syncing, error, lastResult }
}
