import { useEffect, useMemo, useState } from 'preact/hooks'
import {
  apiRequest,
  formatDateTime,
  senderLabel,
  statusLabel,
  type AdminScreen,
  type FaqArticle,
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
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FaqArticle[]>([])
  const [searching, setSearching] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [session, setSession] = useState<SessionRecord | null>(null)
  const [ticket, setTicket] = useState<TicketRecord | null>(null)
  const [messages, setMessages] = useState<MessageRecord[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
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
    setMessages(payload.messages)
  }

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

  const handleFaqSearch = async (event: Event) => {
    event.preventDefault()

    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }

    try {
      setSearching(true)
      setWidgetError(null)
      const result = await apiRequest<FaqArticle[]>(
        `/public/tenants/${tenantId}/faq/search?q=${encodeURIComponent(searchQuery.trim())}`,
      )
      setSearchResults(result)
    } catch (error) {
      setWidgetError((error as Error).message)
    } finally {
      setSearching(false)
    }
  }

  const handleSendMessage = async (event: Event) => {
    event.preventDefault()

    if (!draft.trim()) {
      return
    }

    try {
      setSending(true)
      setChatError(null)
      const nextSessionId = await ensureSession()
      const payload = await apiRequest<PostMessageResponse>(
        `/public/tenants/${tenantId}/dialogue-sessions/${nextSessionId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            content: draft.trim(),
          }),
        },
      )

      setDraft('')
      setSessionId(payload.session.id)
      await refreshSession(payload.session.id)
    } catch (error) {
      setChatError((error as Error).message)
    } finally {
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

      setSessionId(payload.session.id)
      await refreshSession(payload.session.id)
      onScreenChange('chat')
    } catch (error) {
      setChatError((error as Error).message)
    } finally {
      setSending(false)
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
      <header class="widget-header">
        <button
          class="icon-button"
          type="button"
          aria-label="Назад"
          onClick={() => {
            if (screen === 'chat') onScreenChange('home')
          }}
        >
          ←
        </button>
        <div class="brand-chip">
          <img class="app-icon sm" src="/app-icon.png" alt="SupportPulse" />
          <div class="brand-copy">
            <strong>{widgetData?.tenant.name ?? 'SupportPulse'}</strong>
            <span>AI-помощник поддержки</span>
          </div>
        </div>
        <button class="icon-button" type="button" aria-label="Открыть панель" onClick={() => onOpenAdmin('dashboard')}>
          ≡
        </button>
      </header>

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
            <section class="screen-body">
              <div class="hero-banner">
                <div>
                  <span class="hero-eyebrow">SupportPulse</span>
                  <h1>{widgetData?.tenant.name ?? 'Поддержка'}</h1>
                  <p>FAQ, AI-ответы и эскалация на оператора в одном окне.</p>
                </div>
              </div>

              <article class="card intro-card widget-intro-card">
                <img class="app-icon intro-icon" src="/app-icon.png" alt="SupportPulse" />
                <div class="helper-copy">
                  <p>{widgetData?.widgetConfig.welcomeMessage ?? 'Опишите проблему, и я постараюсь помочь.'}</p>
                  <div class="inline-form">
                    <input
                      class="text-input small"
                      type="text"
                      placeholder="Ваше имя"
                      value={customerName}
                      onInput={(event) => setCustomerName((event.currentTarget as HTMLInputElement).value)}
                    />
                    <input
                      class="text-input small"
                      type="email"
                      placeholder="Email для связи"
                      value={customerEmail}
                      onInput={(event) => setCustomerEmail((event.currentTarget as HTMLInputElement).value)}
                    />
                  </div>
                </div>
                <button class="primary-button" type="button" onClick={() => onScreenChange('chat')}>
                  Открыть чат
                </button>
              </article>

              {widgetData?.widgetConfig.showPrivacyNotice && widgetData.widgetConfig.privacyNotice && (
                <article class="card compact-card">
                  <strong>Политика обработки данных</strong>
                  <p>{widgetData.widgetConfig.privacyNotice}</p>
                </article>
              )}

              <form class="faq-search" onSubmit={handleFaqSearch}>
                <input
                  class="text-input"
                  type="text"
                  placeholder="Поиск по FAQ"
                  value={searchQuery}
                  onInput={(event) => setSearchQuery((event.currentTarget as HTMLInputElement).value)}
                />
                <button class="secondary-button" type="submit" disabled={searching}>
                  {searching ? 'Ищу...' : 'Найти'}
                </button>
              </form>

              {searchResults.length > 0 && (
                <section class="search-list">
                  {searchResults.map((article) => (
                    <button
                      class="faq-item"
                      type="button"
                      key={article.id}
                      onClick={() => {
                        setDraft(article.question)
                        onScreenChange('chat')
                      }}
                    >
                      <strong>{article.question}</strong>
                      <span>{article.answer}</span>
                    </button>
                  ))}
                </section>
              )}

              <section class="topic-stack">
                {widgetData?.topics.map((topic) => (
                  <article class="card topic-card" key={topic.id}>
                    <div class="topic-header">
                      <div>
                        <h2>{topic.title}</h2>
                        <span>{topic.articles.length} материалов в базе знаний</span>
                      </div>
                    </div>
                    <div class="faq-list">
                      {topic.articles.slice(0, 3).map((article) => (
                        <button
                          class="faq-item"
                          type="button"
                          key={article.id}
                          onClick={() => {
                            setDraft(article.question)
                            onScreenChange('chat')
                          }}
                        >
                          <strong>{article.question}</strong>
                          <span>{article.answer}</span>
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </section>
            </section>
          ) : (
            <section class="screen-body chat-screen">
              <div class="chat-status-bar">
                <span class={`status-pill ${ticket ? 'operator' : 'ai'}`}>
                  {ticket ? statusLabel[ticket.status] : 'AI отвечает'}
                </span>
                <button class="secondary-link" type="button" disabled={sending} onClick={handleEscalate}>
                  Позвать оператора
                </button>
              </div>

              {session && (
                <div class="helper-hint">
                  Сессия: {session.id.slice(0, 8)} {ticket ? `· ${statusLabel[ticket.status]}` : '· без эскалации'}
                </div>
              )}

              {chatError && <div class="alert-banner error compact">{chatError}</div>}

              <div class="chat-log">
                {visibleMessages.map((message) => (
                  <article class={`chat-bubble ${message.senderType}`} key={message.id}>
                    <div class="message-caption">
                      <strong>{senderLabel[message.senderType]}</strong>
                      <span>{formatDateTime(message.createdAt)}</span>
                    </div>
                    <p>{message.content}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          <footer class="widget-footer">
            <button
              class={`tab-button ${screen === 'home' ? 'active' : ''}`}
              type="button"
              onClick={() => onScreenChange('home')}
            >
              <span class="tab-icon">⌂</span>
              Дом
            </button>
            <button
              class={`tab-button ${screen === 'chat' ? 'active' : ''}`}
              type="button"
              onClick={() => onScreenChange('chat')}
            >
              <span class="tab-icon">💬</span>
              Чат
            </button>
          </footer>

          {screen === 'chat' && (
            <form class="composer" onSubmit={handleSendMessage}>
              <button class="composer-icon" type="button" aria-label="FAQ" onClick={() => onScreenChange('home')}>
                ?
              </button>
              <input
                type="text"
                placeholder="Сообщение..."
                value={draft}
                onInput={(event) => setDraft((event.currentTarget as HTMLInputElement).value)}
              />
              <button class="composer-send" type="submit" aria-label="Отправить" disabled={sending}>
                {sending ? '…' : '↑'}
              </button>
            </form>
          )}
        </>
      )}
    </section>
  )
}
