import { millisToTime } from '../utils/whoop'
import type { WhoopSleep } from '../types'

interface Props {
  sleep: WhoopSleep
}

export default function SleepStagesBar({ sleep }: Props) {
  const total = (sleep.total_in_bed_time_milli ?? 1)
  const stages = [
    { label: 'Desperto', ms: sleep.total_awake_time_milli ?? 0, color: '#555' },
    { label: 'Leve', ms: sleep.total_light_sleep_time_milli ?? 0, color: '#4FC3F7' },
    { label: 'Profundo', ms: sleep.total_slow_wave_sleep_time_milli ?? 0, color: '#1565C0' },
    { label: 'REM', ms: sleep.total_rem_sleep_time_milli ?? 0, color: '#9C59D1' },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-6 rounded-full overflow-hidden gap-0.5">
        {stages.map(s => {
          const pct = (s.ms / total) * 100
          if (pct < 1) return null
          return (
            <div
              key={s.label}
              style={{ width: `${pct}%`, backgroundColor: s.color }}
              className="transition-all duration-500"
            />
          )
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {stages.map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">{s.label}</span>
              <span className="text-sm font-semibold">{millisToTime(s.ms)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
