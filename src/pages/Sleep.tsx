import { useWhoopData } from '../hooks/useWhoopData'
import { useSync } from '../hooks/useSync'
import MetricCard from '../components/MetricCard'
import PageHeader from '../components/PageHeader'
import NoDataBanner from '../components/NoDataBanner'
import LoadingScreen from '../components/LoadingScreen'
import SleepStagesBar from '../components/SleepStagesBar'
import { millisToTime, millisToHours, formatTime, formatShortDate } from '../utils/whoop'
import { BarChart, Bar, XAxis, ResponsiveContainer } from 'recharts'

export default function Sleep() {
  const { latestSleep, recentSleeps, whoopConnected, loading, refresh } = useWhoopData()
  const { sync, syncing } = useSync(refresh)

  if (loading) return <LoadingScreen />

  const perfScore = latestSleep?.sleep_performance_percentage ?? null
  const totalSleep = (latestSleep?.total_in_bed_time_milli ?? 0) - (latestSleep?.total_awake_time_milli ?? 0)

  const chartData = recentSleeps
    .slice(0, 14)
    .reverse()
    .map(s => ({
      date: formatShortDate(s.start_time),
      horas: Math.round(millisToHours(
        (s.total_in_bed_time_milli ?? 0) - (s.total_awake_time_milli ?? 0)
      ) * 10) / 10,
    }))

  return (
    <div className="pb-6">
      <PageHeader
        title="Sono"
        date={latestSleep?.start_time}
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

      {!latestSleep ? (
        <NoDataBanner connected={whoopConnected} onSync={sync} syncing={syncing} />
      ) : (
        <>
          {/* Score + horários */}
          <div className="mx-4 mt-3 bg-surface rounded-3xl overflow-hidden">
            <div className="flex">
              <div className="flex-1 flex flex-col items-center py-5 px-2 gap-1 border-r border-white/8">
                <span className="text-4xl font-bold tabular-nums" style={{ color: '#9C59D1' }}>
                  {perfScore != null ? Math.round(perfScore) : '--'}
                </span>
                <span className="text-[11px] text-gray-500 mt-0.5">% desempenho</span>
              </div>
              <div className="flex-1 flex flex-col items-center py-5 px-2 gap-1 border-r border-white/8">
                <span className="text-2xl font-bold tabular-nums text-white">{formatTime(latestSleep.start_time)}</span>
                <span className="text-[11px] text-gray-500 mt-0.5">dormiu</span>
              </div>
              <div className="flex-1 flex flex-col items-center py-5 px-2 gap-1 border-r border-white/8">
                <span className="text-2xl font-bold tabular-nums text-white">{formatTime(latestSleep.end_time)}</span>
                <span className="text-[11px] text-gray-500 mt-0.5">acordou</span>
              </div>
              <div className="flex-1 flex flex-col items-center py-5 px-2 gap-1">
                <span className="text-2xl font-bold tabular-nums" style={{ color: '#9C59D1' }}>{millisToTime(totalSleep)}</span>
                <span className="text-[11px] text-gray-500 mt-0.5">total</span>
              </div>
            </div>
          </div>

          {/* Métricas */}
          <div className="px-4 grid grid-cols-2 gap-3">
            <MetricCard
              label="Eficiência"
              value={latestSleep.sleep_efficiency_percentage?.toFixed(0)}
              unit="%"
              color="#9C59D1"
            />
            <MetricCard
              label="Consistência"
              value={latestSleep.sleep_consistency_percentage?.toFixed(0)}
              unit="%"
              color="#4FC3F7"
            />
            <MetricCard
              label="Na cama"
              value={millisToTime(latestSleep.total_in_bed_time_milli)}
              color="#fff"
            />
            <MetricCard
              label="Distúrbios"
              value={latestSleep.disturbance_count ?? '--'}
              sub="vezes acordado"
              color={
                (latestSleep.disturbance_count ?? 0) > 5 ? '#FF4444' : '#00D4A0'
              }
            />
          </div>

          {/* Necessidade de sono */}
          {latestSleep.sleep_needed_baseline_milli && (
            <div className="mx-4 mt-3 bg-surface rounded-2xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-medium">Necessidade de sono</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min((totalSleep / latestSleep.sleep_needed_baseline_milli) * 100, 100)}%`,
                      backgroundColor: '#9C59D1',
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-purple-400">
                  {millisToTime(latestSleep.sleep_needed_baseline_milli)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Dormido: {millisToTime(totalSleep)}</span>
                <span>Meta: {millisToTime(latestSleep.sleep_needed_baseline_milli)}</span>
              </div>
            </div>
          )}

          {/* Estágios do sono */}
          <div className="mx-4 mt-3 bg-surface rounded-2xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">Estágios</p>
            <SleepStagesBar sleep={latestSleep} />
          </div>

          {/* Histórico */}
          {chartData.length > 1 && (
            <div className="mx-4 mt-3 bg-surface rounded-2xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">
                Últimos 14 dias (horas)
              </p>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={chartData} barCategoryGap={4}>
                  <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Bar dataKey="horas" fill="#9C59D1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
