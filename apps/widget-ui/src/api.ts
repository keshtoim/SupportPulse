export type WidgetScreen = 'home' | 'chat'
export type AdminScreen = 'dashboard' | 'chats' | 'settings' | 'profile'
export type AppMode = 'widget' | 'admin'
export type SenderType = 'client' | 'ai' | 'operator' | 'system'
export type UserRole = 'operator' | 'supervisor' | 'company_admin' | 'platform_admin'
export type TicketStatus = 'new' | 'in_progress' | 'waiting_client' | 'closed'

export type WidgetConfig = {
  id: string
  tenantId: string
  brandColor: string
  welcomeMessage: string
  toneOfVoice: string
  showPrivacyNotice: boolean
  privacyNotice: string | null
}

export type FaqArticle = {
  id: string
  topicId: string
  tenantId: string
  question: string
  answer: string
}

export type Topic = {
  id: string
  tenantId: string
  title: string
  articles: FaqArticle[]
}

export type WidgetPayload = {
  tenant: {
    id: string
    name: string
  }
  widgetConfig: WidgetConfig
  topics: Topic[]
}

export type SessionRecord = {
  id: string
  tenantId: string
  state: string
  customerName: string | null
  customerEmail: string | null
  lastKnowledgeArticleIds: string[]
  createdAt: string
  updatedAt: string
}

export type MessageRecord = {
  id: string
  sessionId: string
  ticketId: string | null
  senderType: SenderType
  content: string
  createdAt: string
  metadata?: Record<string, unknown>
}

export type TicketRecord = {
  id: string
  tenantId: string
  sessionId: string
  status: TicketStatus
  assignedUserId: string | null
  reason: string
  requestedBy: string
  closedReason: string | null
  createdAt: string
  updatedAt: string
}

export type SessionMessagesResponse = {
  session: SessionRecord
  ticket: TicketRecord | null
  messages: MessageRecord[]
}

export type PostMessageResponse = {
  decision: string
  session: SessionRecord
  ticket?: TicketRecord | null
  reply?: MessageRecord
  clientMessage?: MessageRecord
}

export type AuthUser = {
  id: string
  tenantId: string | null
  name: string
  email: string
  role: UserRole
}

export type AuthResponse = {
  user: AuthUser
  tokens: {
    accessToken: string
    refreshToken: string
  }
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
export const DEFAULT_TENANT_ID = import.meta.env.VITE_DEFAULT_TENANT_ID ?? 'tenant-acme'
export const DEMO_ADMIN_EMAIL = 'admin@acme.dev'
export const DEMO_PASSWORD = 'Admin123!'

export const statusLabel: Record<TicketStatus, string> = {
  new: 'Новый тикет',
  in_progress: 'В работе',
  waiting_client: 'Ждёт клиента',
  closed: 'Закрыт',
}

export const senderLabel: Record<SenderType, string> = {
  client: 'Клиент',
  ai: 'AI',
  operator: 'Оператор',
  system: 'Система',
}

export const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

export const apiRequest = async <ResponseType,>(path: string, init: RequestInit = {}): Promise<ResponseType> => {
  const headers = new Headers(init.headers ?? {})

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  const rawBody = await response.text()
  let payload: unknown = null

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody)
    } catch {
      payload = rawBody
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message?: string }).message)
        : `Ошибка запроса (${response.status})`

    throw new Error(message)
  }

  return payload as ResponseType
}
