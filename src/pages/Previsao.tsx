import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts'

const LAT = -3.7436
const LON = -38.4558
const API_URL =
  `https://api.open-meteo.com/v1/forecast` +
  `?latitude=${LAT}&longitude=${LON}` +
  `&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,weather_code` +
  `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
  `&daily=wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,weather_code,temperature_2m_max` +
  `&wind_speed_unit=kmh&timezone=America%2FFortaleza&forecast_days=7`

interface OpenMeteoResponse {
  current: {
    time: string
    wind_speed_10m: number
    wind_direction_10m: number
    wind_gusts_10m: number
    temperature_2m: number
    weather_code: number
  }
  hourly: {
    time: string[]
    wind_speed_10m: number[]
    wind_direction_10m: number[]
    wind_gusts_10m: number[]
  }
  daily: {
    time: string[]
    wind_speed_10m_max: number[]
    wind_gusts_10m_max: number[]
    wind_direction_10m_dominant: number[]
    weather_code: number[]
    temperature_2m_max: number[]
  }
}

function windQuality(speed: number): { label: string; color: string; sub: string } {
  if (speed < 10) return { label: 'Calmaria', color: '#888', sub: 'Sem vento' }
  if (speed < 20) return { label: 'Fraco', color: '#4FC3F7', sub: 'Bom para iniciantes' }
  if (speed < 30) return { label: 'Moderado', color: '#00D4A0', sub: 'Ótimo para kite' }
  if (speed < 40) return { label: 'Forte', color: '#F5C518', sub: 'Experientes' }
  return { label: 'Muito forte', color: '#FF4444', sub: 'Cuidado' }
}

function dirLabel(deg: number): string {
  const dirs = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO']
  return dirs[Math.round(deg / 45) % 8]
}

function weatherEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 3) return '⛅'
  if (code <= 48) return '🌫️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '❄️'
  if (code <= 82) return '🌦️'
  return '⛈️'
}

function shortDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
}

function Compass({ deg }: { deg: number }) {
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-white/10" />
      {['N', 'L', 'S', 'O'].map((d, i) => (
        <span
          key={d}
          className="absolute text-[9px] text-gray-500 font-medium"
          style={{
            top: i === 0 ? 2 : i === 2 ? 'auto' : '50%',
            bottom: i === 2 ? 2 : 'auto',
            left: i === 3 ? 2 : i === 1 ? 'auto' : '50%',
            right: i === 1 ? 2 : 'auto',
            transform: i === 0 || i === 2 ? 'translateX(-50%)' : 'translateY(-50%)',
          }}
        >
          {d}
        </span>
      ))}
      <div
        className="absolute w-1 h-8 rounded-full origin-bottom"
        style={{
          background: 'linear-gradient(to top, #00D4A0, transparent)',
          bottom: '50%',
          left: 'calc(50% - 2px)',
          transform: `rotate(${deg}deg)`,
          transformOrigin: 'bottom center',
        }}
      />
      <div className="w-2 h-2 rounded-full bg-white/30" />
    </div>
  )
}

export default function Previsao() {
  const [data, setData] = useState<OpenMeteoResponse | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  async function load() {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(API_URL)
      if (!res.ok) throw new Error()
      const json: OpenMeteoResponse = await res.json()
      setData(json)
      setLastUpdate(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 border-2 border-whoop-green border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Buscando vento...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 px-8 text-center">
        <p className="text-4xl">🌬️</p>
        <p className="text-gray-400 text-sm">Não foi possível buscar os dados</p>
        <button onClick={load} className="px-4 py-2 rounded-xl bg-whoop-green text-black font-bold text-sm">
          Tentar novamente
        </button>
      </div>
    )
  }

  const cur = data.current
  const quality = windQuality(cur.wind_speed_10m)

  // Next 24h hourly (from current hour)
  const nowHour = new Date().getHours()
  const hourlyStart = data.hourly.time.findIndex(t => {
    const h = new Date(t).getHours()
    const d = new Date(t).toDateString()
    return d === new Date().toDateString() && h >= nowHour
  })
  const start = hourlyStart >= 0 ? hourlyStart : 0
  const hourlyData = data.hourly.time.slice(start, start + 24).map((t, i) => ({
    hora: new Date(t).getHours() + 'h',
    vento: Math.round(data.hourly.wind_speed_10m[start + i]),
    rajada: Math.round(data.hourly.wind_gusts_10m[start + i]),
  }))

  return (
    <div className="pb-8">
      <div className="px-5 pt-14 pb-3 safe-top flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Previsão</h1>
          <p className="text-xs text-gray-500 mt-0.5">Praia do Futuro · P5 · Fortaleza</p>
        </div>
        <button onClick={load} className="text-gray-500 p-2 rounded-xl bg-surface active:bg-surface-2">
          <RefreshIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-3 px-4">

        {/* Current conditions */}
        <div className="bg-surface rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Agora</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold">{Math.round(cur.wind_speed_10m)}</span>
                <span className="text-lg text-gray-400 pb-1">km/h</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: quality.color }}>
                  {quality.label}
                </span>
                <span className="text-[10px] text-gray-600">{quality.sub}</span>
              </div>
            </div>
            <Compass deg={cur.wind_direction_10m} />
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-4">
            <StatCell label="Rajada" value={`${Math.round(cur.wind_gusts_10m)} km/h`} color="#F5C518" />
            <StatCell label="Direção" value={`${dirLabel(cur.wind_direction_10m)} ${cur.wind_direction_10m}°`} />
            <StatCell label="Temp." value={`${Math.round(cur.temperature_2m)}°C`} />
          </div>

          {lastUpdate && (
            <p className="text-[10px] text-gray-600 mt-3 text-right">
              {weatherEmoji(cur.weather_code)} Atualizado {lastUpdate}
            </p>
          )}
        </div>

        {/* Hourly chart */}
        <div className="bg-surface rounded-2xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Próximas 24h</p>
          <p className="text-[10px] text-gray-600 mb-3">Velocidade do vento (km/h)</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <XAxis dataKey="hora" tick={{ fill: '#555', fontSize: 9 }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fill: '#555', fontSize: 9 }} axisLine={false} tickLine={false} />
              <ReferenceLine y={20} stroke="#00D4A020" strokeDasharray="4 4" />
              <ReferenceLine y={30} stroke="#F5C51820" strokeDasharray="4 4" />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #ffffff15', borderRadius: 8, fontSize: 11 }}
                content={({ payload, label }) => {
                  if (!payload?.length) return null
                  const p = payload[0].payload as { hora: string; vento: number; rajada: number }
                  const q = windQuality(p.vento)
                  return (
                    <div className="bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-xs">
                      <p className="text-gray-400 mb-1">{label}</p>
                      <p>Vento <b style={{ color: q.color }}>{p.vento} km/h</b></p>
                      <p className="text-gray-500">Rajada {p.rajada} km/h</p>
                    </div>
                  )
                }}
              />
              <Line type="monotone" dataKey="vento" stroke="#00D4A0" dot={false} strokeWidth={2} name="Vento" />
              <Line type="monotone" dataKey="rajada" stroke="#F5C518" dot={false} strokeWidth={1.5} strokeDasharray="4 2" name="Rajada" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 px-1">
            <LegendDot color="#00D4A0" label="Vento" />
            <LegendDot color="#F5C518" label="Rajada" dashed />
          </div>
        </div>

        {/* 7-day daily forecast */}
        <div className="bg-surface rounded-2xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Próximos 7 dias</p>
          <div className="flex flex-col gap-2">
            {data.daily.time.map((dateStr, i) => {
              const spd = Math.round(data.daily.wind_speed_10m_max[i])
              const gust = Math.round(data.daily.wind_gusts_10m_max[i])
              const dir = data.daily.wind_direction_10m_dominant[i]
              const q = windQuality(spd)
              const isToday = i === 0
              return (
                <div
                  key={dateStr}
                  className={`flex items-center justify-between py-2.5 ${i < data.daily.time.length - 1 ? 'border-b border-white/5' : ''}`}
                >
                  <div className="w-10">
                    <p className="text-xs font-semibold capitalize">{isToday ? 'Hoje' : shortDay(dateStr)}</p>
                  </div>
                  <span className="text-base">{weatherEmoji(data.daily.weather_code[i])}</span>
                  <div className="flex items-center gap-1 w-8">
                    <WindArrow deg={dir} size={12} />
                    <span className="text-[10px] text-gray-500">{dirLabel(dir)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold" style={{ color: q.color }}>{spd}</span>
                    <span className="text-[10px] text-gray-500 ml-0.5">km/h</span>
                  </div>
                  <div className="text-right w-16">
                    <p className="text-[10px] text-gray-500">raj. {gust}</p>
                    <p className="text-[10px] font-medium" style={{ color: q.color }}>{q.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Source */}
        <p className="text-center text-[10px] text-gray-700 pb-2">
          Dados: Open-Meteo (ECMWF) · Praia do Futuro, Fortaleza CE
        </p>
      </div>
    </div>
  )
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-gray-500 mb-1">{label}</p>
      <p className="text-xs font-semibold" style={color ? { color } : undefined}>{value}</p>
    </div>
  )
}

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-5 h-0.5 rounded-full" style={{ backgroundColor: color, opacity: dashed ? 0.7 : 1 }} />
      <span className="text-[10px] text-gray-500">{label}</span>
    </div>
  )
}

function WindArrow({ deg, size = 16 }: { deg: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"
      className="text-gray-400"
      style={{ transform: `rotate(${deg}deg)` }}>
      <path d="M12 2L6 20l6-3 6 3L12 2z" />
    </svg>
  )
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}
