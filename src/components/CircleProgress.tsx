interface Props {
  value: number | null | undefined
  max?: number
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
  unit?: string
  children?: React.ReactNode
}

export default function CircleProgress({
  value,
  max = 100,
  size = 200,
  strokeWidth = 14,
  color = '#00D4A0',
  label,
  unit = '%',
  children,
}: Props) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = value != null ? Math.min(Math.max(value / max, 0), 1) : 0
  const offset = circumference * (1 - pct)
  const cx = size / 2
  const cy = size / 2

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none" stroke="#1A1A1A" strokeWidth={strokeWidth}
        />
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={value != null ? offset : circumference}
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ?? (
          <>
            <span className="text-5xl font-bold tabular-nums" style={{ color }}>
              {value != null ? Math.round(value) : '--'}
            </span>
            {unit && <span className="text-gray-400 text-sm mt-1">{unit}</span>}
            {label && <span className="text-gray-500 text-xs mt-0.5">{label}</span>}
          </>
        )}
      </div>
    </div>
  )
}
