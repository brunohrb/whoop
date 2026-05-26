import { useState, useEffect, useRef, useCallback } from 'react'
import { SPLITS, WORKOUTS, buscarVideoId, parseDescanso } from '../data/workouts'
import { MEALS } from '../data/meals'

// ── Types ────────────────────────────────────────────────────────────
type TreinoTab = 'treino' | 'dieta' | 'readiness' | 'timer' | 'stats'

interface ReadinessEntry {
  sleep: number
  energy: number
  soreness: number
  mood: number
  score: number
}

interface TreinoState {
  date: string
  split: '6d' | '5d'
  cursor: number
  completedCount: number
  exercises: Record<string, boolean>
  meals: Record<string, boolean>
  mealChoice: Record<string, number>
  fastToday: boolean
  fastDays: Record<string, boolean>
  readiness: Record<string, ReadinessEntry>
  restDayToday: string
  skipNextRest: boolean
}

// ── Constants ────────────────────────────────────────────────────────
const STORAGE_KEY = 'iron-data-v2'
const CYCLE_LENGTH = 35
const DELOAD_WINDOW = 7

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function defaultState(): TreinoState {
  return {
    date: todayKey(),
    split: '6d',
    cursor: 0,
    completedCount: 0,
    exercises: {},
    meals: {},
    mealChoice: {},
    fastToday: false,
    fastDays: {},
    readiness: {},
    restDayToday: '',
    skipNextRest: false,
  }
}

function loadState(): TreinoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as TreinoState
    if (parsed.cursor === undefined || parsed.completedCount === undefined) {
      parsed.cursor = 0
      parsed.completedCount = 0
      parsed.exercises = {}
    }
    const base = defaultState()
    for (const k of Object.keys(base) as (keyof TreinoState)[]) {
      if ((parsed as unknown as Record<string, unknown>)[k] === undefined) {
        (parsed as unknown as Record<string, unknown>)[k] = (base as unknown as Record<string, unknown>)[k]
      }
    }
    if (parsed.date !== todayKey()) {
      if (parsed.fastToday) parsed.fastDays[parsed.date] = true
      parsed.date = todayKey()
      parsed.exercises = {}
      parsed.meals = {}
      parsed.fastToday = false
    }
    return parsed
  } catch {
    return defaultState()
  }
}

// ── Cycle helpers ────────────────────────────────────────────────────
function sessionInCycle(completedCount: number): number {
  return ((completedCount) % CYCLE_LENGTH) + 1
}

function currentCycleNum(completedCount: number): number {
  return Math.floor(completedCount / CYCLE_LENGTH) + 1
}

function isDeload(completedCount: number): boolean {
  return sessionInCycle(completedCount) >= CYCLE_LENGTH - DELOAD_WINDOW + 1
}

function sessionsUntilDeload(completedCount: number): number {
  const pos = sessionInCycle(completedCount)
  const start = CYCLE_LENGTH - DELOAD_WINDOW + 1
  return pos < start ? start - pos : 0
}

function applyDeload(sets: string, deload: boolean): string {
  if (!deload) return sets
  const m = sets.match(/^(\d+)x(.+)$/)
  if (!m) return sets
  return `${Math.max(2, Math.ceil(parseInt(m[1]) / 2))}x${m[2]}`
}

// ── Readiness helpers ─────────────────────────────────────────────────
function computeScore(r: Omit<ReadinessEntry, 'score'>): number {
  const s = r.sleep * 1.5 + r.energy * 1.5 + (6 - r.soreness) * 1.0 + r.mood * 1.0
  return Math.round((s / 25) * 100)
}

function readinessAdvice(score: number): { level: string; color: string; text: string } {
  if (score >= 80) return { level: 'ALTA', color: '#00d97e', text: 'Corpo pronto. Treine forte — pode tentar PR hoje.' }
  if (score >= 60) return { level: 'BOA', color: '#9bd200', text: 'Treino normal conforme plano.' }
  if (score >= 40) return { level: 'MÉDIA', color: '#ffb020', text: 'Reduza carga 10-15%. Mantenha séries.' }
  return { level: 'BAIXA', color: '#ff6060', text: 'Considere treino leve ou descanso. Corpo pedindo.' }
}

// ── Audio ─────────────────────────────────────────────────────────────
function createBeeps(audioCtx: AudioContext, secondsFromNow: number) {
  const tones = [
    { freq: 880, dur: 0.18, gain: 0.55, delay: 0.0 },
    { freq: 1100, dur: 0.18, gain: 0.65, delay: 0.22 },
    { freq: 1320, dur: 0.32, gain: 0.72, delay: 0.44 },
    { freq: 1760, dur: 0.45, gain: 0.78, delay: 0.80 },
  ]
  const startAt = audioCtx.currentTime + Math.max(0, secondsFromNow)
  tones.forEach(t => {
    try {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.type = 'sine'
      osc.frequency.value = t.freq
      const t0 = startAt + t.delay
      gain.gain.setValueAtTime(0.001, t0)
      gain.gain.exponentialRampToValueAtTime(t.gain, t0 + 0.02)
      gain.gain.setValueAtTime(t.gain, t0 + t.dur - 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + t.dur)
      osc.start(t0)
      osc.stop(t0 + t.dur + 0.05)
    } catch {}
  })
}

// ── Main Component ────────────────────────────────────────────────────
export default function Treino() {
  const [activeTab, setActiveTab] = useState<TreinoTab>('treino')
  const [state, setStateRaw] = useState<TreinoState>(() => loadState())

  const setState = useCallback((updater: (prev: TreinoState) => TreinoState) => {
    setStateRaw(prev => {
      const next = updater(prev)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const deload = isDeload(state.completedCount)

  const tabs: { key: TreinoTab; label: string }[] = [
    { key: 'treino', label: 'Treino' },
    { key: 'dieta', label: 'Dieta' },
    { key: 'readiness', label: 'Readiness' },
    { key: 'timer', label: 'Timer' },
    { key: 'stats', label: 'Stats' },
  ]

  return (
    <div className="pb-8 flex flex-col h-full">
      {/* Sub-tab bar */}
      <div className="flex border-b border-white/10 bg-black sticky top-0 z-10 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap px-2 transition-colors ${
              activeTab === t.key ? 'text-whoop-green border-b-2 border-whoop-green' : 'text-gray-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'treino' && (
          <WorkoutTab state={state} setState={setState} deload={deload} />
        )}
        {activeTab === 'dieta' && (
          <DietaTab state={state} setState={setState} />
        )}
        {activeTab === 'readiness' && (
          <ReadinessTab state={state} setState={setState} />
        )}
        {activeTab === 'timer' && <TimerTab />}
        {activeTab === 'stats' && (
          <StatsTab state={state} setState={setState} />
        )}
      </div>
    </div>
  )
}

// ── Workout Tab ───────────────────────────────────────────────────────
function WorkoutTab({
  state,
  setState,
  deload,
}: {
  state: TreinoState
  setState: (u: (p: TreinoState) => TreinoState) => void
  deload: boolean
}) {
  const [activeRest, setActiveRest] = useState<string | null>(null)
  const [restRemaining, setRestRemaining] = useState(0)
  const [restTotal, setRestTotal] = useState(0)
  const restEndRef = useRef(0)
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Chronometer
  const [chronoSec, setChronoSec] = useState(0)
  const [chronoRunning, setChronoRunning] = useState(false)
  const chronoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const split = SPLITS[state.split]
  const dayData = split[state.cursor]
  const workout = WORKOUTS[dayData.key]

  function initAudio() {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      } catch {}
    }
  }

  function startRest(key: string, _name: string, seconds: number) {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    setActiveRest(key)
    setRestTotal(seconds)
    restEndRef.current = Date.now() + seconds * 1000
    setRestRemaining(seconds)
    if (audioCtxRef.current) createBeeps(audioCtxRef.current, seconds)
    if ('vibrate' in navigator) navigator.vibrate(100)

    restIntervalRef.current = setInterval(() => {
      const rem = Math.max(0, Math.ceil((restEndRef.current - Date.now()) / 1000))
      setRestRemaining(rem)
      if (rem <= 0) {
        clearInterval(restIntervalRef.current!)
        restIntervalRef.current = null
        setActiveRest(null)
        if ('vibrate' in navigator) navigator.vibrate([300, 100, 300, 100, 500])
      }
    }, 250)
  }

  function cancelRest() {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    restIntervalRef.current = null
    setActiveRest(null)
  }

  function toggleChrono() {
    if (chronoRunning) {
      clearInterval(chronoIntervalRef.current!)
      chronoIntervalRef.current = null
      setChronoRunning(false)
    } else {
      setChronoRunning(true)
      chronoIntervalRef.current = setInterval(() => setChronoSec(s => s + 1), 1000)
    }
  }

  function resetChrono() {
    clearInterval(chronoIntervalRef.current!)
    chronoIntervalRef.current = null
    setChronoRunning(false)
    setChronoSec(0)
  }

  useEffect(() => () => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    if (chronoIntervalRef.current) clearInterval(chronoIntervalRef.current)
  }, [])

  function toggleExercise(key: string) {
    initAudio()
    setState(prev => {
      const next = { ...prev, exercises: { ...prev.exercises, [key]: !prev.exercises[key] } }
      // check if all done → auto-advance
      if (!prev.exercises[key]) {
        const allDone = workout.exercises.every((_, i) => {
          const k2 = `${dayData.key}-${i}`
          return k2 === key ? true : next.exercises[k2]
        })
        if (allDone) {
          setTimeout(() => advanceSession(), 400)
        }
      }
      return next
    })
  }

  function advanceSession() {
    setState(prev => {
      const split = SPLITS[prev.split]
      const newExercises = { ...prev.exercises }
      Object.keys(newExercises).forEach(k => { if (k.startsWith(dayData.key + '-')) delete newExercises[k] })
      let newCursor = (prev.cursor + 1) % split.length
      let newCount = prev.completedCount + 1
      if (prev.skipNextRest && split[newCursor].key === 'rest') {
        newCursor = (newCursor + 1) % split.length
        newCount++
      }
      return { ...prev, cursor: newCursor, completedCount: newCount, exercises: newExercises, skipNextRest: false, restDayToday: '' }
    })
    resetChrono()
  }

  function restToday() {
    if (!confirm('Descansar hoje?\n\nO próximo dia OFF da fila será consumido.')) return
    setState(prev => ({ ...prev, restDayToday: todayKey(), skipNextRest: true }))
  }

  function undoSession() {
    if (state.completedCount === 0) return
    if (!confirm('Desfazer a última sessão?')) return
    setState(prev => {
      const split = SPLITS[prev.split]
      return {
        ...prev,
        cursor: (prev.cursor - 1 + split.length) % split.length,
        completedCount: prev.completedCount - 1,
      }
    })
  }

  const fmtChrono = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const r = s % 60
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
  }

  // Rest overlay
  const restPct = restTotal > 0 ? (restRemaining / restTotal) * 100 : 0

  return (
    <div className="px-4 py-3">
      {/* Rest overlay */}
      {activeRest && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center gap-4" onClick={cancelRest}>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Descansando</p>
          <div className="text-8xl font-bold tabular-nums text-whoop-green">{String(restRemaining).padStart(2, '0')}</div>
          <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-whoop-green transition-all" style={{ width: `${restPct}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">Toque para cancelar</p>
        </div>
      )}

      {/* Split toggle */}
      <div className="flex gap-2 mb-3">
        {(['6d', '5d'] as const).map(s => (
          <button
            key={s}
            onClick={() => setState(prev => ({ ...prev, split: s, cursor: prev.cursor % SPLITS[s].length }))}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
              state.split === s ? 'bg-whoop-green text-black border-whoop-green' : 'text-gray-400 border-white/20'
            }`}
          >
            {s.toUpperCase()}
          </button>
        ))}
        <div className="ml-auto text-xs text-gray-500 self-center">
          {deload ? (
            <span className="text-yellow-400 font-bold">⚡ DELOAD</span>
          ) : (
            <span>deload em {sessionsUntilDeload(state.completedCount)}s</span>
          )}
        </div>
      </div>

      {/* Queue */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {SPLITS[state.split].map((_item, i) => {
          const idx = (state.cursor + i) % SPLITS[state.split].length
          const d = SPLITS[state.split][idx]
          return (
            <div
              key={i}
              className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border text-center min-w-[64px] ${
                i === 0 ? 'border-whoop-green bg-whoop-green/10' : 'border-white/10 bg-surface'
              }`}
            >
              <span className="text-[9px] font-bold text-gray-400">{i === 0 ? 'AGORA' : `+${i}`}</span>
              <span className="text-[10px] font-semibold text-white mt-0.5">{d.focus}</span>
            </div>
          )
        })}
      </div>

      {/* Deload banner */}
      {deload && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2 text-xs text-yellow-400 mb-3">
          DELOAD · sessão {sessionInCycle(state.completedCount)}/{CYCLE_LENGTH} · Reduza cargas 40% · Séries ajustadas
        </div>
      )}

      {/* Rest day */}
      {state.restDayToday === todayKey() && !workout.rest ? (
        <div className="bg-surface rounded-2xl p-4 text-center mb-3">
          <p className="font-bold text-lg">OFF FLEX</p>
          <p className="text-gray-400 text-sm mt-1">Você descansou hoje. Treino de amanhã: <strong>{workout.title}</strong></p>
          <p className="text-gray-500 text-xs mt-2">Próximo OFF agendado foi removido da fila</p>
        </div>
      ) : workout.rest ? (
        <div className="bg-surface rounded-2xl p-4 mb-3">
          <p className="font-bold text-xl text-center">DESCANSO</p>
          <p className="text-gray-400 text-sm text-center mt-2">{workout.note}</p>
          <button
            onClick={advanceSession}
            className="w-full mt-4 py-3 rounded-xl bg-whoop-green text-black font-bold text-sm"
          >
            CONCLUIR DESCANSO →
          </button>
        </div>
      ) : (
        <>
          {/* Workout card */}
          <div className="bg-surface rounded-2xl p-4 mb-3">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-base">{workout.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">⏱ {workout.duration} · {workout.volume}</p>
              </div>
            </div>

            {/* Chrono */}
            <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2 mb-3">
              <div>
                <p className="text-[9px] text-gray-500 uppercase">Cronômetro</p>
                <p className={`font-bold tabular-nums text-lg ${chronoRunning ? 'text-whoop-green' : 'text-white'}`}>
                  {fmtChrono(chronoSec)}
                </p>
              </div>
              <div className="flex gap-2 ml-auto">
                <button onClick={toggleChrono} className="text-xs px-3 py-1.5 rounded-lg border border-white/20 font-medium">
                  {chronoRunning ? 'PAUSAR' : chronoSec > 0 ? 'CONT.' : 'INICIAR'}
                </button>
                <button onClick={resetChrono} className="text-xs px-2 py-1.5 rounded-lg border border-white/20">✕</button>
              </div>
            </div>

            {/* Exercises */}
            <div className="flex flex-col gap-2">
              {workout.exercises.map((ex, i) => {
                const key = `${dayData.key}-${i}`
                const done = !!state.exercises[key]
                const adjustedSets = applyDeload(ex.sets, deload)
                const videoId = buscarVideoId(ex.name)
                const restSec = parseDescanso(ex.detail)
                const isRestRunning = activeRest === key
                return (
                  <div
                    key={key}
                    onClick={() => toggleExercise(key)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-all ${
                      done ? 'bg-whoop-green/10 opacity-60' : 'bg-white/5'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      done ? 'border-whoop-green bg-whoop-green' : 'border-white/30'
                    }`}>
                      {done && <span className="text-black text-xs font-bold">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight">{ex.name}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{ex.detail}</p>
                      {videoId && (
                        <a
                          href={`https://www.youtube.com/watch?v=${videoId}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-[10px] text-blue-400 mt-0.5 inline-block"
                        >
                          ▶ ver execução
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs font-bold text-white">{adjustedSets}</span>
                      <button
                        onClick={e => { e.stopPropagation(); initAudio(); isRestRunning ? cancelRest() : startRest(key, ex.name, restSec) }}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          isRestRunning ? 'border-whoop-green text-whoop-green' : 'border-white/20 text-gray-400'
                        }`}
                      >
                        ⏱
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          {(() => {
            const doneCount = workout.exercises.filter((_, i) => state.exercises[`${dayData.key}-${i}`]).length
            const allDone = doneCount === workout.exercises.length
            return (
              <div className="flex flex-col gap-2">
                <button
                  onClick={advanceSession}
                  disabled={doneCount === 0}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                    allDone ? 'bg-whoop-green text-black' : doneCount > 0 ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-600'
                  }`}
                >
                  {allDone ? '✓ FINALIZAR TREINO' : `FINALIZAR (${doneCount}/${workout.exercises.length})`}
                </button>
                {state.skipNextRest ? (
                  <div className="text-center text-xs text-yellow-400">OFF FLEX ATIVO · próximo descanso removido</div>
                ) : (
                  <button onClick={restToday} className="w-full py-2 rounded-xl border border-white/20 text-gray-400 text-xs">
                    DESCANSAR HOJE
                  </button>
                )}
              </div>
            )
          })()}
        </>
      )}

      {/* Undo */}
      <button onClick={undoSession} className="w-full mt-3 py-2 text-xs text-gray-600 border border-white/5 rounded-xl">
        ↩ Desfazer última sessão
      </button>
    </div>
  )
}

// ── Dieta Tab ─────────────────────────────────────────────────────────
function DietaTab({
  state,
  setState,
}: {
  state: TreinoState
  setState: (u: (p: TreinoState) => TreinoState) => void
}) {
  const activeMeals = MEALS.filter(m => !(state.fastToday && m.skipOnFast))

  // Jejum count this week
  const jejumCount = (() => {
    const today = new Date()
    const dow = today.getDay()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - dow)
    weekStart.setHours(0, 0, 0, 0)
    let n = Object.entries(state.fastDays).filter(([d, v]) => v && new Date(d) >= weekStart).length
    if (state.fastToday) n++
    return n
  })()

  const totals = activeMeals.reduce(
    (acc, m) => {
      const opt = m.options[state.mealChoice[m.id] ?? 0] ?? m.options[0]
      return { kcal: acc.kcal + opt.macros.kcal, p: acc.p + opt.macros.p, c: acc.c + opt.macros.c, g: acc.g + opt.macros.g }
    },
    { kcal: 0, p: 0, c: 0, g: 0 }
  )

  return (
    <div className="px-4 py-3">
      {/* Mode toggle */}
      <div className="bg-surface rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase font-semibold">Modo hoje</span>
          <span className="text-xs text-gray-500">Jejum {jejumCount}/2 esta semana</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setState(prev => ({ ...prev, fastToday: false }))}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
              !state.fastToday ? 'bg-whoop-green text-black' : 'bg-white/5 text-gray-400'
            }`}
          >
            NORMAL
          </button>
          <button
            onClick={() => setState(prev => ({ ...prev, fastToday: true, meals: { ...prev.meals, cafe: false, lanche1: false } }))}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
              state.fastToday ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-400'
            }`}
          >
            JEJUM 16H
          </button>
        </div>
        {state.fastToday && (
          <p className="text-[10px] text-yellow-400 mt-2">🕐 Primeira refeição 13h · última 22h</p>
        )}
      </div>

      {/* Meal cards */}
      <div className="flex flex-col gap-3">
        {activeMeals.map(m => {
          const chosenIdx = state.mealChoice[m.id] ?? 0
          const opt = m.options[chosenIdx] ?? m.options[0]
          const done = !!state.meals[m.id]
          return (
            <div
              key={m.id}
              onClick={() => setState(prev => ({ ...prev, meals: { ...prev.meals, [m.id]: !prev.meals[m.id] } }))}
              className={`bg-surface rounded-2xl p-4 cursor-pointer transition-all ${done ? 'opacity-60 ring-1 ring-whoop-green/40' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-semibold text-sm">{m.name}</span>
                  {m.optional && <span className="ml-1 text-[9px] text-gray-500 border border-gray-700 rounded px-1">opcional</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{m.time}</span>
                  {done && <span className="text-whoop-green text-sm">✓</span>}
                </div>
              </div>

              {/* Option chips */}
              {m.options.length > 1 && (
                <div className="flex gap-1.5 mb-2 flex-wrap" onClick={e => e.stopPropagation()}>
                  {m.options.map((o, i) => (
                    <button
                      key={i}
                      onClick={() => setState(prev => ({ ...prev, mealChoice: { ...prev.mealChoice, [m.id]: i } }))}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                        i === chosenIdx ? 'border-whoop-green text-whoop-green' : 'border-white/20 text-gray-500'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}

              <ul className="text-xs text-gray-400 space-y-0.5 mb-2">
                {opt.items.map((item, i) => <li key={i}>· {item}</li>)}
              </ul>
              <div className="flex gap-3 text-[10px] text-gray-500 border-t border-white/5 pt-2">
                <span className="font-bold text-white">{opt.macros.kcal}kcal</span>
                <span>P {opt.macros.p}g</span>
                <span>C {opt.macros.c}g</span>
                <span>G {opt.macros.g}g</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Totals */}
      <div className="bg-surface rounded-2xl p-4 mt-3">
        <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Total do dia</p>
        <div className="grid grid-cols-4 text-center">
          <div><p className="text-lg font-bold text-whoop-green">{totals.kcal}</p><p className="text-[10px] text-gray-500">kcal</p></div>
          <div><p className="text-lg font-bold">{totals.p}</p><p className="text-[10px] text-gray-500">prot</p></div>
          <div><p className="text-lg font-bold">{totals.c}</p><p className="text-[10px] text-gray-500">carb</p></div>
          <div><p className="text-lg font-bold">{totals.g}</p><p className="text-[10px] text-gray-500">gord</p></div>
        </div>
      </div>
    </div>
  )
}

// ── Readiness Tab ─────────────────────────────────────────────────────
function ReadinessTab({
  state,
  setState,
}: {
  state: TreinoState
  setState: (u: (p: TreinoState) => TreinoState) => void
}) {
  const today = state.readiness[todayKey()]
  const [sliders, setSliders] = useState({ sleep: today?.sleep ?? 3, energy: today?.energy ?? 3, soreness: today?.soreness ?? 3, mood: today?.mood ?? 3 })

  function save() {
    const score = computeScore(sliders)
    setState(prev => ({ ...prev, readiness: { ...prev.readiness, [todayKey()]: { ...sliders, score } } }))
  }

  const score = computeScore(sliders)
  const advice = readinessAdvice(score)

  const fields: { key: keyof typeof sliders; label: string; desc: string }[] = [
    { key: 'sleep', label: 'SONO', desc: '1 = péssimo · 5 = ótimo' },
    { key: 'energy', label: 'ENERGIA', desc: '1 = exausto · 5 = cheio' },
    { key: 'soreness', label: 'DOR MUSCULAR', desc: '1 = muita dor · 5 = sem dor' },
    { key: 'mood', label: 'HUMOR', desc: '1 = péssimo · 5 = ótimo' },
  ]

  return (
    <div className="px-4 py-3">
      {/* Score display */}
      <div className="bg-surface rounded-2xl p-4 mb-3 flex items-center gap-4">
        <div className="text-center">
          <div className="text-4xl font-bold tabular-nums" style={{ color: advice.color }}>{score}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">/ 100</div>
        </div>
        <div>
          <p className="font-bold text-sm" style={{ color: advice.color }}>{advice.level}</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{advice.text}</p>
        </div>
      </div>

      {/* Sliders */}
      <div className="flex flex-col gap-4">
        {fields.map(f => (
          <div key={f.key} className="bg-surface rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-300">{f.label}</span>
              <span className="text-xs text-gray-400">{f.desc}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={5}
                value={sliders[f.key]}
                onChange={e => setSliders(s => ({ ...s, [f.key]: +e.target.value }))}
                onMouseUp={save}
                onTouchEnd={save}
                className="flex-1 accent-[#00D4A0]"
              />
              <span className="text-xl font-bold w-6 text-center">{sliders[f.key]}</span>
            </div>
          </div>
        ))}
      </div>

      {today && (
        <p className="text-center text-xs text-gray-600 mt-3">Readiness salvo hoje · {today.score} pts</p>
      )}
    </div>
  )
}

// ── Timer Tab ─────────────────────────────────────────────────────────
function TimerTab() {
  const [duration, setDuration] = useState(90)
  const [remaining, setRemaining] = useState(90)
  const [running, setRunning] = useState(false)
  const [label, setLabel] = useState('PRONTO')
  const endTimeRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pausedRef = useRef(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const aviso3sRef = useRef(false)

  function initAudio() {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      try { audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)() } catch {}
    }
  }

  function stop() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    setRunning(false)
  }

  function startOrPause() {
    initAudio()
    if (running) {
      pausedRef.current = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
      stop()
      setLabel('PAUSADO')
      return
    }
    const secs = pausedRef.current > 0 ? pausedRef.current : duration
    pausedRef.current = 0
    endTimeRef.current = Date.now() + secs * 1000
    aviso3sRef.current = false
    setRunning(true)
    setLabel('DESCANSANDO')
    if (audioCtxRef.current) createBeeps(audioCtxRef.current, secs)

    intervalRef.current = setInterval(() => {
      const rem = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
      setRemaining(rem)
      if (rem <= 3 && rem > 0 && !aviso3sRef.current) {
        aviso3sRef.current = true
        if ('vibrate' in navigator) navigator.vibrate([60, 60, 60, 60, 60])
      }
      if (rem <= 0) {
        stop()
        setLabel('TERMINOU — PRÓXIMA SÉRIE')
        if ('vibrate' in navigator) navigator.vibrate([300, 100, 300, 100, 500])
        setTimeout(() => { setRemaining(duration); setLabel('PRONTO') }, 2500)
      }
    }, 250)
  }

  function reset() {
    stop()
    pausedRef.current = 0
    setRemaining(duration)
    setLabel('PRONTO')
  }

  function selectDuration(s: number) {
    stop()
    pausedRef.current = 0
    setDuration(s)
    setRemaining(s)
    setLabel('PRONTO')
  }

  useEffect(() => () => stop(), [])

  const presets = [45, 60, 90, 120, 180]
  const pct = duration > 0 ? (remaining / duration) * 100 : 0
  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="px-4 py-6 flex flex-col items-center gap-6">
      <p className="text-xs text-gray-500 uppercase tracking-widest">{label}</p>

      {/* Circular progress */}
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#ffffff10" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="44" fill="none"
            stroke={running ? '#00D4A0' : '#ffffff30'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold tabular-nums ${running ? 'text-whoop-green' : 'text-white'}`}>
            {fmtTime(remaining)}
          </span>
        </div>
      </div>

      {/* Preset buttons */}
      <div className="flex gap-2">
        {presets.map(s => (
          <button
            key={s}
            onClick={() => selectDuration(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              duration === s ? 'border-whoop-green text-whoop-green' : 'border-white/20 text-gray-400'
            }`}
          >
            {s >= 60 ? `${s / 60}min` : `${s}s`}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={startOrPause}
          className="flex-1 py-4 rounded-2xl font-bold text-sm bg-whoop-green text-black"
        >
          {running ? 'PAUSAR' : pausedRef.current > 0 ? 'CONTINUAR' : 'INICIAR'}
        </button>
        <button onClick={reset} className="py-4 px-5 rounded-2xl border border-white/20 text-gray-400 font-bold">
          ✕
        </button>
      </div>
    </div>
  )
}

// ── Stats Tab ─────────────────────────────────────────────────────────
function StatsTab({
  state,
  setState,
}: {
  state: TreinoState
  setState: (u: (p: TreinoState) => TreinoState) => void
}) {
  const dayData = SPLITS[state.split][state.cursor]
  const workout = WORKOUTS[dayData.key]
  const activeMeals = MEALS.filter(m => !(state.fastToday && m.skipOnFast))
  const mealsDone = activeMeals.filter(m => state.meals[m.id]).length
  const exDone = workout.rest ? workout.exercises.length : workout.exercises.filter((_, i) => state.exercises[`${dayData.key}-${i}`]).length
  const exTotal = workout.exercises.length

  const today = state.readiness[todayKey()]
  const advice = today ? readinessAdvice(today.score) : null

  const sessNum = sessionInCycle(state.completedCount)
  const cycNum = currentCycleNum(state.completedCount)
  const deload = isDeload(state.completedCount)

  return (
    <div className="px-4 py-3">
      {/* Cycle progress */}
      <div className="bg-surface rounded-2xl p-4 mb-3">
        <p className="text-xs text-gray-400 uppercase font-semibold mb-3">Ciclo de treino</p>
        <div className="flex items-center gap-4 mb-3">
          <div className="text-center flex-1">
            <p className="text-2xl font-bold">{sessNum}</p>
            <p className="text-[10px] text-gray-500">/ {CYCLE_LENGTH} sessões</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-2xl font-bold">{cycNum}</p>
            <p className="text-[10px] text-gray-500">ciclo</p>
          </div>
          <div className="text-center flex-1">
            {deload ? (
              <p className="text-yellow-400 font-bold text-sm">DELOAD</p>
            ) : (
              <>
                <p className="text-2xl font-bold">{sessionsUntilDeload(state.completedCount)}</p>
                <p className="text-[10px] text-gray-500">p/ deload</p>
              </>
            )}
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-whoop-green transition-all" style={{ width: `${(sessNum / CYCLE_LENGTH) * 100}%` }} />
        </div>
      </div>

      {/* Today progress */}
      <div className="bg-surface rounded-2xl p-4 mb-3">
        <p className="text-xs text-gray-400 uppercase font-semibold mb-3">Hoje</p>
        <div className="flex flex-col gap-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Treino</span>
              <span className="font-bold">{workout.rest ? 'OFF' : `${exDone} / ${exTotal}`}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-whoop-green transition-all" style={{ width: `${workout.rest ? 100 : exTotal > 0 ? (exDone / exTotal) * 100 : 0}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Dieta</span>
              <span className="font-bold">{mealsDone} / {activeMeals.length}{state.fastToday ? ' · JEJUM' : ''}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-whoop-green transition-all" style={{ width: `${activeMeals.length > 0 ? (mealsDone / activeMeals.length) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Readiness today */}
      {today && advice && (
        <div className="bg-surface rounded-2xl p-4 mb-3">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Readiness hoje</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold" style={{ color: advice.color }}>{today.score}</span>
            <div>
              <p className="font-bold text-sm" style={{ color: advice.color }}>{advice.level}</p>
              <p className="text-xs text-gray-500">{advice.text}</p>
            </div>
          </div>
        </div>
      )}

      {/* Reset buttons */}
      <div className="flex flex-col gap-2 mt-2">
        <button
          onClick={() => { if (confirm('Zerar progresso de hoje?')) setState(prev => ({ ...prev, exercises: {}, meals: {} })) }}
          className="w-full py-2.5 rounded-xl border border-white/10 text-gray-400 text-xs"
        >
          Zerar dia
        </button>
        <button
          onClick={() => { if (confirm('ATENÇÃO: apaga TODOS os dados. Continuar?')) { localStorage.removeItem(STORAGE_KEY); window.location.reload() } }}
          className="w-full py-2.5 rounded-xl border border-red-900/50 text-red-500/70 text-xs"
        >
          Reset total
        </button>
      </div>
    </div>
  )
}
