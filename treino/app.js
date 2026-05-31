// ====================================================================
// BHR SAÚDE — treino · dieta · readiness · exames · bio · IA
// Estado local em localStorage (treino/dieta zera 00h).
// Exames, bio e chave Claude sincronizam via Supabase.
// ====================================================================

// ---------- VÍDEOS DE EXERCÍCIOS ------------------------------------
const VIDEOS_MAP = {
  // Peito
  'supino reto':              'UHa9U-O09_U',
  'supino inclinado':         'cXk2mUsUsxg',
  'supino declinado':         'vnF46SVyFxM',
  'crucifixo':                'jSS8fYMKC1k',
  'crossover':                'taI4XduLpTk',
  'paralelas':                '2z8JmcrW-As',
  // Costas
  'barra fixa':               'eGo4IYlbE5g',
  'remada curvada':           'vT7RPGx5mqk',
  'remada cavalinho':         'B1nJOd65T1U',
  'puxada frente':            'lueEJGjTuKo',
  'remada unilateral':        'kBWAon7ItDw',
  'pullover':                 'F-FMSrlAq5E',
  'pulldown':                 'lueEJGjTuKo',
  'levantamento terra':       'op0GJV4BXS8',
  // Ombro
  'desenvolvimento militar':  'qEwKCR5JCog',
  'desenvolvimento halteres': 'eDTN2SjY1AY',
  'elevação lateral':         '3VcKaXpzqRo',
  'elevação frontal':         'SHsUIZiNdeY',
  'crucifixo invertido':      'Yn7pTBaGzFk',
  'encolhimento':             'cHxcJGVOCuE',
  'remada alta':              'X0MaKW1Bp1g',
  // Bíceps
  'rosca direta':             'sAq_ocpRh_I',
  'rosca scott':              'dDI8ClxRS1g',
  'rosca alternada':          'kwG2ipFRgfo',
  'rosca concentrada':        'Jvj2wV0vOYU',
  'rosca martelo':            'TwD-YGVP4Bw',
  'rosca inversa':            'nZSNzqO5VdY',
  // Tríceps
  'tríceps pulley':           's_3LCYNkMLc',
  'tríceps testa':            'd3_LCuUWdFI',
  'tríceps francês':          'ir5PzbFDZNc',
  'tríceps coice':            'PQQ9upFHJrA',
  // Pernas
  'agachamento livre':        'gcNh17Ckjuk',
  'leg press':                'IZxyjW7MPJQ',
  'cadeira extensora':        'YyvSfVjQeL4',
  'cadeira flexora':          'm0FOpMa7ono',
  'mesa flexora':             'ELOCsoDSmrg',
  'stiff':                    'CN_7cz3P-1U',
  'afundo':                   'QOVaHwm-Q6U',
  'hip thrust':               'SEdqd5HHZzQ',
  'elevação pélvica':         'SEdqd5HHZzQ',
  'panturrilha':              'JJrsmJMGqd4',
  'cadeira abdutora':         'xCfWE70tIcY',
  // Core
  'abdominal canivete':       'dhNQPL_Svhw',
  'abdominal infra':          'dhNQPL_Svhw',
  'prancha':                  'pSHjTRCQxIw',
  'flexão punho':             'zMqtN6cDrQk',
};

function buscarVideoId(nome) {
  const n = nome.toLowerCase();
  for (const key in VIDEOS_MAP) {
    if (n.includes(key)) return VIDEOS_MAP[key];
  }
  return null;
}

function abrirVideo(videoId, nome) {
  const overlay = document.getElementById('videoOverlay');
  document.getElementById('videoOverlayTitle').textContent = nome;
  document.getElementById('videoOverlayIframe').src =
    `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const link = document.getElementById('videoOverlayYtLink');
  link.href = ytUrl;
  overlay.classList.add('show');
}

function fecharVideo() {
  document.getElementById('videoOverlayIframe').src = '';
  document.getElementById('videoOverlay').classList.remove('show');
}

document.getElementById('videoOverlayClose').onclick = fecharVideo;

// ---------- WEB PUSH — alerta com tela bloqueada ----------------------
// Fluxo: subscreve push → ao iniciar timer envia subscrição + delay para
// a Edge Function Supabase → ela retorna 200 imediatamente e dispara o
// push via APNs em background (EdgeRuntime.waitUntil) → iOS entrega na
// tela bloqueada com som no fone. Não para música, não precisa de keepalive.

const _VAPID_PUBLIC = 'BJGi7MmkLYT81pqz4r9LHifLgFxofFBnx8rtxEtZWYEiNcgii6_pknbUwgKVEEdBMBMoaDtLShY0CG69Ub6EC60';
const _PUSH_URL = 'https://hisbbtddpoxufvghxqtm.supabase.co/functions/v1/timer-push';

let _pushSub = null;

// iOS Safari exige Uint8Array — string base64url não é aceita
function _vapidKey() {
  const b64 = (_VAPID_PUBLIC + '===').replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function _getPushSub() {
  if (_pushSub) return _pushSub;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) { _pushSub = existing; return existing; }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return null;
    _pushSub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: _vapidKey(),
    });
    return _pushSub;
  } catch(e) { console.error('push sub:', e); return null; }
}

async function _agendarNotifTimer(ms, body) {
  const sub = await _getPushSub();
  if (!sub) return;
  // Edge Function retorna 200 imediatamente; push vai em EdgeRuntime.waitUntil
  // independente de a conexão HTTP estar aberta ou não
  fetch(_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON(), delay_ms: ms, body }),
    keepalive: true,
  }).catch(() => {});
}

function _cancelarNotifTimer() { /* sem-op: push já foi agendado no servidor */ }

// ---------- ÁUDIO COMPARTILHADO (iOS + Bluetooth) --------------------
// Bipes pré-agendados via AudioContext (ambient mode — não interrompe música).
// Backup para quando o app está em foreground ou com música tocando.
let _audioCtx = null;
let _beepNodes = [];

function _criarAudioCtx() {
  // Chamado no gesto do usuário (clique). Cria o ctx mas não toca nada ainda.
  if (_audioCtx && _audioCtx.state !== 'closed') return;
  try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
}

function _agendarBeeps(segundosRestantes) {
  // Pré-agenda 4 tons crescentes com tempo absoluto do hardware de áudio.
  // Ficam na fila mesmo se JS for throttled ou tela bloquear (music mantém hw ativo).
  const ctx = _audioCtx;
  if (!ctx || ctx.state === 'closed') return;
  _beepNodes.forEach(n => { try { n.stop(); } catch(e) {} });
  _beepNodes = [];
  const startAt = ctx.currentTime + Math.max(0, segundosRestantes);
  const tons = [
    { freq: 880,  dur: 0.18, gain: 0.55, delay: 0.00 },
    { freq: 1100, dur: 0.18, gain: 0.65, delay: 0.22 },
    { freq: 1320, dur: 0.32, gain: 0.72, delay: 0.44 },
    { freq: 1760, dur: 0.45, gain: 0.78, delay: 0.80 },
  ];
  tons.forEach(t => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = t.freq;
      const t0 = startAt + t.delay;
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.exponentialRampToValueAtTime(t.gain, t0 + 0.02);
      gain.gain.setValueAtTime(t.gain, t0 + t.dur - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + t.dur);
      osc.start(t0); osc.stop(t0 + t.dur + 0.05);
      _beepNodes.push(osc);
    } catch(e) {}
  });
}

function _tocarBeeps() {
  // Backup: toca imediatamente ao fim (cobre caso de ctx suspenso com tela acesa).
  _agendarBeeps(0);
}

// ---------- TIMER REGRESSIVO DE DESCANSO ----------------------------
let restInterval = null;
let restTotal = 0;
let restEndTime = 0;   // timestamp absoluto — não perde tempo em background
let restExKey = null;
let restAviso3s = false;

function parseDescanso(detail) {
  const m = detail.match(/Descanso\s+(\d+)(min|s)/i);
  if (!m) return 60;
  return m[2].toLowerCase() === 'min' ? parseInt(m[1]) * 60 : parseInt(m[1]);
}

function _dispararFimRest() {
  if ('vibrate' in navigator) navigator.vibrate([300, 100, 300, 100, 500]);
  _tocarBeeps();
}

function iniciarRest(key, nome, segundos) {
  cancelarRest();
  _criarAudioCtx();
  _agendarBeeps(segundos);
  _agendarNotifTimer(segundos * 1000, `${nome} — hora da próxima série 💪`);
  restExKey = key;
  restTotal = segundos;
  restEndTime = Date.now() + segundos * 1000;
  restAviso3s = false;
  document.getElementById('restOverlayName').textContent = nome.toUpperCase();
  atualizarRestOverlay();
  document.getElementById('restOverlay').classList.add('show');
  const btn = document.getElementById(`restBtn-${key}`);
  if (btn) btn.classList.add('running');

  restInterval = setInterval(() => {
    const restante = Math.max(0, Math.ceil((restEndTime - Date.now()) / 1000));
    atualizarRestOverlay(restante);
    if (restante <= 3 && restante > 0 && !restAviso3s) {
      restAviso3s = true;
      if ('vibrate' in navigator) navigator.vibrate([60, 60, 60, 60, 60]);
    }
    if (restante <= 0) {
      clearInterval(restInterval);
      restInterval = null;
      document.getElementById('restOverlayName').textContent = 'DESCANSOU! PRÓXIMA SÉRIE ✓';
      document.getElementById('restOverlayTime').textContent = '00';
      _dispararFimRest();
      setTimeout(() => cancelarRest(), 2500);
    }
  }, 250);
}

function reiniciarRest(segundos) {
  if (!restExKey) return;
  clearInterval(restInterval);
  _cancelarNotifTimer();
  restTotal = segundos;
  restEndTime = Date.now() + segundos * 1000;
  restAviso3s = false;
  atualizarRestOverlay();
  _agendarBeeps(segundos);
  _agendarNotifTimer(segundos * 1000, 'Hora da próxima série 💪');
  restInterval = setInterval(() => {
    const restante = Math.max(0, Math.ceil((restEndTime - Date.now()) / 1000));
    atualizarRestOverlay(restante);
    if (restante <= 3 && restante > 0 && !restAviso3s) {
      restAviso3s = true;
      if ('vibrate' in navigator) navigator.vibrate([60, 60, 60, 60, 60]);
    }
    if (restante <= 0) {
      clearInterval(restInterval);
      restInterval = null;
      document.getElementById('restOverlayName').textContent = 'DESCANSOU! PRÓXIMA SÉRIE ✓';
      document.getElementById('restOverlayTime').textContent = '00';
      _dispararFimRest();
      setTimeout(() => cancelarRest(), 2500);
    }
  }, 250);
}

function atualizarRestOverlay(restante) {
  if (restante === undefined) restante = restTotal;
  const pct = restTotal > 0 ? (restante / restTotal) * 100 : 0;
  document.getElementById('restOverlayTime').textContent = String(restante).padStart(2, '0');
  document.getElementById('restOverlayBar').style.width = pct + '%';
}

function cancelarRest() {
  if (restInterval) { clearInterval(restInterval); restInterval = null; }
  _cancelarNotifTimer();
  document.getElementById('restOverlay').classList.remove('show');
  if (restExKey) {
    const btn = document.getElementById(`restBtn-${restExKey}`);
    if (btn) btn.classList.remove('running');
    restExKey = null;
  }
}

// ---------- DIVISÕES -------------------------------------------------
const SPLITS = {
  '6d': [
    { day: 'DOM', focus: 'OFF',      key: 'rest' },
    { day: 'SEG', focus: 'PEITO/TRI',key: 'push1' },
    { day: 'TER', focus: 'COSTAS/BI',key: 'pull1' },
    { day: 'QUA', focus: 'PERNA A',  key: 'legs1' },
    { day: 'QUI', focus: 'OMB/TRAP', key: 'shoulders' },
    { day: 'SEX', focus: 'BRAÇO',    key: 'arms' },
    { day: 'SAB', focus: 'PERNA B',  key: 'legs2' }
  ],
  '5d': [
    { day: 'DOM', focus: 'OFF',      key: 'rest' },
    { day: 'SEG', focus: 'PEITO/TRI',key: 'push1' },
    { day: 'TER', focus: 'COSTAS/BI',key: 'pull1' },
    { day: 'QUA', focus: 'OFF',      key: 'rest' },
    { day: 'QUI', focus: 'OMB/TRAP', key: 'shoulders' },
    { day: 'SEX', focus: 'BRAÇO',    key: 'arms' },
    { day: 'SAB', focus: 'PERNA',    key: 'legsfull' }
  ]
};

// ---------- TREINOS --------------------------------------------------
const WORKOUTS = {
  rest: {
    title: 'DESCANSO',
    rest: true,
    note: 'Caminhada leve 30min OPCIONAL. Alongamento. Hidratação ≥ 3L.'
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
      { name: 'Tríceps testa barra W', sets: '3x12-15', detail: 'Descanso 45s · Finalizador' }
    ]
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
      { name: 'CARDIO — Esteira/bike LISS', sets: '20min', detail: 'Zona 2 · FC 120-135 · pós-treino' }
    ]
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
      { name: 'Abdominal canivete', sets: '3x20', detail: 'Descanso 45s' }
    ]
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
      { name: 'CARDIO — Esteira/bike LISS', sets: '20min', detail: 'Zona 2 · FC 120-135 · pós-treino' }
    ]
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
      { name: 'Abdominal infra', sets: '3x15', detail: 'Descanso 45s' }
    ]
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
      { name: 'CARDIO — Esteira/bike LISS', sets: '25min', detail: 'Zona 2 · FC 120-135 · pós-treino' }
    ]
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
      { name: 'CARDIO — LISS', sets: '20min', detail: 'Zona 2 · FC 120-135' }
    ]
  }
};

// ---------- DIETA ----------------------------------------------------
// Cada refeição tem múltiplas opções — usuário escolhe uma por dia.
// skipOnFast: oculta quando Jejum 16h está ativo (janela alimentar 13h→20h30).
const MEALS = [
  {
    id: 'cafe', name: 'CAFÉ DA MANHÃ', time: '07:00', skipOnFast: true,
    options: [
      {
        label: 'Ovos + aveia',
        items: [
          '4 ovos inteiros + 3 claras mexidos',
          '80g aveia com 1 banana e canela',
          '1 colher (sopa) pasta de amendoim integral',
          '1 xícara café preto'
        ],
        macros: { kcal: 680, p: 42, c: 75, g: 20 }
      },
      {
        label: 'Omelete + tapioca',
        items: [
          '3 ovos + 4 claras em omelete com queijo cottage (50g)',
          '1 tapioca média (3 col sopa) com pasta de amendoim',
          '1 mamão papaia pequeno',
          'Café preto'
        ],
        macros: { kcal: 640, p: 44, c: 60, g: 22 }
      },
      {
        label: 'Iogurte + granola',
        items: [
          '300g iogurte natural desnatado',
          '1 scoop whey (30g) misturado',
          '50g granola sem açúcar + 1 banana',
          'Café preto'
        ],
        macros: { kcal: 620, p: 45, c: 70, g: 14 }
      }
    ]
  },
  {
    id: 'lanche1', name: 'LANCHE 1', time: '10:30', skipOnFast: true,
    options: [
      {
        label: 'Whey + castanhas',
        items: [
          '1 scoop whey (30g) com 300ml água',
          '50g castanhas (pará/caju/amêndoa)',
          '1 fruta (maçã, pera ou mamão)'
        ],
        macros: { kcal: 480, p: 28, c: 35, g: 24 }
      },
      {
        label: 'Sanduíche proteico',
        items: [
          '2 fatias pão integral',
          '100g peito de peru ou atum',
          '1 col (sopa) requeijão light',
          '1 fruta'
        ],
        macros: { kcal: 450, p: 32, c: 55, g: 10 }
      }
    ]
  },
  {
    id: 'almoco', name: 'ALMOÇO', time: '13:00',
    options: [
      {
        label: 'Frango + arroz+feijão',
        items: [
          '180g peito de frango grelhado',
          '150g arroz integral cozido + 1 concha feijão',
          'Salada verde à vontade + 1 colher azeite',
          '100g batata-doce ou legumes cozidos'
        ],
        macros: { kcal: 780, p: 50, c: 95, g: 18 }
      },
      {
        label: 'Patinho + mandioquinha',
        items: [
          '180g patinho moído refogado',
          '150g mandioquinha (baroa) ou mandioca',
          'Brócolis + couve refogados',
          '1 col azeite extravirgem'
        ],
        macros: { kcal: 760, p: 48, c: 85, g: 22 }
      },
      {
        label: 'Tilápia + arroz integral',
        items: [
          '200g tilápia grelhada (ou outro peixe branco)',
          '150g arroz integral',
          'Salada colorida + azeite',
          '1 laranja ou maçã'
        ],
        macros: { kcal: 700, p: 50, c: 85, g: 16 }
      }
    ]
  },
  {
    id: 'pre', name: 'PRÉ-TREINO', time: '16:30',
    options: [
      {
        label: 'Pão + peru',
        items: [
          '2 fatias pão integral ou 1 tapioca (3 col sopa)',
          '100g peito de peru ou frango desfiado',
          '1 banana com mel (1 col chá)',
          'Café preto ou cafeína 200mg'
        ],
        macros: { kcal: 520, p: 32, c: 80, g: 8 }
      },
      {
        label: 'Shake rápido',
        items: [
          '1 scoop whey (30g)',
          '1 banana média + 30g aveia',
          '300ml leite desnatado',
          'Cafeína 200mg (cápsula)'
        ],
        macros: { kcal: 480, p: 35, c: 70, g: 6 }
      }
    ]
  },
  {
    id: 'jantar', name: 'JANTAR (pós-treino)', time: '20:30',
    options: [
      {
        label: 'Carne + arroz',
        items: [
          '200g carne vermelha magra (patinho/coxão mole)',
          '150g arroz branco ou batata-doce',
          'Legumes no vapor (brócolis, abobrinha, cenoura)',
          '1 col azeite de oliva extravirgem'
        ],
        macros: { kcal: 740, p: 48, c: 80, g: 22 }
      },
      {
        label: 'Salmão + batata-doce',
        items: [
          '200g salmão grelhado',
          '150g batata-doce assada',
          'Aspargos ou brócolis',
          '1 col azeite'
        ],
        macros: { kcal: 720, p: 45, c: 65, g: 26 }
      },
      {
        label: 'Frango + macarrão integral',
        items: [
          '180g peito de frango em cubos',
          '120g (cru) macarrão integral com molho de tomate caseiro',
          'Salada + 1 col azeite',
          'Parmesão ralado (10g)'
        ],
        macros: { kcal: 720, p: 50, c: 90, g: 14 }
      }
    ]
  },
  {
    id: 'ceia', name: 'CEIA', time: '22:30', optional: true,
    options: [
      {
        label: 'Caseína lenta',
        items: [
          '1 scoop caseína (30g) com 200ml água ou leite desnatado',
          '20g amêndoas',
          'Chá de camomila ou erva-doce'
        ],
        macros: { kcal: 280, p: 28, c: 8, g: 14 }
      },
      {
        label: 'Cottage + fruta',
        items: [
          '200g queijo cottage',
          '1 kiwi ou 1/2 mamão',
          'Canela a gosto',
          '10g castanhas-do-pará (1 unidade)'
        ],
        macros: { kcal: 260, p: 26, c: 18, g: 10 }
      },
      {
        label: 'Claras + pasta de amendoim',
        items: [
          '6 claras mexidas (ou omelete)',
          '1 col (sopa) pasta de amendoim integral',
          '1 fatia pão integral (opcional)'
        ],
        macros: { kcal: 240, p: 25, c: 12, g: 12 }
      }
    ]
  }
];

// ---------- STATE ----------------------------------------------------
const STORAGE_KEY = 'iron-data-v2';
const todayKey = () => new Date().toISOString().slice(0, 10);

// Ciclo da fila: 35 posições (5 "semanas" de 7 dias cada), deload nas últimas 7.
const CYCLE_LENGTH = 35;
const DELOAD_WINDOW = 7;

function defaultState() {
  return {
    date: todayKey(),
    split: '6d',            // '6d' ou '5d'
    cursor: 0,              // posição atual na fila (0..6 no split vigente)
    completedCount: 0,      // total de sessões concluídas/puladas — base do ciclo e deload
    exercises: {},          // checks da sessão em andamento
    meals: {},              // { [mealId]: true/false }
    mealChoice: {},         // { [mealId]: optionIndex }
    fastToday: false,       // jejum 16h ativo hoje
    fastDays: {},           // { 'YYYY-MM-DD': true } — histórico de jejum
    fastTarget: 2,          // meta de jejum por semana
    readiness: {},          // { 'YYYY-MM-DD': { sleep, energy, soreness, mood, score } }
    restDayToday: '',       // 'YYYY-MM-DD' quando usuário descansou hoje de forma flexível
    skipNextRest: false     // aguarda consumir o próximo dia OFF agendado na fila
  };
}

let state;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // migração: estado antigo baseado em dia-da-semana → zera cursor e contador
    if (parsed.cursor === undefined || parsed.completedCount === undefined) {
      parsed.cursor = 0;
      parsed.completedCount = 0;
      parsed.exercises = {};
    }
    // limpa campos obsoletos do modelo antigo
    delete parsed.weekNumber;
    delete parsed.lastWeekIncrement;
    delete parsed.deloadEvery;
    delete parsed.selectedDay;
    // completa campos faltantes com defaults
    const base = defaultState();
    for (const k of Object.keys(base)) {
      if (parsed[k] === undefined) parsed[k] = base[k];
    }
    // reset diário: exercícios e refeições zeram, cursor NÃO avança sozinho
    if (parsed.date !== todayKey()) {
      if (parsed.fastToday) parsed.fastDays[parsed.date] = true;
      parsed.date = todayKey();
      parsed.exercises = {};
      parsed.meals = {};
      parsed.fastToday = false;
    }
    // migração: meals numéricos antigos (0,1,2...) → limpar
    if (parsed.meals && Object.keys(parsed.meals).some(k => /^\d+$/.test(k))) {
      parsed.meals = {};
    }
    return parsed;
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateProgress();
  updateReadinessDisplay();
  updateDeloadBadge();
}

// ---------- CICLO / DELOAD -------------------------------------------
// Sessão atual = a que está sendo executada agora (base 1).
function currentSessionNum() { return state.completedCount + 1; }
function currentCycleNum()  { return Math.floor(state.completedCount / CYCLE_LENGTH) + 1; }
// Posição dentro do ciclo (1..CYCLE_LENGTH).
function sessionInCycle()   { return ((currentSessionNum() - 1) % CYCLE_LENGTH) + 1; }
// Sessões que faltam pro próximo deload (>0 se fora do deload, 0 durante).
function sessionsUntilDeload() {
  const pos = sessionInCycle();
  const deloadStart = CYCLE_LENGTH - DELOAD_WINDOW + 1; // 29
  return pos < deloadStart ? deloadStart - pos : 0;
}

function isDeloadCycle() {
  return sessionInCycle() >= (CYCLE_LENGTH - DELOAD_WINDOW + 1);
}

function applyDeloadModifier(sets) {
  // reduz séries em ~50% e pede reduzir carga 40%
  if (!isDeloadCycle()) return sets;
  const match = sets.match(/^(\d+)x(.+)$/);
  if (!match) return sets;
  const newSets = Math.max(2, Math.ceil(parseInt(match[1]) / 2));
  return `${newSets}x${match[2]}`;
}

// ---------- READINESS (0-100) ----------------------------------------
function computeReadinessScore(r) {
  // cada campo 1-5, soma ponderada
  const s = (r.sleep || 3) * 1.5 + (r.energy || 3) * 1.5 + (6 - (r.soreness || 3)) * 1.0 + (r.mood || 3) * 1.0;
  // max = 7.5 + 7.5 + 5 + 5 = 25 -> scale to 100
  return Math.round((s / 25) * 100);
}

function readinessAdvice(score) {
  if (score >= 80) return { level: 'ALTA', color: '#00d97e', text: 'Corpo pronto. Treine forte — pode tentar PR hoje.' };
  if (score >= 60) return { level: 'BOA', color: '#9bd200', text: 'Treino normal conforme plano.' };
  if (score >= 40) return { level: 'MÉDIA', color: '#ffb020', text: 'Reduza carga 10-15%. Mantenha séries.' };
  return { level: 'BAIXA', color: '#ff6060', text: 'Considere treino leve ou descanso. Corpo pedindo.' };
}

// ---------- RENDER: FILA --------------------------------------------
function currentSplit() { return SPLITS[state.split]; }
function currentDayData() { return currentSplit()[state.cursor]; }
function currentWorkout() { return WORKOUTS[currentDayData().key]; }

// Retorna as próximas N posições da fila a partir do cursor (exclui a atual).
function upcomingQueue(n) {
  const split = currentSplit();
  const out = [];
  for (let i = 1; i <= n; i++) {
    out.push(split[(state.cursor + i) % split.length]);
  }
  return out;
}

function renderWeek() {
  const grid = document.getElementById('weekGrid');
  grid.innerHTML = '';
  const split = currentSplit();
  const size = split.length;

  // Índice relativo do próximo OFF a ser consumido pelo descanso flexível
  let skipRestIdx = -1;
  if (state.skipNextRest) {
    for (let i = 1; i < size; i++) {
      if (split[(state.cursor + i) % size].key === 'rest') { skipRestIdx = i; break; }
    }
  }

  // Rotaciona pra começar no cursor: posição 0 = AGORA, 1..6 = próximas.
  for (let i = 0; i < size; i++) {
    const item = split[(state.cursor + i) % size];
    const chip = document.createElement('div');
    chip.className = 'day-chip';
    if (i === 0) chip.classList.add('active');
    if (i === skipRestIdx) chip.classList.add('rest-consumed');
    const pos = i === 0 ? 'AGORA' : `+${i}`;
    const focus = i === skipRestIdx ? `<s>${item.focus}</s>` : item.focus;
    chip.innerHTML = `<div class="day-name">${pos}</div><div class="day-focus">${focus}</div>`;
    // Clique não muda cursor — apenas scrolla até o workout principal.
    chip.onclick = () => {
      document.getElementById('workoutContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    grid.appendChild(chip);
  }
}

// ---------- RENDER: WORKOUT -----------------------------------------
function renderWorkout() {
  const container = document.getElementById('workoutContainer');
  const dayData = currentDayData();
  const w = WORKOUTS[dayData.key];

  // Descanso flexível ativo hoje: mostra card de OFF sem avançar cursor
  if (state.restDayToday === todayKey() && !w.rest) {
    container.innerHTML = `
      <div class="rest-card">
        <h3>OFF FLEX</h3>
        <p>Você descansou hoje. Treino de amanhã: <strong>${w.title}</strong>.<br>Próximo OFF agendado foi removido da fila.</p>
      </div>
      <div class="info-block">
        <h4>RECUPERAÇÃO</h4>
        <p>Amanhã retoma com <strong>${w.title}</strong>. Dorme bem, hidrata e come todas as refeições.</p>
      </div>
      <div class="workout-actions">
        <button class="btn-skip" id="skipBtn">PULAR TREINO →</button>
      </div>
    `;
    document.getElementById('skipBtn').onclick = () => {
      if (confirm('Pular este treino? A fila avança e conta pro ciclo de deload.')) skipSession();
    };
    updateProgress();
    return;
  }

  if (w.rest) {
    container.innerHTML = `
      <div class="rest-card">
        <h3>DESCANSO</h3>
        <p>${w.note}</p>
      </div>
      <div class="info-block">
        <h4>DIA DE RECUPERAÇÃO</h4>
        <p>Hipertrofia acontece no descanso. Aproveita pra dormir bem, comer todas as refeições e hidratação 3.5L+.
        Se sentir ansiedade, caminhada leve 30min — mas <strong>sem treino de força</strong>.</p>
      </div>
      <div class="workout-actions">
        <button class="btn-finalize" id="finalizeBtn">CONCLUIR DESCANSO →</button>
        <button class="btn-skip" id="skipBtn">PULAR DESCANSO →</button>
      </div>
    `;
    document.getElementById('finalizeBtn').onclick = () => finalizeSession();
    document.getElementById('skipBtn').onclick = () => {
      if (confirm('Pular o descanso? A fila avança e conta pro ciclo de deload.')) skipSession();
    };
    updateProgress();
    return;
  }

  const deload = isDeloadCycle();
  const deloadBanner = deload ? `
    <div class="deload-banner">
      🔋 DELOAD ATIVO · sessão ${sessionInCycle()}/${CYCLE_LENGTH} · Reduza cargas 40% · Séries já ajustadas
    </div>
  ` : '';

  const exercisesHTML = w.exercises.map((ex, idx) => {
    const key = `${dayData.key}-${idx}`;
    const done = state.exercises[key];
    const adjustedSets = applyDeloadModifier(ex.sets);
    const videoId = buscarVideoId(ex.name);
    const videoBtn = videoId
      ? `<button class="ex-yt" onclick="event.stopPropagation(); abrirVideo('${videoId}', '${ex.name.replace(/'/g, "\\'")}')">▶ VER EXECUÇÃO</button>`
      : '';
    const restSec = parseDescanso(ex.detail);
    const isRunning = restExKey === key;
    return `
      <div class="exercise ${done ? 'done' : ''}" data-key="${key}">
        <div class="ex-check"></div>
        <div class="ex-body">
          <div class="ex-name">${ex.name}</div>
          <div class="ex-detail">${ex.detail}</div>
          ${videoBtn}
        </div>
        <div class="ex-sets">${adjustedSets}</div>
        <button class="ex-timer-btn ${isRunning ? 'running' : ''}" id="restBtn-${key}"
                onclick="event.stopPropagation(); iniciarRest('${key}', '${ex.name.replace(/'/g,"\\'")}', ${restSec})">⏱</button>
      </div>
    `;
  }).join('');

  const doneCount = w.exercises.filter((_, i) => state.exercises[`${dayData.key}-${i}`]).length;
  const allDone = doneCount === w.exercises.length && w.exercises.length > 0;

  container.innerHTML = `
    ${deloadBanner}
    <div class="workout-card displayed">
      <div class="workout-header">
        <div class="workout-title">${w.title}</div>
        <div class="workout-meta">
          <span>⏱ <strong>${w.duration}</strong></span>
          <span>📊 <strong>${w.volume}</strong></span>
        </div>
      </div>
      <div class="workout-chrono" id="workoutChrono">
        <div class="workout-chrono-left">
          <div class="workout-chrono-label">CRONÔMETRO</div>
          <div class="workout-chrono-time" id="workoutChronoTime">00:00</div>
        </div>
        <button class="workout-chrono-btn" id="workoutChronoBtn">INICIAR</button>
      </div>
      <div class="exercises">${exercisesHTML}</div>
    </div>
    <div class="workout-actions">
      <button class="btn-finalize ${allDone ? 'ready' : ''}" id="finalizeBtn" ${doneCount === 0 ? 'disabled' : ''}>
        ${allDone ? '✓ FINALIZAR TREINO' : `FINALIZAR TREINO (${doneCount}/${w.exercises.length})`}
      </button>
      <button class="btn-skip" id="skipBtn">PULAR TREINO →</button>
      ${state.skipNextRest
        ? `<div class="rest-flex-pending">OFF FLEX ATIVO · próximo descanso da fila removido</div>`
        : `<button class="btn-rest-flex" id="restFlexBtn">DESCANSAR HOJE</button>`
      }
    </div>
  `;

  container.querySelectorAll('.exercise').forEach(el => {
    el.onclick = () => {
      const key = el.dataset.key;
      state.exercises[key] = !state.exercises[key];
      el.classList.toggle('done');
      saveState();

      // Auto-finaliza quando todos os exercícios marcam como feitos.
      const k = currentDayData().key;
      const allNowDone = WORKOUTS[k].exercises.every((_, i) => state.exercises[`${k}-${i}`]);
      if (allNowDone) {
        setTimeout(() => finalizeSession(), 350); // delay pro usuário ver o último check animar
      } else {
        renderWorkout(); // re-render pra atualizar contador do botão
      }
    };
  });

  // Sincroniza o cronômetro inline com o estado atual e liga o botão
  syncChronoInline();
  document.getElementById('workoutChronoBtn').onclick = toggleChrono;

  document.getElementById('finalizeBtn').onclick = () => finalizeSession();
  document.getElementById('skipBtn').onclick = () => {
    if (confirm('Pular este treino? A fila avança e conta pro ciclo de deload.')) skipSession();
  };
  document.getElementById('restFlexBtn')?.addEventListener('click', descansarHoje);

  updateProgress();
}

// ---------- CONTROLE DA FILA ----------------------------------------
function advanceCursor() {
  const split = currentSplit();
  // limpa checks da sessão que termina
  const oldKey = split[state.cursor].key;
  Object.keys(state.exercises).forEach(k => {
    if (k.startsWith(oldKey + '-')) delete state.exercises[k];
  });
  state.cursor = (state.cursor + 1) % split.length;
  state.completedCount++;

  // Consome descanso flexível pendente quando a fila chega num dia de OFF
  if (state.skipNextRest && currentSplit()[state.cursor].key === 'rest') {
    state.cursor = (state.cursor + 1) % split.length;
    state.completedCount++;
    state.skipNextRest = false;
  }

  saveState();
  renderWeek();
  renderWorkout();
}

function descansarHoje() {
  if (!confirm('Descansar hoje?\n\nO próximo dia OFF da fila será consumido — você não terá descanso duplo.')) return;
  state.restDayToday = todayKey();
  state.skipNextRest = true;
  saveState();
  renderWeek();
  renderWorkout();
}

function finalizeSession() { advanceCursor(); }
function skipSession()     { advanceCursor(); }

function undoLastSession() {
  if (state.completedCount === 0) return;
  const split = currentSplit();
  state.cursor = (state.cursor - 1 + split.length) % split.length;
  state.completedCount--;
  saveState();
  renderWeek();
  renderWorkout();
}

// ---------- RENDER: MEALS -------------------------------------------
function mealsAtivasHoje() {
  return MEALS.filter(m => !(state.fastToday && m.skipOnFast));
}

function jejumCountSemana() {
  // conta dias marcados como jejum na semana corrente (dom→sáb)
  const today = new Date();
  const dow = today.getDay();
  const inicio = new Date(today); inicio.setDate(today.getDate() - dow);
  inicio.setHours(0, 0, 0, 0);
  let n = 0;
  for (const d in state.fastDays) {
    if (state.fastDays[d] && new Date(d) >= inicio) n++;
  }
  if (state.fastToday) n++;
  return n;
}

function renderMeals() {
  const container = document.getElementById('mealsContainer');
  const ativas = mealsAtivasHoje();

  // Barra de modo + contador de jejum
  const jej = jejumCountSemana();
  const meta = state.fastTarget || 2;
  const barraModo = `
    <div class="diet-mode">
      <div class="diet-mode-title">
        <span class="diet-mode-label">MODO HOJE</span>
        <span class="diet-jejum-counter">JEJUM ${jej}/${meta} ESTA SEMANA</span>
      </div>
      <div class="diet-mode-toggle">
        <button class="diet-mode-btn ${!state.fastToday ? 'active' : ''}" data-mode="normal">NORMAL<small>6 refeições</small></button>
        <button class="diet-mode-btn ${state.fastToday ? 'active' : ''}" data-mode="fast">JEJUM 16H<small>janela 13h → 22h</small></button>
      </div>
      ${state.fastToday ? '<div class="diet-fast-note">🕐 Primeira refeição 13h · última 22h · água, café preto e chá liberados no jejum</div>' : ''}
    </div>
  `;

  const cards = ativas.map(m => {
    const chosenIdx = state.mealChoice[m.id] ?? 0;
    const opt = m.options[chosenIdx] || m.options[0];
    const done = !!state.meals[m.id];
    const items = opt.items.map(i => `<li>${i}</li>`).join('');

    const optChips = m.options.length > 1 ? `
      <div class="meal-options">
        ${m.options.map((o, i) => `
          <button class="opt-chip ${i === chosenIdx ? 'active' : ''}" data-meal="${m.id}" data-opt="${i}">${o.label}</button>
        `).join('')}
      </div>
    ` : '';

    return `
      <div class="meal-card ${done ? 'done' : ''} ${m.optional ? 'optional' : ''}" data-meal="${m.id}">
        <div class="meal-header">
          <div class="meal-name">${m.name}${m.optional ? ' <span class="opt-tag">opcional</span>' : ''}</div>
          <div class="meal-time">${m.time}</div>
        </div>
        ${optChips}
        <ul class="meal-items">${items}</ul>
        <div class="meal-macros">
          <span>${opt.macros.kcal}kcal</span>
          <span>P ${opt.macros.p}g</span>
          <span>C ${opt.macros.c}g</span>
          <span>G ${opt.macros.g}g</span>
        </div>
      </div>
    `;
  }).join('');

  // Totais calculados com opção escolhida
  const tot = ativas.reduce((acc, m) => {
    const idx = state.mealChoice[m.id] ?? 0;
    const o = m.options[idx] || m.options[0];
    acc.kcal += o.macros.kcal; acc.p += o.macros.p; acc.c += o.macros.c; acc.g += o.macros.g;
    return acc;
  }, { kcal: 0, p: 0, c: 0, g: 0 });

  const totais = `
    <div class="meal-totals">
      <div class="meal-totals-label">TOTAL DO DIA</div>
      <div class="meal-totals-grid">
        <div><strong>${tot.kcal}</strong><small>kcal</small></div>
        <div><strong>${tot.p}</strong><small>ptn</small></div>
        <div><strong>${tot.c}</strong><small>carb</small></div>
        <div><strong>${tot.g}</strong><small>gord</small></div>
      </div>
    </div>
  `;

  container.innerHTML = barraModo + cards + totais;

  // Click nos cards → toggle done (ignora cliques em chips)
  container.querySelectorAll('.meal-card').forEach(el => {
    el.onclick = (ev) => {
      if (ev.target.closest('.opt-chip')) return;
      const id = el.dataset.meal;
      state.meals[id] = !state.meals[id];
      el.classList.toggle('done');
      saveState();
    };
  });

  // Chips pra trocar opção
  container.querySelectorAll('.opt-chip').forEach(chip => {
    chip.onclick = (ev) => {
      ev.stopPropagation();
      const mealId = chip.dataset.meal;
      const optIdx = +chip.dataset.opt;
      state.mealChoice[mealId] = optIdx;
      saveState();
      renderMeals();
    };
  });

  // Toggle de modo normal/jejum
  container.querySelectorAll('.diet-mode-btn').forEach(btn => {
    btn.onclick = () => {
      const mode = btn.dataset.mode;
      state.fastToday = (mode === 'fast');
      // ao entrar em jejum, desmarca café e lanche 1
      if (state.fastToday) {
        state.meals.cafe = false;
        state.meals.lanche1 = false;
      }
      saveState();
      renderMeals();
    };
  });
}

// ---------- PROGRESS ------------------------------------------------
function updateProgress() {
  const dayKey = currentDayData().key;
  const dayWorkout = WORKOUTS[dayKey];
  if (!dayWorkout.rest) {
    const total = dayWorkout.exercises.length;
    const done = dayWorkout.exercises.filter((_, i) => state.exercises[`${dayKey}-${i}`]).length;
    const pct = total > 0 ? (done / total) * 100 : 0;
    document.getElementById('barTreino').style.width = pct + '%';
    document.getElementById('valTreino').textContent = `${done} / ${total}`;
  } else {
    document.getElementById('barTreino').style.width = '100%';
    document.getElementById('valTreino').textContent = 'OFF';
  }

  const ativas = mealsAtivasHoje();
  const mealsDone = ativas.filter(m => state.meals[m.id]).length;
  const mealsTotal = ativas.length;
  const mealsPct = mealsTotal > 0 ? (mealsDone / mealsTotal) * 100 : 0;
  document.getElementById('barDieta').style.width = mealsPct + '%';
  document.getElementById('valDieta').textContent = `${mealsDone} / ${mealsTotal}${state.fastToday ? ' · JEJUM' : ''}`;

  // contador de sessão/ciclo
  const session = sessionInCycle();
  const cycle = currentCycleNum();
  const wc = document.getElementById('weekCounter');
  if (wc) wc.textContent = `SESSÃO ${session}/${CYCLE_LENGTH}`;
  const sn = document.getElementById('sessionNum');
  if (sn) sn.textContent = session;
  const cn = document.getElementById('cycleNum');
  if (cn) cn.textContent = cycle;
  const st = document.getElementById('sessionTotal');
  if (st) st.textContent = CYCLE_LENGTH;
}

// ---------- READINESS UI --------------------------------------------
function updateReadinessDisplay() {
  const today = state.readiness[todayKey()];
  const scoreEl = document.getElementById('readinessScore');
  const labelEl = document.getElementById('readinessLabel');
  const adviceEl = document.getElementById('readinessAdvice');
  const headerBadge = document.getElementById('headerReadiness');

  if (!today) {
    scoreEl.textContent = '—';
    scoreEl.style.color = 'var(--ink-dim)';
    labelEl.textContent = 'Preencha abaixo';
    adviceEl.textContent = 'Avalie como você acordou hoje pra ajustar o treino.';
    if (headerBadge) headerBadge.textContent = '—';
    return;
  }
  const advice = readinessAdvice(today.score);
  scoreEl.textContent = today.score;
  scoreEl.style.color = advice.color;
  labelEl.textContent = advice.level;
  labelEl.style.color = advice.color;
  adviceEl.textContent = advice.text;
  if (headerBadge) {
    headerBadge.textContent = today.score;
    headerBadge.style.color = advice.color;
  }

  // reflect slider values
  ['sleep','energy','soreness','mood'].forEach(k => {
    const slider = document.getElementById('rd-' + k);
    const valEl = document.getElementById('rdv-' + k);
    if (slider && today[k] !== undefined) {
      slider.value = today[k];
      if (valEl) valEl.textContent = today[k];
    }
  });
}

function saveReadiness() {
  const r = {
    sleep: +document.getElementById('rd-sleep').value,
    energy: +document.getElementById('rd-energy').value,
    soreness: +document.getElementById('rd-soreness').value,
    mood: +document.getElementById('rd-mood').value,
  };
  r.score = computeReadinessScore(r);
  state.readiness[todayKey()] = r;
  saveState();
}

function updateDeloadBadge() {
  const badge = document.getElementById('deloadBadge');
  if (!badge) return;
  if (isDeloadCycle()) {
    badge.textContent = '⚡ DELOAD';
    badge.style.display = 'inline-block';
  } else {
    const remaining = sessionsUntilDeload();
    badge.textContent = `deload em ${remaining} sessão${remaining === 1 ? '' : 'ões'}`;
    badge.style.display = 'inline-block';
  }
}

// ---------- TABS ----------------------------------------------------
document.querySelectorAll('.tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('view-' + tab.dataset.view).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
});

// ---------- TIMER ---------------------------------------------------
let timerDuration = 90;
let timerEndTime = 0;    // timestamp absoluto — não perde tempo em background
let timerInterval = null;
let timerRunning = false;
let timerAviso3s = false;
let timerPausedRemaining = 0;
const display = document.getElementById('timerDisplay');
const label = document.getElementById('timerLabel');
const startBtn = document.getElementById('timerStart');

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function updateTimerDisplay(s) {
  if (s === undefined) s = timerDuration;
  display.textContent = fmtTime(s);
}

function startTimer() {
  if (timerRunning) {
    // Pausa: guarda quanto resta
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    timerPausedRemaining = Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000));
    startBtn.textContent = 'CONTINUAR';
    display.classList.remove('running');
    label.textContent = 'PAUSADO';
    return;
  }

  // Inicia ou retoma
  const segundos = timerPausedRemaining > 0 ? timerPausedRemaining : timerDuration;
  timerPausedRemaining = 0;
  timerEndTime = Date.now() + segundos * 1000;
  timerAviso3s = false;
  timerRunning = true;
  startBtn.textContent = 'PAUSAR';
  display.classList.add('running');
  label.textContent = 'DESCANSANDO';
  _agendarBeeps(segundos);
  _agendarNotifTimer(segundos * 1000, 'Hora da próxima série 💪');

  timerInterval = setInterval(() => {
    const restante = Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000));
    updateTimerDisplay(restante);
    if (restante <= 3 && restante > 0 && !timerAviso3s) {
      timerAviso3s = true;
      if ('vibrate' in navigator) navigator.vibrate([60, 60, 60, 60, 60]);
    }
    if (restante <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerRunning = false;
      display.classList.remove('running');
      label.textContent = 'TERMINOU — PRÓXIMA SÉRIE';
      startBtn.textContent = 'INICIAR';
      if ('vibrate' in navigator) navigator.vibrate([300, 100, 300, 100, 500]);
      _tocarBeeps();
      setTimeout(() => {
        updateTimerDisplay(timerDuration);
        label.textContent = 'PRONTO';
      }, 2000);
    }
  }, 250);
}

startBtn.onclick = () => { _criarAudioCtx(); startTimer(); };

document.getElementById('timerReset').onclick = () => {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
  timerPausedRemaining = 0;
  _cancelarNotifTimer();
  startBtn.textContent = 'INICIAR';
  display.classList.remove('running');
  label.textContent = 'PRONTO';
  updateTimerDisplay(timerDuration);
};

document.querySelectorAll('.timer-btn[data-sec]').forEach(btn => {
  btn.onclick = () => {
    timerDuration = parseInt(btn.dataset.sec);
    timerPausedRemaining = 0;
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    _cancelarNotifTimer();
    startBtn.textContent = 'INICIAR';
    display.classList.remove('running');
    label.textContent = 'PRONTO';
    updateTimerDisplay(timerDuration);
  };
});

// ---------- CRONÔMETRO (conta pra cima) -----------------------------
let chronoRunning = false;
let chronoSeconds = 0;
let chronoInterval = null;
const chronoDisplay  = document.getElementById('chronoDisplay');
const chronoStatus   = document.getElementById('chronoStatus');
const chronoStartBtn = document.getElementById('chronoStart');

function fmtChrono(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
}

// Atualiza o display na aba Timer e o display inline no card de treino
function updateAllChronoDisplays() {
  const t = fmtChrono(chronoSeconds);
  chronoDisplay.textContent = t;
  const inline = document.getElementById('workoutChronoTime');
  if (inline) inline.textContent = t;
}

// Sincroniza o bloco inline do card com o estado atual do cronômetro
function syncChronoInline() {
  const inlineTime = document.getElementById('workoutChronoTime');
  const inlineBtn  = document.getElementById('workoutChronoBtn');
  if (!inlineTime || !inlineBtn) return;
  inlineTime.textContent = fmtChrono(chronoSeconds);
  inlineTime.classList.toggle('running', chronoRunning);
  inlineBtn.textContent = chronoRunning ? 'PAUSAR' : (chronoSeconds > 0 ? 'CONTINUAR' : 'INICIAR');
  inlineBtn.classList.toggle('running', chronoRunning);
}

function toggleChrono() {
  if (chronoRunning) {
    clearInterval(chronoInterval);
    chronoRunning = false;
    chronoDisplay.classList.remove('running');
    chronoStatus.textContent = 'PAUSADO';
    chronoStartBtn.textContent = 'CONTINUAR';
  } else {
    chronoRunning = true;
    chronoDisplay.classList.add('running');
    chronoStatus.textContent = 'TREINANDO';
    chronoStartBtn.textContent = 'PAUSAR';
    chronoInterval = setInterval(() => {
      chronoSeconds++;
      updateAllChronoDisplays();
    }, 1000);
  }
  syncChronoInline();
}

chronoStartBtn.onclick = toggleChrono;

document.getElementById('chronoReset').onclick = () => {
  clearInterval(chronoInterval);
  chronoRunning = false;
  chronoSeconds = 0;
  chronoDisplay.textContent = '00:00';
  chronoDisplay.classList.remove('running');
  chronoStatus.textContent = 'PARADO';
  chronoStartBtn.textContent = 'INICIAR';
  syncChronoInline();
};

// ---------- SPLIT TOGGLE --------------------------------------------
function updateSplitToggle() {
  document.querySelectorAll('.split-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.split === state.split);
  });
}

document.querySelectorAll('.split-btn').forEach(btn => {
  btn.onclick = () => {
    state.split = btn.dataset.split;
    state.exercises = {};
    // cursor se mantém, mas garante estar dentro do range do split novo
    state.cursor = state.cursor % SPLITS[state.split].length;
    saveState();
    updateSplitToggle();
    renderWeek();
    renderWorkout();
  };
});

// ---------- READINESS SLIDERS ---------------------------------------
['sleep','energy','soreness','mood'].forEach(k => {
  const slider = document.getElementById('rd-' + k);
  const valEl = document.getElementById('rdv-' + k);
  slider.addEventListener('input', () => {
    valEl.textContent = slider.value;
  });
  slider.addEventListener('change', saveReadiness);
});

// ---------- CONTROLE DE CICLO ---------------------------------------
// Desfaz o último avanço de cursor (caso tenha marcado/pulado por engano).
const undoBtn = document.getElementById('undoSession');
if (undoBtn) {
  undoBtn.onclick = () => {
    if (state.completedCount === 0) return;
    if (confirm('Desfazer a última sessão? O cursor volta uma posição.')) undoLastSession();
  };
}

// ---------- RESET ---------------------------------------------------
document.getElementById('resetDay').onclick = () => {
  if (confirm('Zerar todo o progresso de hoje?')) {
    state.exercises = {};
    state.meals = {};
    saveState();
    renderWorkout();
    renderMeals();
  }
};

document.getElementById('resetAll').onclick = () => {
  if (confirm('ATENÇÃO: isso apaga TODOS os dados (readiness, semana, progresso). Continuar?')) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
};

// ---------- INSTALL -------------------------------------------------
let deferredPrompt;
const installBanner = document.getElementById('installBanner');
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBanner.classList.add('show');
});

installBtn.onclick = async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') installBanner.classList.remove('show');
  deferredPrompt = null;
};

// ---------- INIT ----------------------------------------------------
state = loadState();
renderWeek();
renderWorkout();
renderMeals();
updateTimerDisplay();
updateProgress();
updateSplitToggle();
updateReadinessDisplay();
updateDeloadBadge();

// ====================================================================
// SAÚDE — integração Supabase (reusa bhr_exames e bhr_bio do app BHR)
// ====================================================================
const SUPABASE_URL = 'https://hisbbtddpoxufvghxqtm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpc2JidGRkcG94dWZ2Z2h4cXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDM0OTgsImV4cCI6MjA4Nzc3OTQ5OH0.r3VkLkBxeorkCYjB-y6WOchePdfRKsm5lWE1iSSYlrw';

let sb = null;
let ironUser = null;
let ironUserId = null;
let bioData = [];
let examesData = [];
let bioChart = null;
let examesChart = null;

function initSupabase() {
  if (typeof window.supabase === 'undefined') { setTimeout(initSupabase, 120); return; }
  try {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: 'treino' } });
    restoreSession();
  } catch (e) { console.error('Supabase init falhou:', e); }
}

// Mesma função que o BHR usa: nome → email interno
function nomeParaEmail(nome) {
  const limpo = (nome || '').toString().trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
  return limpo ? `${limpo}@bhr.treino` : '';
}

async function restoreSession() {
  if (!sb) return;
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session && session.user) {
      ironUser = session.user;
      ironUserId = session.user.id;
      onLogado();
    }
  } catch (e) { console.warn('Sessão não recuperada:', e); }
}

function setAuthStatus(msg, type) {
  const el = document.getElementById('authStatus');
  if (!el) return;
  el.textContent = msg || '';
  el.className = 'auth-status' + (type ? ' ' + type : '');
}

async function handleEntrar() {
  if (!sb) { setAuthStatus('Aguardando Supabase...', 'error'); return; }
  const nome = document.getElementById('authNome').value.trim();
  const senha = document.getElementById('authSenha').value;
  const email = nomeParaEmail(nome);
  if (!email || !senha) { setAuthStatus('Preencha nome e senha', 'error'); return; }
  setAuthStatus('Entrando...', '');
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) { setAuthStatus('Erro: ' + error.message, 'error'); return; }
    ironUser = data.user;
    ironUserId = data.user.id;
    setAuthStatus('Conectado!', 'success');
    onLogado();
  } catch (e) { setAuthStatus('Falha: ' + e.message, 'error'); }
}

async function handleSair() {
  if (!sb) return;
  try { await sb.auth.signOut(); } catch {}
  ironUser = null; ironUserId = null;
  bioData = []; examesData = [];
  claudeKeyCache = null;
  if (bioChart) { bioChart.destroy(); bioChart = null; }
  if (examesChart) { examesChart.destroy(); examesChart = null; }
  document.getElementById('syncBar').style.display = 'none';
  document.getElementById('authCard').style.display = 'block';
  document.getElementById('saudeConteudo').style.display = 'none';
}

function onLogado() {
  document.getElementById('authCard').style.display = 'none';
  document.getElementById('saudeConteudo').style.display = 'block';
  document.getElementById('syncBar').style.display = 'flex';
  const nome = (ironUser.email || '').replace('@bhr.treino', '');
  document.getElementById('syncUser').textContent = nome.toUpperCase();
  carregarSaude();
  loadKeyFromSupabase();
}

async function carregarSaude() {
  if (!sb || !ironUserId) return;
  try {
    const { data: bioRow } = await sb.from('bhr_bio')
      .select('record_content').eq('user_id', ironUserId).maybeSingle();
    bioData = Array.isArray(bioRow?.record_content) ? bioRow.record_content : [];
    const { data: exRow } = await sb.from('bhr_exames')
      .select('record_content').eq('user_id', ironUserId).maybeSingle();
    examesData = Array.isArray(exRow?.record_content) ? exRow.record_content : [];
    renderBio();
    renderExames();
  } catch (e) { console.error('Erro ao carregar saúde:', e); }
}

// ---------- BIO RENDER ----------------------------------------------
function renderBio() {
  const metricsEl = document.getElementById('bioMetrics');
  const wrapEl = document.getElementById('bioChartWrap');
  const emptyEl = document.getElementById('bioEmpty');
  if (!bioData || bioData.length === 0) {
    metricsEl.innerHTML = '';
    wrapEl.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';
  const ordenado = [...bioData].sort((a, b) => new Date(a.data) - new Date(b.data));
  const atual = ordenado[ordenado.length - 1];
  const anterior = ordenado.length > 1 ? ordenado[ordenado.length - 2] : null;

  function delta(campo, invertido = false) {
    if (!anterior) return { txt: '—', cls: 'neutral' };
    const d = parseFloat(atual[campo]) - parseFloat(anterior[campo]);
    if (Math.abs(d) < 0.05) return { txt: '0', cls: 'neutral' };
    const sign = d > 0 ? '+' : '';
    // pra gordura subir é ruim; pra massa subir é bom
    const good = invertido ? d < 0 : d > 0;
    return { txt: `${sign}${d.toFixed(1)}`, cls: good ? 'down' : 'up' };
  }

  const dPeso = delta('peso', true);
  const dGord = delta('gordura', true);
  const dMassa = delta('massa', false);
  const dAgua = delta('agua', false);

  metricsEl.innerHTML = `
    <div class="metric-card">
      <div class="metric-value">${atual.peso || '—'}<span class="metric-unit">kg</span></div>
      <div class="metric-label">Peso</div>
      <div class="metric-delta ${dPeso.cls}">${dPeso.txt}</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${atual.gordura || '—'}<span class="metric-unit">%</span></div>
      <div class="metric-label">Gordura</div>
      <div class="metric-delta ${dGord.cls}">${dGord.txt}</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${atual.massa || '—'}<span class="metric-unit">kg</span></div>
      <div class="metric-label">Massa</div>
      <div class="metric-delta ${dMassa.cls}">${dMassa.txt}</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${atual.agua || '—'}<span class="metric-unit">%</span></div>
      <div class="metric-label">Água</div>
      <div class="metric-delta ${dAgua.cls}">${dAgua.txt}</div>
    </div>
  `;

  wrapEl.style.display = 'block';
  const range = ordenado.length > 1
    ? `${new Date(ordenado[0].data).toLocaleDateString('pt-BR')} → ${new Date(atual.data).toLocaleDateString('pt-BR')}`
    : new Date(atual.data).toLocaleDateString('pt-BR');
  document.getElementById('bioChartRange').textContent = range;

  const labels = ordenado.map(b => new Date(b.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
  const ds = [
    { label: 'Peso (kg)', data: ordenado.map(b => +b.peso || null), borderColor: '#ff6060', backgroundColor: 'rgba(255,96,96,0.1)', tension: 0.35, yAxisID: 'y' },
    { label: 'Gordura (%)', data: ordenado.map(b => +b.gordura || null), borderColor: '#ffb020', backgroundColor: 'rgba(255,176,32,0.1)', tension: 0.35, yAxisID: 'y1' },
    { label: 'Massa (kg)', data: ordenado.map(b => +b.massa || null), borderColor: '#00d97e', backgroundColor: 'rgba(0,217,126,0.1)', tension: 0.35, yAxisID: 'y' },
  ];
  if (bioChart) bioChart.destroy();
  bioChart = new Chart(document.getElementById('bioChart'), {
    type: 'line',
    data: { labels, datasets: ds },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: '#8a8a85', font: { size: 10, family: 'JetBrains Mono' } } } },
      scales: {
        x: { ticks: { color: '#8a8a85', font: { size: 9 } }, grid: { color: 'rgba(42,42,42,0.5)' } },
        y: { position: 'left', ticks: { color: '#8a8a85', font: { size: 9 } }, grid: { color: 'rgba(42,42,42,0.5)' } },
        y1: { position: 'right', ticks: { color: '#ffb020', font: { size: 9 } }, grid: { drawOnChartArea: false } }
      }
    }
  });

  // Histórico de medições (ordem decrescente, com ações)
  renderBioHistorico(ordenado);
}

function renderBioHistorico(ordenadoCrescente) {
  const listEl = document.getElementById('bioList');
  if (!listEl) return;
  // precisa garantir que todas têm id (migração lazy)
  ordenadoCrescente.forEach(b => { if (!b.id) b.id = new Date(b.data).getTime() + Math.floor(Math.random() * 1000); });
  const desc = [...ordenadoCrescente].reverse().slice(0, 20);
  listEl.innerHTML = desc.map(b => `
    <div class="bio-item">
      <div class="bio-item-head">
        <div class="bio-item-date">${new Date(b.data).toLocaleDateString('pt-BR')}</div>
        <div class="bio-item-tags">
          <span>${b.peso}kg</span>
          <span>${b.gordura}%</span>
          <span>${b.massa}kg magra</span>
          <span>${b.agua}% h2o</span>
        </div>
      </div>
      ${b.observacoes ? `<div class="bio-item-obs">${b.observacoes}</div>` : ''}
      <div class="exam-actions">
        ${b.arquivo_path ? `<button class="exam-btn" onclick="abrirArquivoExame('${b.arquivo_path}')">VER ARQUIVO</button>` : ''}
        <button class="exam-btn danger" onclick="deletarBio(${b.id})">EXCLUIR</button>
      </div>
    </div>
  `).join('');
}

// ---------- EXAMES RENDER -------------------------------------------
// Marcadores-chave monitorados (com aliases pra matching case-insensitive)
const MARCADORES_CHAVE = [
  { nome: 'Colesterol Total', aliases: ['colesterol total'] },
  { nome: 'LDL', aliases: ['ldl', 'colesterol ldl'] },
  { nome: 'HDL', aliases: ['hdl', 'colesterol hdl'] },
  { nome: 'Triglicerídeos', aliases: ['triglicer', 'tgl'] },
  { nome: 'Glicose', aliases: ['glicose', 'glicemia em jejum', 'glicemia jejum'] },
  { nome: 'HbA1c', aliases: ['hemoglobina glicada', 'hba1c', 'a1c'] },
  { nome: 'Hemoglobina', aliases: ['hemoglobina '] }, // espaço pra não casar com glicada
  { nome: 'Testosterona', aliases: ['testosterona total', 'testosterona livre', 'testosterona'] },
  { nome: 'TSH', aliases: ['tsh'] },
  { nome: 'T4 Livre', aliases: ['t4 livre', 't4l'] },
  { nome: 'Vitamina D', aliases: ['vitamina d', '25-oh', '25 oh', '25(oh)'] },
  { nome: 'Vitamina B12', aliases: ['vitamina b12', 'b12'] },
  { nome: 'Ferritina', aliases: ['ferritina'] },
  { nome: 'Creatinina', aliases: ['creatinina'] },
  { nome: 'Ureia', aliases: ['ureia', 'uréia'] },
  { nome: 'TGO', aliases: ['tgo', 'ast'] },
  { nome: 'TGP', aliases: ['tgp', 'alt'] },
  { nome: 'Ácido Úrico', aliases: ['ácido úrico', 'acido urico'] },
  { nome: 'PSA', aliases: ['psa'] },
  { nome: 'PCR', aliases: ['pcr', 'proteína c reativa', 'proteina c reativa'] }
];

function matchMarcador(parametro) {
  const p = (parametro || '').toLowerCase().trim();
  if (!p) return null;
  return MARCADORES_CHAVE.find(m => m.aliases.some(a => p.includes(a)));
}

function parseValorNumerico(raw) {
  if (raw == null) return NaN;
  const m = raw.toString().replace(/\./g, '').replace(',', '.').match(/-?[\d.]+/);
  return m ? parseFloat(m[0]) : NaN;
}

function extrairIndicadores() {
  // Agrupa valores de cada marcador-chave por ordem cronológica
  const ordenado = [...examesData].sort((a, b) => new Date(a.data) - new Date(b.data));
  const ind = {};
  ordenado.forEach(e => {
    if (!e.analiseIA?.resultados_principais) return;
    e.analiseIA.resultados_principais.forEach(r => {
      const marc = matchMarcador(r.parametro);
      if (!marc) return;
      const num = parseValorNumerico(r.valor);
      if (isNaN(num)) return;
      if (!ind[marc.nome]) ind[marc.nome] = [];
      ind[marc.nome].push({ data: e.data, valor: num, raw: r.valor, status: (r.status || 'normal').toLowerCase(), referencia: r.referencia });
    });
  });
  return ind;
}

function renderIndicadores() {
  const cont = document.getElementById('indicadoresList');
  if (!cont) return;
  const ind = extrairIndicadores();
  const nomes = Object.keys(ind);
  if (nomes.length === 0) {
    cont.innerHTML = '';
    document.getElementById('indicadoresSection').style.display = 'none';
    return;
  }
  document.getElementById('indicadoresSection').style.display = 'block';

  cont.innerHTML = nomes.map(nome => {
    const vals = ind[nome];
    const atual = vals[vals.length - 1];
    const anterior = vals.length > 1 ? vals[vals.length - 2] : null;
    const delta = anterior ? (atual.valor - anterior.valor) : null;
    const statusCls = atual.status.replace(/[^a-z]/g, '').replace('atencao', 'atencao') || 'normal';

    let trendHtml = '';
    if (delta !== null && Math.abs(delta) > 0.01) {
      const arrow = delta > 0 ? '↑' : '↓';
      // subir é ruim pra maioria (colesterol, LDL, glicose), mas bom pra HDL, hemoglobina, testosterona, vit D
      const subirBom = ['HDL', 'Hemoglobina', 'Testosterona', 'Vitamina D', 'Vitamina B12', 'Ferritina', 'T4 Livre'].includes(nome);
      const bom = subirBom ? delta > 0 : delta < 0;
      const cls = bom ? 'good' : 'bad';
      const pct = anterior.valor !== 0 ? ((delta / anterior.valor) * 100).toFixed(1) : '';
      trendHtml = `<div class="indicator-trend ${cls}">${arrow} ${Math.abs(delta).toFixed(1)} ${pct ? `(${delta > 0 ? '+' : '-'}${Math.abs(pct)}%)` : ''}</div>`;
    } else if (vals.length === 1) {
      trendHtml = `<div class="indicator-trend neutral">1ª medição</div>`;
    }

    return `
      <div class="indicator-card status-${statusCls}" data-marker="${nome}">
        <div class="indicator-name">${nome.toUpperCase()}</div>
        <div class="indicator-value">${atual.raw}</div>
        <div class="indicator-status ${statusCls}">${atual.status.toUpperCase()}</div>
        ${trendHtml}
        ${atual.referencia ? `<div class="indicator-ref">ref: ${atual.referencia}</div>` : ''}
      </div>
    `;
  }).join('');

  // Click no card → scroll pro gráfico daquele marcador
  cont.querySelectorAll('.indicator-card').forEach(card => {
    card.onclick = () => {
      const marker = card.dataset.marker;
      const vals = ind[marker];
      if (vals.length >= 2) renderMarkerChart(marker, vals);
    };
  });
}

let markerChart = null;
function renderMarkerChart(marker, vals) {
  const wrap = document.getElementById('markerChartWrap');
  const canvas = document.getElementById('markerChart');
  document.getElementById('markerChartTitle').textContent = marker.toUpperCase();
  wrap.style.display = 'block';
  wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const labels = vals.map(v => new Date(v.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }));
  const data = vals.map(v => v.valor);

  if (markerChart) markerChart.destroy();
  markerChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: marker,
        data,
        borderColor: '#ff6060',
        backgroundColor: 'rgba(255,96,96,0.15)',
        tension: 0.3,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8a8a85', font: { size: 10 } }, grid: { color: 'rgba(42,42,42,0.5)' } },
        y: { ticks: { color: '#8a8a85', font: { size: 10 } }, grid: { color: 'rgba(42,42,42,0.5)' } }
      }
    }
  });
}

function fecharMarkerChart() {
  document.getElementById('markerChartWrap').style.display = 'none';
  if (markerChart) { markerChart.destroy(); markerChart = null; }
}

// Upload/ver arquivo via Supabase Storage
// subpasta: 'exames' ou 'bio'
async function uploadArquivoStorage(file, subpasta = 'exames') {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${ironUserId}/${subpasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from('exames').upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false
  });
  if (error) throw error;
  return path;
}

async function abrirArquivoExame(path) {
  if (!path) { alert('Arquivo não salvo (esse item é antigo).'); return; }
  try {
    const { data, error } = await sb.storage.from('exames').createSignedUrl(path, 60 * 60);
    if (error) throw error;
    window.open(data.signedUrl, '_blank');
  } catch (e) { alert('Erro ao abrir: ' + e.message); }
}

async function deletarExame(id) {
  const e = examesData.find(x => x.id === id);
  if (!e) return;
  if (!confirm(`Excluir exame "${e.tipo}" de ${new Date(e.data).toLocaleDateString('pt-BR')}?`)) return;
  try {
    // apaga arquivo do storage se existir
    if (e.arquivo_path) {
      await sb.storage.from('exames').remove([e.arquivo_path]).catch(() => {});
    }
    // remove da lista e persiste
    const nova = examesData.filter(x => x.id !== id);
    const { error } = await sb.from('bhr_exames').upsert({
      user_id: ironUserId,
      record_content: nova,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (error) throw error;
    examesData = nova;
    renderExames();
  } catch (err) { alert('Erro: ' + err.message); }
}
window.abrirArquivoExame = abrirArquivoExame;
window.deletarExame = deletarExame;
window.fecharMarkerChart = fecharMarkerChart;

function renderExames() {
  const listEl = document.getElementById('examesList');
  const wrapEl = document.getElementById('examesChartWrap');
  const emptyEl = document.getElementById('examesEmpty');

  renderIndicadores();

  if (!examesData || examesData.length === 0) {
    listEl.innerHTML = '';
    wrapEl.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';
  const ordenado = [...examesData].sort((a, b) => new Date(b.data) - new Date(a.data));

  listEl.innerHTML = ordenado.slice(0, 20).map(e => {
    const temIA = e.analiseIA && e.analiseIA.analise_geral;
    const resumo = temIA ? e.analiseIA.analise_geral : (e.resultados || 'Sem análise');
    const nMarc = e.analiseIA?.resultados_principais?.length || 0;
    return `
      <div class="exam-item">
        <div class="exam-head">
          <div class="exam-type">${(e.tipo || 'Exame').toUpperCase()}</div>
          <div class="exam-date">${new Date(e.data).toLocaleDateString('pt-BR')}</div>
        </div>
        ${e.arquivo ? `<div style="font-family:var(--font-mono);font-size:11px;color:var(--ink-dim);letter-spacing:0.05em;margin-bottom:4px;">📄 ${e.arquivo}${nMarc ? ` · ${nMarc} marcadores` : ''}</div>` : ''}
        <div class="exam-ia">${resumo}</div>
        <div class="exam-actions">
          ${e.arquivo_path ? `<button class="exam-btn" onclick="abrirArquivoExame('${e.arquivo_path}')">VER ARQUIVO</button>` : ''}
          <button class="exam-btn danger" onclick="deletarExame(${e.id})">EXCLUIR</button>
        </div>
      </div>
    `;
  }).join('');

  // gráfico multi-linha com todos os marcadores-chave (até 6)
  const comIA = ordenado.filter(e => e.analiseIA && e.analiseIA.resultados_principais);
  if (comIA.length < 2) { wrapEl.style.display = 'none'; return; }

  const ind = extrairIndicadores();
  const markersParaPlotar = Object.keys(ind).filter(k => ind[k].length >= 2).slice(0, 6);
  if (markersParaPlotar.length === 0) { wrapEl.style.display = 'none'; return; }

  wrapEl.style.display = 'block';
  const datasCronologia = [...new Set(
    markersParaPlotar.flatMap(k => ind[k].map(v => v.data))
  )].sort((a, b) => new Date(a) - new Date(b));
  const labels = datasCronologia.map(d => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
  const cores = ['#ff6060', '#ffb020', '#00d97e', '#8a8afc', '#fc6e9b', '#6be0ff'];
  const datasets = markersParaPlotar.map((p, i) => ({
    label: p,
    data: datasCronologia.map(d => {
      const entry = ind[p].find(x => x.data === d);
      return entry ? entry.valor : null;
    }),
    borderColor: cores[i],
    backgroundColor: cores[i] + '20',
    tension: 0.35,
    spanGaps: true
  }));

  document.getElementById('examesChartRange').textContent = `${labels[0]} → ${labels[labels.length - 1]} · toque num card acima pra ver só o marcador`;
  if (examesChart) examesChart.destroy();
  examesChart = new Chart(document.getElementById('examesChart'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: '#8a8a85', font: { size: 10, family: 'JetBrains Mono' } } } },
      scales: {
        x: { ticks: { color: '#8a8a85', font: { size: 9 } }, grid: { color: 'rgba(42,42,42,0.5)' } },
        y: { ticks: { color: '#8a8a85', font: { size: 9 } }, grid: { color: 'rgba(42,42,42,0.5)' } }
      }
    }
  });
}

// ====================================================================
// CLAUDE API — análise IA + geração de treino/dieta
// Chave armazenada em Supabase (tabela bhr_config, RLS por user_id).
// Nunca em localStorage nem commitada no git.
// ====================================================================
const CLAUDE_MODEL = 'claude-sonnet-4-6';                   // análises de texto (saúde, treino, dieta)
const CLAUDE_VISION_MODEL = 'claude-haiku-4-5-20251001';    // extração de arquivos (mais barato, rate limit maior)
let claudeKeyCache = null;  // cache em memória após 1ª leitura

async function getClaudeKey() {
  if (claudeKeyCache) return claudeKeyCache;
  if (!sb || !ironUserId) return '';
  try {
    const { data } = await sb.from('bhr_config')
      .select('record_content').eq('user_id', ironUserId).maybeSingle();
    claudeKeyCache = data?.record_content?.claude_key || '';
    return claudeKeyCache;
  } catch (e) {
    console.warn('bhr_config não encontrada:', e.message);
    return '';
  }
}

async function setClaudeKey(k) {
  if (!sb || !ironUserId) throw new Error('Faça login primeiro');
  const payload = {
    user_id: ironUserId,
    record_content: { claude_key: k, updated_at: new Date().toISOString() },
    updated_at: new Date().toISOString()
  };
  const { error } = await sb.from('bhr_config').upsert(payload, { onConflict: 'user_id' });
  if (error) throw error;
  claudeKeyCache = k;
}

async function clearClaudeKeyCache() { claudeKeyCache = null; }

async function callClaude(systemPrompt, userPrompt, maxTokens = 1500) {
  const key = await getClaudeKey();
  if (!key) throw new Error('Configure sua chave Claude API primeiro (expanda "CONFIGURAR CHAVE" e cole sua key).');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

// Redimensiona imagem grande pra evitar rate limit do Claude
async function resizeImageFile(file, maxDim = 1600, quality = 0.78) {
  if (!file.type || !file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width <= maxDim && height <= maxDim && file.size < 600 * 1024) {
      bitmap.close();
      return file;
    }
    const ratio = Math.min(maxDim / width, maxDim / height, 1);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch (e) {
    console.warn('Resize falhou, usando original:', e);
    return file;
  }
}

// Claude com arquivo (imagem ou PDF) — retorna JSON extraído
// Usa CLAUDE_VISION_MODEL (Haiku 4.5 — mais barato/rápido/maior rate limit)
async function callClaudeWithFile(systemPrompt, userPrompt, fileBase64, mediaType, maxTokens = 3000) {
  const key = await getClaudeKey();
  if (!key) throw new Error('Configure sua chave Claude API primeiro.');
  const isImage = (mediaType || '').startsWith('image/');
  const contentBlock = isImage
    ? { type: 'image', source: { type: 'base64', media_type: mediaType, data: fileBase64 } }
    : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 } };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: CLAUDE_VISION_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        { role: 'user', content: [contentBlock, { type: 'text', text: userPrompt }] }
      ]
    })
  });
  if (!res.ok) {
    const err = await res.text();
    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after') || '60';
      throw new Error(`Taxa de uso da API atingida. Espera ${retryAfter}s e tenta de novo. Se acontecer sempre, aumenta o Tier em console.anthropic.com/settings/limits (deposita $5 pra ir pro Tier 2 e o limite quintuplica).`);
    }
    throw new Error(`Claude API ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  const raw = data.content?.[0]?.text || '';
  // Remove markdown code fences se tiver, pega do primeiro { ao último }
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('Resposta sem JSON válido: ' + raw.slice(0, 200));
  }
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch (parseErr) {
    throw new Error('JSON malformado: ' + parseErr.message);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // dataURL → "data:image/jpeg;base64,AAAA..." — pega só a parte depois da vírgula
      const result = reader.result || '';
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------- ADD: BIOIMPEDÂNCIA ---------------------------------------
async function salvarBio(entry) {
  if (!sb || !ironUserId) throw new Error('Faça login primeiro');
  const novaLista = [...bioData, entry];
  const { error } = await sb.from('bhr_bio').upsert({
    user_id: ironUserId,
    record_content: novaLista,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  if (error) throw error;
  bioData = novaLista;
  renderBio();
}

function abrirFormBio() {
  const form = document.getElementById('formBio');
  document.getElementById('bioData').value = todayKey();
  form.style.display = 'block';
  document.getElementById('btnNovaBio').style.display = 'none';
  document.getElementById('bioFormStatus').className = 'form-status';
  document.getElementById('bioFormStatus').textContent = '';
  document.getElementById('bioPeso').focus();
}

function fecharFormBio() {
  document.getElementById('formBio').style.display = 'none';
  document.getElementById('btnNovaBio').style.display = 'block';
  document.getElementById('formBio').reset();
}

async function handleSalvarBio(ev) {
  ev.preventDefault();
  const data = document.getElementById('bioData').value;
  const peso = parseFloat(document.getElementById('bioPeso').value);
  const gordura = parseFloat(document.getElementById('bioGordura').value);
  const massa = parseFloat(document.getElementById('bioMassa').value);
  const agua = parseFloat(document.getElementById('bioAgua').value);
  const altura = 1.74;
  const imc = (peso / (altura * altura)).toFixed(1);
  const status = document.getElementById('bioFormStatus');

  if (!data || isNaN(peso) || isNaN(gordura) || isNaN(massa) || isNaN(agua)) {
    status.className = 'form-status error';
    status.textContent = 'Preencha todos os campos';
    return;
  }

  status.className = 'form-status loading';
  status.textContent = 'Salvando no Supabase...';
  try {
    await salvarBio({ id: Date.now(), data, peso, gordura, massa, agua, imc });
    status.className = 'form-status success';
    status.textContent = '✓ Salvo!';
    setTimeout(fecharFormBio, 800);
  } catch (e) {
    status.className = 'form-status error';
    status.textContent = 'Erro: ' + e.message;
  }
}

// Upload de bioimpedância via foto/PDF com Claude Vision
async function handleUploadBio(file) {
  const statusEl = document.getElementById('bioUploadStatus');
  const btn = document.getElementById('btnUploadBio');
  const setStatus = (txt, cls = 'loading') => {
    statusEl.className = 'form-status ' + cls;
    statusEl.textContent = txt;
  };
  btn.disabled = true;
  try {
    setStatus('Lendo arquivo...');
    // Comprime imagens grandes antes de mandar pra API (economiza tokens e evita rate limit)
    const fileParaEnviar = await resizeImageFile(file, 1600, 0.78);
    const base64 = await fileToBase64(fileParaEnviar);
    const mediaType = fileParaEnviar.type || (fileParaEnviar.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

    setStatus('Subindo arquivo e analisando bioimpedância...');
    let arquivoPath = null;
    try {
      arquivoPath = await uploadArquivoStorage(file, 'bio');
    } catch (err) {
      console.warn('Storage falhou (bucket?):', err.message);
    }

    const system = `Você é um especialista em análise de bioimpedância (Tanita, Inbody, Omron, balanças smart, etc).
Analise a imagem ou PDF recebido e retorne APENAS um objeto JSON (sem texto antes/depois, sem markdown) no formato:

{
  "data": "YYYY-MM-DD" (data da medição; se não achar, use "${todayKey()}"),
  "peso": 79.5 (em kg, só o número),
  "gordura": 22.5 (% de gordura, só o número),
  "massa": 35.2 (em kg de massa muscular, só o número),
  "agua": 55.0 (% água corporal, só o número),
  "observacoes": "Texto 60-120 palavras em PT-BR sobre o que chama atenção (massa magra, hidratação, distribuição de gordura, idade metabólica se tiver, etc)"
}

Se o arquivo não for um resultado de bioimpedância, retorne { "erro": "motivo" }.`;

    const result = await callClaudeWithFile(system, 'Analise esta bioimpedância e retorne o JSON.', base64, mediaType, 2000);

    if (result.erro) {
      setStatus('Arquivo não parece bioimpedância: ' + result.erro, 'error');
      btn.disabled = false;
      return;
    }

    const altura = 1.74;
    const imc = (result.peso / (altura * altura)).toFixed(1);
    const novaEntry = {
      id: Date.now(),
      data: result.data || todayKey(),
      peso: result.peso,
      gordura: result.gordura,
      massa: result.massa,
      agua: result.agua,
      imc,
      arquivo: file.name,
      arquivo_path: arquivoPath,
      observacoes: result.observacoes || ''
    };

    setStatus('Salvando no Supabase...');
    await salvarBio(novaEntry);
    setStatus(`✓ Medição de ${new Date(novaEntry.data).toLocaleDateString('pt-BR')} salva (peso ${novaEntry.peso}kg · gordura ${novaEntry.gordura}%)`, 'success');
    setTimeout(() => { statusEl.textContent = ''; statusEl.className = 'form-status'; }, 5000);
  } catch (e) {
    console.error(e);
    setStatus('Erro: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    const inp = document.getElementById('bioFileInput');
    if (inp) inp.value = '';
  }
}

async function deletarBio(id) {
  const e = bioData.find(x => x.id === id);
  if (!e) return;
  if (!confirm(`Excluir medição de ${new Date(e.data).toLocaleDateString('pt-BR')}?`)) return;
  try {
    if (e.arquivo_path) {
      await sb.storage.from('exames').remove([e.arquivo_path]).catch(() => {});
    }
    const nova = bioData.filter(x => x.id !== id);
    const { error } = await sb.from('bhr_bio').upsert({
      user_id: ironUserId,
      record_content: nova,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (error) throw error;
    bioData = nova;
    renderBio();
  } catch (err) { alert('Erro: ' + err.message); }
}
window.deletarBio = deletarBio;

// ---------- ADD: EXAME (Claude Vision) -------------------------------
async function handleUploadExame(file) {
  const statusEl = document.getElementById('exameUploadStatus');
  const btn = document.getElementById('btnNovoExame');
  const setStatus = (txt, cls = 'loading') => {
    statusEl.className = 'form-status ' + cls;
    statusEl.textContent = txt;
  };
  btn.disabled = true;
  try {
    setStatus('Lendo arquivo...');
    // Comprime imagens grandes antes de mandar pra API (economiza tokens e evita rate limit)
    const fileParaEnviar = await resizeImageFile(file, 1600, 0.78);
    const base64 = await fileToBase64(fileParaEnviar);
    const mediaType = fileParaEnviar.type || (fileParaEnviar.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

    // Upload em paralelo: storage + análise
    setStatus('Subindo arquivo e analisando (30-60s)...');
    let arquivoPath = null;
    try {
      arquivoPath = await uploadArquivoStorage(file, 'exames');
    } catch (storageErr) {
      console.warn('Storage falhou (bucket não criado?):', storageErr.message);
      // segue sem storage — pelo menos a análise é preservada
    }
    const system = `Você é um médico especialista em análise de exames laboratoriais.
Analise a imagem ou PDF do exame recebido e retorne APENAS um objeto JSON válido (sem texto antes/depois, sem markdown), no formato:

{
  "tipo": "Hemograma completo" (ou "Perfil lipídico", "Glicemia", "Função hepática", "Função renal", "Hormônios", etc conforme o exame),
  "data": "YYYY-MM-DD" (data da coleta; se não achar, usa "${todayKey()}"),
  "analise_geral": "Texto 100-200 palavras em PT-BR: o que está normal, o que tem atenção, recomendações práticas. Sem disclaimer médico longo.",
  "resultados_principais": [
    { "parametro": "Hemoglobina", "valor": "15.2 g/dL", "referencia": "13.5-17.5", "status": "normal" },
    { "parametro": "Colesterol total", "valor": "220 mg/dL", "referencia": "<200", "status": "alto" }
  ]
}

Regras:
- status só pode ser: "normal", "baixo", "alto", "atencao"
- inclua até 20 marcadores principais (os mais relevantes)
- use exatamente os valores do exame, não invente
- se o arquivo não for um exame laboratorial válido, retorne { "erro": "não é um exame" }`;

    const result = await callClaudeWithFile(system, 'Analise este exame e retorne o JSON.', base64, mediaType, 3000);

    if (result.erro) {
      setStatus('Arquivo não parece um exame laboratorial: ' + result.erro, 'error');
      btn.disabled = false;
      return;
    }

    const novoExame = {
      id: Date.now(),
      data: result.data || todayKey(),
      tipo: result.tipo || 'Exame',
      arquivo: file.name,
      arquivo_path: arquivoPath,
      analiseIA: {
        analise_geral: result.analise_geral || '',
        resultados_principais: result.resultados_principais || []
      }
    };

    setStatus('Salvando no Supabase...');
    const novaLista = [...examesData, novoExame];
    const { error } = await sb.from('bhr_exames').upsert({
      user_id: ironUserId,
      record_content: novaLista,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (error) throw error;
    examesData = novaLista;
    renderExames();
    setStatus(`✓ ${novoExame.tipo} salvo (${novoExame.analiseIA.resultados_principais.length} marcadores)`, 'success');
    setTimeout(() => { statusEl.textContent = ''; statusEl.className = 'form-status'; }, 4000);
  } catch (e) {
    console.error(e);
    setStatus('Erro: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    document.getElementById('exameFileInput').value = '';
  }
}

function contextoSaude() {
  const bioOrd = [...bioData].sort((a, b) => new Date(a.data) - new Date(b.data));
  const bioAtual = bioOrd[bioOrd.length - 1];
  const bioPrimeiro = bioOrd[0];
  const examesOrd = [...examesData].sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 3);

  let texto = `# DADOS DO ATLETA\n`;
  texto += `Bruno · 40 anos · 1.76m · protocolo hipertrofia · split ${state.split} · ciclo ${currentCycleNum()} · sessão ${sessionInCycle()}/${CYCLE_LENGTH}${isDeloadCycle() ? ' (DELOAD)' : ''}\n\n`;

  if (bioAtual) {
    texto += `# BIOIMPEDÂNCIA ATUAL (${new Date(bioAtual.data).toLocaleDateString('pt-BR')})\n`;
    texto += `Peso: ${bioAtual.peso}kg · Gordura: ${bioAtual.gordura}% · Massa muscular: ${bioAtual.massa}kg · IMC: ${bioAtual.imc} · Água: ${bioAtual.agua}%\n`;
    if (bioPrimeiro && bioPrimeiro !== bioAtual) {
      texto += `Primeira medição (${new Date(bioPrimeiro.data).toLocaleDateString('pt-BR')}): Peso ${bioPrimeiro.peso}kg, Gordura ${bioPrimeiro.gordura}%, Massa ${bioPrimeiro.massa}kg\n`;
      texto += `Δ: peso ${(bioAtual.peso - bioPrimeiro.peso).toFixed(1)}kg · gordura ${(bioAtual.gordura - bioPrimeiro.gordura).toFixed(1)}% · massa ${(bioAtual.massa - bioPrimeiro.massa).toFixed(1)}kg\n`;
    }
    texto += `Total de medições: ${bioOrd.length}\n\n`;
  } else {
    texto += `# BIOIMPEDÂNCIA: sem dados\n\n`;
  }

  if (examesOrd.length > 0) {
    texto += `# ÚLTIMOS EXAMES (${examesOrd.length})\n`;
    examesOrd.forEach(e => {
      texto += `\n## ${e.tipo || 'Exame'} — ${new Date(e.data).toLocaleDateString('pt-BR')}\n`;
      if (e.analiseIA?.analise_geral) texto += `Análise: ${e.analiseIA.analise_geral}\n`;
      if (e.analiseIA?.resultados_principais) {
        e.analiseIA.resultados_principais.forEach(r => {
          texto += `- ${r.parametro}: ${r.valor}${r.status ? ` (${r.status})` : ''}${r.referencia ? ` · ref: ${r.referencia}` : ''}\n`;
        });
      } else if (e.resultados) {
        texto += e.resultados.slice(0, 300) + '\n';
      }
    });
    texto += `\n`;
  } else {
    texto += `# EXAMES: sem dados\n\n`;
  }

  const rToday = state.readiness[todayKey()];
  if (rToday) {
    texto += `# PRONTIDÃO HOJE: ${rToday.score}/100 (sono ${rToday.sleep}, energia ${rToday.energy}, dor ${rToday.soreness}, humor ${rToday.mood})\n`;
  }
  return texto;
}

function showIaOutput(txt) {
  const out = document.getElementById('iaOutput');
  out.textContent = txt;
  out.classList.add('show');
}

function setIaLoading(on, msg) {
  const out = document.getElementById('iaOutput');
  document.querySelectorAll('.ia-btn').forEach(b => b.disabled = on);
  if (on) { out.textContent = msg || 'Consultando Claude...'; out.classList.add('show'); }
}

async function analisarSaude() {
  if (!bioData.length && !examesData.length) {
    showIaOutput('Sem bio/exames ainda. Registre no app BHR Treinos antes.');
    return;
  }
  setIaLoading(true, 'Analisando seus exames + bio...');
  try {
    const system = `Você é um médico esportivo experiente. Responda em PT-BR, direto e prático, máximo 250 palavras. Aponte 3-5 pontos de atenção concretos baseados nos dados, e uma recomendação acionável para o treino/dieta atual. Evite disclaimers médicos longos.`;
    const user = contextoSaude() + `\n# TAREFA\nAnalise os dados acima e me diga: 1) o que está bom, 2) pontos de atenção, 3) 1-2 ajustes práticos no meu treino/dieta atual.`;
    const resp = await callClaude(system, user, 1200);
    showIaOutput(resp);
  } catch (e) { showIaOutput('Erro: ' + e.message); }
  finally { setIaLoading(false); }
}

async function gerarTreino() {
  setIaLoading(true, 'Gerando novo treino baseado nos seus dados...');
  try {
    const system = `Você é um personal trainer especializado em hipertrofia masculina. Responda em PT-BR. Proponha uma divisão de 6 dias (ou 5 se os dados sugerirem recuperação limitada) adequada ao atleta, considerando bio e exames. Formato: para cada dia, título + 6-10 exercícios com séries e descanso. Máximo 400 palavras. Não repita a divisão atual cegamente — justifique UMA mudança importante no começo.`;
    const user = contextoSaude() + `\n# DIVISÃO ATUAL\n${state.split === '6d' ? 'PUSH/PULL/LEGS A/OMB/BRAÇO/LEGS B (6 dias)' : 'PUSH/PULL/OMB/BRAÇO/LEGS FULL (5 dias)'}\n\n# TAREFA\nProponha um novo plano de treino semanal otimizado para meus dados. Comece com UMA justificativa curta baseada em algum marcador específico dos exames ou da bio.`;
    const resp = await callClaude(system, user, 2000);
    showIaOutput(resp);
  } catch (e) { showIaOutput('Erro: ' + e.message); }
  finally { setIaLoading(false); }
}

async function gerarDieta() {
  setIaLoading(true, 'Gerando nova dieta...');
  try {
    const system = `Você é um nutricionista esportivo. Responda em PT-BR. Proponha um plano alimentar de 5 refeições adaptado aos dados (especial atenção a marcadores metabólicos se existirem). Calcule kcal e macros totais realistas para o atleta. Formato: target diário + 5 refeições com horário, itens e macros. Máximo 400 palavras. Comece com UMA linha justificando o calórico escolhido.`;
    const user = contextoSaude() + `\n# DIETA ATUAL\n3000kcal · 180g proteína · 375g carbo · 80g gordura\n\n# TAREFA\nProponha nova dieta otimizada. Justifique o ajuste calórico com base em algo concreto dos dados (ex: gordura subindo, massa parada, colesterol, glicemia, etc).`;
    const resp = await callClaude(system, user, 2000);
    showIaOutput(resp);
  } catch (e) { showIaOutput('Erro: ' + e.message); }
  finally { setIaLoading(false); }
}

// ---------- SAÚDE WIRING --------------------------------------------
document.getElementById('btnEntrar').onclick = handleEntrar;
document.getElementById('btnLogout').onclick = handleSair;

// Bio form manual
document.getElementById('btnNovaBio').onclick = abrirFormBio;
document.getElementById('btnCancelarBio').onclick = fecharFormBio;
document.getElementById('formBio').addEventListener('submit', handleSalvarBio);

// Bio upload (foto/PDF via Claude Vision)
document.getElementById('btnUploadBio').onclick = () => {
  document.getElementById('bioFileInput').click();
};
document.getElementById('bioFileInput').addEventListener('change', (ev) => {
  const f = ev.target.files?.[0];
  if (f) handleUploadBio(f);
});

// Exame upload
document.getElementById('btnNovoExame').onclick = () => {
  document.getElementById('exameFileInput').click();
};
document.getElementById('exameFileInput').addEventListener('change', (ev) => {
  const f = ev.target.files?.[0];
  if (f) handleUploadExame(f);
});
document.getElementById('authSenha').addEventListener('keydown', e => { if (e.key === 'Enter') handleEntrar(); });

const iaKeyInput = document.getElementById('iaKey');
const iaKeyStatus = document.getElementById('iaKeyStatus');

async function loadKeyFromSupabase() {
  if (!ironUserId) { iaKeyInput.placeholder = 'Faça login primeiro'; return; }
  const k = await getClaudeKey();
  if (k) {
    iaKeyInput.value = '••••••••••••••••' + k.slice(-4);
    iaKeyInput.dataset.saved = '1';
    if (iaKeyStatus) iaKeyStatus.textContent = 'Chave carregada do Supabase';
  } else {
    iaKeyInput.value = '';
    iaKeyInput.placeholder = 'sk-ant-...';
    if (iaKeyStatus) iaKeyStatus.textContent = '';
  }
}

iaKeyInput.addEventListener('focus', () => {
  if (iaKeyInput.dataset.saved) {
    iaKeyInput.value = '';
    iaKeyInput.dataset.saved = '';
    iaKeyInput.placeholder = 'cole a nova chave';
  }
});

document.getElementById('btnSalvarKey').onclick = async () => {
  const btn = document.getElementById('btnSalvarKey');
  const raw = iaKeyInput.value.trim();
  if (!raw || raw.startsWith('•')) { if (iaKeyStatus) iaKeyStatus.textContent = 'Cole uma chave primeiro'; return; }
  if (!ironUserId) { if (iaKeyStatus) iaKeyStatus.textContent = 'Faça login antes de salvar'; return; }
  const orig = btn.textContent;
  btn.textContent = '...';
  try {
    await setClaudeKey(raw);
    btn.textContent = 'SALVO';
    if (iaKeyStatus) iaKeyStatus.textContent = 'Salvo no Supabase (RLS protegido)';
    iaKeyInput.value = '••••••••••••••••' + raw.slice(-4);
    iaKeyInput.dataset.saved = '1';
  } catch (e) {
    btn.textContent = 'ERRO';
    if (iaKeyStatus) iaKeyStatus.textContent = 'Erro: ' + e.message;
  }
  setTimeout(() => btn.textContent = orig, 1800);
};

document.getElementById('btnAnalisarSaude').onclick = analisarSaude;
document.getElementById('btnGerarTreino').onclick = gerarTreino;
document.getElementById('btnGerarDieta').onclick = gerarDieta;
document.getElementById('btnLimparIA').onclick = () => {
  document.getElementById('iaOutput').classList.remove('show');
  document.getElementById('iaOutput').textContent = '';
};

initSupabase();
