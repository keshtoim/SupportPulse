import { useEffect, useMemo, useState } from 'preact/hooks'
import {
  apiRequest,
  formatDateTime,
  statusLabel,
  type AdminScreen,
  type MessageRecord,
  type PostMessageResponse,
  type SessionMessagesResponse,
  type SessionRecord,
  type TicketRecord,
  type WidgetPayload,
  type WidgetScreen,
} from './api'

const buildAssistantFallback = (content: string): MessageRecord => ({
  id: 'welcome-message',
  sessionId: 'welcome-session',
  ticketId: null,
  senderType: 'ai',
  content,
  createdAt: new Date().toISOString(),
})

export function WidgetExperience({
  active,
  tenantId,
  screen,
  onScreenChange,
  onOpenAdmin,
}: {
  active: boolean
  tenantId: string
  screen: WidgetScreen
  onScreenChange: (screen: WidgetScreen) => void
  onOpenAdmin: (screen: AdminScreen) => void
}) {
  const [widgetData, setWidgetData] = useState<WidgetPayload | null>(null)
  const [widgetError, setWidgetError] = useState<string | null>(null)
  const [loadingWidget, setLoadingWidget] = useState(true)
  const customerName = ''
  const customerEmail = ''
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [, setSession] = useState<SessionRecord | null>(null)
  const [ticket, setTicket] = useState<TicketRecord | null>(null)
  const [messages, setMessages] = useState<MessageRecord[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [typing, setTyping] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadWidget = async () => {
      try {
        setLoadingWidget(true)
        setWidgetError(null)
        const payload = await apiRequest<WidgetPayload>(`/public/tenants/${tenantId}/widget`)

        if (!cancelled) {
          setWidgetData(payload)
        }
      } catch (error) {
        if (!cancelled) {
          setWidgetError((error as Error).message)
        }
      } finally {
        if (!cancelled) {
          setLoadingWidget(false)
        }
      }
    }

    void loadWidget()

    return () => {
      cancelled = true
    }
  }, [])

  const refreshSession = async (nextSessionId: string) => {
    const payload = await apiRequest<SessionMessagesResponse>(
      `/public/tenants/${tenantId}/dialogue-sessions/${nextSessionId}/messages`,
    )

    setSession(payload.session)
    setTicket(payload.ticket)
    setMessages(prev => {
      const prevIds = new Set(prev.map(m => m.id))
      const hasNewReply = payload.messages.some(m => !prevIds.has(m.id) && m.senderType !== 'client')
      if (hasNewReply) {
        setTyping(false)
      }
      return payload.messages
    })
  }

  // Polling: клиент видит ответы оператора без F5
  useEffect(() => {
    if (!sessionId || screen !== 'chat') return
    const id = setInterval(() => void refreshSession(sessionId).catch(() => {}), 5000)
    return () => clearInterval(id)
  }, [sessionId, screen])

  const ensureSession = async (): Promise<string> => {
    if (sessionId) {
      return sessionId
    }

    const created = await apiRequest<SessionRecord>(`/public/tenants/${tenantId}/dialogue-sessions`, {
      method: 'POST',
      body: JSON.stringify({
        customerName: customerName.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
      }),
    })

    setSessionId(created.id)
    setSession(created)
    return created.id
  }

  const handleSendMessage = async (event: Event) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content) return

    // Оптимистичное обновление: очищаем поле и сразу показываем сообщение клиента
    const tempId = `temp-${Date.now()}`
    setDraft('')
    setMessages(prev => [...prev, {
      id: tempId,
      sessionId: sessionId ?? 'pending',
      ticketId: null,
      senderType: 'client',
      content,
      createdAt: new Date().toISOString(),
    }])
    setTyping(true)
    setSending(true)
    setChatError(null)

    try {
      const nextSessionId = await ensureSession()
      const payload = await apiRequest<PostMessageResponse>(
        `/public/tenants/${tenantId}/dialogue-sessions/${nextSessionId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ content }),
        },
      )

      // Убираем временное сообщение и добавляем реальные
      setMessages(prev => prev.filter(m => m.id !== tempId))
      applyPayload(payload)
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setChatError((error as Error).message)
    } finally {
      setTyping(false)
      setSending(false)
    }
  }

  const handleEscalate = async () => {
    try {
      setSending(true)
      setChatError(null)
      const nextSessionId = await ensureSession()
      const payload = await apiRequest<PostMessageResponse>(
        `/public/tenants/${tenantId}/dialogue-sessions/${nextSessionId}/escalate`,
        {
          method: 'POST',
          body: JSON.stringify({
            reason: 'Клиент запросил оператора через виджет',
            customerName: customerName.trim() || undefined,
            customerEmail: customerEmail.trim() || undefined,
          }),
        },
      )

      applyPayload(payload)
      onScreenChange('chat')
    } catch (error) {
      setChatError((error as Error).message)
    } finally {
      setSending(false)
    }
  }

  const applyPayload = (payload: PostMessageResponse) => {
    setSessionId(payload.session.id)
    setSession(payload.session)
    if (payload.ticket !== undefined) setTicket(payload.ticket ?? null)
    const incoming = [payload.clientMessage, payload.reply].filter(Boolean) as import('./api').MessageRecord[]
    if (incoming.length > 0) {
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        return [...prev, ...incoming.filter(m => !existingIds.has(m.id))]
      })
    }
  }

  const visibleMessages = useMemo(() => {
    if (messages.length > 0) {
      return messages
    }

    if (widgetData) {
      return [buildAssistantFallback(widgetData.widgetConfig.welcomeMessage)]
    }

    return []
  }, [messages, widgetData])

  return (
    <section class={`widget-shell ${!active ? 'is-hidden' : ''}`}>

      {/* Compact header — только на экране чата */}
      {screen === 'chat' && (
        <header class="widget-header">
          <button
            class="icon-button"
            type="button"
            aria-label="Назад"
            onClick={() => onScreenChange('home')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div class="chat-brand">
            <div class="chat-brand-icon">
              <img class="app-icon xs" src="/app-icon.png" alt="SupportPulse" />
            </div>
            <div class="brand-copy">
              <strong>Помощник</strong>
              <span>ИИ-ассистент</span>
            </div>
          </div>
          <button class="icon-button" type="button" aria-label="Открыть панель" onClick={() => onOpenAdmin('dashboard')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" width="18" height="18">
              <path d="M5 12h14M5 6h14M5 18h14" />
            </svg>
          </button>
        </header>
      )}

      {loadingWidget ? (
        <section class="screen-body">
          <article class="card loading-card">
            <p>Загружаю виджет и базу знаний...</p>
          </article>
        </section>
      ) : (
        <>
          {widgetError && <div class="alert-banner error">{widgetError}</div>}

          {screen === 'home' ? (
            <>
              {/* Большой градиентный hero */}
              <div class="widget-hero">
                <h1>Свяжитесь с нами!</h1>
              </div>

              <section class="screen-body">
                {/* Intro-карточка: иконка + текст + кнопка */}
                <article class="card intro-card">
                  <div class="intro-card-row">
                    <div class="intro-avatar">
                      <img class="app-icon sm" src="/app-icon.png" alt="SupportPulse" />
                    </div>
                    <p class="intro-text">
                      {widgetData?.widgetConfig.welcomeMessage ?? 'Опишите проблему, и я постараюсь помочь.'}
                    </p>
                  </div>
                  <button class="primary-button" type="button" onClick={() => onScreenChange('chat')}>
                    Задать вопрос
                  </button>
                </article>

                {/* Темы как flat-аккордеон */}
                <div class="topic-accordion">
                  {widgetData?.topics.map((topic) => (
                    <button
                      class="accordion-item"
                      type="button"
                      key={topic.id}
                      onClick={() => {
                        onScreenChange('chat')
                      }}
                    >
                      <span>{topic.title}</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  ))}
                </div>

              </section>

              {/* Таб-бар — только на главном экране */}
              <footer class="widget-footer">
                <button
                  class={`tab-button ${screen === 'home' ? 'active' : ''}`}
                  type="button"
                  onClick={() => onScreenChange('home')}
                >
                  <span class="tab-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" /><path d="M3 12v9h18v-9" />
                    </svg>
                  </span>
                  Дом
                </button>
                <button
                  class="tab-button"
                  type="button"
                  onClick={() => onScreenChange('chat')}
                >
                  <span class="tab-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </span>
                  Чат
                </button>
              </footer>
            </>
          ) : (
            /* Экран чата */
            <>
              <section class="screen-body chat-screen">
                <div class="chat-status-bar">
                  <div class="status-left">
                    <span class={`status-pill ${ticket ? 'operator' : widgetData?.aiEnabled ? 'ai' : 'ai-fallback'}`}>
                      {ticket ? statusLabel[ticket.status] : widgetData?.aiEnabled ? 'AI отвечает' : 'FAQ-режим'}
                    </span>
                    {!ticket && (
                      <span
                        class="ai-status-hint"
                        data-tooltip={widgetData?.aiEnabled
                          ? 'AI подключён — ответы точнее и адаптированы под ваш вопрос'
                          : 'AI не подключён — ответы берутся напрямую из базы знаний'}
                      >
                        <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                          <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.4" />
                          <path d="M8 7v4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                          <circle cx="8" cy="5.25" r="0.8" fill="currentColor" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <button class="secondary-link" type="button" disabled={sending} onClick={handleEscalate}>
                    Позвать оператора
                  </button>
                </div>

                {chatError && <div class="alert-banner error compact">{chatError}</div>}

                <div class="chat-log">
                  {visibleMessages.map((message) => (
                    <div class={`chat-row ${message.senderType === 'client' ? 'chat-row-right' : 'chat-row-left'}`} key={message.id}>
                      {message.senderType !== 'client' && (
                        <div class="chat-avatar">
                          {message.senderType === 'ai' ? (
                            <img class="app-icon xs" src="/app-icon.png" alt="AI" />
                          ) : (
                            <div class="chat-avatar-placeholder">
                              {message.senderType === 'operator' ? 'О' : 'S'}
                            </div>
                          )}
                        </div>
                      )}
                      <article class={`chat-bubble ${message.senderType}`}>
                        <p>{message.content}</p>
                        {message.senderType !== 'system' && (
                          <time class="bubble-time">{formatDateTime(message.createdAt)}</time>
                        )}
                      </article>
                    </div>
                  ))}

                  {/* Индикатор "печатает..." пока ждём ответа */}
                  {typing && (
                    <div class="chat-row chat-row-left">
                      <div class="chat-avatar">
                        <img class="app-icon xs" src="/app-icon.png" alt="AI" />
                      </div>
                      <article class="chat-bubble ai typing-bubble">
                        <span class="typing-dot" />
                        <span class="typing-dot" />
                        <span class="typing-dot" />
                      </article>
                    </div>
                  )}
                </div>
              </section>

              <form class="composer" onSubmit={handleSendMessage}>
                <button class="composer-plus" type="button" aria-label="FAQ" onClick={() => onScreenChange('home')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="18" height="18">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
                <input
                  type="text"
                  placeholder="Сообщение..."
                  value={draft}
                  onInput={(event) => setDraft((event.currentTarget as HTMLInputElement).value)}
                />
                <button class="composer-send" type="submit" aria-label="Отправить" disabled={sending}>
                  {sending ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="16" height="16">
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="16" height="16">
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                  )}
                </button>
              </form>
            </>
          )}
        </>
      )}
    </section>
  )
}
