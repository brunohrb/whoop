import { useWhoopData } from '../hooks/useWhoopData'
import { useSync } from '../hooks/useSync'
import CircleProgress from '../components/CircleProgress'
import PageHeader from '../components/PageHeader'
import NoDataBanner from '../components/NoDataBanner'
import LoadingScreen from '../components/LoadingScreen'
import HRZonesBar from '../components/HRZonesBar'
import { strainColor, sportName, workoutDuration, kcalFromKj, formatTime } from '../utils/whoop'

const STRAIN_ZONES = [
  { label: 'Leve', range: '0–9', color: '#4FC3F7' },
  { label: 'Moderado', range: '10–13', color: '#F5C518' },
  { label: 'Intenso', range: '14–17', color: '#FF8C00' },
  { label: 'Extremo', range: '18–21', color: '#FF4444' },
]

export default function Strain() {
  const { latestCycle, recentWorkouts, whoopConnected, loading, refresh } = useWhoopData()
  const { sync, syncing } = useSync(refresh)

  if (loading) return <LoadingScreen />

  const strain = latestCycle?.strain ?? null
  const color = strainColor(strain)

  const todayWorkouts = recentWorkouts.filter(w => {
    if (!latestCycle) return false
    const wStart = new Date(w.start_time).getTime()
    const cStart = new Date(latestCycle.start_time).getTime()
    const cEnd = latestCycle.end_time ? new Date(latestCycle.end_time).getTime() : Date.now()
    return wStart >= cStart && wStart <= cEnd
  })

  const otherWorkouts = recentWorkouts.filter(w => !todayWorkouts.includes(w)).slice(0, 5)

  return (
    <div className="pb-8">
      <PageHeader
        title="Esforço"
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

      {!latestCycle ? (
        <NoDataBanner connected={whoopConnected} onSync={sync} syncing={syncing} />
      ) : (
        <>
          {/* Hero: círculo + métricas lado a lado */}
          <div className="px-4 pt-2 pb-4">
            <div className="bg-surface rounded-3xl p-5">
              <div className="flex items-center gap-4">
                <CircleProgress
                  value={strain}
                  max={21}
                  size={140}
                  strokeWidth={13}
                  color={color}
                  unit="/ 21"
                  label="esforço"
                />
                <div className="flex-1 flex flex-col gap-3">
                  <Metric label="Calorias" value={`${kcalFromKj(latestCycle.kilojoule) || '--'}`} unit="kcal" color="#FF8C00" />
                  <Metric label="FC Média" value={`${latestCycle.average_heart_rate ?? '--'}`} unit="bpm" color="#4FC3F7" />
                  <Metric label="FC Máxima" value={`${latestCycle.max_heart_rate ?? '--'}`} unit="bpm" color="#FF4444" />
                </div>
              </div>

              {/* Legenda de zonas */}
              <div className="flex justify-between mt-5 pt-4 border-t border-white/5">
                {STRAIN_ZONES.map(z => (
                  <div key={z.label} className="flex flex-col items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: z.color }} />
                    <span className="text-[10px] text-gray-400 font-medium">{z.label}</span>
                    <span className="text-[9px] text-gray-600">{z.range}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Treinos de hoje */}
          {todayWorkouts.length > 0 && (
            <div className="px-4 mb-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium px-1">
                Treinos de hoje
              </p>
              <div className="flex flex-col gap-3">
                {todayWorkouts.map(w => <WorkoutCard key={w.id} workout={w} />)}
              </div>
            </div>
          )}

          {/* Treinos recentes */}
          {otherWorkouts.length > 0 && (
            <div className="px-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium px-1">
                Treinos recentes
              </p>
              <div className="flex flex-col gap-3">
                {otherWorkouts.map(w => <WorkoutCard key={w.id} workout={w} />)}
              </div>
            </div>
          )}

          {todayWorkouts.length === 0 && otherWorkouts.length === 0 && (
            <div className="mx-4 bg-surface rounded-2xl p-4 text-center">
              <p className="text-gray-500 text-sm">Nenhum treino registrado</p>
              <p className="text-gray-600 text-xs mt-1">Registre atividades no app WHOOP</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Metric({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-lg font-bold leading-none" style={{ color }}>
        {value} <span className="text-xs font-normal text-gray-400">{unit}</span>
      </p>
    </div>
  )
}

function WorkoutCard({ workout }: { workout: ReturnType<typeof useWhoopData>['recentWorkouts'][0] }) {
  const color = strainColor(workout.strain)
  return (
    <div className="bg-surface rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold">{sportName(workout.sport_id)}</p>
          <p className="text-xs text-gray-400">
            {formatTime(workout.start_time)} · {workoutDuration(workout.start_time, workout.end_time)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold" style={{ color }}>
            {workout.strain?.toFixed(1) ?? '--'}
          </p>
          <p className="text-xs text-gray-400">esforço</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <p className="text-gray-400 text-xs">FC Média</p>
          <p className="font-semibold">{workout.average_heart_rate ?? '--'} <span className="text-xs text-gray-400">bpm</span></p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">FC Máx</p>
          <p className="font-semibold">{workout.max_heart_rate ?? '--'} <span className="text-xs text-gray-400">bpm</span></p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Calorias</p>
          <p className="font-semibold">{kcalFromKj(workout.kilojoule) || '--'} <span className="text-xs text-gray-400">kcal</span></p>
        </div>
      </div>
      {(workout.zone_one_milli || workout.zone_two_milli || workout.zone_three_milli) && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-xs text-gray-400 mb-2">Zonas de FC</p>
          <HRZonesBar workout={workout} />
        </div>
      )}
    </div>
  )
}
