# WHOOP em Português 🇧🇷

PWA para acompanhar seus dados do WHOOP em português.

## Como configurar

### 1. Criar conta de desenvolvedor no WHOOP

1. Acesse [developer.whoop.com](https://developer.whoop.com)
2. Crie uma conta e um novo aplicativo
3. No campo **Redirect URI**, coloque exatamente:
   ```
   https://hisbbtddpoxufvghxqtm.supabase.co/functions/v1/whoop-auth-callback
   ```
4. Copie o **Client ID** e o **Client Secret**

### 2. Configurar secrets no Supabase

No painel do Supabase, vá em **Settings → Edge Functions → Secrets** e adicione:

| Variável | Valor |
|----------|-------|
| `WHOOP_CLIENT_ID` | Client ID do seu app WHOOP |
| `WHOOP_CLIENT_SECRET` | Client Secret do seu app WHOOP |
| `APP_URL` | `https://brunohrb.github.io/whoop` |

### 3. Configurar secrets no GitHub Actions

No repositório GitHub, vá em **Settings → Secrets and variables → Actions** e adicione:

| Secret | Valor |
|--------|-------|
| `VITE_SUPABASE_URL` | `https://hisbbtddpoxufvghxqtm.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Chave anon do Supabase (Settings → API) |

### 4. Habilitar GitHub Pages

No repositório, vá em **Settings → Pages** e configure:
- Source: **GitHub Actions**

### 5. Primeiro acesso

1. Acesse `https://brunohrb.github.io/whoop`
2. Crie uma conta com seu email
3. Clique em **Conectar WHOOP** e autorize o acesso
4. Clique em **Sincronizar** para carregar seus dados

## Desenvolvimento local

```bash
cp .env.example .env
# Preencha as variáveis no .env
npm install
npm run dev
```

## Tecnologias

- React 18 + TypeScript
- Vite + vite-plugin-pwa
- Tailwind CSS
- Supabase (auth + banco + edge functions)
- GitHub Pages
