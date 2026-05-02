import type {
  AuditLog,
  AuthenticatedUser,
  DialogueSession,
  FaqArticle,
  Message,
  SupportReplyContext,
  SupportReplyDecision,
  Tenant,
  Ticket,
  TicketStatus,
  Topic,
  User,
  WidgetConfig
} from "../domain/model";

export interface AuthTokenPayload {
  sub: string;
  tenantId: string | null;
  role: AuthenticatedUser["role"];
  email: string;
  name: string;
}

export interface RefreshTokenRecord {
  token: string;
  userId: string;
  expiresAt: string;
}

export interface IdGenerator {
  next(prefix: string): string;
}

export interface Clock {
  now(): Date;
}

export interface PasswordService {
  compare(plainText: string, hash: string): Promise<boolean>;
}

export interface TokenService {
  generateAccessToken(payload: AuthTokenPayload): string;
  generateRefreshToken(payload: AuthTokenPayload): RefreshTokenRecord;
  verifyAccessToken(token: string): AuthTokenPayload;
  verifyRefreshToken(token: string): AuthTokenPayload;
}

export interface SupportAnswerService {
  answer(context: SupportReplyContext): Promise<SupportReplyDecision>;
}

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
}

export interface TopicRepository {
  listByTenant(tenantId: string): Promise<Topic[]>;
  getById(id: string): Promise<Topic | null>;
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
}

export interface MessageRepository {
  listBySession(sessionId: string): Promise<Message[]>;
  listByTicket(ticketId: string): Promise<Message[]>;
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

export interface AuditLogRepository {
  add(entry: AuditLog): Promise<AuditLog>;
  listByTenant(tenantId: string | null): Promise<AuditLog[]>;
}

export interface RefreshTokenRepository {
  save(record: RefreshTokenRecord): Promise<void>;
  get(token: string): Promise<RefreshTokenRecord | null>;
  revoke(token: string): Promise<void>;
}
