# BHR Saúde (PWA)

App pessoal offline-first integrando treino, dieta, readiness e análise de exames/bioimpedância com IA. Roda em `https://brunohrb.github.io/treino/bhr-saude/`.

## Abas

- **Treino** — split 6d/5d, 7 dias mapeados, contador de semana + deload automático a cada 5 sem
- **Readiness** — sliders sono/energia/dor/humor → score 0-100 com recomendação de ajuste de carga
- **Dieta** — 5 refeições + Ceia opcional, toggle Jejum 16h (meta 2x/sem), opções alternativas por refeição
- **Timer** — presets 45/60/90/120/180s, som + vibração
- **Saúde** — exames de sangue + bioimpedância sincronizados com Supabase (`bhr_exames`, `bhr_bio`), gráficos de série temporal e análise via Claude
- **Stats** — progresso do dia e reset

## Integrações

- **Supabase** (schema `treino`): login com nome+senha (mesmo do app principal), leitura de `bhr_bio`, `bhr_exames` e `bhr_config`
- **Claude API** (claude-sonnet-4-6) via `anthropic-dangerous-direct-browser-access`. Chave guardada em `bhr_config` (RLS protegido) — nunca em localStorage

## Estrutura

```
index.html     → interface + CSS
app.js         → lógica (treino, dieta, readiness, saúde, IA)
manifest.json  → PWA
sw.js          → service worker offline (cache-first)
icon-192.png · icon-512.png
```

## Lembretes

- Exames periódicos: hemograma, lipidograma, função hepática/renal, PSA
- Pressão arterial semanal
- Sono ≥ 7h · hidratação 3.5–4L/dia
- Cardio 2x/sem inegociável
