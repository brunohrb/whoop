import type { RecoveryLevel } from '../types'

export function recoveryLevel(score: number | null | undefined): RecoveryLevel {
  if (score == null) return 'unknown'
  if (score >= 67) return 'green'
  if (score >= 34) return 'yellow'
  return 'red'
}

export function recoveryColor(score: number | null | undefined): string {
  const level = recoveryLevel(score)
  return { green: '#00D4A0', yellow: '#F5C518', red: '#FF4444', unknown: '#555555' }[level]
}

export function strainColor(strain: number | null | undefined): string {
  if (strain == null) return '#555555'
  if (strain >= 18) return '#FF4444'
  if (strain >= 14) return '#FF8C00'
  if (strain >= 10) return '#F5C518'
  if (strain >= 7) return '#4FC3F7'
  return '#555555'
}

export function millisToTime(ms: number | null | undefined): string {
  if (!ms) return '0h 0min'
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const min = totalMin % 60
  if (h === 0) return `${min}min`
  return `${h}h ${min}min`
}

export function millisToHours(ms: number | null | undefined): number {
  if (!ms) return 0
  return ms / 3600000
}

export function sportName(sportId: number | null | undefined): string {
  const sports: Record<number, string> = {
    0: 'Corrida',
    1: 'Ciclismo',
    16: 'Basquete',
    17: 'Futebol Americano',
    18: 'Baseball',
    19: 'Golfe',
    20: 'Hóquei no Gelo',
    21: 'Lacrosse',
    22: 'Rugby',
    23: 'Tênis',
    24: 'Vôlei',
    25: 'Nado',
    26: 'Corrida (Pista)',
    27: 'Luta',
    28: 'Esgrima',
    29: 'Campo e Pista',
    30: 'Natação',
    31: 'Crossfit',
    32: 'Polo Aquático',
    33: 'Futebol',
    34: 'Levantamento de Peso',
    35: 'Boxe',
    36: 'Tênis de Mesa',
    37: 'Pólo',
    38: 'Ciclismo (Indoor)',
    39: 'Remo',
    40: 'Caiaque',
    41: 'Surfe',
    42: 'Escalada',
    43: 'Golfe (Indoor)',
    44: 'Musculação',
    45: 'Funcional',
    46: 'Atletismo',
    47: 'Patinação',
    48: 'Corrida (Esteira)',
    49: 'Elíptico',
    50: 'Pilates',
    51: 'Yoga',
    52: 'Meditação',
    53: 'Outros',
    54: 'Dança',
    55: 'Artes Marciais',
    56: 'Esportes de Inverno',
    57: 'Equitação',
    58: 'Alpinismo',
    59: 'Handebol',
    60: 'Ginástica',
    61: 'Treinamento Funcional',
    62: 'Badminton',
    63: 'Futebol (Salão)',
    64: 'Squash',
    65: 'Lacrosse (Caixa)',
    66: 'Softbol',
    67: 'Ultime',
    68: 'Boliche',
    69: 'Cricket',
    70: 'Canoagem',
    71: 'Triathlon',
    72: 'Paintball',
    73: 'Cabo de Guerra',
    74: 'Polo (Aquático)',
    75: 'Fisioterapia',
    76: 'Corrida (Trail)',
    77: 'Caminhada',
    78: 'Skate',
    79: 'Snowboard',
    80: 'Esqui',
    81: 'Corrida de Obstáculos',
    82: 'Padel',
    83: 'Raquetebol',
    84: 'Esgrima',
    85: 'Bicicross',
    86: 'Calistenia',
    87: 'Treinamento HIIT',
    88: 'Aeróbico',
    89: 'Arco e Flecha',
    90: 'Mergulho',
    91: 'Escalada (Indoor)',
    92: 'Pular Corda',
    93: 'Atividade em Geral',
  }
  return sports[sportId ?? -1] ?? 'Atividade'
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

export function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function workoutDuration(start: string | null, end: string | null): string {
  if (!start || !end) return '-'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return millisToTime(ms)
}

export function kcalFromKj(kj: number | null | undefined): number {
  if (!kj) return 0
  return Math.round(kj * 0.239006)
}
