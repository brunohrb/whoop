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
          options: { emailRedirectTo: window.location.origin + '/saude-bhr' },
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
            <svg className="w-10 h-10 text-bhr-green" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Saúde BHR</h1>
          <p className="text-gray-400 text-sm mt-1">Sua saúde, no seu idioma</p>
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
                ? 'bg-bhr-green/10 text-bhr-green border border-bhr-green/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-bhr-green text-black font-bold py-3.5 rounded-xl text-base disabled:opacity-50 transition-opacity"
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
