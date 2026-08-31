import type {
  AuditLog,
  AuthenticatedUser,
  DialogueSession,
  FaqArticle,
  KnowledgeChunk,
  KnowledgeDocument,
  Message,
  RankedKnowledgeChunk,
  ResponseTemplate,
  SupportReplyContext,
  SupportReplyDecision,
  Tenant,
  Ticket,
  TicketNote,
  TicketStatus,
  Topic,
  User,
  WidgetConfig
} from "../domain/model";

/** Payload, хранимый внутри JWT-токена */
export interface AuthTokenPayload {
  sub: string;
  tenantId: string | null;
  role: AuthenticatedUser["role"];
  email: string;
  name: string;
}

/** Запись refresh-токена в хранилище */
export interface RefreshTokenRecord {
  token: string;
  userId: string;
  expiresAt: string;
}

/** Генератор уникальных идентификаторов с префиксом */
export interface IdGenerator {
  next(prefix: string): string;
}

/** Источник текущего времени — выделен для упрощения тестирования */
export interface Clock {
  now(): Date;
}

/** Проверка паролей */
export interface PasswordService {
  compare(plainText: string, hash: string): Promise<boolean>;
}

/** Генерация и верификация JWT access/refresh токенов */
export interface TokenService {
  generateAccessToken(payload: AuthTokenPayload): string;
  generateRefreshToken(payload: AuthTokenPayload): RefreshTokenRecord;
  verifyAccessToken(token: string): AuthTokenPayload;
  verifyRefreshToken(token: string): AuthTokenPayload;
}

/** AI-сервис, принимающий вопрос и контекст, возвращающий решение об ответе */
export interface SupportAnswerService {
  answer(context: SupportReplyContext): Promise<SupportReplyDecision>;
  /** true — LLM подключён; false — работает в fallback-режиме по FAQ */
  isLlmEnabled(): boolean;
}

/** Извлекает текст из загруженного файла базы знаний (PDF/DOCX) */
export interface DocumentTextExtractor {
  extract(file: { buffer: Buffer; mimeType: string; fileName: string }): Promise<string>;
}

/** Отправка email-уведомлений (FR-062). Без SMTP-конфигурации — выключен (fallback-режим, как AI/эмбеддинги) */
export interface EmailService {
  isEnabled(): boolean;
  send(params: { to: string[]; subject: string; text: string }): Promise<void>;
}

/** Строит векторные представления текста для семантического поиска (RAG). Без ключа — выключен (fallback-режим) */
export interface EmbeddingService {
  isEnabled(): boolean;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

// --- Репозитории — абстракции над хранилищем данных ---

export interface TenantRepository {
  list(): Promise<Tenant[]>;
  getById(id: string): Promise<Tenant | null>;
  create(tenant: Tenant): Promise<Tenant>;
  update(tenant: Tenant): Promise<Tenant>;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  listByTenant(tenantId: string): Promise<User[]>;
  update(user: User): Promise<User>;
  /** Общее число пользователей на платформе (для агрегированных метрик, без выгрузки всех строк) */
  countAll(): Promise<number>;
}

export interface TopicRepository {
  listByTenant(tenantId: string): Promise<Topic[]>;
  getById(id: string): Promise<Topic | null>;
  create(topic: Topic): Promise<Topic>;
}

export interface FaqRepository {
  listByTenant(tenantId: string): Promise<FaqArticle[]>;
  searchByTenant(tenantId: string, query: string): Promise<FaqArticle[]>;
  getById(id: string): Promise<FaqArticle | null>;
  create(article: FaqArticle): Promise<FaqArticle>;
  update(article: FaqArticle): Promise<FaqArticle>;
}

export interface WidgetConfigRepository {
  getByTenantId(tenantId: string): Promise<WidgetConfig | null>;
  upsert(config: WidgetConfig): Promise<WidgetConfig>;
}

export interface DialogueSessionRepository {
  listByTenant(tenantId: string): Promise<DialogueSession[]>;
  getById(id: string): Promise<DialogueSession | null>;
  create(session: DialogueSession): Promise<DialogueSession>;
  update(session: DialogueSession): Promise<DialogueSession>;
  /** Общее число сессий на платформе (для агрегированных метрик, без выгрузки всех строк) */
  countAll(): Promise<number>;
}

export interface MessageRepository {
  listBySession(sessionId: string): Promise<Message[]>;
  /** Последние `limit` сообщений сессии в хронологическом порядке — для контекста LLM, без выгрузки всей истории */
  listRecentBySession(sessionId: string, limit: number): Promise<Message[]>;
  create(message: Message): Promise<Message>;
}

export interface TicketRepository {
  listAll(): Promise<Ticket[]>;
  listByTenant(tenantId: string): Promise<Ticket[]>;
  findBySessionId(sessionId: string): Promise<Ticket | null>;
  getById(id: string): Promise<Ticket | null>;
  create(ticket: Ticket): Promise<Ticket>;
  update(ticket: Ticket): Promise<Ticket>;
}

export interface KnowledgeDocumentRepository {
  listByTenant(tenantId: string): Promise<KnowledgeDocument[]>;
  getById(id: string): Promise<KnowledgeDocument | null>;
  create(document: KnowledgeDocument): Promise<KnowledgeDocument>;
  delete(id: string): Promise<void>;
}

export interface KnowledgeChunkRepository {
  createMany(chunks: KnowledgeChunk[]): Promise<void>;
  deleteByDocumentId(documentId: string): Promise<void>;
  searchByTenant(tenantId: string, queryEmbedding: number[], limit: number): Promise<RankedKnowledgeChunk[]>;
}

export interface TicketNoteRepository {
  listByTicket(ticketId: string): Promise<TicketNote[]>;
  create(note: TicketNote): Promise<TicketNote>;
}

export interface ResponseTemplateRepository {
  listByTenant(tenantId: string): Promise<ResponseTemplate[]>;
  getById(id: string): Promise<ResponseTemplate | null>;
  create(template: ResponseTemplate): Promise<ResponseTemplate>;
  update(template: ResponseTemplate): Promise<ResponseTemplate>;
  delete(id: string): Promise<void>;
}

export interface AuditLogRepository {
  add(entry: AuditLog): Promise<AuditLog>;
  listByTenant(tenantId: string | null): Promise<AuditLog[]>;
  listAll(): Promise<AuditLog[]>;
}

export interface RefreshTokenRepository {
  save(record: RefreshTokenRecord): Promise<void>;
  get(token: string): Promise<RefreshTokenRecord | null>;
  revoke(token: string): Promise<void>;
}
