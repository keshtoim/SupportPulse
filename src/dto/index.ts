// ─── dto/index.ts ─────────────────────────────────────────────────────────────
// DTO (Data Transfer Objects) — то, что реально летит по сети.
// Этот файл импортируют и фронт (React/Preact), и бек (Express).
//
// Правила:
//   • camelCase — стандарт для JSON API и React/Preact компонентов
//   • Бек маппит snake_case Supabase → camelCase DTO перед отправкой
//   • Даты — string ISO 8601 (JSON не знает тип Date)
//   • null вместо undefined там, где Supabase возвращает NULL
//   • Вложенные объекты там, где фронту нужны данные за один запрос

import type {
  UserRole,
  TicketStatus,
  SessionState,
  SenderType,
  TicketPriority,
  TicketChannel,
  TicketStatusFilter,
} from "../enums";

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ── User ──────────────────────────────────────────────────────────────────────

/** Безопасное представление пользователя для фронта.
 *  Supabase Auth управляет паролем — его здесь нет никогда. */
export interface UserDTO {
  userId: string;       // uuid
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

// ── Topic & FAQ ───────────────────────────────────────────────────────────────

export interface TopicDTO {
  topicId: string;
  title: string;
  faqCount: number;
}

export interface FAQItemDTO {
  faqId: string;
  topicId: string;
  question: string;
  answer: string;
}

/** Тема со вложенными FAQ — один запрос для виджета (FR-010, FR-011) */
export interface TopicWithFAQDTO extends TopicDTO {
  items: FAQItemDTO[];
}

// ── Session ───────────────────────────────────────────────────────────────────

export interface DialogueSessionDTO {
  sessionId: string;
  state: SessionState;
  createdAt: string;
}

// ── Message ───────────────────────────────────────────────────────────────────

export interface MessageDTO {
  messageId: string;
  sessionId: string;
  ticketId: string | null;
  senderType: SenderType;
  senderName: string | null;  // имя оператора если senderType === "operator"
  content: string;
  sentAt: string;
}

// ── AI streaming chunk ────────────────────────────────────────────────────────
// LangChain.js стримит ответ OpenAI через SSE (Server-Sent Events).
// Виджет (Preact) слушает EventSource и собирает чанки в строку.

export interface AIStreamChunk {
  sessionId: string;
  delta: string;        // очередной кусок текста от GPT-4o-mini
  done: boolean;        // последний чанк — можно рендерить финальное сообщение
  escalate?: boolean;   // LangChain решил эскалировать по ходу стриминга
}

// ── Ticket ────────────────────────────────────────────────────────────────────

/** Краткая карточка для списка / очереди (FR-040) */
export interface TicketSummaryDTO {
  ticketId: string;
  status: TicketStatus;
  priority: TicketPriority;
  channel: TicketChannel;
  clientName: string | null;
  assignedOperatorName: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Полная карточка тикета с историей (FR-045) */
export interface TicketDetailDTO extends TicketSummaryDTO {
  sessionId: string;
  messages: MessageDTO[];
  internalNotes: string | null;   // видно только оператору/супервизору
  closureCategory: string | null;
  assignedUserId: string | null;
}

export interface TicketListQueryDTO {
  status?: TicketStatusFilter;
  priority?: TicketPriority;
  channel?: TicketChannel;
  search?: string;
  page?: number;
  pageSize?: number;
}

// ── Realtime event (Supabase Realtime) ───────────────────────────────────────
// Adminка оператора (React + Vite) подписывается на supabase.channel()
// и получает эти события без polling'а.

export type RealtimeEventType =
  | "ticket.created"      // новый тикет → обновить очередь
  | "ticket.assigned"     // тикет назначен → обновить карточку
  | "ticket.status"       // сменился статус
  | "message.new";        // новое сообщение в тикете

export interface RealtimeEvent<T = unknown> {
  type: RealtimeEventType;
  tenantId: string;
  payload: T;
}

// ── Widget Config ─────────────────────────────────────────────────────────────

export interface WidgetConfigDTO {
  brandColor: string;
  welcomeMessage: string;
  logoUrl: string | null;
  privacyPolicyUrl: string | null;
}
