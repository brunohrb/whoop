import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

type Status = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

export default function AIAnalysis() {
  const [status, setStatus] = useState<Status>('idle')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [text])

  async function analyze() {
    if (status === 'loading' || status === 'streaming') {
      abortRef.current?.abort()
      return
    }

    setText('')
    setError('')
    setStatus('loading')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setStatus('error'); setError('Sessão expirada'); return }

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/health-ai`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      if (!resp.ok) {
        const msg = await resp.text()
        throw new Error(msg || `Erro ${resp.status}`)
      }

      setStatus('streaming')

      const reader = resp.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') continue
          try {
            const evt = JSON.parse(raw)
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              setText(t => t + evt.delta.text)
            }
          } catch { /* ignore malformed chunks */ }
        }
      }

      setStatus('done')
    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') {
        setStatus('idle')
      } else {
        setStatus('error')
        setError((e as Error).message ?? 'Erro desconhecido')
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 safe-top flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🤖</span>
          <h1 className="text-2xl font-bold">Análise por IA</h1>
        </div>
        <p className="text-sm text-gray-400">
          O Claude analisa todos os seus dados — recuperação, sono, esforço, diário e exames — e gera um relatório personalizado.
        </p>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4">
        {status === 'idle' && (
          <div className="bg-surface rounded-2xl p-5 text-center mt-2">
            <div className="text-5xl mb-4">🧬</div>
            <p className="text-gray-300 font-semibold mb-1">Pronto para analisar</p>
            <p className="text-gray-500 text-sm">
              Toque em "Analisar" para gerar um relatório completo de saúde baseado nos seus dados reais do WHOOP.
            </p>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center mt-16 gap-4">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2.5 h-2.5 rounded-full bg-whoop-green animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="text-gray-400 text-sm">Coletando seus dados...</p>
          </div>
        )}

        {(status === 'streaming' || status === 'done') && text && (
          <div className="mt-2">
            <MarkdownView text={text} />
            {status === 'streaming' && (
              <span className="inline-block w-2 h-4 bg-whoop-green animate-pulse ml-0.5 rounded-sm" />
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
            <p className="text-red-400 font-semibold text-sm mb-1">Erro na análise</p>
            <p className="text-red-300 text-xs">{error}</p>
            {error.includes('ANTHROPIC_API_KEY') || error.includes('401') ? (
              <p className="text-gray-400 text-xs mt-3 border-t border-white/5 pt-3">
                Configure a chave ANTHROPIC_API_KEY nas secrets do Supabase em:<br />
                <span className="text-whoop-green">Dashboard → Edge Functions → Secrets</span>
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Bottom button */}
      <div className="px-4 pb-6 pt-3 flex-shrink-0 border-t border-white/5 bg-black">
        <button
          onClick={analyze}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
            status === 'loading' || status === 'streaming'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-whoop-green text-black active:scale-95'
          }`}
        >
          {status === 'loading' ? 'Cancelar' :
           status === 'streaming' ? '⏹ Parar' :
           status === 'done' ? '🔄 Analisar novamente' :
           '✨ Analisar minha saúde'}
        </button>
        {status === 'done' && (
          <p className="text-center text-xs text-gray-600 mt-2">
            Análise gerada com dados reais do WHOOP
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Minimal markdown renderer ────────────────────────────────────────────────
function MarkdownView({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-base font-bold text-white mt-5 mb-2 first:mt-0">
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-lg font-bold text-white mt-4 mb-2">
          {line.slice(2)}
        </h1>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex gap-2 text-sm text-gray-300 mb-1">
          <span className="text-whoop-green flex-shrink-0 mt-0.5">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-1" />)
    } else {
      elements.push(
        <p key={i} className="text-sm text-gray-300 mb-2 leading-relaxed">
          {renderInline(line)}
        </p>
      )
    }
  }

  return <div className="pb-4">{elements}</div>
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
    }
    return part
  })
}
