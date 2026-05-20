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

      if (cycles > 0 && sleeps === 0 && recoveries === 0 && workouts === 0) {
        setError('⚠️ Permissões insuficientes: sono, recuperação e treinos não foram sincronizados. Vá em developer.whoop.com, habilite Sleep/Recovery/Workout no seu app, desconecte e reconecte o WHOOP.')
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
