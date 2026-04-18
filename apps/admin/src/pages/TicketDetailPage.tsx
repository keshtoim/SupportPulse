import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { TicketDetailDTO, TicketStatus, MessageDTO } from '@supportpulse/shared'
import { TicketStatusLabel, SenderTypeLabel, TicketStatus as TS } from '@supportpulse/shared'
import { ticketsApi } from '../api/tickets'
import { useAuth } from '../contexts/AuthContext'
import { StatusBadge } from '../components/StatusBadge'

const STATUS_OPTIONS: TicketStatus[] = ['new', 'in_queue', 'in_progress', 'waiting_client', 'closed']

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function MessageBubble({ msg }: { msg: MessageDTO }) {
  const isOperator = msg.senderType === 'operator'
  const isAI       = msg.senderType === 'ai'

  return (
    <div className={`flex gap-2 ${isOperator ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
          isOperator ? 'bg-blue-100' : isAI ? 'bg-purple-100' : 'bg-gray-100'
        }`}
      >
        {isOperator ? '👤' : isAI ? '🤖' : '🧑'}
      </div>
      <div className={`max-w-[70%] ${isOperator ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <span className="text-xs text-gray-400">
          {msg.senderName ?? SenderTypeLabel[msg.senderType]} · {formatTime(msg.sentAt)}
        </span>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isOperator
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
          }`}
        >
          {msg.content}
        </div>
      </div>
    </div>
  )
}

export function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ticket, setTicket] = useState<TicketDetailDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ticketId) return
    setLoading(true)
    ticketsApi.get(ticketId)
      .then((t) => {
        setTicket(t)
        setNotes(t.internalNotes ?? '')
      })
      .catch(() => navigate('/tickets'))
      .finally(() => setLoading(false))
  }, [ticketId, navigate])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.messages])

  async function sendReply() {
    if (!reply.trim() || !ticketId || sending) return
    setSending(true)
    try {
      const { message } = await ticketsApi.reply(ticketId, { content: reply.trim() })
      setTicket((prev) => prev ? { ...prev, messages: [...prev.messages, message] } : prev)
      setReply('')
    } finally {
      setSending(false)
    }
  }

  async function changeStatus(status: TicketStatus) {
    if (!ticketId) return
    const { ticket: updated } = await ticketsApi.setStatus(ticketId, { status })
    setTicket((prev) => prev ? { ...prev, ...updated } : prev)
  }

  async function takeIntoWork() {
    if (!ticketId || !user) return
    const [{ ticket: t1 }, { ticket: t2 }] = await Promise.all([
      ticketsApi.assign(ticketId, { assignedUserId: user.userId }),
      ticketsApi.setStatus(ticketId, { status: TS.InProgress }),
    ])
    setTicket((prev) => prev ? { ...prev, ...t1, ...t2 } : prev)
  }

  async function saveNotes() {
    if (!ticketId) return
    setSavingNotes(true)
    try {
      const { ticket: updated } = await ticketsApi.updateNotes(ticketId, { internalNotes: notes })
      setTicket((prev) => prev ? { ...prev, ...updated } : prev)
    } finally {
      setSavingNotes(false)
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400">Загрузка...</div>
  if (!ticket) return null

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 shrink-0">
        <button
          className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          onClick={() => navigate('/tickets')}
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate">
            {ticket.clientName ?? 'Аноним'}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={ticket.status} />
            {ticket.assignedOperatorName && (
              <span className="text-xs text-gray-400">→ {ticket.assignedOperatorName}</span>
            )}
          </div>
        </div>

        {/* Take into work */}
        {ticket.status !== TS.InProgress && ticket.status !== TS.Closed && (
          <button
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            onClick={takeIntoWork}
          >
            Взять в работу
          </button>
        )}

        {/* Status selector */}
        <select
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={ticket.status}
          onChange={(e) => changeStatus(e.target.value as TicketStatus)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{TicketStatusLabel[s]}</option>
          ))}
        </select>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Messages */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-gray-50">
            {ticket.messages.map((msg) => (
              <MessageBubble key={msg.messageId} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Reply composer */}
          <div className="bg-white border-t border-gray-200 p-4 shrink-0">
            <div className="flex gap-3 items-end">
              <textarea
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Ответ клиенту..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply() }}
              />
              <button
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
                onClick={sendReply}
                disabled={sending || !reply.trim()}
              >
                {sending ? '...' : 'Отправить'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Ctrl+Enter для отправки</p>
          </div>
        </div>

        {/* Right panel */}
        <aside className="w-72 border-l border-gray-200 bg-white flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Информация</h3>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Приоритет</dt>
                <dd className="font-medium capitalize">{ticket.priority}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Канал</dt>
                <dd className="font-medium capitalize">{ticket.channel}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Создан</dt>
                <dd className="font-medium">{formatTime(ticket.createdAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="p-4 flex-1">
            <h3 className="text-sm font-bold text-gray-700 mb-2">Внутренние заметки</h3>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={6}
              placeholder="Видно только операторам..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button
              className="mt-2 text-sm text-blue-600 hover:underline disabled:opacity-50"
              onClick={saveNotes}
              disabled={savingNotes}
            >
              {savingNotes ? 'Сохранение...' : 'Сохранить заметку'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
