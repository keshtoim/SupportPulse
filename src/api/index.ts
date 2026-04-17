// ─── api/index.ts ─────────────────────────────────────────────────────────────
// API-контракт: типы всех запросов и ответов.
// Бек (Express) реализует эти типы в роутах.
// Фронт (React/Preact + Vite) использует их при вызове fetch.
//
// Аутентификация: Supabase Auth JWT в заголовке Authorization: Bearer <token>
// Бек проверяет токен через supabase.auth.getUser(token)

import {
  UserDTO,
  TopicWithFAQDTO,
  FAQItemDTO,
  TopicDTO,
  MessageDTO,
  TicketSummaryDTO,
  TicketDetailDTO,
  DialogueSessionDTO,
  WidgetConfigDTO,
  PaginatedResponse,
} from "../dto";
import { TicketStatus, UserRole } from "../enums";

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH  (FR-001 – FR-004)
// Supabase Auth — пароли не хранятся на нашем беке.
// ═══════════════════════════════════════════════════════════════════════════════

// POST /auth/login
// Бек вызывает supabase.auth.signInWithPassword(), возвращает сессию клиенту.
export interface LoginRequest {
  email: string;
  password: string;
}
export interface LoginResponse {
  accessToken: string;  // Supabase JWT — передаётся в каждый последующий запрос
  user: UserDTO;
}

// POST /auth/logout
export interface LogoutResponse {
  success: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WIDGET — публичные endpoints без авторизации
// Preact-виджет встраивается на сайт клиента и вызывает эти endpoint'ы
// ═══════════════════════════════════════════════════════════════════════════════

// GET /widget/:tenantId/config
export type GetWidgetConfigResponse = WidgetConfigDTO;

// GET /widget/:tenantId/topics  (FR-010, FR-011)
export type GetTopicsResponse = TopicWithFAQDTO[];

// GET /widget/:tenantId/faq/search?q=...  (FR-012)
export interface SearchFAQRequest {
  q: string;
}
export interface SearchFAQResponse {
  results: FAQItemDTO[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIALOGUE SESSION — чат клиента в виджете
// ═══════════════════════════════════════════════════════════════════════════════

// POST /sessions
export interface CreateSessionRequest {
  tenantId: string;    // uuid
  clientContactInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}
export interface CreateSessionResponse {
  session: DialogueSessionDTO;
}

// POST /sessions/:sessionId/messages  (FR-020)
// Синхронный endpoint — возвращает ответ целиком (короткие ответы).
// Для стриминга — использовать SSE endpoint ниже.
export interface SendMessageRequest {
  content: string;
}
export interface SendMessageResponse {
  userMessage: MessageDTO;
  aiReply: MessageDTO | null;    // null если сразу эскалация
  escalated: boolean;
  ticket: TicketSummaryDTO | null;
}

// GET /sessions/:sessionId/stream  — SSE стриминг ответа LangChain/OpenAI
// Виджет (Preact) подключается через EventSource:
//   const es = new EventSource(`/sessions/${id}/stream?content=...`)
//   es.onmessage = (e) => { const chunk: AIStreamChunk = JSON.parse(e.data) }
// Типы чанков описаны в dto/index.ts → AIStreamChunk

// POST /sessions/:sessionId/escalate  (FR-030)
export interface EscalateSessionRequest {
  reason?: string;
}
export interface EscalateSessionResponse {
  ticket: TicketSummaryDTO;
  session: DialogueSessionDTO;
}

// GET /sessions/:sessionId/messages
export type GetSessionMessagesResponse = MessageDTO[];

// ═══════════════════════════════════════════════════════════════════════════════
// TICKETS — операторская обработка (FR-040 – FR-046)
// Realtime-обновления через Supabase channel (см. RealtimeEvent в dto/)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /tickets?status=...&page=...&pageSize=...
export interface GetTicketsRequest {
  status?: TicketStatus;
  page?: number;
  pageSize?: number;
}
export type GetTicketsResponse = PaginatedResponse<TicketSummaryDTO>;

// GET /tickets/:ticketId
export type GetTicketDetailResponse = TicketDetailDTO;

// PATCH /tickets/:ticketId/assign  (FR-042)
export interface AssignTicketRequest {
  assignedUserId: string;  // uuid
}
export interface AssignTicketResponse {
  ticket: TicketSummaryDTO;
}

// PATCH /tickets/:ticketId/status  (FR-041)
export interface UpdateTicketStatusRequest {
  status: TicketStatus;
}
export interface UpdateTicketStatusResponse {
  ticket: TicketSummaryDTO;
}

// POST /tickets/:ticketId/messages  (FR-035)
export interface ReplyToTicketRequest {
  content: string;
}
export interface ReplyToTicketResponse {
  message: MessageDTO;
}

// PATCH /tickets/:ticketId/notes  (FR-043)
export interface UpdateInternalNotesRequest {
  internalNotes: string;
}
export interface UpdateInternalNotesResponse {
  ticket: TicketDetailDTO;
}

// POST /tickets/:ticketId/close  (FR-046)
export interface CloseTicketRequest {
  closureCategory: string;
}
export interface CloseTicketResponse {
  ticket: TicketSummaryDTO;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPANY ADMIN — управление темами, FAQ, виджетом (FR-050 – FR-055)
// ═══════════════════════════════════════════════════════════════════════════════

export type GetAdminTopicsResponse = TopicDTO[];

export interface CreateTopicRequest { title: string; }
export interface CreateTopicResponse { topic: TopicDTO; }

export interface UpdateTopicRequest { title?: string; isPublished?: boolean; }
export interface UpdateTopicResponse { topic: TopicDTO; }

export interface DeleteTopicResponse { success: boolean; }

export interface CreateFAQItemRequest {
  question: string;
  answer: string;
}
export interface CreateFAQItemResponse { item: FAQItemDTO; }

export interface UpdateFAQItemRequest {
  question?: string;
  answer?: string;
  isPublished?: boolean;
}
export interface UpdateFAQItemResponse { item: FAQItemDTO; }

export interface DeleteFAQItemResponse { success: boolean; }

// PUT /admin/widget-config  (FR-050)
export interface UpdateWidgetConfigRequest {
  brandColor?: string;
  welcomeMessage?: string;
  logoUrl?: string;
  privacyPolicyUrl?: string;
}
export interface UpdateWidgetConfigResponse { config: WidgetConfigDTO; }

// ═══════════════════════════════════════════════════════════════════════════════
// USERS — управление операторами (FR-002, FR-005, FR-055)
// ═══════════════════════════════════════════════════════════════════════════════

export type GetUsersResponse = UserDTO[];

// POST /admin/users
// Бек вызывает supabase.auth.admin.createUser() + вставляет запись в public.users
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}
export interface CreateUserResponse { user: UserDTO; }

export interface UpdateUserRequest {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}
export interface UpdateUserResponse { user: UserDTO; }

// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM ADMIN — управление тенантами (FR-070 – FR-072)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TenantDTO {
  tenantId: string;    // uuid
  name: string;
  isBlocked: boolean;
  createdAt: string;
}

export type GetTenantsResponse = TenantDTO[];

export interface CreateTenantRequest { name: string; }
export interface CreateTenantResponse { tenant: TenantDTO; }

export interface UpdateTenantRequest { isBlocked?: boolean; name?: string; }
export interface UpdateTenantResponse { tenant: TenantDTO; }

