import { useState, useEffect, useRef } from 'preact/hooks'
import { api } from './services/api'
import type { WidgetConfigDTO, TopicWithFAQDTO, FAQItemDTO, AIStreamChunk } from './services/api'
import './app.css'

// document.currentScript is null for ES modules (deferred) — use querySelector instead
const TENANT_ID =
  (import.meta.env.VITE_TENANT_ID as string | undefined) ??
  document.querySelector<HTMLScriptElement>('script[data-tenant-id]')?.dataset?.tenantId ??
  'demo'

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconPerson() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function IconChats() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2v4l-4-4H9a2 2 0 0 1-2-2v-1"/>
      <path d="M15 6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2v3l3-3h3a2 2 0 0 0 2-2V6z"/>
    </svg>
  )
}

function IconGear() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function IconDocument() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

function IconKnowledge() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="3" y1="15" x2="21" y2="15"/>
      <line x1="9" y1="9" x2="9" y2="21"/>
    </svg>
  )
}

function IconHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function IconChat() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type WidgetView = 'home' | 'contact' | 'chat'
type AdminScreen = 'dashboard' | 'chats' | 'settings' | 'profile'

interface LocalMessage {
  id: string
  role: 'user' | 'ai' | 'operator'
  content: string
  pending?: boolean
}

// ─── Dev preview root ─────────────────────────────────────────────────────────

export function App() {
  const [mode, setMode] = useState<'widget' | 'admin'>('widget')
  const [adminScreen, setAdminScreen] = useState<AdminScreen>('dashboard')

  return (
    <main class="app-root">
      <section class="mode-switch">
        <button
          class={`mode-switch-button ${mode === 'widget' ? 'active' : ''}`}
          type="button"
          onClick={() => setMode('widget')}
        >
          Виджет
        </button>
        <button
          class={`mode-switch-button ${mode === 'admin' ? 'active' : ''}`}
          type="button"
          onClick={() => setMode('admin')}
        >
          Панель
        </button>
      </section>

      {mode === 'widget' ? (
        <WidgetApp />
      ) : (
        <AdminPreview screen={adminScreen} onScreenChange={setAdminScreen} />
      )}
    </main>
  )
}

// ─── Floating embed widget ────────────────────────────────────────────────────

export function FloatingWidget() {
  const [open, setOpen] = useState(false)

  return (
    <div class="sp-float">
      {open && (
        <div class="sp-float-panel">
          <WidgetApp onClose={() => setOpen(false)} />
        </div>
      )}
      <button
        class={`sp-float-btn ${open ? 'open' : ''}`}
        type="button"
        aria-label={open ? 'Закрыть чат' : 'Открыть чат'}
        onClick={() => setOpen((p) => !p)}
      >
        {open ? '✕' : <IconChat />}
      </button>
    </div>
  )
}

// ─── Widget ───────────────────────────────────────────────────────────────────

function WidgetApp({ onClose }: { onClose?: () => void } = {}) {
  const [view, setView] = useState<WidgetView>('home')
  const [config, setConfig] = useState<WidgetConfigDTO | null>(null)
  const [topics, setTopics] = useState<TopicWithFAQDTO[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [configError, setConfigError] = useState(false)
  const [escalated, setEscalated] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    api.getConfig(TENANT_ID).then(setConfig).catch(() => setConfigError(true))
    api.getTopics(TENANT_ID).then(setTopics).catch(() => {})
  }, [])

  useEffect(() => () => { esRef.current?.close() }, [])

  function openChat(prefill = '') {
    if (prefill) setInput(prefill)
    if (sessionId) { setView('chat'); return }
    setView('contact')
  }

  async function startSession(name?: string, email?: string) {
    try {
      const contact = name || email ? { name, email } : undefined
      const { session } = await api.createSession(TENANT_ID, contact)
      setSessionId(session.sessionId)
      const welcome = config?.welcomeMessage ?? 'Здравствуйте! Чем могу помочь?'
      setMessages([{ id: 'welcome', role: 'ai', content: welcome }])
    } catch {
      setMessages([{
        id: 'err-session',
        role: 'ai',
        content: 'Не удалось подключиться к серверу. Попробуйте позже.',
      }])
    }
    setView('chat')
  }

  function sendMessage() {
    if (!input.trim() || !sessionId || sending) return
    const content = input.trim()
    setInput('')
    setSending(true)

    const userId = `u-${Date.now()}`
    const aiId = `ai-${Date.now()}`

    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', content },
      { id: aiId, role: 'ai', content: '', pending: true },
    ])

    esRef.current?.close()
    const es = new EventSource(api.streamUrl(sessionId, content))
    esRef.current = es

    let buffer = ''
    es.onmessage = (e: MessageEvent) => {
      const chunk = JSON.parse(e.data as string) as AIStreamChunk
      buffer += chunk.delta ?? ''
      setMessages((prev) =>
        prev.map((m) => m.id === aiId ? { ...m, content: buffer, pending: !chunk.done } : m)
      )
      if (chunk.done || chunk.escalate) {
        es.close()
        setSending(false)
        if (chunk.escalate) {
          setEscalated(true)
          setMessages((prev) => [
            ...prev,
            { id: `sys-${Date.now()}`, role: 'operator', content: '⏳ Ваш запрос передан оператору. Ожидайте ответа.' },
          ])
        }
      }
    }

    es.onerror = () => {
      es.close()
      setSending(false)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId
            ? { ...m, content: 'Ошибка получения ответа. Попробуйте ещё раз.', pending: false }
            : m
        )
      )
    }
  }

  async function callOperator() {
    if (!sessionId || escalated) return
    try {
      await api.escalate(sessionId)
      setEscalated(true)
      setMessages((prev) => [
        ...prev,
        { id: `esc-${Date.now()}`, role: 'operator', content: '⏳ Оператор подключится к вам в ближайшее время.' },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `esc-err-${Date.now()}`, role: 'ai', content: 'Не удалось вызвать оператора. Попробуйте ещё раз.' },
      ])
    }
  }

  const goBack = () => setView(view === 'chat' || view === 'contact' ? 'home' : 'home')
  const chatTabActive = view === 'chat' || view === 'contact'

  return (
    <section class="widget-shell">
      {/* Header */}
      <header class="widget-header">
        <button class="icon-button" type="button" aria-label="Назад" onClick={goBack}>
          ←
        </button>
        <div class="brand-chip">
          <img
            class="app-icon sm"
            src={config?.logoUrl ?? '/app-icon.png'}
            alt="SupportPulse"
          />
          <div class="brand-copy">
            <strong>Помощник</strong>
            <span>ИИ-ассистент</span>
          </div>
        </div>
        {onClose ? (
          <button class="icon-button" type="button" aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>
        ) : (
          <div class="icon-button" aria-hidden="true" />
        )}
      </header>

      {/* Screens */}
      {view === 'home' && (
        <HomeScreen
          topics={topics}
          error={configError}
          onStartChat={openChat}
        />
      )}
      {view === 'contact' && (
        <ContactForm
          onSubmit={startSession}
          onSkip={() => startSession()}
        />
      )}
      {view === 'chat' && <ChatScreen messages={messages} />}

      {/* Tab bar */}
      <footer class="widget-footer">
        <button
          class={`tab-button ${view === 'home' ? 'active' : ''}`}
          type="button"
          onClick={() => setView('home')}
        >
          <span class="tab-icon"><IconHome /></span>
          Дом
        </button>
        <button
          class={`tab-button ${chatTabActive ? 'active' : ''}`}
          type="button"
          onClick={() => openChat()}
        >
          <span class="tab-icon"><IconChat /></span>
          Чат
        </button>
      </footer>

      {/* Composer — only in chat */}
      {view === 'chat' && (
        <div class="composer-wrap">
          {!escalated && (
            <button class="escalate-link" type="button" onClick={callOperator}>
              Позвать оператора
            </button>
          )}
          {escalated && (
            <p class="escalated-notice">⏳ Ожидание оператора</p>
          )}
          <div class="composer">
            <div class="composer-icon" aria-hidden="true" />
            <input
              type="text"
              placeholder="Сообщение..."
              value={input}
              onInput={(e) => setInput((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
              disabled={sending}
            />
            <button
              class="composer-send"
              type="button"
              aria-label="Отправить"
              onClick={sendMessage}
              disabled={sending || !input.trim()}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

// ─── Home screen ──────────────────────────────────────────────────────────────

function HomeScreen({
  topics,
  error,
  onStartChat,
}: {
  topics: TopicWithFAQDTO[]
  error: boolean
  onStartChat: (prefill?: string) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FAQItemDTO[]>([])
  const [searching, setSearching] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(() => {
      setSearching(true)
      api.searchFAQ(TENANT_ID, query)
        .then((r) => setResults(r.results))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  const FALLBACK = ['Часто задаваемые вопросы', 'Техническая поддержка', 'Обратная связь']
  const showSearch = query.trim().length > 0

  return (
    <section class="screen-body">
      <div class="hero-banner">
        <h1>Свяжитесь<br />с нами!</h1>
      </div>

      <article class="card intro-card">
        <img class="app-icon intro-icon" src="/app-icon.png" alt="SupportPulse" />
        <p>Здравствуйте! Задайте вопрос нашему ИИ-ассистенту или найдите ответ в базе знаний.</p>
        <button class="primary-button" type="button" onClick={() => onStartChat()}>
          Задать вопрос
        </button>
      </article>

      {/* Search */}
      <div class="search-row">
        <input
          class="search-input"
          type="search"
          placeholder="Поиск по базе знаний..."
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        />
        {searching && <span class="search-spinner" />}
      </div>

      {error && <p class="error-hint">Не удалось загрузить данные. Проверьте подключение.</p>}

      {/* Search results */}
      {showSearch ? (
        results.length > 0 ? (
          <ul class="faq-results">
            {results.map((item) => (
              <li key={item.faqId}>
                <button
                  class="faq-result-item"
                  type="button"
                  onClick={() => onStartChat(item.question)}
                >
                  <span class="faq-q">{item.question}</span>
                  <span class="faq-a">{item.answer}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          !searching && <p class="no-results">Ничего не найдено — попробуйте задать вопрос напрямую</p>
        )
      ) : (
        /* Topic accordion or fallback */
        topics.length > 0
          ? topics.map((topic) => (
              <div class="topic-block" key={topic.topicId}>
                <button
                  class={`feature-card topic-toggle ${expanded === topic.topicId ? 'expanded' : ''}`}
                  type="button"
                  onClick={() => setExpanded((p) => (p === topic.topicId ? null : topic.topicId))}
                >
                  <span>{topic.title}</span>
                  <span class="topic-chevron">{expanded === topic.topicId ? '▲' : '▼'}</span>
                </button>
                {expanded === topic.topicId && (
                  <ul class="faq-list">
                    {topic.items.length > 0
                      ? topic.items.map((item) => (
                          <li key={item.faqId}>
                            <button
                              class="faq-item"
                              type="button"
                              onClick={() => onStartChat(item.question)}
                            >
                              {item.question}
                            </button>
                          </li>
                        ))
                      : <li class="faq-empty">В этой теме пока нет вопросов</li>
                    }
                  </ul>
                )}
              </div>
            ))
          : FALLBACK.map((t) => (
              <button class="feature-card" type="button" key={t} onClick={() => onStartChat()}>
                <span>{t}</span>
              </button>
            ))
      )}
    </section>
  )
}

// ─── Contact form ─────────────────────────────────────────────────────────────

function ContactForm({
  onSubmit,
  onSkip,
}: {
  onSubmit: (name?: string, email?: string) => void
  onSkip: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit() {
    setBusy(true)
    await onSubmit(name.trim() || undefined, email.trim() || undefined)
    setBusy(false)
  }

  return (
    <section class="screen-body contact-screen">
      <div class="contact-card card">
        <h2 class="contact-title">Представьтесь</h2>
        <p class="contact-hint">
          Это поможет оператору быстрее вам помочь. Поля не обязательны.
        </p>

        <label class="form-label" for="c-name">Имя</label>
        <input
          id="c-name"
          class="text-input"
          type="text"
          placeholder="Ваше имя"
          value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
        />

        <label class="form-label" for="c-email">Email</label>
        <input
          id="c-email"
          class="text-input"
          type="email"
          placeholder="email@example.com"
          value={email}
          onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
        />

        <button
          class="primary-button"
          type="button"
          disabled={busy}
          onClick={handleSubmit}
        >
          {busy ? '...' : 'Начать чат'}
        </button>

        <button class="skip-button" type="button" onClick={onSkip}>
          Пропустить
        </button>
      </div>
    </section>
  )
}

// ─── Chat screen ──────────────────────────────────────────────────────────────

function ChatScreen({ messages }: { messages: LocalMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <section class="screen-body chat-screen">
      {messages.length === 0 && (
        <p class="chat-empty">Начните диалог — задайте ваш вопрос</p>
      )}
      {messages.map((msg) => (
        <article
          key={msg.id}
          class={`chat-bubble ${msg.role === 'user' ? 'user' : msg.role === 'operator' ? 'operator' : 'assistant'}`}
        >
          {msg.pending ? (
            <span class="typing-dots"><span /><span /><span /></span>
          ) : (
            <p>{msg.content}</p>
          )}
        </article>
      ))}
      <div ref={bottomRef} />
    </section>
  )
}

// ─── Admin preview (placeholder — отдельное приложение apps/admin) ─────────────

function AdminPreview({
  screen,
  onScreenChange,
}: {
  screen: AdminScreen
  onScreenChange: (s: AdminScreen) => void
}) {
  const titles: Record<AdminScreen, string> = {
    dashboard: 'Главная',
    chats: 'Мои чаты',
    settings: 'Настройки',
    profile: 'Профиль',
  }

  return (
    <section class="admin-shell">
      <aside class="admin-sidebar">
        <div class="panel-header">
          <img class="app-icon xs" src="/app-icon.png" alt="SupportPulse" />
          <strong>{titles[screen]}</strong>
        </div>

        {screen === 'dashboard' ? (
          <section class="dashboard-menu">
            <div class="dashboard-brand">
              <img class="app-icon md" src="/app-icon.png" alt="SupportPulse" />
              <div>
                <strong>Главная</strong>
                <p>SupportPulse</p>
              </div>
            </div>
            <div class="dashboard-grid">
              {(
                [
                  { title: 'Профиль', Icon: IconPerson, s: 'profile' as AdminScreen },
                  { title: 'Сообщения', Icon: IconChats, s: 'chats' as AdminScreen },
                  { title: 'Настройки', Icon: IconGear, s: 'settings' as AdminScreen },
                  { title: 'О сервисе', Icon: IconDocument, s: 'dashboard' as AdminScreen },
                ]
              ).map((item) => (
                <button
                  class="dashboard-tile"
                  type="button"
                  key={item.title}
                  onClick={() => onScreenChange(item.s)}
                >
                  <div class="tile-icon"><item.Icon /></div>
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
            <button class="dashboard-wide-tile" type="button" onClick={() => onScreenChange('dashboard')}>
              <div class="tile-icon"><IconKnowledge /></div>
              <span>База знаний</span>
            </button>
          </section>
        ) : (
          <nav class="admin-nav">
            {(['profile', 'chats', 'settings'] as AdminScreen[]).map((s) => (
              <button
                key={s}
                class={`admin-nav-item ${screen === s ? 'active' : ''}`}
                type="button"
                onClick={() => onScreenChange(s)}
              >
                <span class="dot-circle" />
                {titles[s]}
              </button>
            ))}
          </nav>
        )}

        <div class="side-bottom-nav">
          {(
            [
              { Icon: IconPerson, s: 'profile' as AdminScreen },
              { Icon: IconChats, s: 'chats' as AdminScreen },
              { Icon: IconGear, s: 'settings' as AdminScreen },
              { Icon: IconKnowledge, s: 'dashboard' as AdminScreen },
            ]
          ).map((item) => (
            <button
              class={`mini-nav-button ${screen === item.s ? 'active' : ''}`}
              type="button"
              key={item.s}
              onClick={() => onScreenChange(item.s)}
            >
              <item.Icon />
            </button>
          ))}
        </div>
      </aside>

      <section class="admin-content">
        {screen === 'dashboard' && (
          <div class="admin-page">
            <header class="knowledge-header">
              <h2>База знаний</h2>
              <div class="profile-circle">◔</div>
            </header>
            <article class="knowledge-card">
              <img class="app-icon md" src="/app-icon.png" alt="SupportPulse" />
              <div>
                <h3>Долгожданный запуск</h3>
                <p>Спустя долгий период разработки SupportPulse наконец-то стал доступен для использования.</p>
                <button class="primary-button compact" type="button">Использовать</button>
              </div>
            </article>
          </div>
        )}
        {screen === 'chats' && (
          <div class="admin-page chats-page">
            <header class="chat-controls">
              <button class="chip" type="button">Дата</button>
              <button class="chip circle" type="button" aria-label="Фильтр" />
            </header>
            <div class="chat-canvas">
              <div class="message-row right">
                <div class="message-meta">Имя</div>
                <div class="avatar-circle" />
                <div class="bubble-line" />
              </div>
              <div class="message-row left">
                <div class="avatar-circle" />
                <div>
                  <div class="message-meta">Имя</div>
                  <div class="bubble-line medium" />
                </div>
              </div>
            </div>
          </div>
        )}
        {screen === 'settings' && (
          <div class="admin-page">
            <h2>Активация виджета</h2>
            <div class="toggle-row">
              <button class="toggle-pill active" type="button">Включен</button>
              <button class="toggle-pill" type="button">Выключен</button>
            </div>
            <label class="form-label" for="site-url">
              Адрес сайта<span class="required">*</span>
            </label>
            <p class="form-hint">На нём будет размещён виджет поддержки</p>
            <input id="site-url" class="text-input" type="text" placeholder="https://www.example.com" />
          </div>
        )}
        {screen === 'profile' && (
          <div class="profile-layout">
            <div class="profile-main">
              <label class="form-label" for="display-name">Отображаемое имя</label>
              <input id="display-name" class="text-input" type="text" placeholder="Имя профиля" />
              <label class="form-label" for="bio">Биография</label>
              <textarea id="bio" class="text-area" />
            </div>
            <div class="profile-side">
              <h3>Аватар профиля</h3>
              <div class="avatar-big">
                <img class="app-icon md" src="/app-icon.png" alt="Аватар" />
              </div>
              <button class="primary-button compact" type="button">Изменить</button>
            </div>
          </div>
        )}
      </section>
    </section>
  )
}
