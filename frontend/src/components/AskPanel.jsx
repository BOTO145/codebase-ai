import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { askQuestion } from '../utils/api'
import './AskPanel.css'

const SUGGESTED = [
  'Where is authentication implemented?',
  'What are the entry points?',
  'Which modules handle database operations?',
  'What is the most complex file?',
  'How is error handling structured?',
]

export default function AskPanel({ jobId }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (q) => {
    const question = (q || input).trim()
    if (!question || loading) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text: question }])
    setLoading(true)
    try {
      const { answer } = await askQuestion(jobId, question)
      setMessages(m => [...m, { role: 'ai', text: answer }])
    } catch (e) {
      setMessages(m => [...m, { role: 'ai', text: `Error: ${e.message}`, error: true }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="ask-panel">
      {/* Messages */}
      <div className="ask-messages">
        {messages.length === 0 && (
          <div className="ask-empty fade-in">
            <p className="ask-empty-title">Ask anything about the codebase</p>
            <div className="ask-suggestions">
              {SUGGESTED.map(s => (
                <button key={s} className="ask-suggestion" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`ask-msg ask-msg--${msg.role} fade-in`}>
            <span className="ask-msg-label">
              {msg.role === 'user' ? 'YOU' : 'AI'}
            </span>
            <div className={`ask-msg-text ${msg.error ? 'err' : ''}`}>
              {msg.role === 'ai' && !msg.error
                ? <ReactMarkdown>{msg.text}</ReactMarkdown>
                : msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="ask-msg ask-msg--ai fade-in">
            <span className="ask-msg-label">AI</span>
            <span className="ask-thinking pulse">thinking…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <hr className="divider" />

      {/* Input */}
      <div className="ask-input-row">
        <textarea
          className="ask-textarea"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask a question… (Enter to send)"
          rows={2}
          disabled={loading}
        />
        <button
          className="btn primary ask-send-btn"
          onClick={() => send()}
          disabled={!input.trim() || loading}
        >
          ↑
        </button>
      </div>
    </div>
  )
}
