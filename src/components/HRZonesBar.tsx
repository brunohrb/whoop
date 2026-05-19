import { millisToTime } from '../utils/whoop'
import type { WhoopWorkout } from '../types'

interface Props {
  workout: WhoopWorkout
}

const ZONES = [
  { label: 'Zona 1', key: 'zone_one_milli' as const, color: '#4FC3F7', desc: '50–60% FCM' },
  { label: 'Zona 2', key: 'zone_two_milli' as const, color: '#81C784', desc: '60–70% FCM' },
  { label: 'Zona 3', key: 'zone_three_milli' as const, color: '#F5C518', desc: '70–80% FCM' },
  { label: 'Zona 4', key: 'zone_four_milli' as const, color: '#FF8C00', desc: '80–90% FCM' },
  { label: 'Zona 5', key: 'zone_five_milli' as const, color: '#FF4444', desc: '90–100% FCM' },
]

export default function HRZonesBar({ workout }: Props) {
  const totalMs = ZONES.reduce((sum, z) => sum + (workout[z.key] ?? 0), 0) || 1

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-5 rounded-full overflow-hidden gap-0.5">
        {ZONES.map(z => {
          const ms = workout[z.key] ?? 0
          const pct = (ms / totalMs) * 100
          if (pct < 0.5) return null
          return (
            <div
              key={z.key}
              style={{ width: `${pct}%`, backgroundColor: z.color }}
              className="transition-all duration-500"
            />
          )
        })}
      </div>
      <div className="flex flex-col gap-2">
        {ZONES.map(z => {
          const ms = workout[z.key] ?? 0
          const pct = Math.round((ms / totalMs) * 100)
          return (
            <div key={z.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: z.color }} />
                <span className="text-sm text-gray-300">{z.label}</span>
                <span className="text-xs text-gray-500">{z.desc}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{pct}%</span>
                <span className="text-sm font-semibold w-16 text-right">{millisToTime(ms)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
