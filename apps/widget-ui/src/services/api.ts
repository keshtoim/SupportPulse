import type {
  WidgetConfigDTO,
  TopicWithFAQDTO,
  FAQItemDTO,
  CreateSessionResponse,
  SendMessageResponse,
  EscalateSessionResponse,
  AIStreamChunk,
} from '@supportpulse/shared'

export type { WidgetConfigDTO, TopicWithFAQDTO, FAQItemDTO, AIStreamChunk, SendMessageResponse, EscalateSessionResponse }

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:3000'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export interface ContactInfo {
  name?: string
  email?: string
  phone?: string
}

export const api = {
  getConfig: (tenantId: string) =>
    get<WidgetConfigDTO>(`/widget/${tenantId}/config`),

  getTopics: (tenantId: string) =>
    get<TopicWithFAQDTO[]>(`/widget/${tenantId}/topics`),

  searchFAQ: (tenantId: string, q: string) =>
    get<{ results: FAQItemDTO[] }>(
      `/widget/${tenantId}/faq/search?q=${encodeURIComponent(q)}`
    ),

  createSession: (tenantId: string, contact?: ContactInfo) =>
    post<CreateSessionResponse>('/sessions', {
      tenantId,
      ...(contact && { clientContactInfo: contact }),
    }),

  sendMessage: (sessionId: string, content: string) =>
    post<SendMessageResponse>(`/sessions/${sessionId}/messages`, { content }),

  escalate: (sessionId: string) =>
    post<EscalateSessionResponse>(`/sessions/${sessionId}/escalate`, {}),

  streamUrl: (sessionId: string, content: string) =>
    `${BASE}/sessions/${sessionId}/stream?content=${encodeURIComponent(content)}`,
}
