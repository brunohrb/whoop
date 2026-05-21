import { useWhoopData } from '../hooks/useWhoopData'
import { useSync } from '../hooks/useSync'
import { useNavigate } from 'react-router-dom'
import LoadingScreen from '../components/LoadingScreen'
import { recoveryColor, strainColor, millisToTime, formatDate, kcalFromKj } from '../utils/whoop'

export default function Dashboard() {
  const {
    latestRecovery, latestSleep, latestCycle,
    recentRecoveries,
    whoopConnected, loading, refresh,
  } = useWhoopData()
  const { sync, syncing } = useSync(refresh)
  const navigate = useNavigate()

  if (loading) return <LoadingScreen />

  const recoveryScore = latestRecovery?.recovery_score ?? null
  const sleepScore = latestSleep?.sleep_performance_percentage ?? null
  const strain = latestCycle?.strain ?? null

  const recovColor = recoveryColor(recoveryScore)
  const strColor = strainColor(strain)
  const sleepColor = '#9C59D1'

  const totalSleep = latestSleep
    ? (latestSleep.total_in_bed_time_milli ?? 0) - (latestSleep.total_awake_time_milli ?? 0)
    : null

  // Trend vs yesterday
  const prevRecovery = recentRecoveries[1]?.recovery_score ?? null
  const recovTrend = recoveryScore != null && prevRecovery != null
    ? recoveryScore - prevRecovery
    : null

  // 7-day avg recovery
  const weekAvg = recentRecoveries.slice(0, 7).length > 0
    ? Math.round(recentRecoveries.slice(0, 7).reduce((s, r) => s + (r.recovery_score ?? 0), 0) / recentRecoveries.slice(0, 7).length)
    : null

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-5 pt-14 pb-2 safe-top flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hoje</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {latestCycle?.start_time ? formatDate(latestCycle.start_time) : new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          onClick={sync}
          disabled={syncing}
          className="text-xs text-gray-400 border border-white/10 rounded-lg px-3 py-1.5 disabled:opacity-50 mt-1"
        >
          {syncing ? '...' : '↻ Sync'}
        </button>
      </div>

      {!whoopConnected ? (
        <div className="mx-4 mt-4 bg-surface rounded-2xl p-6 text-center">
          <p className="text-gray-400 mb-3">WHOOP não conectado</p>
          <button
            onClick={() => navigate('/conectar-whoop')}
            className="bg-whoop-green text-black font-bold py-2.5 px-6 rounded-xl text-sm"
          >
            Conectar WHOOP
          </button>
        </div>
      ) : (
        <>
          {/* 3 metric summary */}
          <div className="mx-4 mt-3 bg-surface rounded-3xl overflow-hidden">
            <div className="flex">
              <button onClick={() => navigate('/recuperacao')} className="flex-1 flex flex-col items-center py-5 px-2 gap-1 active:opacity-70 border-r border-white/8">
                <span className="text-4xl font-bold tabular-nums" style={{ color: recovColor }}>
                  {recoveryScore != null ? Math.round(recoveryScore) : '--'}
                </span>
                <span className="text-[11px] text-gray-500 mt-0.5">% recuperação</span>
              </button>

              <button onClick={() => navigate('/sono')} className="flex-1 flex flex-col items-center py-5 px-2 gap-1 active:opacity-70 border-r border-white/8">
                <span className="text-4xl font-bold tabular-nums" style={{ color: sleepColor }}>
                  {sleepScore != null ? Math.round(sleepScore) : '--'}
                </span>
                <span className="text-[11px] text-gray-500 mt-0.5">% sono</span>
              </button>

              <button onClick={() => navigate('/esforco')} className="flex-1 flex flex-col items-center py-5 px-2 gap-1 active:opacity-70">
                <span className="text-4xl font-bold tabular-nums" style={{ color: strColor }}>
                  {strain != null ? strain.toFixed(1) : '--'}
                </span>
                <span className="text-[11px] text-gray-500 mt-0.5">/21 esforço</span>
              </button>
            </div>
          </div>

          {/* Recovery detail card */}
          {latestRecovery && (
            <div className="mx-4 mt-3 bg-surface rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Recuperação</p>
                {recovTrend != null && (
                  <span className={`text-xs font-semibold ${recovTrend >= 0 ? 'text-whoop-green' : 'text-red-400'}`}>
                    {recovTrend >= 0 ? '↑' : '↓'} {Math.abs(Math.round(recovTrend))}pts vs ontem
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="VFC" value={latestRecovery.hrv_rmssd_milli ? `${Math.round(latestRecovery.hrv_rmssd_milli)}` : '--'} unit="ms" color="#00D4A0" />
                <MiniStat label="FC Repouso" value={latestRecovery.resting_heart_rate ? `${Math.round(latestRecovery.resting_heart_rate)}` : '--'} unit="bpm" color="#4FC3F7" />
                <MiniStat label="SpO₂" value={latestRecovery.spo2_percentage ? `${latestRecovery.spo2_percentage.toFixed(1)}` : '--'} unit="%" color="#9C59D1" />
                <MiniStat label="Temp. Pele" value={latestRecovery.skin_temp_celsius ? `${latestRecovery.skin_temp_celsius.toFixed(1)}` : '--'} unit="°C" color="#FF8C00" />
              </div>
              {weekAvg != null && (
                <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-white/5">
                  Média 7 dias: <span className="font-semibold" style={{ color: recoveryColor(weekAvg) }}>{weekAvg}%</span>
                </p>
              )}
            </div>
          )}

          {/* Sleep detail card */}
          {latestSleep && totalSleep != null && (
            <div className="mx-4 mt-3 bg-surface rounded-2xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Sono</p>
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Total" value={millisToTime(totalSleep)} unit="" color="#9C59D1" />
                <MiniStat label="Eficiência" value={latestSleep.sleep_efficiency_percentage ? `${latestSleep.sleep_efficiency_percentage.toFixed(0)}` : '--'} unit="%" color="#4FC3F7" />
                <MiniStat label="Freq. resp." value={latestSleep.respiratory_rate ? `${latestSleep.respiratory_rate.toFixed(1)}` : '--'} unit="rpm" color="#00D4A0" />
                <MiniStat label="Consistência" value={latestSleep.sleep_consistency_percentage ? `${latestSleep.sleep_consistency_percentage.toFixed(0)}` : '--'} unit="%" color="#F5C518" />
              </div>
            </div>
          )}

          {/* Strain + calories */}
          {latestCycle && (
            <div className="mx-4 mt-3 bg-surface rounded-2xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Esforço</p>
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Esforço" value={strain ? strain.toFixed(1) : '--'} unit="/ 21" color={strColor} />
                <MiniStat label="Calorias" value={`${kcalFromKj(latestCycle.kilojoule) || '--'}`} unit="kcal" color="#FF8C00" />
                <MiniStat label="FC Média" value={`${latestCycle.average_heart_rate ?? '--'}`} unit="bpm" color="#4FC3F7" />
                <MiniStat label="FC Máxima" value={`${latestCycle.max_heart_rate ?? '--'}`} unit="bpm" color="#FF4444" />
              </div>
            </div>
          )}

          {/* No data at all */}
          {!latestRecovery && !latestSleep && !latestCycle && (
            <div className="mx-4 mt-4 bg-surface rounded-2xl p-6 text-center">
              <p className="text-gray-400 text-sm mb-3">Nenhum dado ainda</p>
              <button
                onClick={sync}
                disabled={syncing}
                className="bg-whoop-green text-black font-bold py-2.5 px-6 rounded-xl text-sm disabled:opacity-50"
              >
                {syncing ? 'Sincronizando...' : '↻ Sincronizar'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function MiniStat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="bg-surface-2 rounded-xl p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="font-bold" style={{ color }}>
        {value} <span className="text-xs font-normal text-gray-400">{unit}</span>
      </p>
    </div>
  )
}
