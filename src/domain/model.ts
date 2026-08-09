// Роли пользователей в системе
export type UserRole = "operator" | "supervisor" | "company_admin" | "platform_admin";
// Статусы тикета поддержки
export type TicketStatus = "new" | "in_progress" | "waiting_client" | "closed";
// Категория закрытия тикета (FR-046)
export type TicketCloseCategory = "resolved" | "no_response" | "duplicate" | "out_of_scope" | "other";
// Состояния сессии диалога клиента
export type SessionState = "ai_active" | "waiting_operator" | "operator_connected" | "closed";
// Типы отправителей сообщений
export type SenderType = "client" | "ai" | "operator" | "system";

/** Организация-клиент, использующая платформу */
export interface Tenant {
  id: string;
  name: string;
  isBlocked: boolean;
  createdAt: string;
}

/** Пользователь системы (оператор, администратор компании и т.д.) */
export interface User {
  id: string;
  tenantId: string | null;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  isBlocked: boolean;
  createdAt: string;
}

/** Тематическая категория FAQ */
export interface Topic {
  id: string;
  tenantId: string;
  title: string;
  createdAt: string;
}

/** Статья базы знаний */
export interface FaqArticle {
  id: string;
  topicId: string;
  tenantId: string;
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}

// Статус обработки загруженного документа базы знаний
export type KnowledgeDocumentStatus = "processed" | "failed";

/** Загруженный файл (PDF/DOCX), из которого извлечён текст для базы знаний */
export interface KnowledgeDocument {
  id: string;
  tenantId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: KnowledgeDocumentStatus;
  extractedText: string | null;
  errorMessage: string | null;
  createdAt: string;
}

/** Фрагмент текста документа с векторным представлением — единица индекса для RAG-поиска */
export interface KnowledgeChunk {
  id: string;
  tenantId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  embedding: number[] | null;
  createdAt: string;
}

/** Фрагмент документа, найденный векторным поиском по релевантности вопросу */
export interface RankedKnowledgeChunk {
  chunkId: string;
  documentId: string;
  content: string;
  similarity: number;
}

/** Настройки виджета для конкретного тенанта */
export interface WidgetConfig {
  id: string;
  tenantId: string;
  brandColor: string;
  welcomeMessage: string;
  toneOfVoice: string;
  showPrivacyNotice: boolean;
  privacyNotice: string | null;
  // Email-уведомления о новых тикетах для operator/supervisor/company_admin тенанта (FR-062)
  emailNotificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Сессия диалога клиента с AI или оператором */
export interface DialogueSession {
  id: string;
  tenantId: string;
  state: SessionState;
  customerName: string | null;
  customerEmail: string | null;
  /** ID статей FAQ, использованных в последнем AI-ответе */
  lastKnowledgeArticleIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** Сообщение в рамках сессии или тикета */
export interface Message {
  id: string;
  sessionId: string;
  ticketId: string | null;
  senderType: SenderType;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

/** Тикет поддержки, создаётся при эскалации к оператору */
export interface Ticket {
  id: string;
  tenantId: string;
  sessionId: string;
  status: TicketStatus;
  assignedUserId: string | null;
  reason: string;
  requestedBy: string;
  closedCategory: TicketCloseCategory | null;
  closedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Внутренняя заметка оператора к тикету — не видна клиенту (FR-043) */
export interface TicketNote {
  id: string;
  ticketId: string;
  tenantId: string;
  authorUserId: string | null;
  authorName: string;
  content: string;
  createdAt: string;
}

/** Шаблон быстрого ответа оператора (FR-044) */
export interface ResponseTemplate {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/** Запись журнала аудита */
export interface AuditLog {
  id: string;
  tenantId: string | null;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

/** Публичное представление пользователя без хеша пароля */
export type PublicUser = Omit<User, "passwordHash">;

/** Данные авторизованного пользователя, хранимые в JWT и прикреплённые к запросу */
export interface AuthenticatedUser {
  id: string;
  tenantId: string | null;
  name: string;
  email: string;
  role: UserRole;
}

/** Входные данные для AI-сервиса при формировании ответа */
export interface SupportReplyContext {
  tenant: Tenant;
  widgetConfig: WidgetConfig;
  question: string;
  faqArticles: FaqArticle[];
  history: Message[];
  /** Фрагменты загруженных документов, найденные векторным поиском; пусто, если RAG выключен (нет ключа эмбеддингов) */
  retrievedChunks?: RankedKnowledgeChunk[];
}

/** Решение AI: ответить на основе FAQ / запросить уточнение / эскалировать к оператору */
export type SupportReplyDecision =
  | {
      kind: "answer";
      message: string;
      matchedArticleIds: string[];
      /** ID фрагментов документов, использованных при ответе (через RAG) */
      matchedChunkIds?: string[];
      confidence: number;
    }
  | {
      kind: "clarify";
      message: string;
    }
  | {
      kind: "escalate";
      message: string;
      reason: string;
    };

/** Базовый класс ошибок приложения с HTTP-кодом и машиночитаемым кодом */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly code = "APP_ERROR",
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** Возвращает пользователя без поля passwordHash */
export const toPublicUser = (user: User): PublicUser => {
  const { passwordHash: _, ...rest } = user;
  return rest;
};
