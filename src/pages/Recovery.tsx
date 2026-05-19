import { useWhoopData } from '../hooks/useWhoopData'
import { useSync } from '../hooks/useSync'
import CircleProgress from '../components/CircleProgress'
import MetricCard from '../components/MetricCard'
import PageHeader from '../components/PageHeader'
import NoDataBanner from '../components/NoDataBanner'
import LoadingScreen from '../components/LoadingScreen'
import { recoveryColor, recoveryLevel, formatShortDate } from '../utils/whoop'
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from 'recharts'

export default function Recovery() {
  const { latestRecovery, latestCycle, recentRecoveries, recentCycles, whoopConnected, loading, refresh } = useWhoopData()
  const { sync, syncing } = useSync(refresh)

  if (loading) return <LoadingScreen />

  const score = latestRecovery?.recovery_score ?? null
  const color = recoveryColor(score)
  const level = recoveryLevel(score)
  const levelLabel = { green: 'Boa', yellow: 'Moderada', red: 'Baixa', unknown: 'Sem dados' }[level]

  const chartData = recentCycles
    .slice(0, 14)
    .reverse()
    .map(cycle => {
      const rec = recentRecoveries.find(r => r.cycle_id === cycle.whoop_cycle_id)
      return {
        date: formatShortDate(cycle.start_time),
        score: rec?.recovery_score ?? 0,
        color: recoveryColor(rec?.recovery_score),
      }
    })

  const hrv = latestRecovery?.hrv_rmssd_milli
    ? Math.round(latestRecovery.hrv_rmssd_milli)
    : null

  const rhr = latestRecovery?.resting_heart_rate
    ? Math.round(latestRecovery.resting_heart_rate)
    : null

  const spo2 = latestRecovery?.spo2_percentage
    ? latestRecovery.spo2_percentage.toFixed(1)
    : null

  const temp = latestRecovery?.skin_temp_celsius
    ? latestRecovery.skin_temp_celsius.toFixed(1)
    : null

  return (
    <div className="pb-6">
      <PageHeader
        title="Recuperação"
        date={latestCycle?.start_time}
        right={
          <button
            onClick={sync}
            disabled={syncing}
            className="text-xs text-gray-400 border border-white/10 rounded-lg px-3 py-1.5 disabled:opacity-50"
          >
            {syncing ? '...' : '↻'}
          </button>
        }
      />

      {!latestRecovery ? (
        <NoDataBanner connected={whoopConnected} onSync={sync} syncing={syncing} />
      ) : (
        <>
          {/* Score principal */}
          <div className="flex flex-col items-center py-6">
            <CircleProgress value={score} size={210} strokeWidth={16} color={color} unit="%" />
            <p className="text-lg font-semibold mt-3" style={{ color }}>
              Recuperação {levelLabel}
            </p>
          </div>

          {/* Métricas */}
          <div className="px-4 grid grid-cols-2 gap-3">
            <MetricCard
              label="VFC"
              value={hrv}
              unit="ms"
              sub="Variabilidade cardíaca"
              color="#00D4A0"
              icon={<WaveIcon />}
            />
            <MetricCard
              label="FCC"
              value={rhr}
              unit="bpm"
              sub="Frequência em repouso"
              color="#4FC3F7"
              icon={<HeartIcon />}
            />
            <MetricCard
              label="SpO₂"
              value={spo2}
              unit="%"
              sub="Oxigênio no sangue"
              color="#9C59D1"
              icon={<DropIcon />}
            />
            <MetricCard
              label="Temp. Pele"
              value={temp}
              unit="°C"
              sub="Temperatura cutânea"
              color="#FF8C00"
              icon={<TempIcon />}
            />
          </div>

          {/* Histórico 14 dias */}
          {chartData.length > 1 && (
            <div className="px-4 mt-4 bg-surface mx-4 rounded-2xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">
                Últimos 14 dias
              </p>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={chartData} barCategoryGap={4}>
                  <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Bar dataKey="score" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const WaveIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
  </svg>
)
const HeartIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.53L12 21.35z"/>
  </svg>
)
const DropIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2c-5.33 4.55-8 8.48-8 11.8C4 17.78 7.58 22 12 22s8-4.22 8-8.2C20 10.48 17.33 6.55 12 2z"/>
  </svg>
)
const TempIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4zm-3 7c-1.65 0-3-1.35-3-3 0-1.3.84-2.4 2-2.82V5c0-.55.45-1 1-1s1 .45 1 1v9.18c1.16.42 2 1.52 2 2.82 0 1.65-1.35 3-3 3z"/>
  </svg>
)
