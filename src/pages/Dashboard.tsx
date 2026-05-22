import { useWhoopData } from '../hooks/useWhoopData'
import { useSync } from '../hooks/useSync'
import { useNavigate, Link } from 'react-router-dom'
import LoadingScreen from '../components/LoadingScreen'
import ArcGauge from '../components/ArcGauge'
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

  const prevRecovery = recentRecoveries[1]?.recovery_score ?? null
  const recovTrend = recoveryScore != null && prevRecovery != null
    ? recoveryScore - prevRecovery
    : null

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
            {latestCycle?.start_time
              ? formatDate(latestCycle.start_time)
              : new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={sync}
            disabled={syncing}
            className="text-xs text-gray-400 border border-white/10 rounded-lg px-3 py-1.5 disabled:opacity-50"
          >
            {syncing ? '...' : '↻ Sync'}
          </button>
          <Link to="/configuracoes" className="text-gray-400 border border-white/10 rounded-lg p-1.5">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </Link>
        </div>
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
          {/* 3 ring summary — WHOOP style */}
          <div className="mx-4 mt-3 bg-surface rounded-3xl px-4 py-5">
            <div className="flex justify-around items-center">
              <RingMetric
                value={recoveryScore}
                max={100}
                color={recovColor}
                label="Recuperação"
                unit="%"
                onTap={() => navigate('/recuperacao')}
              />
              <RingMetric
                value={sleepScore}
                max={100}
                color={sleepColor}
                label="Sono"
                unit="%"
                onTap={() => navigate('/sono')}
              />
              <RingMetric
                value={strain}
                max={21}
                color={strColor}
                label="Esforço"
                unit="/21"
                decimals={1}
                onTap={() => navigate('/esforco')}
              />
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

function RingMetric({
  value, max, color, label, unit, decimals = 0, onTap,
}: {
  value: number | null; max: number; color: string
  label: string; unit: string; decimals?: number; onTap: () => void
}) {
  const display = value != null
    ? decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString()
    : '--'

  return (
    <button onClick={onTap} className="flex flex-col items-center gap-1 active:opacity-70">
      <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
        <ArcGauge value={value} max={max} color={color} size={100} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums leading-none" style={{ color }}>
            {display}
          </span>
          <span className="text-[10px] text-gray-500 mt-0.5">{unit}</span>
        </div>
      </div>
      <span className="text-[11px] text-gray-400 font-medium">{label}</span>
    </button>
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
