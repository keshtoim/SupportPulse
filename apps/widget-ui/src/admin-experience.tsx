import { useEffect, useState } from 'preact/hooks'
import {
  DEMO_ADMIN_EMAIL,
  DEMO_PASSWORD,
  apiRequest,
  closeCategoryLabel,
  formatDateTime,
  senderLabel,
  statusLabel,
  type AdminScreen,
  type AuthResponse,
  type FaqArticle,
  type KnowledgeDocument,
  type MessageRecord,
  type PlatformMetrics,
  type ResponseTemplate,
  type Tenant,
  type TicketCloseCategory,
  type TicketNote,
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
  const [, setSeenTicketIds] = useState<Set<string> | null>(null)
  const [newTicketToast, setNewTicketToast] = useState<string | null>(null)
  const [unseenTicketCount, setUnseenTicketCount] = useState(0)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [ticketMessages, setTicketMessages] = useState<MessageRecord[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [replyDraft, setReplyDraft] = useState('')
  const [closingTicket, setClosingTicket] = useState(false)
  const [closeCategory, setCloseCategory] = useState<TicketCloseCategory | ''>('')
  const [closeReasonText, setCloseReasonText] = useState('')
  const [closeError, setCloseError] = useState<string | null>(null)
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
  const [knowledgeNotice, setKnowledgeNotice] = useState<string | null>(null)
  const [newTopicTitle, setNewTopicTitle] = useState('')
  const [addingFaqTopicId, setAddingFaqTopicId] = useState<string | null>(null)
  const [newFaqQuestion, setNewFaqQuestion] = useState('')
  const [newFaqAnswer, setNewFaqAnswer] = useState('')
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null)
  const [editFaqQuestion, setEditFaqQuestion] = useState('')
  const [editFaqAnswer, setEditFaqAnswer] = useState('')
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<KnowledgeDocument[]>([])
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics | null>(null)
  const [newTenantName, setNewTenantName] = useState('')
  const [tenantsNotice, setTenantsNotice] = useState<string | null>(null)
  const [creatingTenant, setCreatingTenant] = useState(false)
  const [ticketNotes, setTicketNotes] = useState<TicketNote[]>([])
  const [newNoteDraft, setNewNoteDraft] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<ResponseTemplate[]>([])
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [templatesNotice, setTemplatesNotice] = useState<string | null>(null)
  const [newTemplateTitle, setNewTemplateTitle] = useState('')
  const [newTemplateContent, setNewTemplateContent] = useState('')
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [editTemplateTitle, setEditTemplateTitle] = useState('')
  const [editTemplateContent, setEditTemplateContent] = useState('')

  const adminTitle =
    screen === 'dashboard'
      ? 'Главная'
      : screen === 'chats'
        ? 'Очередь'
        : screen === 'knowledge'
          ? 'База знаний'
          : screen === 'tenants'
            ? 'Тенанты'
            : screen === 'settings'
              ? 'Настройки'
              : screen === 'news'
                ? 'Новости'
                : 'Профиль'
  const canManageCompany = auth?.user.role === 'company_admin'
  const isPlatformAdmin = auth?.user.role === 'platform_admin'
  const canManageTemplates = auth?.user.role === 'supervisor' || auth?.user.role === 'company_admin'
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

      // Уведомление о новых тикетах (FR-060): пропускаем самый первый опрос — это просто начальный снимок, не "новые" тикеты
      setSeenTicketIds((previousSeen) => {
        const nextSeen = new Set(result.map((item) => item.id))

        if (previousSeen !== null) {
          const arrived = result.filter((item) => !previousSeen.has(item.id))

          if (arrived.length > 0) {
            setNewTicketToast(
              arrived.length === 1 ? `Новый тикет в очереди: ${arrived[0].reason}` : `Новых тикетов в очереди: ${arrived.length}`,
            )

            if (screen !== 'chats') {
              setUnseenTicketCount((count) => count + arrived.length)
            }
          }
        }

        return nextSeen
      })
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

  const loadTicketNotes = async (ticketId: string) => {
    try {
      setNoteError(null)
      const result = await authorizedRequest<TicketNote[]>(`/operator/tickets/${ticketId}/notes`)
      setTicketNotes(result)
    } catch (error) {
      setNoteError((error as Error).message)
    }
  }

  const loadTemplates = async () => {
    if (!auth) {
      setTemplates([])
      return
    }

    try {
      const result = await authorizedRequest<ResponseTemplate[]>('/operator/templates')
      setTemplates(result)
    } catch (error) {
      setTemplatesNotice((error as Error).message)
    }
  }

  const loadCompanyData = async () => {
    if (!canManageCompany) {
      setCompanyKnowledge([])
      setWidgetConfig(null)
      setKnowledgeDocuments([])
      return
    }

    try {
      const [knowledgeBase, config, documents] = await Promise.all([
        authorizedRequest<Topic[]>('/company/knowledge-base'),
        authorizedRequest<WidgetConfig>('/company/widget-config'),
        authorizedRequest<KnowledgeDocument[]>('/company/knowledge/documents'),
      ])

      setCompanyKnowledge(knowledgeBase)
      setWidgetConfig(config)
      setKnowledgeDocuments(documents)
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

  const loadPlatformData = async () => {
    if (!isPlatformAdmin) {
      setTenants([])
      setPlatformMetrics(null)
      return
    }

    try {
      const [tenantList, metrics] = await Promise.all([
        authorizedRequest<Tenant[]>('/platform/tenants'),
        authorizedRequest<PlatformMetrics>('/platform/metrics'),
      ])

      setTenants(tenantList)
      setPlatformMetrics(metrics)
    } catch (error) {
      setTenantsNotice((error as Error).message)
    }
  }

  useEffect(() => {
    if (!auth) {
      return
    }

    void loadTickets()
    void loadCompanyData()
    void loadPlatformData()
    void loadTemplates()
  }, [auth])

  // Смена выбранного тикета закрывает панель закрытия — она относится к конкретному тикету
  useEffect(() => {
    setClosingTicket(false)
    setCloseCategory('')
    setCloseReasonText('')
    setCloseError(null)
  }, [selectedTicketId])

  useEffect(() => {
    if (!auth || !selectedTicketId) {
      setTicketMessages([])
      setTicketNotes([])
      return
    }

    void loadTicketMessages(selectedTicketId)
    void loadTicketNotes(selectedTicketId)
  }, [auth, selectedTicketId])

  // Polling: список тикетов обновляется каждые 5с всегда (не только на экране очереди) —
  // иначе оператор не узнает о новом тикете, если сейчас смотрит другой экран
  useEffect(() => {
    if (!auth) return
    const id = setInterval(() => void loadTickets(true), 5000)
    return () => clearInterval(id)
  }, [auth, screen, selectedTicketId])

  // Тост с уведомлением о новом тикете исчезает сам через 6 секунд
  useEffect(() => {
    if (!newTicketToast) return
    const id = setTimeout(() => setNewTicketToast(null), 6000)
    return () => clearTimeout(id)
  }, [newTicketToast])

  // Открыв очередь, оператор считается "увидевшим" все накопленные тикеты
  useEffect(() => {
    if (screen === 'chats') {
      setUnseenTicketCount(0)
    }
  }, [screen])

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
        body: JSON.stringify({ status }),
      })
      await loadTickets()
      await loadTicketMessages(selectedTicket.id)
    } catch (error) {
      setTicketError((error as Error).message)
    }
  }

  const handleCloseTicket = async (event: Event) => {
    event.preventDefault()

    if (!selectedTicket || !closeCategory) {
      return
    }

    try {
      setCloseError(null)
      await authorizedRequest<TicketRecord>(`/operator/tickets/${selectedTicket.id}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status: 'closed',
          closedCategory: closeCategory,
          closedReason: closeReasonText.trim() || undefined,
        }),
      })
      setClosingTicket(false)
      setCloseCategory('')
      setCloseReasonText('')
      await loadTickets()
      await loadTicketMessages(selectedTicket.id)
    } catch (error) {
      setCloseError((error as Error).message)
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

  const handleAddNote = async (event: Event) => {
    event.preventDefault()

    if (!selectedTicket || !newNoteDraft.trim()) {
      return
    }

    try {
      setNoteError(null)
      await authorizedRequest(`/operator/tickets/${selectedTicket.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content: newNoteDraft.trim() }),
      })
      setNewNoteDraft('')
      await loadTicketNotes(selectedTicket.id)
    } catch (error) {
      setNoteError((error as Error).message)
    }
  }

  const handleInsertTemplate = (template: ResponseTemplate) => {
    setReplyDraft(template.content)
    setShowTemplatePicker(false)
  }

  const handleCreateTemplate = async (event: Event) => {
    event.preventDefault()

    if (!canManageTemplates || !newTemplateTitle.trim() || !newTemplateContent.trim()) {
      return
    }

    try {
      setTemplatesNotice(null)
      await authorizedRequest<ResponseTemplate>('/operator/templates', {
        method: 'POST',
        body: JSON.stringify({ title: newTemplateTitle.trim(), content: newTemplateContent.trim() }),
      })
      setNewTemplateTitle('')
      setNewTemplateContent('')
      await loadTemplates()
      setTemplatesNotice('Шаблон добавлен.')
    } catch (error) {
      setTemplatesNotice((error as Error).message)
    }
  }

  const startEditTemplate = (template: ResponseTemplate) => {
    setEditingTemplateId(template.id)
    setEditTemplateTitle(template.title)
    setEditTemplateContent(template.content)
  }

  const handleUpdateTemplate = async (event: Event, templateId: string) => {
    event.preventDefault()

    if (!canManageTemplates || !editTemplateTitle.trim() || !editTemplateContent.trim()) {
      return
    }

    try {
      setTemplatesNotice(null)
      await authorizedRequest<ResponseTemplate>(`/operator/templates/${templateId}`, {
        method: 'PUT',
        body: JSON.stringify({ title: editTemplateTitle.trim(), content: editTemplateContent.trim() }),
      })
      setEditingTemplateId(null)
      await loadTemplates()
      setTemplatesNotice('Шаблон обновлён.')
    } catch (error) {
      setTemplatesNotice((error as Error).message)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!canManageTemplates) {
      return
    }

    try {
      setTemplatesNotice(null)
      await authorizedRequest(`/operator/templates/${templateId}`, { method: 'DELETE' })
      await loadTemplates()
      setTemplatesNotice('Шаблон удалён.')
    } catch (error) {
      setTemplatesNotice((error as Error).message)
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

  const handleCreateTopic = async (event: Event) => {
    event.preventDefault()

    if (!canManageCompany || !newTopicTitle.trim()) {
      return
    }

    try {
      setKnowledgeNotice(null)
      await authorizedRequest<Topic>('/company/topics', {
        method: 'POST',
        body: JSON.stringify({ title: newTopicTitle.trim() }),
      })
      setNewTopicTitle('')
      await loadCompanyData()
      setKnowledgeNotice('Тема добавлена.')
    } catch (error) {
      setKnowledgeNotice((error as Error).message)
    }
  }

  const handleCreateFaq = async (event: Event, topicId: string) => {
    event.preventDefault()

    if (!canManageCompany || !newFaqQuestion.trim() || !newFaqAnswer.trim()) {
      return
    }

    try {
      setKnowledgeNotice(null)
      await authorizedRequest<FaqArticle>('/company/faq', {
        method: 'POST',
        body: JSON.stringify({ topicId, question: newFaqQuestion.trim(), answer: newFaqAnswer.trim() }),
      })
      setNewFaqQuestion('')
      setNewFaqAnswer('')
      setAddingFaqTopicId(null)
      await loadCompanyData()
      setKnowledgeNotice('Вопрос добавлен.')
    } catch (error) {
      setKnowledgeNotice((error as Error).message)
    }
  }

  const startEditFaq = (article: FaqArticle) => {
    setEditingFaqId(article.id)
    setEditFaqQuestion(article.question)
    setEditFaqAnswer(article.answer)
  }

  const handleUpdateFaq = async (event: Event, faqId: string) => {
    event.preventDefault()

    if (!canManageCompany || !editFaqQuestion.trim() || !editFaqAnswer.trim()) {
      return
    }

    try {
      setKnowledgeNotice(null)
      await authorizedRequest<FaqArticle>(`/company/faq/${faqId}`, {
        method: 'PUT',
        body: JSON.stringify({ question: editFaqQuestion.trim(), answer: editFaqAnswer.trim() }),
      })
      setEditingFaqId(null)
      await loadCompanyData()
      setKnowledgeNotice('Вопрос обновлён.')
    } catch (error) {
      setKnowledgeNotice((error as Error).message)
    }
  }

  const handleUploadDocument = async (event: Event) => {
    event.preventDefault()

    if (!canManageCompany || !selectedUploadFile) {
      return
    }

    try {
      setUploadingDocument(true)
      setKnowledgeNotice(null)
      const formData = new FormData()
      formData.append('file', selectedUploadFile)
      await authorizedRequest<KnowledgeDocument>('/company/knowledge/documents', {
        method: 'POST',
        body: formData,
      })
      setSelectedUploadFile(null)
      await loadCompanyData()
      setKnowledgeNotice('Файл добавлен в базу знаний.')
    } catch (error) {
      setKnowledgeNotice((error as Error).message)
    } finally {
      setUploadingDocument(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!canManageCompany) {
      return
    }

    try {
      setKnowledgeNotice(null)
      await authorizedRequest(`/company/knowledge/documents/${documentId}`, {
        method: 'DELETE',
      })
      await loadCompanyData()
      setKnowledgeNotice('Файл удалён.')
    } catch (error) {
      setKnowledgeNotice((error as Error).message)
    }
  }

  const formatFileSize = (sizeBytes: number): string =>
    sizeBytes < 1024 * 1024 ? `${Math.max(1, Math.round(sizeBytes / 1024))} КБ` : `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`

  const knowledgeArticlesCount = companyKnowledge.reduce((total, topic) => total + topic.articles.length, 0)

  const handleCreateTenant = async (event: Event) => {
    event.preventDefault()

    if (!isPlatformAdmin || !newTenantName.trim()) {
      return
    }

    try {
      setCreatingTenant(true)
      setTenantsNotice(null)
      await authorizedRequest<Tenant>('/platform/tenants', {
        method: 'POST',
        body: JSON.stringify({ name: newTenantName.trim() }),
      })
      setNewTenantName('')
      await loadPlatformData()
      setTenantsNotice('Тенант создан.')
    } catch (error) {
      setTenantsNotice((error as Error).message)
    } finally {
      setCreatingTenant(false)
    }
  }

  const handleToggleTenantBlocked = async (tenant: Tenant) => {
    if (!isPlatformAdmin) {
      return
    }

    try {
      setTenantsNotice(null)
      await authorizedRequest<Tenant>(`/platform/tenants/${tenant.id}/block`, {
        method: 'POST',
        body: JSON.stringify({ isBlocked: !tenant.isBlocked }),
      })
      await loadPlatformData()
      setTenantsNotice(tenant.isBlocked ? 'Тенант разблокирован.' : 'Тенант заблокирован.')
    } catch (error) {
      setTenantsNotice((error as Error).message)
    }
  }

  return (
    <section class={`admin-shell ${!active ? 'is-hidden' : ''}`}>
      {newTicketToast && <div class="ticket-toast">{newTicketToast}</div>}
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
                title: 'База знаний',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                ),
                screen: 'knowledge' as const,
              },
              {
                title: 'Тенанты',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 22V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v18Z" />
                    <path d="M6 12H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2" />
                    <path d="M18 9h2a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-2" />
                    <path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
                  </svg>
                ),
                screen: 'tenants' as const,
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
                {item.screen === 'chats' && unseenTicketCount > 0 && (
                  <span class="notification-badge">{unseenTicketCount > 9 ? '9+' : unseenTicketCount}</span>
                )}
                <div class="tile-icon">{item.icon}</div>
                <span>{item.title}</span>
              </button>
            ))}
          </div>

          <button class="dashboard-wide-tile" type="button" onClick={() => onScreenChange('news')}>
            <div class="tile-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                <line x1="12" y1="7" x2="18" y2="7" /><line x1="12" y1="11" x2="18" y2="11" /><line x1="12" y1="15" x2="16" y2="15" />
              </svg>
            </div>
            <span>Новости</span>
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
              target: 'knowledge' as const,
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
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
              {item.target === 'chats' && unseenTicketCount > 0 && (
                <span class="notification-badge">{unseenTicketCount > 9 ? '9+' : unseenTicketCount}</span>
              )}
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
                    <span>{auth.user.tenantId ? auth.user.tenantId.slice(0, 8) : 'platform'}</span>
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
                  <button
                    class="chip circle"
                    type="button"
                    aria-label="Закрыть"
                    disabled={!selectedTicket}
                    onClick={() => setClosingTicket((current) => !current)}
                  >
                    ✓
                  </button>
                  {canManageTemplates && (
                    <button class="chip" type="button" onClick={() => setShowTemplateManager((current) => !current)}>
                      {showTemplateManager ? 'Скрыть шаблоны' : 'Управление шаблонами'}
                    </button>
                  )}
                </header>

                {ticketError && <div class="alert-banner error compact">{ticketError}</div>}

                {showTemplateManager && (
                  <section class="card compact-card">
                    <strong>Шаблоны ответов</strong>
                    {templatesNotice && (
                      <div class={`alert-banner ${templatesNotice.includes('добавл') || templatesNotice.includes('обновл') || templatesNotice.includes('удал') ? 'success' : 'error'} compact`}>
                        {templatesNotice}
                      </div>
                    )}

                    <form class="settings-form" onSubmit={handleCreateTemplate}>
                      <label class="form-label" for="new-template-title">
                        Название
                      </label>
                      <input
                        id="new-template-title"
                        class="text-input"
                        type="text"
                        value={newTemplateTitle}
                        onInput={(event) => setNewTemplateTitle((event.currentTarget as HTMLInputElement).value)}
                      />
                      <label class="form-label" for="new-template-content">
                        Текст ответа
                      </label>
                      <textarea
                        id="new-template-content"
                        class="text-area"
                        value={newTemplateContent}
                        onInput={(event) => setNewTemplateContent((event.currentTarget as HTMLTextAreaElement).value)}
                      />
                      <button class="primary-button compact" type="submit">
                        Добавить шаблон
                      </button>
                    </form>

                    <div class="compact-list">
                      {templates.map((template) => (
                        <div class="card compact-card" key={template.id}>
                          {editingTemplateId === template.id ? (
                            <form class="settings-form" onSubmit={(event) => handleUpdateTemplate(event, template.id)}>
                              <input
                                class="text-input"
                                type="text"
                                value={editTemplateTitle}
                                onInput={(event) => setEditTemplateTitle((event.currentTarget as HTMLInputElement).value)}
                              />
                              <textarea
                                class="text-area"
                                value={editTemplateContent}
                                onInput={(event) => setEditTemplateContent((event.currentTarget as HTMLTextAreaElement).value)}
                              />
                              <div class="thread-actions">
                                <button class="primary-button compact" type="submit">
                                  Сохранить
                                </button>
                                <button class="secondary-button compact-button" type="button" onClick={() => setEditingTemplateId(null)}>
                                  Отмена
                                </button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <strong>{template.title}</strong>
                              <p>{template.content}</p>
                              <div class="thread-actions">
                                <button class="secondary-link" type="button" onClick={() => startEditTemplate(template)}>
                                  Редактировать
                                </button>
                                <button class="secondary-link" type="button" onClick={() => void handleDeleteTemplate(template.id)}>
                                  Удалить
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      {templates.length === 0 && <div class="empty-state">Шаблонов пока нет — добавьте первый выше.</div>}
                    </div>
                  </section>
                )}

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
                            <p>
                              {statusLabel[selectedTicket.status]}
                              {selectedTicket.status === 'closed' && selectedTicket.closedCategory && (
                                <> · {closeCategoryLabel[selectedTicket.closedCategory]}</>
                              )}
                              {selectedTicket.status === 'closed' && selectedTicket.closedReason && (
                                <> · {selectedTicket.closedReason}</>
                              )}
                            </p>
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

                        {closingTicket && (
                          <form class="settings-form" onSubmit={handleCloseTicket}>
                            <label class="form-label" for="close-category">
                              Категория закрытия
                            </label>
                            <select
                              id="close-category"
                              class="text-input"
                              value={closeCategory}
                              onChange={(event) => setCloseCategory((event.currentTarget as HTMLSelectElement).value as TicketCloseCategory)}
                            >
                              <option value="">Выберите категорию...</option>
                              {(Object.entries(closeCategoryLabel) as [TicketCloseCategory, string][]).map(([value, label]) => (
                                <option value={value} key={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                            <label class="form-label" for="close-reason">
                              Комментарий (необязательно)
                            </label>
                            <textarea
                              id="close-reason"
                              class="text-area"
                              value={closeReasonText}
                              onInput={(event) => setCloseReasonText((event.currentTarget as HTMLTextAreaElement).value)}
                            />
                            {closeError && <div class="alert-banner error compact">{closeError}</div>}
                            <div class="thread-actions">
                              <button class="primary-button compact" type="submit" disabled={!closeCategory}>
                                Закрыть тикет
                              </button>
                              <button
                                class="secondary-button compact-button"
                                type="button"
                                onClick={() => {
                                  setClosingTicket(false)
                                  setCloseCategory('')
                                  setCloseReasonText('')
                                  setCloseError(null)
                                }}
                              >
                                Отмена
                              </button>
                            </div>
                          </form>
                        )}

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

                        <div class="thread-actions">
                          <button class="chip" type="button" onClick={() => setShowTemplatePicker((current) => !current)}>
                            Шаблоны {showTemplatePicker ? '▲' : '▼'}
                          </button>
                        </div>

                        {showTemplatePicker && (
                          <div class="compact-list">
                            {templates.map((template) => (
                              <button
                                class="ticket-list-item"
                                type="button"
                                key={template.id}
                                onClick={() => handleInsertTemplate(template)}
                              >
                                <strong>{template.title}</strong>
                                <span>{template.content.slice(0, 80)}</span>
                              </button>
                            ))}
                            {templates.length === 0 && <div class="empty-state">Шаблонов пока нет.</div>}
                          </div>
                        )}

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

                        <section class="card compact-card">
                          <strong>Внутренние заметки</strong>
                          <p class="form-hint">Видны только команде поддержки, клиент их не видит.</p>
                          {noteError && <div class="alert-banner error compact">{noteError}</div>}

                          <div class="compact-list">
                            {ticketNotes.map((note) => (
                              <div class="card compact-card note-item" key={note.id}>
                                <div class="message-caption">
                                  <strong>{note.authorName}</strong>
                                  <span>{formatDateTime(note.createdAt)}</span>
                                </div>
                                <p>{note.content}</p>
                              </div>
                            ))}
                            {ticketNotes.length === 0 && <div class="empty-state">Заметок пока нет.</div>}
                          </div>

                          <form class="thread-composer" onSubmit={handleAddNote}>
                            <textarea
                              class="text-area"
                              placeholder="Заметка для команды..."
                              value={newNoteDraft}
                              onInput={(event) => setNewNoteDraft((event.currentTarget as HTMLTextAreaElement).value)}
                            />
                            <button class="secondary-button compact-button" type="submit">
                              Добавить заметку
                            </button>
                          </form>
                        </section>
                      </>
                    ) : (
                      <div class="empty-state">Выберите тикет из списка слева.</div>
                    )}
                  </section>
                </div>
              </div>
            )}

            {screen === 'knowledge' && (
              <div class="admin-page">
                <h2>База знаний</h2>
                {!canManageCompany && (
                  <div class="alert-banner">
                    Для управления базой знаний нужен вход под администратором компании.
                  </div>
                )}
                {knowledgeNotice && (
                  <div class={`alert-banner ${knowledgeNotice.includes('добавл') || knowledgeNotice.includes('обновл') ? 'success' : 'error'}`}>
                    {knowledgeNotice}
                  </div>
                )}

                <form class="inline-form" onSubmit={handleCreateTopic}>
                  <input
                    class="text-input"
                    type="text"
                    placeholder="Название новой темы"
                    value={newTopicTitle}
                    disabled={!canManageCompany}
                    onInput={(event) => setNewTopicTitle((event.currentTarget as HTMLInputElement).value)}
                  />
                  <button class="primary-button compact" type="submit" disabled={!canManageCompany}>
                    Добавить тему
                  </button>
                </form>

                <div class="topic-stack">
                  {companyKnowledge.map((topic) => (
                    <article class="card topic-card" key={topic.id}>
                      <div class="topic-header">
                        <h3>{topic.title}</h3>
                        <span>{topic.articles.length} FAQ</span>
                      </div>

                      <div class="faq-list">
                        {topic.articles.map((article) => (
                          <div class="card compact-card faq-item" key={article.id}>
                            {editingFaqId === article.id ? (
                              <form class="settings-form" onSubmit={(event) => handleUpdateFaq(event, article.id)}>
                                <label class="form-label" for={`faq-question-${article.id}`}>
                                  Вопрос
                                </label>
                                <textarea
                                  id={`faq-question-${article.id}`}
                                  class="text-area"
                                  value={editFaqQuestion}
                                  onInput={(event) => setEditFaqQuestion((event.currentTarget as HTMLTextAreaElement).value)}
                                />
                                <label class="form-label" for={`faq-answer-${article.id}`}>
                                  Ответ
                                </label>
                                <textarea
                                  id={`faq-answer-${article.id}`}
                                  class="text-area"
                                  value={editFaqAnswer}
                                  onInput={(event) => setEditFaqAnswer((event.currentTarget as HTMLTextAreaElement).value)}
                                />
                                <div class="thread-actions">
                                  <button class="primary-button compact" type="submit">
                                    Сохранить
                                  </button>
                                  <button
                                    class="secondary-button compact-button"
                                    type="button"
                                    onClick={() => setEditingFaqId(null)}
                                  >
                                    Отмена
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <strong>{article.question}</strong>
                                <p>{article.answer}</p>
                                {canManageCompany && (
                                  <button class="secondary-link" type="button" onClick={() => startEditFaq(article)}>
                                    Редактировать
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                        {topic.articles.length === 0 && <div class="empty-state">В этой теме пока нет вопросов.</div>}
                      </div>

                      {canManageCompany &&
                        (addingFaqTopicId === topic.id ? (
                          <form class="settings-form" onSubmit={(event) => handleCreateFaq(event, topic.id)}>
                            <label class="form-label" for={`new-faq-question-${topic.id}`}>
                              Новый вопрос
                            </label>
                            <textarea
                              id={`new-faq-question-${topic.id}`}
                              class="text-area"
                              value={newFaqQuestion}
                              onInput={(event) => setNewFaqQuestion((event.currentTarget as HTMLTextAreaElement).value)}
                            />
                            <label class="form-label" for={`new-faq-answer-${topic.id}`}>
                              Ответ
                            </label>
                            <textarea
                              id={`new-faq-answer-${topic.id}`}
                              class="text-area"
                              value={newFaqAnswer}
                              onInput={(event) => setNewFaqAnswer((event.currentTarget as HTMLTextAreaElement).value)}
                            />
                            <div class="thread-actions">
                              <button class="primary-button compact" type="submit">
                                Сохранить вопрос
                              </button>
                              <button
                                class="secondary-button compact-button"
                                type="button"
                                onClick={() => {
                                  setAddingFaqTopicId(null)
                                  setNewFaqQuestion('')
                                  setNewFaqAnswer('')
                                }}
                              >
                                Отмена
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            class="chip"
                            type="button"
                            onClick={() => {
                              setAddingFaqTopicId(topic.id)
                              setNewFaqQuestion('')
                              setNewFaqAnswer('')
                            }}
                          >
                            + Добавить вопрос
                          </button>
                        ))}
                    </article>
                  ))}
                  {companyKnowledge.length === 0 && <div class="empty-state">Тем пока нет — добавьте первую выше.</div>}
                </div>

                <h3 class="screen-section-title">Файлы базы знаний</h3>
                <p class="form-hint">Загрузите PDF или DOCX — текст будет извлечён и добавлен как источник для AI-агента.</p>

                <form class="inline-form" onSubmit={handleUploadDocument}>
                  <input
                    class="text-input"
                    type="file"
                    accept=".pdf,.docx"
                    disabled={!canManageCompany || uploadingDocument}
                    onChange={(event) => {
                      const input = event.currentTarget as HTMLInputElement
                      setSelectedUploadFile(input.files && input.files.length > 0 ? input.files[0] : null)
                    }}
                  />
                  <button class="primary-button compact" type="submit" disabled={!canManageCompany || !selectedUploadFile || uploadingDocument}>
                    {uploadingDocument ? 'Загружаю...' : 'Загрузить файл'}
                  </button>
                </form>

                <div class="compact-list">
                  {knowledgeDocuments.map((document) => (
                    <article class="card compact-card" key={document.id}>
                      <div class="topic-header">
                        <div>
                          <strong>{document.fileName}</strong>
                          <p>
                            {formatFileSize(document.sizeBytes)} · {formatDateTime(document.createdAt)}
                          </p>
                        </div>
                        <span class={`status-pill ${document.status === 'failed' ? 'ai-fallback' : 'ai'}`}>
                          {document.status === 'failed' ? 'Ошибка обработки' : 'Обработан'}
                        </span>
                      </div>
                      {document.status === 'failed' && document.errorMessage && (
                        <p class="form-hint">{document.errorMessage}</p>
                      )}
                      {canManageCompany && (
                        <button class="secondary-link" type="button" onClick={() => void handleDeleteDocument(document.id)}>
                          Удалить
                        </button>
                      )}
                    </article>
                  ))}
                  {knowledgeDocuments.length === 0 && <div class="empty-state">Файлы пока не загружены.</div>}
                </div>
              </div>
            )}

            {screen === 'tenants' && (
              <div class="admin-page">
                <h2>Тенанты платформы</h2>
                {!isPlatformAdmin && (
                  <div class="alert-banner">
                    Для управления тенантами нужен вход под администратором платформы.
                  </div>
                )}
                {tenantsNotice && (
                  <div class={`alert-banner ${tenantsNotice.includes('создан') || tenantsNotice.includes('заблокирован') || tenantsNotice.includes('разблокирован') ? 'success' : 'error'}`}>
                    {tenantsNotice}
                  </div>
                )}

                {platformMetrics && (
                  <section class="stats-grid">
                    <article class="card stat-card">
                      <strong>Тенантов</strong>
                      <span>{platformMetrics.tenantsTotal}</span>
                    </article>
                    <article class="card stat-card">
                      <strong>Заблокировано</strong>
                      <span>{platformMetrics.tenantsBlocked}</span>
                    </article>
                    <article class="card stat-card">
                      <strong>Пользователей</strong>
                      <span>{platformMetrics.usersTotal}</span>
                    </article>
                    <article class="card stat-card">
                      <strong>Тикетов всего</strong>
                      <span>{platformMetrics.tickets.total}</span>
                    </article>
                  </section>
                )}

                <form class="inline-form" onSubmit={handleCreateTenant}>
                  <input
                    class="text-input"
                    type="text"
                    placeholder="Название новой компании-клиента"
                    value={newTenantName}
                    disabled={!isPlatformAdmin || creatingTenant}
                    onInput={(event) => setNewTenantName((event.currentTarget as HTMLInputElement).value)}
                  />
                  <button class="primary-button compact" type="submit" disabled={!isPlatformAdmin || !newTenantName.trim() || creatingTenant}>
                    {creatingTenant ? 'Создаю...' : 'Создать тенанта'}
                  </button>
                </form>

                <div class="compact-list">
                  {tenants.map((tenant) => (
                    <article class="card compact-card" key={tenant.id}>
                      <div class="topic-header">
                        <div>
                          <strong>{tenant.name}</strong>
                          <p>Создан {formatDateTime(tenant.createdAt)} · ID {tenant.id.slice(0, 8)}</p>
                        </div>
                        <span class={`status-pill ${tenant.isBlocked ? 'ai-fallback' : 'ai'}`}>
                          {tenant.isBlocked ? 'Заблокирован' : 'Активен'}
                        </span>
                      </div>
                      {isPlatformAdmin && (
                        <button class="secondary-link" type="button" onClick={() => void handleToggleTenantBlocked(tenant)}>
                          {tenant.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                        </button>
                      )}
                    </article>
                  ))}
                  {tenants.length === 0 && <div class="empty-state">Тенантов пока нет — создайте первого выше.</div>}
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

            {screen === 'news' && (
              <div class="admin-page">
                <div class="news-feed">
                  <article class="news-card">
                    <div class="news-card-header">
                      <span class="news-badge">Запуск</span>
                      <time class="news-date">10 мая 2025</time>
                    </div>
                    <h3 class="news-title">Ура, мы наконец-то запустились! 🎉</h3>
                    <p class="news-body">
                      SupportPulse официально открывает двери. Теперь вы можете принимать обращения
                      клиентов, отвечать на них с помощью AI или подключаться к чату вручную.
                      Спасибо всем, кто ждал — это только начало.
                    </p>
                  </article>
                </div>
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
                      setKnowledgeNotice(null)
                      setAddingFaqTopicId(null)
                      setEditingFaqId(null)
                      setKnowledgeDocuments([])
                      setSelectedUploadFile(null)
                      setSeenTicketIds(null)
                      setNewTicketToast(null)
                      setUnseenTicketCount(0)
                      setTenants([])
                      setPlatformMetrics(null)
                      setTenantsNotice(null)
                      setNewTenantName('')
                      setTicketNotes([])
                      setNewNoteDraft('')
                      setNoteError(null)
                      setTemplates([])
                      setShowTemplatePicker(false)
                      setShowTemplateManager(false)
                      setTemplatesNotice(null)
                      setNewTemplateTitle('')
                      setNewTemplateContent('')
                      setEditingTemplateId(null)
                      setClosingTicket(false)
                      setCloseCategory('')
                      setCloseReasonText('')
                      setCloseError(null)
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
