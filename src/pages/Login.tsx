import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup' | 'magic'>('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin + '/whoop' },
        })
        if (error) throw error
        setMessage({ text: 'Link enviado! Verifique seu email.', type: 'success' })
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage({ text: 'Conta criada! Verifique seu email para confirmar.', type: 'success' })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Erro ao autenticar',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12 bg-black">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-whoop-green" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.53L12 21.35z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold">WHOOP em Português</h1>
          <p className="text-gray-400 text-sm mt-1">Seu WHOOP, no seu idioma</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          {mode !== 'magic' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
          )}

          {message && (
            <div className={`rounded-xl p-3 text-sm ${
              message.type === 'success'
                ? 'bg-whoop-green/10 text-whoop-green border border-whoop-green/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-whoop-green text-black font-bold py-3.5 rounded-xl text-base disabled:opacity-50 transition-opacity"
          >
            {loading
              ? 'Aguarde...'
              : mode === 'login'
              ? 'Entrar'
              : mode === 'signup'
              ? 'Criar Conta'
              : 'Enviar Link'}
          </button>
        </form>

        <div className="flex flex-col gap-3 mt-6">
          {mode !== 'login' && (
            <button
              onClick={() => { setMode('login'); setMessage(null) }}
              className="text-gray-400 text-sm hover:text-white transition-colors"
            >
              Já tenho conta → Entrar
            </button>
          )}
          {mode !== 'signup' && (
            <button
              onClick={() => { setMode('signup'); setMessage(null) }}
              className="text-gray-400 text-sm hover:text-white transition-colors"
            >
              Criar nova conta
            </button>
          )}
          {mode !== 'magic' && (
            <button
              onClick={() => { setMode('magic'); setMessage(null) }}
              className="text-gray-400 text-sm hover:text-white transition-colors"
            >
              Entrar sem senha (link por email)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
