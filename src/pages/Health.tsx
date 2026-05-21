import { useState } from 'react'
import { useWhoopData } from '../hooks/useWhoopData'
import LoadingScreen from '../components/LoadingScreen'
import { recoveryColor, strainColor, formatShortDate, millisToHours } from '../utils/whoop'
import { supabase } from '../lib/supabase'
import type { BloodWork } from '../types'
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip,
  ScatterChart, Scatter, CartesianGrid, ReferenceLine,
} from 'recharts'

// ─── Markers catalogue ──────────────────────────────────────────────────────
const MARKER_PRESETS: { label: string; unit: string; refMin: number; refMax: number }[] = [
  { label: 'Glicose', unit: 'mg/dL', refMin: 70, refMax: 99 },
  { label: 'Hemoglobina', unit: 'g/dL', refMin: 12, refMax: 17.5 },
  { label: 'Ferritina', unit: 'ng/mL', refMin: 12, refMax: 300 },
  { label: 'Vitamina D', unit: 'ng/mL', refMin: 30, refMax: 100 },
  { label: 'Vitamina B12', unit: 'pg/mL', refMin: 200, refMax: 900 },
  { label: 'TSH', unit: 'mUI/L', refMin: 0.4, refMax: 4.0 },
  { label: 'Testosterona', unit: 'ng/dL', refMin: 300, refMax: 1000 },
  { label: 'Cortisol', unit: 'µg/dL', refMin: 6, refMax: 23 },
  { label: 'Colesterol Total', unit: 'mg/dL', refMin: 0, refMax: 200 },
  { label: 'HDL', unit: 'mg/dL', refMin: 40, refMax: 999 },
  { label: 'LDL', unit: 'mg/dL', refMin: 0, refMax: 130 },
  { label: 'Triglicerídeos', unit: 'mg/dL', refMin: 0, refMax: 150 },
  { label: 'Creatinina', unit: 'mg/dL', refMin: 0.7, refMax: 1.3 },
  { label: 'PCR', unit: 'mg/L', refMin: 0, refMax: 5 },
  { label: 'Insulina', unit: 'µUI/mL', refMin: 2, refMax: 25 },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function statusColor(bw: BloodWork) {
  if (bw.ref_min == null && bw.ref_max == null) return '#888'
  const v = bw.value
  const lo = bw.ref_min ?? -Infinity
  const hi = bw.ref_max ?? Infinity
  if (v < lo || v > hi) return '#FF4444'
  const pctLo = (v - lo) / (hi - lo)
  if (pctLo < 0.1 || pctLo > 0.9) return '#F5C518'
  return '#00D4A0'
}

function statusLabel(bw: BloodWork) {
  if (bw.ref_min == null && bw.ref_max == null) return ''
  const v = bw.value
  if (bw.ref_max != null && v > bw.ref_max) return 'Alto'
  if (bw.ref_min != null && v < bw.ref_min) return 'Baixo'
  return 'Normal'
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function Health() {
  const { recentCycles, recentRecoveries, recentSleeps, bloodWork, loading, refresh } = useWhoopData()
  const [tab, setTab] = useState<'tendencias' | 'exames'>('tendencias')

  if (loading) return <LoadingScreen />

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-5 pt-14 pb-3 safe-top">
        <h1 className="text-2xl font-bold">Saúde</h1>
      </div>

      {/* Tab bar */}
      <div className="flex mx-4 bg-surface rounded-xl p-1 mb-4">
        {(['tendencias', 'exames'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t ? 'bg-white/10 text-white' : 'text-gray-500'
            }`}
          >
            {t === 'tendencias' ? 'Tendências' : 'Exames de Sangue'}
          </button>
        ))}
      </div>

      {tab === 'tendencias'
        ? <TrendsTab cycles={recentCycles} recoveries={recentRecoveries} sleeps={recentSleeps} />
        : <BloodTab entries={bloodWork} onAdded={refresh} />
      }
    </div>
  )
}

// ─── Trends tab ──────────────────────────────────────────────────────────────
function TrendsTab({
  cycles, recoveries, sleeps,
}: {
  cycles: ReturnType<typeof useWhoopData>['recentCycles']
  recoveries: ReturnType<typeof useWhoopData>['recentRecoveries']
  sleeps: ReturnType<typeof useWhoopData>['recentSleeps']
}) {
  // Build daily data: recovery + strain + sleep paired by date
  const daily = cycles
    .slice(0, 30)
    .reverse()
    .map(c => {
      const rec = recoveries.find(r => r.cycle_id === c.whoop_cycle_id)
      return {
        date: formatShortDate(c.start_time),
        recovery: rec?.recovery_score ?? null,
        strain: c.strain ?? null,
        hrv: rec?.hrv_rmssd_milli ? Math.round(rec.hrv_rmssd_milli) : null,
        rhr: rec?.resting_heart_rate ? Math.round(rec.resting_heart_rate) : null,
        recovColor: recoveryColor(rec?.recovery_score),
        strainC: strainColor(c.strain),
      }
    })

  // Scatter: strain (x) vs recovery (y)
  const scatterData = daily
    .filter(d => d.strain != null && d.recovery != null)
    .map(d => ({ x: d.strain!, y: d.recovery!, date: d.date, color: recoveryColor(d.recovery) }))

  const sleepData = sleeps
    .slice(0, 14)
    .reverse()
    .map(s => ({
      date: formatShortDate(s.start_time),
      horas: Math.round(millisToHours((s.total_in_bed_time_milli ?? 0) - (s.total_awake_time_milli ?? 0)) * 10) / 10,
      perf: s.sleep_performance_percentage ?? null,
    }))

  return (
    <div className="flex flex-col gap-3 px-4">
      {/* Strain vs Recovery scatter */}
      <ChartCard title="Esforço × Recuperação" subtitle="Cada ponto = 1 dia (últimos 30 dias)">
        <ResponsiveContainer width="100%" height={180}>
          <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis
              type="number" dataKey="x" name="Esforço"
              domain={[0, 21]} ticks={[0, 7, 14, 21]}
              tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false}
              label={{ value: 'Esforço', position: 'insideBottom', offset: -2, fill: '#555', fontSize: 9 }}
            />
            <YAxis
              type="number" dataKey="y" name="Recuperação"
              domain={[0, 100]} ticks={[0, 33, 67, 100]}
              tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false}
            />
            <ReferenceLine y={67} stroke="#00D4A020" strokeDasharray="4 4" />
            <ReferenceLine y={33} stroke="#F5C51820" strokeDasharray="4 4" />
            <Tooltip
              cursor={false}
              content={({ payload }) => {
                if (!payload?.length) return null
                const d = payload[0].payload
                return (
                  <div className="bg-surface-2 border border-white/10 rounded-lg px-2 py-1 text-xs">
                    <p className="text-gray-400">{d.date}</p>
                    <p>Esforço <span className="font-bold" style={{ color: strainColor(d.x) }}>{d.x.toFixed(1)}</span></p>
                    <p>Recuperação <span className="font-bold" style={{ color: recoveryColor(d.y) }}>{Math.round(d.y)}%</span></p>
                  </div>
                )
              }}
            />
            <Scatter
              data={scatterData}
              shape={(props: unknown) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: { color: string } }
                return <circle cx={cx} cy={cy} r={4} fill={payload.color} fillOpacity={0.85} />
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Recovery + Strain dual line */}
      <ChartCard title="Recuperação vs Esforço" subtitle="Últimos 30 dias">
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
            <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 8 }} axisLine={false} tickLine={false} interval={4} />
            <YAxis yAxisId="rec" domain={[0, 100]} tick={false} axisLine={false} tickLine={false} />
            <YAxis yAxisId="str" domain={[0, 21]} orientation="right" tick={false} axisLine={false} tickLine={false} />
            <Tooltip
              content={({ payload, label }) => {
                if (!payload?.length) return null
                return (
                  <div className="bg-surface-2 border border-white/10 rounded-lg px-2 py-1 text-xs">
                    <p className="text-gray-400 mb-1">{label}</p>
                    {payload.map((p) => (
                      <p key={p.name} style={{ color: p.color as string }}>
                        {p.name}: <span className="font-bold">{p.value != null ? p.value : '--'}</span>
                      </p>
                    ))}
                  </div>
                )
              }}
            />
            <Line yAxisId="rec" type="monotone" dataKey="recovery" name="Recuperação %" stroke="#00D4A0" dot={false} strokeWidth={2} connectNulls />
            <Line yAxisId="str" type="monotone" dataKey="strain" name="Esforço" stroke="#FF8C00" dot={false} strokeWidth={2} connectNulls />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 px-1">
          <Legend color="#00D4A0" label="Recuperação %" />
          <Legend color="#FF8C00" label="Esforço /21" />
        </div>
      </ChartCard>

      {/* HRV trend */}
      {daily.some(d => d.hrv != null) && (
        <ChartCard title="VFC (HRV)" subtitle="Variabilidade da frequência cardíaca · ms">
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 8 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`${v} ms`, 'VFC']} contentStyle={{ background: '#1a1a1a', border: '1px solid #ffffff15', borderRadius: 8, fontSize: 11 }} />
              <Line type="monotone" dataKey="hrv" stroke="#00D4A0" dot={false} strokeWidth={2} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* RHR trend */}
      {daily.some(d => d.rhr != null) && (
        <ChartCard title="FC de Repouso" subtitle="Batimentos por minuto · bpm">
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 8 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`${v} bpm`, 'FC Repouso']} contentStyle={{ background: '#1a1a1a', border: '1px solid #ffffff15', borderRadius: 8, fontSize: 11 }} />
              <Line type="monotone" dataKey="rhr" stroke="#4FC3F7" dot={false} strokeWidth={2} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Sleep performance trend */}
      {sleepData.some(d => d.perf != null) && (
        <ChartCard title="Desempenho do Sono" subtitle="Últimas 2 semanas · %">
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={sleepData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 8 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis domain={[0, 100]} tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Desempenho']} contentStyle={{ background: '#1a1a1a', border: '1px solid #ffffff15', borderRadius: 8, fontSize: 11 }} />
              <Line type="monotone" dataKey="perf" stroke="#9C59D1" dot={false} strokeWidth={2} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Sleep duration */}
      {sleepData.length > 1 && (
        <ChartCard title="Horas de Sono" subtitle="Últimas 2 semanas">
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={sleepData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 8 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis domain={[0, 12]} tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`${v}h`, 'Sono']} contentStyle={{ background: '#1a1a1a', border: '1px solid #ffffff15', borderRadius: 8, fontSize: 11 }} />
              <ReferenceLine y={8} stroke="#ffffff15" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="horas" stroke="#9C59D1" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  )
}

// ─── Blood work tab ───────────────────────────────────────────────────────────
function BloodTab({ entries, onAdded }: { entries: BloodWork[]; onAdded: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null)

  // Group by marker
  const byMarker: Record<string, BloodWork[]> = {}
  for (const e of entries) {
    if (!byMarker[e.marker]) byMarker[e.marker] = []
    byMarker[e.marker].push(e)
  }
  const markers = Object.keys(byMarker).sort()

  return (
    <div className="px-4 flex flex-col gap-3">
      <button
        onClick={() => setShowForm(true)}
        className="w-full py-3 bg-whoop-green text-black font-bold rounded-xl text-sm"
      >
        + Adicionar Exame
      </button>

      {showForm && (
        <AddBloodWorkForm
          onSaved={() => { setShowForm(false); onAdded() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {markers.length === 0 && !showForm && (
        <div className="bg-surface rounded-2xl p-6 text-center">
          <p className="text-gray-400 text-sm">Nenhum exame registrado</p>
          <p className="text-gray-500 text-xs mt-1">Adicione seus resultados de exames de sangue para acompanhar tendências</p>
        </div>
      )}

      {markers.map(marker => {
        const list = byMarker[marker]
        const latest = list[0]
        const color = statusColor(latest)
        const label = statusLabel(latest)
        return (
          <div key={marker} className="bg-surface rounded-2xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4"
              onClick={() => setSelectedMarker(selectedMarker === marker ? null : marker)}
            >
              <div className="text-left">
                <p className="font-semibold">{marker}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Último: <span className="font-bold" style={{ color }}>{latest.value} {latest.unit}</span>
                  {label && <span className="ml-2 text-[10px]" style={{ color }}>● {label}</span>}
                </p>
              </div>
              <span className="text-gray-600 text-sm">{selectedMarker === marker ? '▲' : '▼'}</span>
            </button>

            {selectedMarker === marker && (
              <div className="border-t border-white/5 px-4 pb-4">
                {/* Trend chart if multiple readings */}
                {list.length > 1 && (
                  <div className="mt-3 mb-3">
                    <ResponsiveContainer width="100%" height={80}>
                      <LineChart data={[...list].reverse()} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                        <XAxis dataKey="test_date" tick={{ fill: '#666', fontSize: 8 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} />
                        {latest.ref_min != null && <ReferenceLine y={latest.ref_min} stroke="#ffffff15" strokeDasharray="3 3" />}
                        {latest.ref_max != null && <ReferenceLine y={latest.ref_max} stroke="#ffffff15" strokeDasharray="3 3" />}
                        <Tooltip formatter={(v: number) => [`${v} ${latest.unit}`, marker]} contentStyle={{ background: '#1a1a1a', border: '1px solid #ffffff15', borderRadius: 8, fontSize: 11 }} />
                        <Line type="monotone" dataKey="value" stroke={color} dot={{ fill: color, r: 3 }} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Reference range bar */}
                {latest.ref_min != null && latest.ref_max != null && (
                  <RangeBar value={latest.value} min={latest.ref_min} max={latest.ref_max} color={color} />
                )}

                {/* All readings */}
                <div className="flex flex-col gap-1 mt-3">
                  {list.map(e => (
                    <div key={e.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 text-xs">{e.test_date}</span>
                      <span className="font-semibold" style={{ color: statusColor(e) }}>
                        {e.value} <span className="text-gray-500 font-normal text-xs">{e.unit}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Range bar ────────────────────────────────────────────────────────────────
function RangeBar({ value, min, max, color }: { value: number; min: number; max: number; color: string }) {
  const span = max - min
  const extended = span * 0.5
  const lo = Math.min(value, min) - extended * 0.2
  const hi = Math.max(value, max) + extended * 0.2
  const total = hi - lo
  const rangePctStart = ((min - lo) / total) * 100
  const rangePctWidth = ((max - min) / total) * 100
  const valuePct = ((value - lo) / total) * 100

  return (
    <div className="mt-2">
      <div className="relative h-3 bg-surface-3 rounded-full overflow-visible">
        <div
          className="absolute h-full rounded-full bg-white/10"
          style={{ left: `${rangePctStart}%`, width: `${rangePctWidth}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-black"
          style={{ left: `${Math.min(Math.max(valuePct, 0), 100)}%`, backgroundColor: color, transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-gray-600 mt-1">
        <span>Min {min}</span>
        <span className="text-gray-400 font-semibold">{value}</span>
        <span>Max {max}</span>
      </div>
    </div>
  )
}

// ─── Add form ─────────────────────────────────────────────────────────────────
function AddBloodWorkForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [saving, setSaving] = useState(false)
  const [customMarker, setCustomMarker] = useState(false)
  const [form, setForm] = useState({
    marker: MARKER_PRESETS[0].label,
    customName: '',
    value: '',
    unit: MARKER_PRESETS[0].unit,
    refMin: String(MARKER_PRESETS[0].refMin),
    refMax: String(MARKER_PRESETS[0].refMax),
    test_date: new Date().toISOString().slice(0, 10),
    notes: '',
  })

  function selectPreset(label: string) {
    if (label === '__custom__') {
      setCustomMarker(true)
      setForm(f => ({ ...f, marker: '', unit: '', refMin: '', refMax: '' }))
      return
    }
    const preset = MARKER_PRESETS.find(p => p.label === label)
    if (preset) {
      setCustomMarker(false)
      setForm(f => ({ ...f, marker: preset.label, unit: preset.unit, refMin: String(preset.refMin), refMax: String(preset.refMax) }))
    }
  }

  async function save() {
    const markerName = customMarker ? form.customName.trim() : form.marker
    if (!markerName || !form.value) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.schema('whoop').from('blood_work').insert({
      user_id: user!.id,
      test_date: form.test_date,
      marker: markerName,
      value: parseFloat(form.value),
      unit: form.unit,
      ref_min: form.refMin ? parseFloat(form.refMin) : null,
      ref_max: form.refMax ? parseFloat(form.refMax) : null,
      notes: form.notes || null,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="bg-surface rounded-2xl p-4 flex flex-col gap-3">
      <p className="font-semibold text-sm">Novo Exame</p>

      <div>
        <label className="text-xs text-gray-400 mb-1 block">Marcador</label>
        <select
          className="w-full bg-surface-2 rounded-xl px-3 py-2.5 text-sm text-white border border-white/10"
          onChange={e => selectPreset(e.target.value)}
          value={customMarker ? '__custom__' : form.marker}
        >
          {MARKER_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
          <option value="__custom__">Outro (personalizado)</option>
        </select>
      </div>

      {customMarker && (
        <Field label="Nome do marcador">
          <input
            className="w-full bg-surface-2 rounded-xl px-3 py-2.5 text-sm text-white border border-white/10"
            value={form.customName}
            onChange={e => setForm(f => ({ ...f, customName: e.target.value }))}
            placeholder="ex: Ferritina livre"
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor">
          <input
            type="number"
            className="w-full bg-surface-2 rounded-xl px-3 py-2.5 text-sm text-white border border-white/10"
            value={form.value}
            onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
            placeholder="0.0"
          />
        </Field>
        <Field label="Unidade">
          <input
            className="w-full bg-surface-2 rounded-xl px-3 py-2.5 text-sm text-white border border-white/10"
            value={form.unit}
            onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
            placeholder="mg/dL"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Ref. mínima">
          <input
            type="number"
            className="w-full bg-surface-2 rounded-xl px-3 py-2.5 text-sm text-white border border-white/10"
            value={form.refMin}
            onChange={e => setForm(f => ({ ...f, refMin: e.target.value }))}
            placeholder="opcional"
          />
        </Field>
        <Field label="Ref. máxima">
          <input
            type="number"
            className="w-full bg-surface-2 rounded-xl px-3 py-2.5 text-sm text-white border border-white/10"
            value={form.refMax}
            onChange={e => setForm(f => ({ ...f, refMax: e.target.value }))}
            placeholder="opcional"
          />
        </Field>
      </div>

      <Field label="Data do exame">
        <input
          type="date"
          className="w-full bg-surface-2 rounded-xl px-3 py-2.5 text-sm text-white border border-white/10"
          value={form.test_date}
          onChange={e => setForm(f => ({ ...f, test_date: e.target.value }))}
        />
      </Field>

      <Field label="Observações (opcional)">
        <input
          className="w-full bg-surface-2 rounded-xl px-3 py-2.5 text-sm text-white border border-white/10"
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="em jejum, clínica, etc."
        />
      </Field>

      <div className="flex gap-2 mt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400"
        >
          Cancelar
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-whoop-green text-black font-bold text-sm disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

// ─── Shared small components ──────────────────────────────────────────────────
function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-2xl p-4">
      <div className="mb-3">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">{title}</p>
        {subtitle && <p className="text-[10px] text-gray-600 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-gray-500">{label}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      {children}
    </div>
  )
}
