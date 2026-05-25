import { useWhoopData } from '../hooks/useWhoopData'
import { useSync } from '../hooks/useSync'
import { useNavigate, Link } from 'react-router-dom'
import LoadingScreen from '../components/LoadingScreen'
import ArcGauge from '../components/ArcGauge'
import { recoveryColor, strainColor, millisToTime, formatDate, kcalFromKj, sportName } from '../utils/whoop'
import type { WhoopRecovery, WhoopSleep, WhoopWorkout } from '../types'

export default function Dashboard() {
  const {
    latestRecovery, latestSleep, latestCycle,
    recentRecoveries, recentSleeps, recentWorkouts, recentCycles,
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

  // Weekly comparison (this week vs last week)
  const thisWeekRecoveries = recentRecoveries.slice(0, 7)
  const lastWeekRecoveries = recentRecoveries.slice(7, 14)
  const thisWeekSleeps = recentSleeps.slice(0, 7)
  const lastWeekSleeps = recentSleeps.slice(7, 14)
  const thisWeekCycles = recentCycles.slice(0, 7)
  const lastWeekCycles = recentCycles.slice(7, 14)

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null

  const thisWeekAvgRecov = avg(thisWeekRecoveries.map(r => r.recovery_score ?? 0).filter(Boolean))
  const lastWeekAvgRecov = avg(lastWeekRecoveries.map(r => r.recovery_score ?? 0).filter(Boolean))
  const thisWeekAvgSleep = avg(thisWeekSleeps.map(s => s.sleep_performance_percentage ?? 0).filter(Boolean))
  const lastWeekAvgSleep = avg(lastWeekSleeps.map(s => s.sleep_performance_percentage ?? 0).filter(Boolean))
  const thisWeekAvgStrain = avg(thisWeekCycles.map(c => c.strain ? Math.round(c.strain * 10) / 10 : 0).filter(Boolean))
  const lastWeekAvgStrain = avg(lastWeekCycles.map(c => c.strain ? Math.round(c.strain * 10) / 10 : 0).filter(Boolean))

  // Personal records
  const bestRecovery = recentRecoveries.length > 0
    ? Math.max(...recentRecoveries.map(r => r.recovery_score ?? 0))
    : null
  const bestSleep = recentSleeps.length > 0
    ? Math.max(...recentSleeps.map(s => s.sleep_performance_percentage ?? 0))
    : null
  const topWorkout = recentWorkouts.length > 0
    ? recentWorkouts.reduce((best, w) => (w.strain ?? 0) > (best.strain ?? 0) ? w : best)
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

          {/* AI Analysis entry */}
          <Link
            to="/ia"
            className="mx-4 mt-3 bg-gradient-to-r from-whoop-green/15 to-purple-500/15 border border-whoop-green/20 rounded-2xl p-4 flex items-center gap-3 active:opacity-70"
          >
            <span className="text-2xl">🤖</span>
            <div className="flex-1">
              <p className="font-semibold text-sm">Análise por IA</p>
              <p className="text-xs text-gray-400 mt-0.5">O Claude analisa sua saúde completa e dá recomendações</p>
            </div>
            <span className="text-gray-500 text-sm">›</span>
          </Link>

          {/* Strain Coach */}
          {recoveryScore != null && (
            <StrainCoach recovery={recoveryScore} strain={strain} />
          )}

          {/* Insights */}
          <Insights recoveries={recentRecoveries} sleep={latestSleep} />

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

          {/* Weekly comparison */}
          {thisWeekAvgRecov != null && lastWeekAvgRecov != null && (
            <WeekComparison
              thisRecov={thisWeekAvgRecov} lastRecov={lastWeekAvgRecov}
              thisSleep={thisWeekAvgSleep} lastSleep={lastWeekAvgSleep}
              thisStrain={thisWeekAvgStrain} lastStrain={lastWeekAvgStrain}
            />
          )}

          {/* Personal records */}
          {(bestRecovery != null || bestSleep != null || topWorkout != null) && (
            <PersonalRecords
              bestRecovery={bestRecovery}
              bestSleep={bestSleep}
              topWorkout={topWorkout}
            />
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

// ─── Strain Coach ─────────────────────────────────────────────────────────────
function StrainCoach({ recovery, strain }: { recovery: number; strain: number | null }) {
  let zoneLabel: string, zoneColor: string, desc: string, min: number, max: number
  if (recovery >= 67) {
    zoneLabel = 'Verde'; zoneColor = '#00D4A0'
    desc = 'Corpo pronto — busque esforço alto hoje'
    min = 14; max = 21
  } else if (recovery >= 34) {
    zoneLabel = 'Amarela'; zoneColor = '#F5C518'
    desc = 'Esforço moderado — não force demais'
    min = 10; max = 14
  } else {
    zoneLabel = 'Vermelha'; zoneColor = '#FF4444'
    desc = 'Priorize descanso — esforço leve no máximo'
    min = 0; max = 10
  }

  const current = strain ?? 0
  const pct = Math.min(current / 21, 1)

  return (
    <div className="mx-4 mt-3 bg-surface rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Orientação de Esforço</p>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: zoneColor, backgroundColor: `${zoneColor}20` }}>
          Zona {zoneLabel}
        </span>
      </div>
      <p className="text-sm text-gray-300 mb-3">{desc}</p>
      {/* Progress bar */}
      <div className="relative h-2.5 bg-surface-3 rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${pct * 100}%`, backgroundColor: strainColor(strain) }} />
        {/* Target zone band */}
        <div className="absolute inset-y-0 rounded-full opacity-30"
          style={{ left: `${(min / 21) * 100}%`, width: `${((max - min) / 21) * 100}%`, backgroundColor: zoneColor }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-600 mt-1.5">
        <span>0</span>
        <span style={{ color: zoneColor }}>Alvo: {min}–{max}</span>
        <span>21</span>
      </div>
      {strain != null && (
        <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-white/5">
          Esforço atual: <span className="font-bold" style={{ color: strainColor(strain) }}>{strain.toFixed(1)}</span>
          {current >= min && current <= max && <span className="text-whoop-green ml-2">✓ na zona ideal</span>}
          {current > max && <span className="text-red-400 ml-2">acima do alvo</span>}
        </p>
      )}
    </div>
  )
}

// ─── Insights ─────────────────────────────────────────────────────────────────
function Insights({ recoveries, sleep }: { recoveries: WhoopRecovery[]; sleep: WhoopSleep | null }) {
  const insights: { text: string; color: string; icon: string }[] = []

  if (recoveries.length >= 3) {
    // HRV vs 7-day avg
    const todayHRV = recoveries[0]?.hrv_rmssd_milli
    const past = recoveries.slice(1, 8).filter(r => r.hrv_rmssd_milli != null)
    if (todayHRV && past.length >= 3) {
      const avg = past.reduce((s, r) => s + r.hrv_rmssd_milli!, 0) / past.length
      const pct = ((todayHRV - avg) / avg) * 100
      if (pct >= 15) insights.push({ icon: '📈', color: '#00D4A0', text: `VFC ${Math.round(pct)}% acima da média — ótimo sinal de recuperação` })
      else if (pct <= -15) insights.push({ icon: '📉', color: '#FF4444', text: `VFC ${Math.abs(Math.round(pct))}% abaixo da média — corpo pedindo descanso` })
    }

    // Green streak
    let streak = 0
    for (const r of recoveries) { if ((r.recovery_score ?? 0) >= 67) streak++; else break }
    if (streak >= 3) insights.push({ icon: '🔥', color: '#00D4A0', text: `${streak} dias consecutivos de recuperação ótima — você está voando!` })

    // Low recovery streak
    let lowStreak = 0
    for (const r of recoveries) { if ((r.recovery_score ?? 100) < 34) lowStreak++; else break }
    if (lowStreak >= 2) insights.push({ icon: '⚠️', color: '#FF4444', text: `${lowStreak} dias seguidos de recuperação baixa — priorize sono e descanso` })
  }

  // Sleep debt
  if (sleep) {
    const totalSleep = (sleep.total_in_bed_time_milli ?? 0) - (sleep.total_awake_time_milli ?? 0)
    const needed = (sleep.sleep_needed_baseline_milli ?? 0) + (sleep.sleep_needed_from_recent_strain_milli ?? 0) + (sleep.sleep_needed_from_sleep_debt_milli ?? 0)
    if (needed > 0) {
      const pct = totalSleep / needed
      if (pct < 0.85) insights.push({ icon: '😴', color: '#9C59D1', text: `Você dormiu ${Math.round(pct * 100)}% da necessidade — tente dormir mais cedo hoje` })
      else if (pct >= 1.05) insights.push({ icon: '💜', color: '#9C59D1', text: `Sono em dia! Você dormiu mais do que o necessário — ótima recuperação` })
    }
  }

  if (insights.length === 0) return null

  return (
    <div className="mx-4 mt-3 flex flex-col gap-2">
      {insights.slice(0, 3).map((ins, i) => (
        <div key={i} className="bg-surface rounded-xl px-3 py-2.5 flex items-start gap-2.5">
          <span className="text-base leading-none mt-0.5">{ins.icon}</span>
          <p className="text-xs text-gray-300 leading-relaxed">{ins.text}</p>
        </div>
      ))}
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

// ─── Weekly Comparison ────────────────────────────────────────────────────────
function WeekComparison({
  thisRecov, lastRecov, thisSleep, lastSleep, thisStrain, lastStrain,
}: {
  thisRecov: number; lastRecov: number
  thisSleep: number | null; lastSleep: number | null
  thisStrain: number | null; lastStrain: number | null
}) {
  const diff = (a: number, b: number) => {
    const d = a - b
    return { d, sign: d >= 0 ? '+' : '', color: d >= 0 ? '#00D4A0' : '#FF4444' }
  }
  const rd = diff(thisRecov, lastRecov)
  const sd = thisSleep != null && lastSleep != null ? diff(thisSleep, lastSleep) : null
  const std = thisStrain != null && lastStrain != null ? diff(thisStrain, lastStrain) : null

  return (
    <div className="mx-4 mt-3 bg-surface rounded-2xl p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">Esta semana vs anterior</p>
      <div className="grid grid-cols-3 gap-3">
        <WeekCol label="Recuperação" unit="%" this={`${thisRecov}`} diff={rd} />
        {sd && thisSleep != null && <WeekCol label="Sono" unit="%" this={`${thisSleep}`} diff={sd} />}
        {std && thisStrain != null && <WeekCol label="Esforço" unit="/21" this={`${thisStrain}`} diff={std} />}
      </div>
    </div>
  )
}

function WeekCol({ label, unit, this: val, diff }: {
  label: string; unit: string; this: string
  diff: { d: number; sign: string; color: string }
}) {
  return (
    <div className="flex flex-col items-center bg-surface-2 rounded-xl p-2.5">
      <p className="text-[10px] text-gray-500 mb-1">{label}</p>
      <p className="text-base font-bold text-white">{val}<span className="text-xs text-gray-400 ml-0.5">{unit}</span></p>
      <p className="text-[11px] font-semibold mt-0.5" style={{ color: diff.color }}>
        {diff.sign}{Math.round(Math.abs(diff.d))}{unit}
      </p>
    </div>
  )
}

// ─── Personal Records ─────────────────────────────────────────────────────────
function PersonalRecords({
  bestRecovery, bestSleep, topWorkout,
}: {
  bestRecovery: number | null
  bestSleep: number | null
  topWorkout: WhoopWorkout | null
}) {
  return (
    <div className="mx-4 mt-3 bg-surface rounded-2xl p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">🏆 Seus recordes</p>
      <div className="flex flex-col gap-2">
        {bestRecovery != null && (
          <RecordRow
            icon="💚"
            label="Melhor recuperação"
            value={`${Math.round(bestRecovery)}%`}
            color={recoveryColor(bestRecovery)}
          />
        )}
        {bestSleep != null && (
          <RecordRow
            icon="💜"
            label="Melhor sono"
            value={`${Math.round(bestSleep)}%`}
            color="#9C59D1"
          />
        )}
        {topWorkout != null && topWorkout.strain != null && (
          <RecordRow
            icon="⚡"
            label={`Treino mais intenso — ${sportName(topWorkout.sport_id)}`}
            value={`${topWorkout.strain.toFixed(1)} esforço`}
            color={strainColor(topWorkout.strain)}
          />
        )}
      </div>
    </div>
  )
}

function RecordRow({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between bg-surface-2 rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <span className="text-sm font-bold" style={{ color }}>{value}</span>
    </div>
  )
}
