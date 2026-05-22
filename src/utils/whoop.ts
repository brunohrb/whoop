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
    // Extended sport IDs
    96:  'Futebol Australiano',
    98:  'Hóquei de Campo',
    99:  'Lacrosse',
    100: 'Netball',
    101: 'Rúgbi (7s)',
    102: 'Tênis de Praia',
    103: 'Vôlei de Praia',
    104: 'Parkour',
    105: 'Ciclismo (BMX)',
    106: 'Ciclismo (Downhill)',
    107: 'Wakeboard',
    108: 'Windsurf',
    109: 'Stand Up Paddle',
    110: 'Remo (Ergômetro)',
    111: 'Esgrima (Sabre)',
    112: 'Tiro Esportivo',
    113: 'Hipismo',
    114: 'Judô',
    115: 'Karatê',
    116: 'Taekwondo',
    117: 'Capoeira',
    118: 'Luta Livre',
    119: 'Kickboxing',
    120: 'Muay Thai',
    121: 'BJJ',
    122: 'MMA',
    123: 'Strength Training',
    124: 'Circuito',
    125: 'Treinamento de Mobilidade',
    126: 'Pickleball',
    127: 'Corrida (Ultradistância)',
    128: 'Ciclismo (Ultradistância)',
    129: 'Natação (Água Aberta)',
    130: 'Corrida com Obstáculos',
    131: 'Slacklining',
    132: 'Escalada (Esportiva)',
    133: 'Escalada (Boulder)',
    134: 'Ginástica Artística',
    135: 'Ginástica Rítmica',
    136: 'Atletismo (Arremesso)',
    137: 'Atletismo (Salto)',
    138: 'Pentatlo Moderno',
    139: 'Biatlo',
    140: 'Esqui Cross-Country',
    141: 'Esqui Alpino',
    142: 'Snowboard (Freestyle)',
    143: 'Curling',
    144: 'Patinação Artística',
    145: 'Patinação de Velocidade',
    146: 'Hóquei no Gelo',
    147: 'Bobsled',
    148: 'Luge',
    150: 'Corrida na Neve',
    152: 'Surfe (Bodyboard)',
    153: 'Skimboard',
    154: 'Wakeskate',
    155: 'Kiteboard',
    156: 'Paragliding',
    157: 'Skydiving',
    158: 'Bungee Jump',
    159: 'Via Ferrata',
    160: 'MTB (Enduro)',
    161: 'Gravel Biking',
    162: 'Ciclismo de Estrada',
    163: 'Spinning (Indoor)',
    164: 'HIIT',
    165: 'Tabata',
    166: 'CrossFit',
    167: 'Levantamento Olímpico',
    168: 'Powerlifting',
    169: 'Strongman',
    170: 'Calistenia',
    171: 'Pilates (Reformer)',
    172: 'Yoga (Hot)',
    173: 'Ciclismo Indoor',
    174: 'Natação (Indoor)',
    175: 'Aqua Aeróbica',
    176: 'Hidroginástica',
    177: 'Dança (Zumba)',
    178: 'Dança (Pole)',
    179: 'Barre',
    180: 'TRX',
    181: 'Kettlebell',
    182: 'Battle Rope',
    183: 'Sled Push',
    184: 'Assault Bike',
    185: 'Remo (Conceito)',
    186: 'Esqui Ergômetro',
    187: 'Corrida (Treadmill)',
    188: 'Caminhada (Inclinada)',
    189: 'StepMill',
    190: 'Escada (Máquina)',
    191: 'Elíptico',
    192: 'Bicicleta (Reclinada)',
    193: 'Corrida com Cão',
    194: 'Caminhada com Cão',
    195: 'Tiro com Arco',
    196: 'Pesca Esportiva',
    197: 'Caiaque de Mar',
    198: 'Caiaque de Rio',
    199: 'Rafting',
    200: 'Vela (Offshore)',
    201: 'Vela (Dinghy)',
    202: 'Windsurf (Racing)',
    203: 'Kitesurf (Race)',
    204: 'Triathlon (Ironman)',
    205: 'Duathlon',
    206: 'Aquatlon',
    207: 'Corrida (Montanha)',
    208: 'Trail Running',
    209: 'Skyrunning',
    210: 'Corrida (24h)',
    211: 'Marcha Atlética',
    212: 'Corrida (Dragster)',
    213: 'Polo (Cavalo)',
    214: 'Polo (Bike)',
    215: 'Disc Golf',
    216: 'Bocha',
    217: 'Petanque',
    218: 'Crossminton',
    219: 'Frescobol',
    220: 'Beach Tennis',
    221: 'Padel',
    222: 'Squash',
    223: 'Racquetball',
    224: 'Badminton',
    225: 'Tênis (Mini)',
    226: 'Futebol (Areia)',
    227: 'Futevôlei',
    228: 'Handebol (Praia)',
    229: 'Vôlei (Areia)',
    230: 'Rugby (Praia)',
    231: 'Corrida (Estafeta)',
    232: 'Corrida (Orientação)',
    233: 'Corrida (Parede)',
    234: 'Parkour (Free Running)',
    235: 'Freeride',
    236: 'Downhill (MTB)',
    237: 'Pump Track',
    238: 'BMX (Freestyle)',
    239: 'Ciclismo (Ciclocross)',
    240: 'Ciclismo (Pista)',
    241: 'Corrida (Estrada)',
    242: 'Corrida (Virtual)',
    243: 'Atividade',
    244: 'Futebol (Virtual)',
    245: 'E-Sports',
    246: 'Gaming',
    247: 'Dança (Hip-Hop)',
    248: 'Dança (Salsa)',
    249: 'Dança (Forró)',
    250: 'Dança (Funk)',
    251: 'Capoeira (Angola)',
    252: 'Jiu-Jitsu Brasileiro',
    253: 'Wrestling (Greco-Romano)',
    254: 'Luta (Sambo)',
    255: 'Hapkido',
    256: 'Krav Maga',
    257: 'Defesa Pessoal',
    258: 'Esgrima (Florete)',
    259: 'Esgrima (Espada)',
    260: 'Pentatlo',
    261: 'Heptatlo',
    262: 'Decatlo',
    263: 'Triatlo (Sprint)',
    264: 'Kite Surf',
    265: 'Wakeboard',
    266: 'Esqui Aquático',
    267: 'Tubing',
    268: 'Snorkeling',
    269: 'Mergulho (Livre)',
    270: 'Mergulho (Scuba)',
    271: 'Natação (Oceano)',
    272: 'Corrida (Praia)',
    273: 'Futsal',
    274: 'Futebol (Society)',
    275: 'Futebol (Campo)',
    999: 'Atividade',
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
