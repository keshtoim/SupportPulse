import { useEffect, useState } from 'preact/hooks'
import {
  DEMO_ADMIN_EMAIL,
  DEMO_PASSWORD,
  apiRequest,
  formatDateTime,
  senderLabel,
  statusLabel,
  type AdminScreen,
  type AuthResponse,
  type MessageRecord,
  type TicketRecord,
  type Topic,
  type WidgetConfig,
} from './api'

export function AdminExperience({
  active,
  screen,
  onScreenChange,
  onBackToWidget,
}: {
  active: boolean
  screen: AdminScreen
  onScreenChange: (screen: AdminScreen) => void
  onBackToWidget: () => void
}) {
  const [email, setEmail] = useState(DEMO_ADMIN_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [auth, setAuth] = useState<AuthResponse | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [tickets, setTickets] = useState<TicketRecord[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [ticketError, setTicketError] = useState<string | null>(null)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [ticketMessages, setTicketMessages] = useState<MessageRecord[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [replyDraft, setReplyDraft] = useState('')
  const [companyKnowledge, setCompanyKnowledge] = useState<Topic[]>([])
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig | null>(null)
  const [settingsState, setSettingsState] = useState({
    brandColor: '#1F7AE0',
    welcomeMessage: '',
    toneOfVoice: '',
    showPrivacyNotice: true,
    privacyNotice: '',
  })
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null)

  const adminTitle =
    screen === 'dashboard' ? 'Главная' : screen === 'chats' ? 'Очередь' : screen === 'settings' ? 'Настройки' : 'Профиль'
  const canManageCompany = auth?.user.role === 'company_admin'
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? null

  const authorizedRequest = async <ResponseType,>(path: string, init: RequestInit = {}) => {
    if (!auth) {
      throw new Error('Нужно войти в панель.')
    }

    const headers = new Headers(init.headers ?? {})
    headers.set('Authorization', `Bearer ${auth.tokens.accessToken}`)

    return apiRequest<ResponseType>(path, {
      ...init,
      headers,
    })
  }

  const loadTickets = async (silent = false) => {
    if (!auth) {
      return
    }

    try {
      if (!silent) setTicketsLoading(true)
      setTicketError(null)
      const result = await authorizedRequest<TicketRecord[]>('/operator/tickets')
      setTickets(result)

      if (!selectedTicketId && result.length > 0) {
        setSelectedTicketId(result[0].id)
      }

      if (selectedTicketId && !result.some((ticket) => ticket.id === selectedTicketId)) {
        setSelectedTicketId(result[0]?.id ?? null)
      }
    } catch (error) {
      if (!silent) setTicketError((error as Error).message)
    } finally {
      if (!silent) setTicketsLoading(false)
    }
  }

  const loadTicketMessages = async (ticketId: string, silent = false) => {
    try {
      if (!silent) setMessagesLoading(true)
      setTicketError(null)
      const result = await authorizedRequest<MessageRecord[]>(`/operator/tickets/${ticketId}/messages`)
      setTicketMessages(result)
    } catch (error) {
      if (!silent) setTicketError((error as Error).message)
    } finally {
      if (!silent) setMessagesLoading(false)
    }
  }

  const loadCompanyData = async () => {
    if (!canManageCompany) {
      setCompanyKnowledge([])
      setWidgetConfig(null)
      return
    }

    try {
      const [knowledgeBase, config] = await Promise.all([
        authorizedRequest<Topic[]>('/company/knowledge-base'),
        authorizedRequest<WidgetConfig>('/company/widget-config'),
      ])

      setCompanyKnowledge(knowledgeBase)
      setWidgetConfig(config)
      setSettingsState({
        brandColor: config.brandColor,
        welcomeMessage: config.welcomeMessage,
        toneOfVoice: config.toneOfVoice,
        showPrivacyNotice: config.showPrivacyNotice,
        privacyNotice: config.privacyNotice ?? '',
      })
    } catch (error) {
      setSettingsNotice((error as Error).message)
    }
  }

  useEffect(() => {
    if (!auth) {
      return
    }

    void loadTickets()
    void loadCompanyData()
  }, [auth])

  useEffect(() => {
    if (!auth || !selectedTicketId) {
      setTicketMessages([])
      return
    }

    void loadTicketMessages(selectedTicketId)
  }, [auth, selectedTicketId])

  // Polling: список тикетов обновляется каждые 5с на экране очереди
  useEffect(() => {
    if (!auth || screen !== 'chats') return
    const id = setInterval(() => void loadTickets(true), 5000)
    return () => clearInterval(id)
  }, [auth, screen, selectedTicketId])

  // Polling: переписка обновляется каждые 5с пока открыт тикет
  useEffect(() => {
    if (!auth || !selectedTicketId) return
    const id = setInterval(() => void loadTicketMessages(selectedTicketId, true), 5000)
    return () => clearInterval(id)
  }, [auth, selectedTicketId])

  const handleLogin = async (event: Event) => {
    event.preventDefault()

    try {
      setAuthLoading(true)
      setAuthError(null)
      const response = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
        }),
      })

      setAuth(response)
      setSettingsNotice(null)
    } catch (error) {
      setAuthError((error as Error).message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleClaimTicket = async () => {
    if (!selectedTicket) {
      return
    }

    try {
      await authorizedRequest<TicketRecord>(`/operator/tickets/${selectedTicket.id}/claim`, {
        method: 'POST',
      })
      await loadTickets()
      await loadTicketMessages(selectedTicket.id)
    } catch (error) {
      setTicketError((error as Error).message)
    }
  }

  const handleChangeTicketStatus = async (status: TicketRecord['status']) => {
    if (!selectedTicket) {
      return
    }

    try {
      await authorizedRequest<TicketRecord>(`/operator/tickets/${selectedTicket.id}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          closedReason: status === 'closed' ? 'resolved_from_admin_panel' : undefined,
        }),
      })
      await loadTickets()
      await loadTicketMessages(selectedTicket.id)
    } catch (error) {
      setTicketError((error as Error).message)
    }
  }

  const handleSendReply = async (event: Event) => {
    event.preventDefault()

    if (!selectedTicket || !replyDraft.trim()) {
      return
    }

    try {
      setTicketError(null)
      await authorizedRequest(`/operator/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: replyDraft.trim(),
        }),
      })
      setReplyDraft('')
      await loadTickets()
      await loadTicketMessages(selectedTicket.id)
    } catch (error) {
      setTicketError((error as Error).message)
    }
  }

  const handleSaveSettings = async (event: Event) => {
    event.preventDefault()

    if (!canManageCompany) {
      setSettingsNotice('Для изменения настроек нужен вход под администратором компании.')
      return
    }

    try {
      setSettingsNotice(null)
      const payload = await authorizedRequest<WidgetConfig>('/company/widget-config', {
        method: 'PUT',
        body: JSON.stringify({
          brandColor: settingsState.brandColor,
          welcomeMessage: settingsState.welcomeMessage,
          toneOfVoice: settingsState.toneOfVoice,
          showPrivacyNotice: settingsState.showPrivacyNotice,
          privacyNotice: settingsState.privacyNotice || null,
        }),
      })

      setWidgetConfig(payload)
      setSettingsNotice('Настройки виджета сохранены.')
    } catch (error) {
      setSettingsNotice((error as Error).message)
    }
  }

  const knowledgeArticlesCount = companyKnowledge.reduce((total, topic) => total + topic.articles.length, 0)

  return (
    <section class={`admin-shell ${!active ? 'is-hidden' : ''}`}>
      <aside class="admin-sidebar">
        <div class="panel-header">
          <img class="app-icon xs" src="/app-icon.png" alt="SupportPulse" />
          <button class="back-button" type="button" onClick={() => onBackToWidget()}>
            ‹
          </button>
          <strong>{adminTitle}</strong>
        </div>

        <section class="dashboard-menu">
          <div class="dashboard-brand">
            <img class="app-icon md" src="/app-icon.png" alt="SupportPulse" />
            <div>
              <strong>{auth?.user.name ?? 'Панель'}</strong>
              <p>{auth ? auth.user.role : 'Нужен вход'}</p>
            </div>
          </div>

          <div class="dashboard-grid">
            {[
              {
                title: 'Главная',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" /><path d="M3 12v9h18v-9" />
                  </svg>
                ),
                screen: 'dashboard' as const,
              },
              {
                title: 'Очередь',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                ),
                screen: 'chats' as const,
              },
              {
                title: 'Настройки',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                ),
                screen: 'settings' as const,
              },
              {
                title: 'Профиль',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                ),
                screen: 'profile' as const,
              },
            ].map((item) => (
              <button class="dashboard-tile" type="button" key={item.title} onClick={() => onScreenChange(item.screen)}>
                <div class="tile-icon">{item.icon}</div>
                <span>{item.title}</span>
              </button>
            ))}
          </div>

          <button class="dashboard-wide-tile" type="button" onClick={() => onScreenChange('chats')}>
            <div class="tile-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16l4-4h10a2 2 0 0 0 2-2V8z" /><line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="13" x2="13" y2="13" />
              </svg>
            </div>
            <span>Открыть активные тикеты</span>
          </button>
        </section>

        <div class="side-bottom-nav">
          {[
            {
              target: 'dashboard' as const,
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" /><path d="M3 12v9h18v-9" />
                </svg>
              ),
            },
            {
              target: 'chats' as const,
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              ),
            },
            {
              target: 'settings' as const,
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              ),
            },
            {
              target: 'profile' as const,
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              ),
            },
          ].map((item) => (
            <button
              class={`mini-nav-button ${screen === item.target ? 'active' : ''}`}
              type="button"
              key={item.target}
              onClick={() => onScreenChange(item.target)}
            >
              {item.icon}
            </button>
          ))}
        </div>
      </aside>

      <section class="admin-content">
        {!auth ? (
          <div class="admin-page auth-page">
            <h2>Вход в панель</h2>
            <form class="card auth-card" onSubmit={handleLogin}>
              <label class="form-label" for="auth-email">
                Email
              </label>
              <input
                id="auth-email"
                class="text-input"
                type="email"
                value={email}
                onInput={(event) => setEmail((event.currentTarget as HTMLInputElement).value)}
              />
              <label class="form-label" for="auth-password">
                Пароль
              </label>
              <input
                id="auth-password"
                class="text-input"
                type="password"
                value={password}
                onInput={(event) => setPassword((event.currentTarget as HTMLInputElement).value)}
              />
              {authError && <div class="alert-banner error compact">{authError}</div>}
              <button class="primary-button compact" type="submit" disabled={authLoading}>
                {authLoading ? 'Вхожу...' : 'Войти'}
              </button>
              <p class="form-hint">По умолчанию подставлен администратор компании `admin@acme.dev`.</p>
            </form>
          </div>
        ) : (
          <>
            {screen === 'dashboard' && (
              <div class="admin-page">
                <header class="knowledge-header">
                  <h2>Сводка проекта</h2>
                  <div class="profile-circle">{tickets.length}</div>
                </header>

                <section class="stats-grid">
                  <article class="card stat-card">
                    <strong>Роль</strong>
                    <span>{auth.user.role}</span>
                  </article>
                  <article class="card stat-card">
                    <strong>Тикеты</strong>
                    <span>{tickets.length}</span>
                  </article>
                  <article class="card stat-card">
                    <strong>База знаний</strong>
                    <span>{knowledgeArticlesCount}</span>
                  </article>
                  <article class="card stat-card">
                    <strong>Тенант</strong>
                    <span>{auth.user.tenantId ?? 'platform'}</span>
                  </article>
                </section>

                <article class="knowledge-card">
                  <img class="app-icon md" src="/app-icon.png" alt="SupportPulse" />
                  <div>
                    <h3>Интеграция front + back</h3>
                    <p>
                      Виджет уже работает с backend API, а панель умеет логиниться, видеть тикеты и
                      продолжать диалог с клиентом.
                    </p>
                    <button class="primary-button compact" type="button" onClick={() => onScreenChange('chats')}>
                      Перейти к тикетам
                    </button>
                  </div>
                </article>

                {companyKnowledge.length > 0 && (
                  <section class="compact-list">
                    <h3 class="screen-section-title">Темы базы знаний</h3>
                    {companyKnowledge.map((topic) => (
                      <article class="card compact-card" key={topic.id}>
                        <strong>{topic.title}</strong>
                        <p>{topic.articles.length} FAQ-материалов</p>
                      </article>
                    ))}
                  </section>
                )}
              </div>
            )}

            {screen === 'chats' && (
              <div class="admin-page chats-page">
                <header class="chat-controls">
                  <button class="chip" type="button" onClick={() => void loadTickets()}>
                    {ticketsLoading ? 'Обновляю...' : 'Обновить'}
                  </button>
                  <button class="chip" type="button" onClick={() => handleChangeTicketStatus('waiting_client')}>
                    Ждёт клиента
                  </button>
                  <button class="chip circle" type="button" aria-label="Закрыть" onClick={() => handleChangeTicketStatus('closed')}>
                    ✓
                  </button>
                </header>

                {ticketError && <div class="alert-banner error compact">{ticketError}</div>}

                <div class="ticket-layout">
                  <aside class="ticket-list">
                    {tickets.map((ticket) => (
                      <button
                        class={`ticket-list-item ${selectedTicketId === ticket.id ? 'active' : ''}`}
                        type="button"
                        key={ticket.id}
                        onClick={() => setSelectedTicketId(ticket.id)}
                      >
                        <strong>{statusLabel[ticket.status]}</strong>
                        <span>Сессия: {ticket.sessionId.slice(0, 12)}...</span>
                        <span>Причина: {ticket.reason}</span>
                      </button>
                    ))}
                    {tickets.length === 0 && <div class="empty-state">Активных тикетов пока нет.</div>}
                  </aside>

                  <section class="ticket-thread">
                    {selectedTicket ? (
                      <>
                        <div class="thread-header">
                          <div>
                            <h3>Тикет {selectedTicket.id.slice(0, 8)}</h3>
                            <p>{statusLabel[selectedTicket.status]}</p>
                          </div>
                          <div class="thread-actions">
                            <button class="secondary-button compact-button" type="button" onClick={handleClaimTicket}>
                              Взять в работу
                            </button>
                            <button
                              class="secondary-button compact-button"
                              type="button"
                              onClick={() => handleChangeTicketStatus('in_progress')}
                            >
                              В работе
                            </button>
                          </div>
                        </div>

                        <div class="thread-log">
                          {messagesLoading ? (
                            <div class="empty-state">Загружаю переписку...</div>
                          ) : ticketMessages.length > 0 ? (
                            ticketMessages.map((message) => (
                              <article class={`chat-bubble ${message.senderType}`} key={message.id}>
                                <div class="message-caption">
                                  <strong>{senderLabel[message.senderType]}</strong>
                                  <span>{formatDateTime(message.createdAt)}</span>
                                </div>
                                <p>{message.content}</p>
                              </article>
                            ))
                          ) : (
                            <div class="empty-state">В этом тикете пока нет сообщений.</div>
                          )}
                        </div>

                        <form class="thread-composer" onSubmit={handleSendReply}>
                          <textarea
                            class="text-area"
                            placeholder="Ответ клиенту..."
                            value={replyDraft}
                            onInput={(event) => setReplyDraft((event.currentTarget as HTMLTextAreaElement).value)}
                          />
                          <button class="primary-button compact" type="submit">
                            Отправить ответ
                          </button>
                        </form>
                      </>
                    ) : (
                      <div class="empty-state">Выберите тикет из списка слева.</div>
                    )}
                  </section>
                </div>
              </div>
            )}

            {screen === 'settings' && (
              <div class="admin-page">
                <h2>Настройки виджета</h2>
                {!canManageCompany && (
                  <div class="alert-banner">
                    Для редактирования настроек нужен вход под администратором компании.
                  </div>
                )}
                {settingsNotice && <div class={`alert-banner ${settingsNotice.includes('сохранены') ? 'success' : 'error'}`}>{settingsNotice}</div>}
                <form class="settings-form" onSubmit={handleSaveSettings}>
                  <label class="form-label" for="brand-color">
                    Цвет бренда
                  </label>
                  <input
                    id="brand-color"
                    class="text-input"
                    type="text"
                    value={settingsState.brandColor}
                    disabled={!canManageCompany}
                    onInput={(event) =>
                      setSettingsState((current) => ({
                        ...current,
                        brandColor: (event.currentTarget as HTMLInputElement).value,
                      }))
                    }
                  />
                  <label class="form-label" for="welcome-message">
                    Приветственное сообщение
                  </label>
                  <textarea
                    id="welcome-message"
                    class="text-area"
                    value={settingsState.welcomeMessage}
                    disabled={!canManageCompany}
                    onInput={(event) =>
                      setSettingsState((current) => ({
                        ...current,
                        welcomeMessage: (event.currentTarget as HTMLTextAreaElement).value,
                      }))
                    }
                  />
                  <label class="form-label" for="tone-of-voice">
                    Тон общения AI
                  </label>
                  <input
                    id="tone-of-voice"
                    class="text-input"
                    type="text"
                    value={settingsState.toneOfVoice}
                    disabled={!canManageCompany}
                    onInput={(event) =>
                      setSettingsState((current) => ({
                        ...current,
                        toneOfVoice: (event.currentTarget as HTMLInputElement).value,
                      }))
                    }
                  />
                  <label class="form-label" for="privacy-notice">
                    Текст согласия
                  </label>
                  <textarea
                    id="privacy-notice"
                    class="text-area"
                    value={settingsState.privacyNotice}
                    disabled={!canManageCompany}
                    onInput={(event) =>
                      setSettingsState((current) => ({
                        ...current,
                        privacyNotice: (event.currentTarget as HTMLTextAreaElement).value,
                      }))
                    }
                  />
                  <div class="toggle-row">
                    <button
                      class={`toggle-pill ${settingsState.showPrivacyNotice ? 'active' : ''}`}
                      type="button"
                      disabled={!canManageCompany}
                      onClick={() =>
                        setSettingsState((current) => ({
                          ...current,
                          showPrivacyNotice: true,
                        }))
                      }
                    >
                      Согласие включено
                    </button>
                    <button
                      class={`toggle-pill ${!settingsState.showPrivacyNotice ? 'active' : ''}`}
                      type="button"
                      disabled={!canManageCompany}
                      onClick={() =>
                        setSettingsState((current) => ({
                          ...current,
                          showPrivacyNotice: false,
                        }))
                      }
                    >
                      Согласие выключено
                    </button>
                  </div>
                  <button class="primary-button compact" type="submit" disabled={!canManageCompany}>
                    Сохранить настройки
                  </button>
                </form>

                {widgetConfig && (
                  <article class="card compact-card">
                    <strong>Текущая конфигурация</strong>
                    <p>Цвет: {widgetConfig.brandColor}</p>
                    <p>Тон: {widgetConfig.toneOfVoice}</p>
                  </article>
                )}
              </div>
            )}

            {screen === 'profile' && (
              <div class="profile-layout">
                <div class="profile-main">
                  <h2>Профиль пользователя</h2>
                  <div class="profile-details">
                    <p>
                      <strong>Имя:</strong> {auth.user.name}
                    </p>
                    <p>
                      <strong>Email:</strong> {auth.user.email}
                    </p>
                    <p>
                      <strong>Роль:</strong> {auth.user.role}
                    </p>
                    <p>
                      <strong>Тенант:</strong> {auth.user.tenantId ?? 'platform'}
                    </p>
                  </div>
                </div>
                <div class="profile-side">
                  <h3>Сессия</h3>
                  <div class="avatar-big">
                    <img class="app-icon md" src="/app-icon.png" alt="Аватар" />
                  </div>
                  <button
                    class="primary-button compact"
                    type="button"
                    onClick={() => {
                      setAuth(null)
                      setTickets([])
                      setSelectedTicketId(null)
                      setTicketMessages([])
                      setCompanyKnowledge([])
                      setWidgetConfig(null)
                    }}
                  >
                    Выйти
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </section>
  )
}
