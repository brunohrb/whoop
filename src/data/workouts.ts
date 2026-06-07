export const VIDEOS_MAP: Record<string, string> = {
  'supino reto': 'UHa9U-O09_U',
  'supino inclinado': 'cXk2mUsUsxg',
  'supino declinado': 'vnF46SVyFxM',
  'crucifixo': 'jSS8fYMKC1k',
  'crossover': 'taI4XduLpTk',
  'paralelas': '2z8JmcrW-As',
  'barra fixa': 'eGo4IYlbE5g',
  'remada curvada': 'vT7RPGx5mqk',
  'remada cavalinho': 'B1nJOd65T1U',
  'puxada frente': 'lueEJGjTuKo',
  'remada unilateral': 'kBWAon7ItDw',
  'pullover': 'F-FMSrlAq5E',
  'pulldown': 'lueEJGjTuKo',
  'levantamento terra': 'op0GJV4BXS8',
  'desenvolvimento militar': 'qEwKCR5JCog',
  'desenvolvimento halteres': 'eDTN2SjY1AY',
  'elevação lateral': '3VcKaXpzqRo',
  'elevação frontal': 'SHsUIZiNdeY',
  'crucifixo invertido': 'Yn7pTBaGzFk',
  'encolhimento': 'cHxcJGVOCuE',
  'remada alta': 'X0MaKW1Bp1g',
  'rosca direta': 'sAq_ocpRh_I',
  'rosca scott': 'dDI8ClxRS1g',
  'rosca alternada': 'kwG2ipFRgfo',
  'rosca concentrada': 'Jvj2wV0vOYU',
  'rosca martelo': 'TwD-YGVP4Bw',
  'rosca inversa': 'nZSNzqO5VdY',
  'tríceps pulley': 's_3LCYNkMLc',
  'tríceps testa': 'd3_LCuUWdFI',
  'tríceps francês': 'ir5PzbFDZNc',
  'tríceps coice': 'PQQ9upFHJrA',
  'agachamento livre': 'gcNh17Ckjuk',
  'leg press': 'IZxyjW7MPJQ',
  'cadeira extensora': 'YyvSfVjQeL4',
  'cadeira flexora': 'm0FOpMa7ono',
  'mesa flexora': 'ELOCsoDSmrg',
  'stiff': 'CN_7cz3P-1U',
  'afundo': 'QOVaHwm-Q6U',
  'hip thrust': 'SEdqd5HHZzQ',
  'elevação pélvica': 'SEdqd5HHZzQ',
  'panturrilha': 'JJrsmJMGqd4',
  'cadeira abdutora': 'xCfWE70tIcY',
  'abdominal canivete': 'dhNQPL_Svhw',
  'abdominal infra': 'dhNQPL_Svhw',
  'prancha': 'pSHjTRCQxIw',
  'flexão punho': 'zMqtN6cDrQk',
}

export function buscarVideoId(nome: string): string | null {
  const n = nome.toLowerCase()
  for (const key in VIDEOS_MAP) {
    if (n.includes(key)) return VIDEOS_MAP[key]
  }
  return null
}

export function parseDescanso(detail: string): number {
  const m = detail.match(/Descanso\s+(\d+)(min|s)/i)
  if (!m) return 60
  return m[2].toLowerCase() === 'min' ? parseInt(m[1]) * 60 : parseInt(m[1])
}

export interface Exercise {
  name: string
  sets: string
  detail: string
}

export interface Workout {
  title: string
  duration?: string
  volume?: string
  rest?: boolean
  note?: string
  exercises: Exercise[]
}

export interface PhaseInfo {
  label: string
  focus: string
  description: string
  workouts: Record<string, Workout>
}

const PHASE1: PhaseInfo = {
  label: 'Fase 1',
  focus: 'Hipertrofia',
  description: 'Volume moderado · 4x8-12 · descanso médio',
  workouts: {
  rest: {
    title: 'DESCANSO',
    rest: true,
    note: 'Caminhada leve 30min OPCIONAL. Alongamento. Hidratação ≥ 3L.',
    exercises: [],
  },
  push1: {
    title: 'PEITO · TRÍCEPS',
    duration: '60-70min',
    volume: '22 séries',
    exercises: [
      { name: 'Supino reto com barra', sets: '4x8-10', detail: 'Descanso 90s · Carga pesada' },
      { name: 'Supino inclinado halteres', sets: '4x10-12', detail: 'Descanso 75s · Inclinação 30°' },
      { name: 'Crucifixo inclinado', sets: '3x12-15', detail: 'Descanso 60s · Alongamento máximo' },
      { name: 'Crossover cabo', sets: '3x12-15', detail: 'Descanso 60s · Contração no centro' },
      { name: 'Paralelas (peito)', sets: '3x8-12', detail: 'Descanso 90s · Tronco inclinado' },
      { name: 'Tríceps pulley corda', sets: '4x10-12', detail: 'Descanso 60s · Abrir corda no final' },
      { name: 'Tríceps francês halteres', sets: '3x10-12', detail: 'Descanso 60s · Amplitude total' },
      { name: 'Tríceps testa barra W', sets: '3x12-15', detail: 'Descanso 45s · Finalizador' },
    ],
  },
  pull1: {
    title: 'COSTAS · BÍCEPS',
    duration: '75-85min',
    volume: '23 séries + cardio',
    exercises: [
      { name: 'Barra fixa (pegada aberta)', sets: '4xAMRAP', detail: 'Descanso 90s · Alternativa: puxada 4x8-10' },
      { name: 'Remada curvada barra', sets: '4x8-10', detail: 'Descanso 90s · Pegada pronada' },
      { name: 'Remada cavalinho (T-bar)', sets: '4x10-12', detail: 'Descanso 75s · Pegada neutra' },
      { name: 'Puxada frente fechada', sets: '3x12', detail: 'Descanso 60s · Pegada neutra/supinada' },
      { name: 'Remada unilateral halter', sets: '3x10-12 cada', detail: 'Descanso 60s · Foco contração' },
      { name: 'Pullover polia alta', sets: '3x15', detail: 'Descanso 45s · Alongamento máximo' },
      { name: 'Rosca direta barra W', sets: '4x8-10', detail: 'Descanso 75s · Sem balançar' },
      { name: 'Rosca alternada halteres', sets: '3x10-12', detail: 'Descanso 60s · Supinação completa' },
      { name: 'Rosca martelo', sets: '3x12', detail: 'Descanso 45s · Braquial + antebraço' },
      { name: 'CARDIO — Esteira/bike LISS', sets: '20min', detail: 'Zona 2 · FC 120-135 · pós-treino' },
    ],
  },
  legs1: {
    title: 'PERNA A · QUADRÍCEPS',
    duration: '50-60min',
    volume: '16 séries',
    exercises: [
      { name: 'Agachamento livre', sets: '4x8-10', detail: 'Descanso 2min · Abaixo paralelo' },
      { name: 'Leg press 45°', sets: '4x12-15', detail: 'Descanso 90s · Pés médios' },
      { name: 'Cadeira extensora', sets: '3x15', detail: 'Descanso 60s · Contração 1s topo' },
      { name: 'Mesa flexora', sets: '3x12', detail: 'Descanso 60s · Controle excêntrica' },
      { name: 'Elevação pélvica (hip thrust)', sets: '3x12', detail: 'Descanso 75s · Glúteo' },
      { name: 'Panturrilha em pé', sets: '4x15-20', detail: 'Descanso 45s · Amplitude total' },
      { name: 'Abdominal canivete', sets: '3x20', detail: 'Descanso 45s' },
    ],
  },
  shoulders: {
    title: 'OMBRO · TRAPÉZIO',
    duration: '75-80min',
    volume: '22 séries + cardio',
    exercises: [
      { name: 'Desenvolvimento militar barra', sets: '4x8-10', detail: 'Descanso 90s' },
      { name: 'Desenvolvimento halteres', sets: '4x10-12', detail: 'Descanso 75s · Sentado' },
      { name: 'Elevação lateral halteres', sets: '4x12-15', detail: 'Descanso 45s · Controle descida' },
      { name: 'Elevação lateral cabo (uni)', sets: '3x12 cada', detail: 'Descanso 45s' },
      { name: 'Elevação frontal halter/anilha', sets: '3x12', detail: 'Descanso 45s' },
      { name: 'Crucifixo invertido (peck deck)', sets: '4x12-15', detail: 'Descanso 60s · Deltoide posterior' },
      { name: 'Encolhimento halteres', sets: '4x12-15', detail: 'Descanso 60s · Pausa 1s topo' },
      { name: 'Remada alta cabo', sets: '3x12', detail: 'Descanso 45s · Pegada fechada' },
      { name: 'CARDIO — Esteira/bike LISS', sets: '20min', detail: 'Zona 2 · FC 120-135 · pós-treino' },
    ],
  },
  arms: {
    title: 'BRAÇO (BI+TRI+ANTE)',
    duration: '60min',
    volume: '24 séries · especialização',
    exercises: [
      { name: 'Rosca direta barra reta', sets: '4x8-10', detail: 'Descanso 75s · Carga progressiva' },
      { name: 'Tríceps testa barra W', sets: '4x10-12', detail: 'Descanso 75s · Emparelhado' },
      { name: 'Rosca Scott barra W', sets: '3x10-12', detail: 'Descanso 60s · Amplitude total' },
      { name: 'Tríceps pulley corda', sets: '3x12-15', detail: 'Descanso 60s' },
      { name: 'Rosca concentrada', sets: '3x12 cada', detail: 'Descanso 45s · Pico' },
      { name: 'Tríceps coice cabo (uni)', sets: '3x15 cada', detail: 'Descanso 45s · Bombeamento' },
      { name: 'Rosca martelo corda', sets: '4x12-15', detail: 'Descanso 45s · Braquial' },
      { name: 'Tríceps francês halter uni', sets: '3x12', detail: 'Descanso 45s' },
      { name: 'Rosca inversa barra W', sets: '3x15', detail: 'Descanso 45s · Antebraço' },
      { name: 'Flexão punho (antebraço)', sets: '3x20', detail: 'Descanso 30s' },
      { name: 'Abdominal infra', sets: '3x15', detail: 'Descanso 45s' },
    ],
  },
  legs2: {
    title: 'PERNA B + CARDIO',
    duration: '60min',
    volume: '14 séries + cardio',
    exercises: [
      { name: 'Stiff com barra', sets: '4x10-12', detail: 'Descanso 90s · Leve flexão joelho' },
      { name: 'Afundo halteres', sets: '3x10 cada', detail: 'Descanso 75s · Amplitude total' },
      { name: 'Cadeira flexora', sets: '4x12-15', detail: 'Descanso 60s · Posteriores' },
      { name: 'Cadeira abdutora', sets: '3x15-20', detail: 'Descanso 45s · Glúteo médio' },
      { name: 'Panturrilha sentado', sets: '4x15-20', detail: 'Descanso 45s · Sóleo' },
      { name: 'Prancha isométrica', sets: '3x45s', detail: 'Descanso 45s' },
      { name: 'CARDIO — Esteira/bike LISS', sets: '25min', detail: 'Zona 2 · FC 120-135 · pós-treino' },
    ],
  },
  legsfull: {
    title: 'PERNA COMPLETA + CARDIO',
    duration: '70-80min',
    volume: '18 séries + cardio',
    exercises: [
      { name: 'Agachamento livre', sets: '4x8-10', detail: 'Descanso 2min · Abaixo paralelo' },
      { name: 'Stiff com barra', sets: '4x10-12', detail: 'Descanso 90s · Posteriores' },
      { name: 'Leg press 45°', sets: '3x12-15', detail: 'Descanso 90s · Pés médios' },
      { name: 'Afundo halteres', sets: '3x10 cada', detail: 'Descanso 75s' },
      { name: 'Cadeira extensora', sets: '3x15', detail: 'Descanso 60s' },
      { name: 'Cadeira flexora', sets: '3x12-15', detail: 'Descanso 60s' },
      { name: 'Panturrilha em pé', sets: '4x15-20', detail: 'Descanso 45s' },
      { name: 'Abdominal canivete', sets: '3x20', detail: 'Descanso 45s' },
      { name: 'CARDIO — LISS', sets: '20min', detail: 'Zona 2 · FC 120-135' },
    ],
  },
  },
}

const PHASE2: PhaseInfo = {
  label: 'Fase 2',
  focus: 'Força',
  description: 'Baixo volume · 5x3-6 · cargas máximas · descanso longo',
  workouts: {
  rest: {
    title: 'DESCANSO',
    rest: true,
    note: 'Caminhada leve 30min OPCIONAL. Alongamento. Hidratação ≥ 3L.',
    exercises: [],
  },
  push1: {
    title: 'PEITO · TRÍCEPS — Força',
    duration: '65-75min',
    volume: '18 séries · pesado',
    exercises: [
      { name: 'Supino reto barra', sets: '5x3-5', detail: 'Descanso 3min · PR — máximo possível' },
      { name: 'Supino inclinado barra', sets: '4x5-6', detail: 'Descanso 2min · pesado' },
      { name: 'Paralelas lastradas', sets: '4x6-8', detail: 'Descanso 2min · adicione peso' },
      { name: 'Supino fechado barra', sets: '4x6-8', detail: 'Descanso 90s · tríceps' },
      { name: 'Tríceps testa barra reta', sets: '4x8', detail: 'Descanso 75s · pesado' },
      { name: 'Tríceps pulley barra V', sets: '3x10', detail: 'Descanso 60s · finalizador' },
    ],
  },
  pull1: {
    title: 'COSTAS · BÍCEPS — Força',
    duration: '75-85min',
    volume: '19 séries + cardio',
    exercises: [
      { name: 'Barra fixa lastrada', sets: '5x4-6', detail: 'Descanso 2min · add cinto' },
      { name: 'Levantamento terra romeno', sets: '4x5', detail: 'Descanso 3min · carga máxima' },
      { name: 'Remada curvada barra supinada', sets: '4x6-8', detail: 'Descanso 90s · pesado' },
      { name: 'Remada cavalinho pesado', sets: '4x8', detail: 'Descanso 90s' },
      { name: 'Rosca direta barra reta', sets: '4x6-8', detail: 'Descanso 75s · carga máxima' },
      { name: 'Rosca Scott barra W', sets: '3x8', detail: 'Descanso 60s · pesado' },
      { name: 'CARDIO — Esteira/bike LISS', sets: '20min', detail: 'Zona 2 · FC 120-135 · pós-treino' },
    ],
  },
  legs1: {
    title: 'PERNA A · FORÇA',
    duration: '60-70min',
    volume: '17 séries',
    exercises: [
      { name: 'Agachamento livre', sets: '5x3-5', detail: 'Descanso 3min · abaixo do paralelo · PR' },
      { name: 'Leg press 45° pesado', sets: '4x8-10', detail: 'Descanso 2min · pés altos' },
      { name: 'Agachamento búlgaro halteres', sets: '3x8 cada', detail: 'Descanso 90s · amplitude total' },
      { name: 'Mesa flexora', sets: '4x10', detail: 'Descanso 75s · controle excêntrico' },
      { name: 'Hip thrust barra', sets: '4x8', detail: 'Descanso 90s · pesado' },
      { name: 'Panturrilha em pé', sets: '4x12', detail: 'Descanso 45s · carregada' },
      { name: 'Abdominal roda', sets: '3x10', detail: 'Descanso 60s' },
    ],
  },
  shoulders: {
    title: 'OMBRO · TRAPÉZIO — Força',
    duration: '70-80min',
    volume: '20 séries + cardio',
    exercises: [
      { name: 'Desenvolvimento militar barra em pé', sets: '5x5', detail: 'Descanso 2min · PR' },
      { name: 'Arnold press halteres', sets: '4x8-10', detail: 'Descanso 75s' },
      { name: 'Elevação lateral halteres', sets: '4x12', detail: 'Descanso 45s · controle' },
      { name: 'Remada alta barra', sets: '4x10', detail: 'Descanso 60s' },
      { name: 'Encolhimento barra', sets: '4x10-12', detail: 'Descanso 60s · pesado' },
      { name: 'Crucifixo invertido peck deck', sets: '3x12', detail: 'Descanso 45s' },
      { name: 'CARDIO — Esteira/bike LISS', sets: '20min', detail: 'Zona 2 · FC 120-135 · pós-treino' },
    ],
  },
  arms: {
    title: 'BRAÇO — Força',
    duration: '60min',
    volume: '22 séries · pesado',
    exercises: [
      { name: 'Rosca direta barra reta', sets: '5x6-8', detail: 'Descanso 75s · carga máxima' },
      { name: 'Tríceps testa barra reta', sets: '5x6-8', detail: 'Descanso 75s · pesado' },
      { name: 'Rosca Scott barra W', sets: '4x8', detail: 'Descanso 60s · sem trapaça' },
      { name: 'Tríceps pulley barra V', sets: '4x10', detail: 'Descanso 60s' },
      { name: 'Rosca martelo halteres', sets: '4x10', detail: 'Descanso 45s · braquial' },
      { name: 'Tríceps coice halter uni', sets: '3x12 cada', detail: 'Descanso 45s' },
      { name: 'Rosca inversa barra W', sets: '3x12', detail: 'Descanso 45s · antebraço' },
      { name: 'Prancha isométrica', sets: '3x45s', detail: 'Descanso 45s' },
    ],
  },
  legs2: {
    title: 'PERNA B · POSTERIOR — Força',
    duration: '65min',
    volume: '16 séries + cardio',
    exercises: [
      { name: 'Stiff barra pesado', sets: '4x6-8', detail: 'Descanso 2min · carga máxima' },
      { name: 'Afundo barra', sets: '3x8 cada', detail: 'Descanso 90s · amplitude total' },
      { name: 'Cadeira flexora', sets: '4x10-12', detail: 'Descanso 60s · controle excêntrico' },
      { name: 'Hack squat', sets: '3x10', detail: 'Descanso 75s · quad focus' },
      { name: 'Cadeira abdutora', sets: '3x15', detail: 'Descanso 45s' },
      { name: 'Panturrilha sentado', sets: '4x15', detail: 'Descanso 45s · sóleo' },
      { name: 'CARDIO — Esteira/bike LISS', sets: '25min', detail: 'Zona 2 · FC 120-135' },
    ],
  },
  legsfull: {
    title: 'PERNA COMPLETA · FORÇA',
    duration: '70-80min',
    volume: '19 séries + cardio',
    exercises: [
      { name: 'Agachamento livre', sets: '5x3-5', detail: 'Descanso 3min · PR' },
      { name: 'Stiff barra pesado', sets: '4x6-8', detail: 'Descanso 2min · posteriores' },
      { name: 'Leg press pesado', sets: '3x10', detail: 'Descanso 90s · pés médios' },
      { name: 'Agachamento búlgaro halteres', sets: '3x8 cada', detail: 'Descanso 90s' },
      { name: 'Mesa flexora', sets: '3x10-12', detail: 'Descanso 60s' },
      { name: 'Hip thrust barra', sets: '3x8', detail: 'Descanso 90s · pesado' },
      { name: 'Panturrilha em pé', sets: '4x12', detail: 'Descanso 45s' },
      { name: 'Abdominal roda', sets: '3x10', detail: 'Descanso 60s' },
      { name: 'CARDIO — LISS', sets: '20min', detail: 'Zona 2 · FC 120-135' },
    ],
  },
  },
}

const PHASE3: PhaseInfo = {
  label: 'Fase 3',
  focus: 'Variação',
  description: 'Máquinas e cabos · 3x15-20 · alto volume · bombeamento',
  workouts: {
  rest: {
    title: 'DESCANSO',
    rest: true,
    note: 'Caminhada leve 30min OPCIONAL. Alongamento. Hidratação ≥ 3L.',
    exercises: [],
  },
  push1: {
    title: 'PEITO · TRÍCEPS — Variação',
    duration: '60-70min',
    volume: '24 séries · bombeamento',
    exercises: [
      { name: 'Supino máquina', sets: '4x12-15', detail: 'Descanso 60s · contração máxima' },
      { name: 'Crucifixo peck deck', sets: '4x12-15', detail: 'Descanso 60s · pausa 1s fechado' },
      { name: 'Supino halteres inclinado', sets: '4x10-12', detail: 'Descanso 75s · amplitude total' },
      { name: 'Crossover cabo baixo', sets: '3x15', detail: 'Descanso 45s · superior do peito' },
      { name: 'Crossover cabo alto', sets: '3x15', detail: 'Descanso 45s · inferior do peito' },
      { name: 'Tríceps pulley corda', sets: '4x15-20', detail: 'Descanso 45s · abrir corda' },
      { name: 'Tríceps francês máquina', sets: '3x15', detail: 'Descanso 45s' },
      { name: 'Tríceps coice cabo uni', sets: '3x15 cada', detail: 'Descanso 30s · finalizador' },
    ],
  },
  pull1: {
    title: 'COSTAS · BÍCEPS — Variação',
    duration: '75-85min',
    volume: '23 séries + cardio',
    exercises: [
      { name: 'Puxada máquina grip neutro', sets: '4x12-15', detail: 'Descanso 60s' },
      { name: 'Remada máquina (peito apoiado)', sets: '4x12-15', detail: 'Descanso 60s · sem trapézio' },
      { name: 'Puxada supinada cabo', sets: '4x12', detail: 'Descanso 60s · cotovelo ao quadril' },
      { name: 'Face pull corda', sets: '3x15-20', detail: 'Descanso 45s · rotação externa' },
      { name: 'Pullover polia alta', sets: '3x15', detail: 'Descanso 45s · grande dorsal' },
      { name: 'Rosca concentrada halter', sets: '4x12 cada', detail: 'Descanso 45s · pico' },
      { name: 'Rosca cabo uni (baixo)', sets: '3x15 cada', detail: 'Descanso 45s · tensão constante' },
      { name: 'Rosca martelo corda', sets: '3x15', detail: 'Descanso 45s' },
      { name: 'CARDIO — Esteira/bike LISS', sets: '20min', detail: 'Zona 2 · FC 120-135 · pós-treino' },
    ],
  },
  legs1: {
    title: 'PERNA A · VARIAÇÃO',
    duration: '55-65min',
    volume: '18 séries',
    exercises: [
      { name: 'Leg press 45° pés altos', sets: '4x15-20', detail: 'Descanso 90s · glúteo + posterior' },
      { name: 'Cadeira extensora uni', sets: '3x15 cada', detail: 'Descanso 60s · pausa 1s topo' },
      { name: 'Agachamento sumô halteres', sets: '4x15', detail: 'Descanso 75s · adutores' },
      { name: 'Hip thrust máquina', sets: '4x15', detail: 'Descanso 60s · glúteo' },
      { name: 'Mesa flexora', sets: '3x12-15', detail: 'Descanso 60s' },
      { name: 'Panturrilha prensa', sets: '4x20', detail: 'Descanso 45s · amplitude total' },
      { name: 'Abdominal máquina', sets: '3x15', detail: 'Descanso 45s' },
    ],
  },
  shoulders: {
    title: 'OMBRO · TRAPÉZIO — Variação',
    duration: '70-80min',
    volume: '22 séries + cardio',
    exercises: [
      { name: 'Desenvolvimento máquina', sets: '4x12-15', detail: 'Descanso 60s' },
      { name: 'Elevação lateral cabo uni', sets: '4x15 cada', detail: 'Descanso 30s · tensão constante' },
      { name: 'Elevação lateral máquina', sets: '3x15-20', detail: 'Descanso 45s · drop set final' },
      { name: 'Face pull corda', sets: '4x15-20', detail: 'Descanso 45s · postura' },
      { name: 'Elevação frontal cabo', sets: '3x12', detail: 'Descanso 45s' },
      { name: 'Crucifixo invertido peck deck', sets: '4x15', detail: 'Descanso 45s · deltoide posterior' },
      { name: 'Encolhimento halteres', sets: '4x15', detail: 'Descanso 45s · pausa topo' },
      { name: 'CARDIO — Esteira/bike LISS', sets: '20min', detail: 'Zona 2 · FC 120-135 · pós-treino' },
    ],
  },
  arms: {
    title: 'BRAÇO — Variação · Bombeamento',
    duration: '60min',
    volume: '25 séries · pump',
    exercises: [
      { name: 'Rosca banco inclinado halteres', sets: '4x12', detail: 'Descanso 60s · alongamento máximo' },
      { name: 'Tríceps francês máquina', sets: '4x12-15', detail: 'Descanso 60s' },
      { name: 'Rosca cabo uni (baixo)', sets: '4x15 cada', detail: 'Descanso 45s · tensão constante' },
      { name: 'Tríceps pulley barra reta', sets: '4x15', detail: 'Descanso 45s' },
      { name: 'Rosca spider curl banco', sets: '3x15', detail: 'Descanso 45s · sem balanço' },
      { name: 'Tríceps coice cabo', sets: '3x15 cada', detail: 'Descanso 30s' },
      { name: 'Rosca inversa cabo', sets: '3x15', detail: 'Descanso 45s · antebraço' },
      { name: 'Abdominal canivete', sets: '3x20', detail: 'Descanso 45s' },
    ],
  },
  legs2: {
    title: 'PERNA B · VARIAÇÃO',
    duration: '60-70min',
    volume: '17 séries + cardio',
    exercises: [
      { name: 'Stiff halteres', sets: '4x12-15', detail: 'Descanso 75s · amplitude total' },
      { name: 'Afundo reverso halteres', sets: '3x12 cada', detail: 'Descanso 60s · joelho traseiro roça' },
      { name: 'Cadeira flexora deitada', sets: '4x15', detail: 'Descanso 60s · controle excêntrico' },
      { name: 'Cadeira abdutora', sets: '3x20', detail: 'Descanso 45s' },
      { name: 'Step up halteres', sets: '3x12 cada', detail: 'Descanso 60s · glúteo' },
      { name: 'Panturrilha sentado', sets: '4x20', detail: 'Descanso 45s · sóleo' },
      { name: 'Prancha lateral', sets: '3x30s cada', detail: 'Descanso 30s' },
      { name: 'CARDIO — Esteira/bike LISS', sets: '25min', detail: 'Zona 2 · FC 120-135' },
    ],
  },
  legsfull: {
    title: 'PERNA COMPLETA · VARIAÇÃO',
    duration: '70-80min',
    volume: '20 séries + cardio',
    exercises: [
      { name: 'Leg press 45° pés altos', sets: '4x15-20', detail: 'Descanso 90s · glúteo' },
      { name: 'Stiff halteres', sets: '4x12-15', detail: 'Descanso 75s · posteriores' },
      { name: 'Agachamento sumô halteres', sets: '3x15', detail: 'Descanso 75s · adutores' },
      { name: 'Afundo reverso halteres', sets: '3x12 cada', detail: 'Descanso 60s' },
      { name: 'Cadeira extensora', sets: '3x15', detail: 'Descanso 60s' },
      { name: 'Cadeira flexora', sets: '3x15', detail: 'Descanso 60s' },
      { name: 'Panturrilha prensa', sets: '4x20', detail: 'Descanso 45s' },
      { name: 'Abdominal máquina', sets: '3x15', detail: 'Descanso 45s' },
      { name: 'CARDIO — LISS', sets: '20min', detail: 'Zona 2 · FC 120-135' },
    ],
  },
  },
}

export const WORKOUT_PHASES: PhaseInfo[] = [PHASE1, PHASE2, PHASE3]

export function getActivePhase(completedCount: number): PhaseInfo {
  const cycleNumber = Math.floor(completedCount / 35)
  return WORKOUT_PHASES[cycleNumber % WORKOUT_PHASES.length]
}

export const SPLITS: Record<string, { day: string; focus: string; key: string }[]> = {
  '6d': [
    { day: 'DOM', focus: 'OFF', key: 'rest' },
    { day: 'SEG', focus: 'PEITO/TRI', key: 'push1' },
    { day: 'TER', focus: 'COSTAS/BI', key: 'pull1' },
    { day: 'QUA', focus: 'PERNA A', key: 'legs1' },
    { day: 'QUI', focus: 'OMB/TRAP', key: 'shoulders' },
    { day: 'SEX', focus: 'BRAÇO', key: 'arms' },
    { day: 'SAB', focus: 'PERNA B', key: 'legs2' },
  ],
  '5d': [
    { day: 'DOM', focus: 'OFF', key: 'rest' },
    { day: 'SEG', focus: 'PEITO/TRI', key: 'push1' },
    { day: 'TER', focus: 'COSTAS/BI', key: 'pull1' },
    { day: 'QUA', focus: 'OFF', key: 'rest' },
    { day: 'QUI', focus: 'OMB/TRAP', key: 'shoulders' },
    { day: 'SEX', focus: 'BRAÇO', key: 'arms' },
    { day: 'SAB', focus: 'PERNA', key: 'legsfull' },
  ],
}

