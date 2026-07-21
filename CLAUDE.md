# Saúde BHR

PWA de acompanhamento de saúde com dados do Fitbit, publicada em `https://brunohrb.github.io/saude/`.

## Stack

- React 18 + TypeScript
- Vite + vite-plugin-pwa (PWA com service worker)
- Tailwind CSS (tema escuro, fundo preto `#000000`)
- Supabase (auth, banco de dados, edge functions)
- GitHub Pages (deploy via GitHub Actions)

## Comandos

```bash
npm run dev      # desenvolvimento local
npm run build    # build de produção (tsc + vite build)
npm run lint     # ESLint
npm run preview  # preview do build local
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```
VITE_SUPABASE_URL=https://hisbbtddpoxufvghxqtm.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_FITBIT_CLIENT_ID=...
VITE_APP_URL=https://brunohrb.github.io/saude
```

No GitHub Actions (Settings → Secrets): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_CLIENT_ID`.

## Estrutura

```
src/
  pages/        # uma rota por arquivo
  components/   # componentes reutilizáveis
  hooks/        # useAuth, useFitbitData, useSync, useWhoopData
  lib/          # clientes supabase e fitbit
  utils/        # helpers
supabase/
  functions/    # edge functions (Deno)
  migrations/   # SQL migrations
```

## Rotas

| Path | Página |
|------|--------|
| `/` | Dashboard |
| `/recuperacao` | Recuperação |
| `/sono` | Sono |
| `/esforco` | Esforço / Strain |
| `/saude` | Saúde |
| `/ia` | Análise IA |
| `/treino` | Treino |
| `/previsao` | Previsão |
| `/configuracoes` | Configurações |
| `/conectar-fitbit` | Conectar Fitbit |

## Deploy

Push para `main` aciona o workflow `.github/workflows/deploy.yml`, que faz build e publica no GitHub Pages.

O `base` do Vite e o `basename` do React Router estão configurados como `/saude/` — não altere sem atualizar ambos juntos.

## Integração Fitbit

O fluxo OAuth usa edge functions do Supabase. O redirect URI configurado no app Fitbit deve apontar para a edge function de callback.

## PWA

O service worker é gerenciado pelo `vite-plugin-pwa` com `registerType: 'autoUpdate'`. O banner de atualização em `App.tsx` (`UpdateBanner`) detecta novas versões e oferece reload ao usuário.
