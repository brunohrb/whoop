import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

const WHOOP_OAUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth'
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/whoop-auth-callback`
const SCOPES = 'read:profile read:recovery read:sleep read:workout read:cycles offline'

export default function ConnectWhoop() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Sessão expirada, faça login novamente')

      // Usa o access_token como state — verificado pelo edge function via Supabase Auth
      const state = session.access_token

      const params = new URLSearchParams({
        client_id: import.meta.env.VITE_WHOOP_CLIENT_ID as string,
        redirect_uri: CALLBACK_URL,
        response_type: 'code',
        scope: SCOPES,
        state,
      })

      window.location.href = `${WHOOP_OAUTH_URL}?${params}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar conexão')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full flex flex-col px-6 pt-16 pb-8 bg-black">
      <button
        onClick={() => navigate('/configuracoes')}
        className="flex items-center gap-2 text-gray-400 text-sm mb-8"
      >
        ← Voltar
      </button>

      <div className="flex flex-col items-center text-center gap-6 flex-1">
        <div className="w-20 h-20 rounded-2xl bg-surface flex items-center justify-center">
          <svg className="w-12 h-12 text-whoop-green" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.53L12 21.35z"/>
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">Conectar WHOOP</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Você será redirecionado para o WHOOP para autorizar o acesso aos seus dados.
            Seus dados ficam armazenados de forma segura no seu banco de dados pessoal.
          </p>
        </div>

        <div className="w-full bg-surface rounded-2xl p-4 text-left">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">
            Dados que serão acessados
          </p>
          {[
            'Recuperação (VFC, FCC, SpO₂)',
            'Sono (duração, estágios, eficiência)',
            'Esforço diário e ciclos',
            'Treinos e atividades',
            'Perfil básico',
          ].map(item => (
            <div key={item} className="flex items-center gap-2 py-1.5">
              <span className="text-whoop-green text-xs">✓</span>
              <span className="text-sm text-gray-300">{item}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="w-full bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="w-full mt-auto flex flex-col gap-3">
          <button
            onClick={handleConnect}
            disabled={loading}
            className="bg-whoop-green text-black font-bold py-4 rounded-xl text-base disabled:opacity-50 w-full"
          >
            {loading ? 'Aguarde...' : 'Autorizar no WHOOP'}
          </button>
          <button
            onClick={() => navigate('/configuracoes')}
            className="text-gray-400 text-sm py-2"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
