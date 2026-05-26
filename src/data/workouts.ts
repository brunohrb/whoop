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

export const WORKOUTS: Record<string, Workout> = {
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
}
