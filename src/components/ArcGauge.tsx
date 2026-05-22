interface Props {
  value: number | null
  max: number
  color: string
  size?: number
}

export default function ArcGauge({ value, max, color, size = 140 }: Props) {
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.38
  const sw = size * 0.08

  const toXY = (deg: number) => ({
    x: cx + r * Math.cos((deg * Math.PI) / 180),
    y: cy + r * Math.sin((deg * Math.PI) / 180),
  })

  // Gauge goes from 135° (7 o'clock) clockwise 270° to 45° (5 o'clock)
  const START = 135
  const SWEEP = 270

  const arcPath = (from: number, sweep: number) => {
    if (sweep <= 0) return ''
    const capped = Math.min(sweep, SWEEP - 0.01) // avoid degenerate path at 100%
    const s = toXY(from)
    const e = toXY(from + capped)
    const large = capped > 180 ? 1 : 0
    return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`
  }

  const pct = value != null ? Math.min(Math.max(value / max, 0), 1) : 0

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {/* Track */}
      <path
        d={arcPath(START, SWEEP)}
        fill="none"
        stroke="#1f1f1f"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      {/* Value */}
      {pct > 0.005 && (
        <path
          d={arcPath(START, pct * SWEEP)}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}
