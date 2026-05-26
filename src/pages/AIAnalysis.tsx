import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

type Message = { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = [
  'Faça um relatório completo de saúde',
  'Por que minha recuperação está baixa?',
  'O que devo treinar hoje?',
  'Como está meu sono esta semana?',
  'Analise minha HRV e FC de repouso',
]

export default function AIAnalysis() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || streaming) return

    setError('')
    setInput('')
    setStreaming(true)

    const userMessage: Message = { role: 'user', content: msg }
    const history = [...messages, userMessage]
    setMessages([...history, { role: 'assistant', content: '' }])

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Sessão expirada')
      setStreaming(false)
      return
    }

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
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      })

      if (!resp.ok) {
        const errText = await resp.text()
        throw new Error(errText || `Erro ${resp.status}`)
      }

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
              setMessages(m => {
                const updated = [...m]
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: updated[updated.length - 1].content + evt.delta.text,
                }
                return updated
              })
            }
          } catch { /* ignore malformed chunks */ }
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') {
        setError((e as Error).message ?? 'Erro desconhecido')
        setMessages(m => m.slice(0, -1))
      }
    } finally {
      setStreaming(false)
    }
  }

  function stop() {
    abortRef.current?.abort()
    setStreaming(false)
  }

  function clear() {
    if (streaming) stop()
    setMessages([])
    setError('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-14 pb-3 safe-top flex-shrink-0 flex items-center justify-between border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xl">🤖</span>
            <h1 className="text-xl font-bold">WHOOP Coach</h1>
          </div>
          <p className="text-xs text-gray-500">IA com acesso aos seus dados reais</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clear}
            className="text-xs text-gray-500 border border-white/10 rounded-lg px-3 py-1.5"
          >
            Nova conversa
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <>
            <div className="text-center mt-6 mb-4">
              <div className="text-4xl mb-3">🧬</div>
              <p className="text-gray-300 font-semibold text-sm mb-1">Olá! Sou seu WHOOP Coach</p>
              <p className="text-gray-500 text-xs leading-relaxed px-4">
                Tenho acesso a todos os seus dados — recuperação, sono, esforço e exames. Pergunte qualquer coisa.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {QUICK_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  disabled={streaming}
                  className="text-left bg-surface rounded-xl px-4 py-3 text-sm text-gray-300 border border-white/5 active:scale-95 transition-transform"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
              <div className="bg-whoop-green/20 border border-whoop-green/20 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
                <p className="text-sm text-white">{msg.content}</p>
              </div>
            ) : (
              <div className="bg-surface rounded-2xl rounded-tl-sm px-4 py-3 max-w-[92%]">
                {msg.content ? (
                  <>
                    <MarkdownView text={msg.content} />
                    {streaming && i === messages.length - 1 && (
                      <span className="inline-block w-1.5 h-3.5 bg-whoop-green animate-pulse ml-0.5 rounded-sm" />
                    )}
                  </>
                ) : (
                  <div className="flex gap-1 py-1">
                    {[0, 1, 2].map(j => (
                      <div
                        key={j}
                        className="w-2 h-2 rounded-full bg-whoop-green animate-bounce"
                        style={{ animationDelay: `${j * 0.15}s` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-6 pt-3 flex-shrink-0 border-t border-white/5 bg-black">
        {streaming && (
          <button
            onClick={stop}
            className="w-full mb-2 py-2 rounded-xl text-xs font-medium text-red-400 border border-red-400/20"
          >
            ⏹ Parar
          </button>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Pergunte sobre seus dados..."
            rows={1}
            disabled={streaming}
            className="flex-1 bg-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none disabled:opacity-50 focus:outline-none focus:border-whoop-green/30"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || streaming}
            className="bg-whoop-green text-black font-bold rounded-xl px-4 py-3 text-sm disabled:opacity-30 active:scale-95 transition-transform flex-shrink-0"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}

function MarkdownView({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-sm font-bold text-white mt-4 mb-1.5 first:mt-0">
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-base font-bold text-white mt-3 mb-1.5">
          {line.slice(2)}
        </h1>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex gap-2 text-xs text-gray-300 mb-1">
          <span className="text-whoop-green flex-shrink-0 mt-0.5">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-1" />)
    } else {
      elements.push(
        <p key={i} className="text-xs text-gray-300 mb-1.5 leading-relaxed">
          {renderInline(line)}
        </p>
      )
    }
  }

  return <div>{elements}</div>
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
