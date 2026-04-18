import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import type { TicketSummaryDTO, TicketStatusFilter } from '@supportpulse/shared'
import { TicketStatusLabel } from '@supportpulse/shared'
import { ticketsApi } from '../api/tickets'
import { StatusBadge } from '../components/StatusBadge'

const FILTERS: { value: TicketStatusFilter; label: string }[] = [
  { value: 'all',            label: 'Все' },
  { value: 'new',            label: TicketStatusLabel.new },
  { value: 'in_queue',       label: TicketStatusLabel.in_queue },
  { value: 'in_progress',    label: TicketStatusLabel.in_progress },
  { value: 'waiting_client', label: TicketStatusLabel.waiting_client },
  { value: 'closed',         label: TicketStatusLabel.closed },
]

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)   return `${diff}с назад`
  if (diff < 3600) return `${Math.floor(diff / 60)}м назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`
  return `${Math.floor(diff / 86400)}д назад`
}

export function TicketsPage() {
  const [filter, setFilter] = useState<TicketStatusFilter>('all')
  const [tickets, setTickets] = useState<TicketSummaryDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await ticketsApi.list(filter === 'all' ? {} : { status: filter })
      setTickets(res.data)
    } catch {
      setError('Не удалось загрузить тикеты')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { void load() }, [load])

  // Poll every 15 seconds (Supabase Realtime can replace this later)
  useEffect(() => {
    const id = setInterval(() => { void load() }, 15_000)
    return () => clearInterval(id)
  }, [load])

  return (
    <div className="flex-1 p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Тикеты</h1>
        <button
          className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
          onClick={load}
        >
          ↻ Обновить
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
            }`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && (
        <div className="text-center py-16 text-gray-400">Загрузка...</div>
      )}
      {error && (
        <div className="text-center py-10 text-red-500">{error}</div>
      )}
      {!loading && !error && tickets.length === 0 && (
        <div className="text-center py-16 text-gray-400">Тикетов нет</div>
      )}

      {!loading && tickets.length > 0 && (
        <div className="flex flex-col gap-2">
          {tickets.map((t) => (
            <Link
              key={t.ticketId}
              to={`/tickets/${t.ticketId}`}
              className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center gap-4 hover:border-blue-200 hover:shadow-sm transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={t.status} />
                  {t.unreadCount > 0 && (
                    <span className="bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {t.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {t.clientName ?? 'Аноним'}
                </p>
                {t.lastMessagePreview && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{t.lastMessagePreview}</p>
                )}
              </div>

              <div className="text-right shrink-0">
                {t.assignedOperatorName && (
                  <p className="text-xs text-gray-500 mb-1">{t.assignedOperatorName}</p>
                )}
                <p className="text-xs text-gray-400">{timeAgo(t.updatedAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
