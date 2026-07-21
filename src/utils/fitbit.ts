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
  // Google Fit activity type IDs (official list)
  const sports: Record<number, string> = {
    [-1]: 'Atividade',
    0: 'Atividade',
    1: 'Aeróbico',
    2: 'Arco e Flecha',
    3: 'Badminton',
    4: 'Baseball',
    5: 'Basquete',
    6: 'Biatlo',
    7: 'Ciclismo',
    8: 'Ciclismo (Hand)',
    9: 'Mountain Bike',
    10: 'Ciclismo (Estrada)',
    11: 'Spinning',
    12: 'Ciclismo (Estacionário)',
    13: 'Ciclismo (Utilitário)',
    14: 'Boxe',
    15: 'Calistenia',
    16: 'Treinamento em Circuito',
    17: 'Cricket',
    18: 'Cross Training',
    19: 'Curling',
    20: 'Dança',
    21: 'Mergulho',
    22: 'Elíptico',
    23: 'Remo (Ergômetro)',
    24: 'Esgrima',
    25: 'Futebol Americano',
    26: 'Futebol Australiano',
    27: 'Futebol',
    28: 'Frisbee',
    29: 'Jardinagem',
    30: 'Golfe',
    31: 'Ginástica',
    32: 'Handebol',
    33: 'Caminhada (Trilha)',
    34: 'Equitação',
    35: 'Tarefas Domésticas',
    36: 'Patinação no Gelo',
    37: 'Pular Corda',
    38: 'Caiaque',
    39: 'Kettlebell',
    40: 'Kickboxing',
    41: 'Kitesurf',
    42: 'Artes Marciais',
    43: 'Meditação',
    44: 'MMA',
    45: 'P90X',
    46: 'Paragliding',
    47: 'Pilates',
    48: 'Polo',
    49: 'Raquetebol',
    50: 'Escalada',
    51: 'Remo',
    52: 'Remo (Máquina)',
    53: 'Rugby',
    54: 'Corrida',
    55: 'Corrida (Trote)',
    56: 'Corrida (Areia)',
    57: 'Corrida (Esteira)',
    58: 'Vela',
    59: 'Mergulho (Scuba)',
    60: 'Skate',
    61: 'Patinação',
    62: 'Esqui (Cross-Country)',
    63: 'Esqui (Downhill)',
    64: 'Snowboard',
    65: 'Snowmobile',
    66: 'Snowshoe',
    67: 'Squash',
    68: 'Subida de Escadas',
    69: 'Máquina de Escadas',
    70: 'Stand Up Paddle',
    71: 'Musculação',
    72: 'Surfe',
    73: 'Natação (Água Aberta)',
    74: 'Natação',
    75: 'Tênis de Mesa',
    76: 'Esportes Coletivos',
    77: 'Tênis',
    78: 'Esteira (Caminhada)',
    79: 'Vôlei',
    80: 'Vôlei de Praia',
    81: 'Vôlei (Indoor)',
    82: 'Wakeboard',
    83: 'Caminhada',
    84: 'Caminhada (Fitness)',
    85: 'Caminhada (Nordic)',
    86: 'Caminhada (Esteira)',
    87: 'Polo Aquático',
    88: 'Levantamento de Peso',
    89: 'Cadeira de Rodas',
    90: 'Windsurf',
    91: 'Yoga',
    92: 'Zumba',
    93: 'Outro',
    108: 'CrossFit',
    109: 'HIIT',
    110: 'Musculação',
    111: 'Treinamento de Força',
    112: 'Treinamento Funcional',
    113: 'Corrida (Montanha)',
    114: 'Caminhada (Montanha)',
    115: 'Ciclismo (Indoor)',
    116: 'Natação (Indoor)',
    117: 'Dança (Aeróbica)',
    118: 'Boxe (Kickboxing)',
    119: 'Judô',
    120: 'Karatê',
    121: 'Taekwondo',
    122: 'Luta',
  }
  return sports[sportId ?? -1] ?? `Esporte #${sportId}`
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
