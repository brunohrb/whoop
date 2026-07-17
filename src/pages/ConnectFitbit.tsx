import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

const FITBIT_OAUTH_URL = 'https://www.fitbit.com/oauth2/authorize'
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/fitbit-auth-callback`
const SCOPES = 'activity heartrate sleep profile oxygen_saturation'

export default function ConnectFitbit() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = () => {
    if (!user) return
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_FITBIT_CLIENT_ID as string,
      redirect_uri: CALLBACK_URL,
      response_type: 'code',
      scope: SCOPES,
      state: user.id,
    })

    window.location.href = `${FITBIT_OAUTH_URL}?${params}`
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
          <svg className="w-12 h-12 text-bhr-green" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">Conectar Fitbit</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Você será redirecionado para o Fitbit para autorizar o acesso aos seus dados.
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
            'Atividade diária e calorias',
            'Treinos e exercícios',
            'Perfil básico',
          ].map(item => (
            <div key={item} className="flex items-center gap-2 py-1.5">
              <span className="text-bhr-green text-xs">✓</span>
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
            className="bg-bhr-green text-black font-bold py-4 rounded-xl text-base disabled:opacity-50 w-full"
          >
            {loading ? 'Aguarde...' : 'Autorizar no Fitbit'}
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
