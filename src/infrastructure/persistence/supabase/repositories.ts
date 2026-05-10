import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditLogRepository,
  DialogueSessionRepository,
  FaqRepository,
  MessageRepository,
  RefreshTokenRecord,
  RefreshTokenRepository,
  TenantRepository,
  TicketRepository,
  TopicRepository,
  UserRepository,
  WidgetConfigRepository
} from "../../../application/ports";
import type {
  AuditLog,
  DialogueSession,
  FaqArticle,
  Message,
  Tenant,
  Ticket,
  Topic,
  User,
  WidgetConfig
} from "../../../domain/model";

// ---------- row types ----------

type TenantRow = { tenant_id: string; name: string; is_blocked: boolean; created_at: string };
type UserRow = { user_id: string; tenant_id: string | null; name: string; email: string; role: string; password_hash: string; is_blocked: boolean; created_at: string };
type TopicRow = { topic_id: string; tenant_id: string; title: string; created_at: string };
type FaqRow = { faq_id: string; topic_id: string; tenant_id: string; question: string; answer: string; created_at: string; updated_at: string };
type WidgetConfigRow = { config_id: string; tenant_id: string; brand_color: string; welcome_message: string; tone_of_voice: string; show_privacy_notice: boolean; privacy_notice: string | null; created_at: string; updated_at: string };
type SessionRow = { session_id: string; tenant_id: string; state: string; customer_name: string | null; customer_email: string | null; last_knowledge_article_ids: string[]; created_at: string; updated_at: string };
type MessageRow = { message_id: string; session_id: string; ticket_id: string | null; sender_type: string; content: string; metadata: Record<string, unknown>; created_at: string };
type TicketRow = { ticket_id: string; tenant_id: string; session_id: string; status: string; assigned_user_id: string | null; reason: string; requested_by: string; closed_reason: string | null; created_at: string; updated_at: string };
type AuditLogRow = { audit_id: string; tenant_id: string | null; actor_user_id: string | null; action: string; entity_type: string; entity_id: string; payload: Record<string, unknown>; created_at: string };
type RefreshTokenRow = { token: string; user_id: string; expires_at: string };

// ---------- mappers ----------

const toTenant = (r: TenantRow): Tenant => ({ id: r.tenant_id, name: r.name, isBlocked: r.is_blocked, createdAt: r.created_at });
const toUser = (r: UserRow): User => ({ id: r.user_id, tenantId: r.tenant_id, name: r.name, email: r.email, role: r.role as User["role"], passwordHash: r.password_hash, isBlocked: r.is_blocked, createdAt: r.created_at });
const toTopic = (r: TopicRow): Topic => ({ id: r.topic_id, tenantId: r.tenant_id, title: r.title, createdAt: r.created_at });
const toFaq = (r: FaqRow): FaqArticle => ({ id: r.faq_id, topicId: r.topic_id, tenantId: r.tenant_id, question: r.question, answer: r.answer, createdAt: r.created_at, updatedAt: r.updated_at });
const toWidgetConfig = (r: WidgetConfigRow): WidgetConfig => ({ id: r.config_id, tenantId: r.tenant_id, brandColor: r.brand_color, welcomeMessage: r.welcome_message, toneOfVoice: r.tone_of_voice, showPrivacyNotice: r.show_privacy_notice, privacyNotice: r.privacy_notice, createdAt: r.created_at, updatedAt: r.updated_at });
const toSession = (r: SessionRow): DialogueSession => ({ id: r.session_id, tenantId: r.tenant_id, state: r.state as DialogueSession["state"], customerName: r.customer_name, customerEmail: r.customer_email, lastKnowledgeArticleIds: r.last_knowledge_article_ids ?? [], createdAt: r.created_at, updatedAt: r.updated_at });
const toMessage = (r: MessageRow): Message => ({ id: r.message_id, sessionId: r.session_id, ticketId: r.ticket_id, senderType: r.sender_type as Message["senderType"], content: r.content, metadata: r.metadata ?? {}, createdAt: r.created_at });
const toTicket = (r: TicketRow): Ticket => ({ id: r.ticket_id, tenantId: r.tenant_id, sessionId: r.session_id, status: r.status as Ticket["status"], assignedUserId: r.assigned_user_id, reason: r.reason, requestedBy: r.requested_by, closedReason: r.closed_reason, createdAt: r.created_at, updatedAt: r.updated_at });
const toAuditLog = (r: AuditLogRow): AuditLog => ({ id: r.audit_id, tenantId: r.tenant_id, actorUserId: r.actor_user_id, action: r.action, entityType: r.entity_type, entityId: r.entity_id, payload: r.payload ?? {}, createdAt: r.created_at });

// ---------- helpers ----------

async function mustSelect<T>(promise: ReturnType<SupabaseClient["from"]>["select"] extends (...args: unknown[]) => Promise<infer R> ? Promise<R> : never, map: (row: unknown) => T): Promise<T[]> {
  const { data, error } = await (promise as Promise<{ data: unknown[] | null; error: unknown }>);
  if (error) throw new Error(String(error));
  return (data ?? []).map(map);
}

// ---------- repositories ----------

export class SupabaseTenantRepository implements TenantRepository {
  constructor(private readonly db: SupabaseClient) {}

  async list(): Promise<Tenant[]> {
    const { data, error } = await this.db.from("tenants").select("*").order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => toTenant(r as TenantRow));
  }

  async getById(id: string): Promise<Tenant | null> {
    const { data, error } = await this.db.from("tenants").select("*").eq("tenant_id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toTenant(data as TenantRow) : null;
  }

  async create(tenant: Tenant): Promise<Tenant> {
    const { data, error } = await this.db.from("tenants").insert({ tenant_id: tenant.id, name: tenant.name, is_blocked: tenant.isBlocked, created_at: tenant.createdAt }).select().single();
    if (error) throw new Error(error.message);
    return toTenant(data as TenantRow);
  }

  async update(tenant: Tenant): Promise<Tenant> {
    const { data, error } = await this.db.from("tenants").update({ name: tenant.name, is_blocked: tenant.isBlocked }).eq("tenant_id", tenant.id).select().single();
    if (error) throw new Error(error.message);
    return toTenant(data as TenantRow);
  }
}

export class SupabaseUserRepository implements UserRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.db.from("users").select("*").ilike("email", email).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toUser(data as UserRow) : null;
  }

  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.db.from("users").select("*").eq("user_id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toUser(data as UserRow) : null;
  }

  async listByTenant(tenantId: string): Promise<User[]> {
    const { data, error } = await this.db.from("users").select("*").eq("tenant_id", tenantId).order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => toUser(r as UserRow));
  }

  async update(user: User): Promise<User> {
    const { data, error } = await this.db.from("users").update({ name: user.name, email: user.email, role: user.role, is_blocked: user.isBlocked, password_hash: user.passwordHash }).eq("user_id", user.id).select().single();
    if (error) throw new Error(error.message);
    return toUser(data as UserRow);
  }
}

export class SupabaseTopicRepository implements TopicRepository {
  constructor(private readonly db: SupabaseClient) {}

  async listByTenant(tenantId: string): Promise<Topic[]> {
    const { data, error } = await this.db.from("topics").select("*").eq("tenant_id", tenantId).order("title");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => toTopic(r as TopicRow));
  }

  async getById(id: string): Promise<Topic | null> {
    const { data, error } = await this.db.from("topics").select("*").eq("topic_id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toTopic(data as TopicRow) : null;
  }
}

export class SupabaseFaqRepository implements FaqRepository {
  constructor(private readonly db: SupabaseClient) {}

  async listByTenant(tenantId: string): Promise<FaqArticle[]> {
    const { data, error } = await this.db.from("faq_articles").select("*").eq("tenant_id", tenantId).order("question");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => toFaq(r as FaqRow));
  }

  async searchByTenant(tenantId: string, query: string): Promise<FaqArticle[]> {
    const { data, error } = await this.db.from("faq_articles").select("*").eq("tenant_id", tenantId).or(`question.ilike.%${query}%,answer.ilike.%${query}%`);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => toFaq(r as FaqRow));
  }

  async getById(id: string): Promise<FaqArticle | null> {
    const { data, error } = await this.db.from("faq_articles").select("*").eq("faq_id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toFaq(data as FaqRow) : null;
  }

  async create(article: FaqArticle): Promise<FaqArticle> {
    const { data, error } = await this.db.from("faq_articles").insert({ faq_id: article.id, topic_id: article.topicId, tenant_id: article.tenantId, question: article.question, answer: article.answer, created_at: article.createdAt, updated_at: article.updatedAt }).select().single();
    if (error) throw new Error(error.message);
    return toFaq(data as FaqRow);
  }

  async update(article: FaqArticle): Promise<FaqArticle> {
    const { data, error } = await this.db.from("faq_articles").update({ question: article.question, answer: article.answer, updated_at: article.updatedAt }).eq("faq_id", article.id).select().single();
    if (error) throw new Error(error.message);
    return toFaq(data as FaqRow);
  }
}

export class SupabaseWidgetConfigRepository implements WidgetConfigRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getByTenantId(tenantId: string): Promise<WidgetConfig | null> {
    const { data, error } = await this.db.from("widget_configs").select("*").eq("tenant_id", tenantId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toWidgetConfig(data as WidgetConfigRow) : null;
  }

  async upsert(config: WidgetConfig): Promise<WidgetConfig> {
    const { data, error } = await this.db.from("widget_configs").upsert({ config_id: config.id, tenant_id: config.tenantId, brand_color: config.brandColor, welcome_message: config.welcomeMessage, tone_of_voice: config.toneOfVoice, show_privacy_notice: config.showPrivacyNotice, privacy_notice: config.privacyNotice, updated_at: config.updatedAt }, { onConflict: "tenant_id" }).select().single();
    if (error) throw new Error(error.message);
    return toWidgetConfig(data as WidgetConfigRow);
  }
}

export class SupabaseDialogueSessionRepository implements DialogueSessionRepository {
  constructor(private readonly db: SupabaseClient) {}

  async listByTenant(tenantId: string): Promise<DialogueSession[]> {
    const { data, error } = await this.db.from("dialogue_sessions").select("*").eq("tenant_id", tenantId).order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => toSession(r as SessionRow));
  }

  async getById(id: string): Promise<DialogueSession | null> {
    const { data, error } = await this.db.from("dialogue_sessions").select("*").eq("session_id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toSession(data as SessionRow) : null;
  }

  async create(session: DialogueSession): Promise<DialogueSession> {
    const { data, error } = await this.db.from("dialogue_sessions").insert({ session_id: session.id, tenant_id: session.tenantId, state: session.state, customer_name: session.customerName, customer_email: session.customerEmail, last_knowledge_article_ids: session.lastKnowledgeArticleIds, created_at: session.createdAt, updated_at: session.updatedAt }).select().single();
    if (error) throw new Error(error.message);
    return toSession(data as SessionRow);
  }

  async update(session: DialogueSession): Promise<DialogueSession> {
    const { data, error } = await this.db.from("dialogue_sessions").update({ state: session.state, customer_name: session.customerName, customer_email: session.customerEmail, last_knowledge_article_ids: session.lastKnowledgeArticleIds, updated_at: session.updatedAt }).eq("session_id", session.id).select().single();
    if (error) throw new Error(error.message);
    return toSession(data as SessionRow);
  }
}

export class SupabaseMessageRepository implements MessageRepository {
  constructor(private readonly db: SupabaseClient) {}

  async listBySession(sessionId: string): Promise<Message[]> {
    const { data, error } = await this.db.from("messages").select("*").eq("session_id", sessionId).order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => toMessage(r as MessageRow));
  }

  async listByTicket(ticketId: string): Promise<Message[]> {
    const { data, error } = await this.db.from("messages").select("*").eq("ticket_id", ticketId).order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => toMessage(r as MessageRow));
  }

  async create(message: Message): Promise<Message> {
    const isTransient = (msg: string) =>
      msg.includes("AbortError") || msg.includes("terminated") || msg.includes("ECONNRESET") || msg.includes("fetch failed");

    for (let attempt = 0; attempt <= 2; attempt++) {
      const { data, error } = await this.db
        .from("messages")
        .insert({ message_id: message.id, session_id: message.sessionId, ticket_id: message.ticketId, sender_type: message.senderType, content: message.content, metadata: message.metadata ?? {}, created_at: message.createdAt })
        .select()
        .single();
      if (!error) return toMessage(data as MessageRow);
      if (attempt < 2 && isTransient(error.message)) {
        await new Promise<void>((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
        continue;
      }
      throw new Error(error.message);
    }
    throw new Error("Не удалось сохранить сообщение после нескольких попыток.");
  }
}

export class SupabaseTicketRepository implements TicketRepository {
  constructor(private readonly db: SupabaseClient) {}

  async listAll(): Promise<Ticket[]> {
    const { data, error } = await this.db.from("tickets").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => toTicket(r as TicketRow));
  }

  async listByTenant(tenantId: string): Promise<Ticket[]> {
    const { data, error } = await this.db.from("tickets").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => toTicket(r as TicketRow));
  }

  async findBySessionId(sessionId: string): Promise<Ticket | null> {
    const { data, error } = await this.db.from("tickets").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toTicket(data as TicketRow) : null;
  }

  async getById(id: string): Promise<Ticket | null> {
    const { data, error } = await this.db.from("tickets").select("*").eq("ticket_id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toTicket(data as TicketRow) : null;
  }

  async create(ticket: Ticket): Promise<Ticket> {
    const { data, error } = await this.db.from("tickets").insert({ ticket_id: ticket.id, tenant_id: ticket.tenantId, session_id: ticket.sessionId, status: ticket.status, assigned_user_id: ticket.assignedUserId, reason: ticket.reason, requested_by: ticket.requestedBy, closed_reason: ticket.closedReason, created_at: ticket.createdAt, updated_at: ticket.updatedAt }).select().single();
    if (error) throw new Error(error.message);
    return toTicket(data as TicketRow);
  }

  async update(ticket: Ticket): Promise<Ticket> {
    const { data, error } = await this.db.from("tickets").update({ status: ticket.status, assigned_user_id: ticket.assignedUserId, closed_reason: ticket.closedReason, updated_at: ticket.updatedAt }).eq("ticket_id", ticket.id).select().single();
    if (error) throw new Error(error.message);
    return toTicket(data as TicketRow);
  }
}

export class SupabaseAuditLogRepository implements AuditLogRepository {
  constructor(private readonly db: SupabaseClient) {}

  async add(entry: AuditLog): Promise<AuditLog> {
    const { data, error } = await this.db.from("audit_logs").insert({ audit_id: entry.id, tenant_id: entry.tenantId, actor_user_id: entry.actorUserId, action: entry.action, entity_type: entry.entityType, entity_id: entry.entityId, payload: entry.payload, created_at: entry.createdAt }).select().single();
    if (error) throw new Error(error.message);
    return toAuditLog(data as AuditLogRow);
  }

  async listByTenant(tenantId: string | null): Promise<AuditLog[]> {
    const query = this.db.from("audit_logs").select("*").order("created_at", { ascending: false });
    const { data, error } = await (tenantId === null ? query.is("tenant_id", null) : query.eq("tenant_id", tenantId));
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => toAuditLog(r as AuditLogRow));
  }
}

export class SupabaseRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly db: SupabaseClient) {}

  async save(record: RefreshTokenRecord): Promise<void> {
    const { error } = await this.db.from("refresh_tokens").upsert({ token: record.token, user_id: record.userId, expires_at: record.expiresAt });
    if (error) throw new Error(error.message);
  }

  async get(token: string): Promise<RefreshTokenRecord | null> {
    const { data, error } = await this.db.from("refresh_tokens").select("*").eq("token", token).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const r = data as RefreshTokenRow;
    return { token: r.token, userId: r.user_id, expiresAt: r.expires_at };
  }

  async revoke(token: string): Promise<void> {
    const { error } = await this.db.from("refresh_tokens").delete().eq("token", token);
    if (error) throw new Error(error.message);
  }
}

export const createSupabaseRepositories = (db: SupabaseClient) => ({
  tenantRepository: new SupabaseTenantRepository(db),
  userRepository: new SupabaseUserRepository(db),
  topicRepository: new SupabaseTopicRepository(db),
  faqRepository: new SupabaseFaqRepository(db),
  widgetConfigRepository: new SupabaseWidgetConfigRepository(db),
  sessionRepository: new SupabaseDialogueSessionRepository(db),
  messageRepository: new SupabaseMessageRepository(db),
  ticketRepository: new SupabaseTicketRepository(db),
  auditLogRepository: new SupabaseAuditLogRepository(db),
  refreshTokenRepository: new SupabaseRefreshTokenRepository(db)
});
