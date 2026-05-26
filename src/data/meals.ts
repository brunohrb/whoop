export interface MealOption {
  label: string
  items: string[]
  macros: { kcal: number; p: number; c: number; g: number }
}

export interface Meal {
  id: string
  name: string
  time: string
  skipOnFast?: boolean
  optional?: boolean
  options: MealOption[]
}

export const MEALS: Meal[] = [
  {
    id: 'cafe',
    name: 'CAFÉ DA MANHÃ',
    time: '07:00',
    skipOnFast: true,
    options: [
      {
        label: 'Ovos + aveia',
        items: ['4 ovos inteiros + 3 claras mexidos', '80g aveia com 1 banana e canela', '1 colher (sopa) pasta de amendoim integral', '1 xícara café preto'],
        macros: { kcal: 680, p: 42, c: 75, g: 20 },
      },
      {
        label: 'Omelete + tapioca',
        items: ['3 ovos + 4 claras em omelete com queijo cottage (50g)', '1 tapioca média (3 col sopa) com pasta de amendoim', '1 mamão papaia pequeno', 'Café preto'],
        macros: { kcal: 640, p: 44, c: 60, g: 22 },
      },
      {
        label: 'Iogurte + granola',
        items: ['300g iogurte natural desnatado', '1 scoop whey (30g) misturado', '50g granola sem açúcar + 1 banana', 'Café preto'],
        macros: { kcal: 620, p: 45, c: 70, g: 14 },
      },
    ],
  },
  {
    id: 'lanche1',
    name: 'LANCHE 1',
    time: '10:30',
    skipOnFast: true,
    options: [
      {
        label: 'Whey + castanhas',
        items: ['1 scoop whey (30g) com 300ml água', '50g castanhas (pará/caju/amêndoa)', '1 fruta (maçã, pera ou mamão)'],
        macros: { kcal: 480, p: 28, c: 35, g: 24 },
      },
      {
        label: 'Sanduíche proteico',
        items: ['2 fatias pão integral', '100g peito de peru ou atum', '1 col (sopa) requeijão light', '1 fruta'],
        macros: { kcal: 450, p: 32, c: 55, g: 10 },
      },
    ],
  },
  {
    id: 'almoco',
    name: 'ALMOÇO',
    time: '13:00',
    options: [
      {
        label: 'Frango + arroz+feijão',
        items: ['180g peito de frango grelhado', '150g arroz integral cozido + 1 concha feijão', 'Salada verde à vontade + 1 colher azeite', '100g batata-doce ou legumes cozidos'],
        macros: { kcal: 780, p: 50, c: 95, g: 18 },
      },
      {
        label: 'Patinho + mandioquinha',
        items: ['180g patinho moído refogado', '150g mandioquinha (baroa) ou mandioca', 'Brócolis + couve refogados', '1 col azeite extravirgem'],
        macros: { kcal: 760, p: 48, c: 85, g: 22 },
      },
      {
        label: 'Tilápia + arroz integral',
        items: ['200g tilápia grelhada (ou outro peixe branco)', '150g arroz integral', 'Salada colorida + azeite', '1 laranja ou maçã'],
        macros: { kcal: 700, p: 50, c: 85, g: 16 },
      },
    ],
  },
  {
    id: 'pre',
    name: 'PRÉ-TREINO',
    time: '16:30',
    options: [
      {
        label: 'Pão + peru',
        items: ['2 fatias pão integral ou 1 tapioca (3 col sopa)', '100g peito de peru ou frango desfiado', '1 banana com mel (1 col chá)', 'Café preto ou cafeína 200mg'],
        macros: { kcal: 520, p: 32, c: 80, g: 8 },
      },
      {
        label: 'Shake rápido',
        items: ['1 scoop whey (30g)', '1 banana média + 30g aveia', '300ml leite desnatado', 'Cafeína 200mg (cápsula)'],
        macros: { kcal: 480, p: 35, c: 70, g: 6 },
      },
    ],
  },
  {
    id: 'jantar',
    name: 'JANTAR (pós-treino)',
    time: '20:30',
    options: [
      {
        label: 'Carne + arroz',
        items: ['200g carne vermelha magra (patinho/coxão mole)', '150g arroz branco ou batata-doce', 'Legumes no vapor (brócolis, abobrinha, cenoura)', '1 col azeite de oliva extravirgem'],
        macros: { kcal: 740, p: 48, c: 80, g: 22 },
      },
      {
        label: 'Salmão + batata-doce',
        items: ['200g salmão grelhado', '150g batata-doce assada', 'Aspargos ou brócolis', '1 col azeite'],
        macros: { kcal: 720, p: 45, c: 65, g: 26 },
      },
      {
        label: 'Frango + macarrão integral',
        items: ['180g peito de frango em cubos', '120g (cru) macarrão integral com molho de tomate caseiro', 'Salada + 1 col azeite', 'Parmesão ralado (10g)'],
        macros: { kcal: 720, p: 50, c: 90, g: 14 },
      },
    ],
  },
  {
    id: 'ceia',
    name: 'CEIA',
    time: '22:30',
    optional: true,
    options: [
      {
        label: 'Caseína lenta',
        items: ['1 scoop caseína (30g) com 200ml água ou leite desnatado', '20g amêndoas', 'Chá de camomila ou erva-doce'],
        macros: { kcal: 280, p: 28, c: 8, g: 14 },
      },
      {
        label: 'Cottage + fruta',
        items: ['200g queijo cottage', '1 kiwi ou 1/2 mamão', 'Canela a gosto', '10g castanhas-do-pará (1 unidade)'],
        macros: { kcal: 260, p: 26, c: 18, g: 10 },
      },
      {
        label: 'Claras + pasta de amendoim',
        items: ['6 claras mexidas (ou omelete)', '1 col (sopa) pasta de amendoim integral', '1 fatia pão integral (opcional)'],
        macros: { kcal: 240, p: 25, c: 12, g: 12 },
      },
    ],
  },
]
