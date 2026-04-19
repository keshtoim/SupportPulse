import { hashSync } from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import type {
  AuditLogRepository,
  Clock,
  DialogueSessionRepository,
  FaqRepository,
  IdGenerator,
  MessageRepository,
  RefreshTokenRecord,
  RefreshTokenRepository,
  TenantRepository,
  TicketRepository,
  TopicRepository,
  UserRepository,
  WidgetConfigRepository
} from "../../../application/ports";
import type { AuditLog, DialogueSession, FaqArticle, Message, Tenant, Ticket, Topic, User, WidgetConfig } from "../../../domain/model";

const clone = <Value>(value: Value): Value => structuredClone(value);

class InMemoryDatabase {
  readonly tenants = new Map<string, Tenant>();
  readonly users = new Map<string, User>();
  readonly topics = new Map<string, Topic>();
  readonly faqArticles = new Map<string, FaqArticle>();
  readonly widgetConfigs = new Map<string, WidgetConfig>();
  readonly sessions = new Map<string, DialogueSession>();
  readonly messages = new Map<string, Message>();
  readonly tickets = new Map<string, Ticket>();
  readonly auditLogs = new Map<string, AuditLog>();
  readonly refreshTokens = new Map<string, RefreshTokenRecord>();

  constructor() {
    this.seed();
  }

  private seed() {
    const createdAt = new Date("2026-04-01T10:00:00.000Z").toISOString();
    const passwordHash = hashSync("Admin123!", 10);

    const tenants: Tenant[] = [
      {
        id: "tenant-acme",
        name: "Acme College Services",
        isBlocked: false,
        createdAt
      },
      {
        id: "tenant-globex",
        name: "Globex Campus Support",
        isBlocked: false,
        createdAt
      }
    ];

    const users: User[] = [
      {
        id: "user-platform-admin",
        tenantId: null,
        name: "Администратор платформы",
        email: "platform@supportpulse.dev",
        role: "platform_admin",
        passwordHash,
        isBlocked: false,
        createdAt
      },
      {
        id: "user-company-admin",
        tenantId: "tenant-acme",
        name: "Администратор компании",
        email: "admin@acme.dev",
        role: "company_admin",
        passwordHash,
        isBlocked: false,
        createdAt
      },
      {
        id: "user-supervisor",
        tenantId: "tenant-acme",
        name: "Супервизор поддержки",
        email: "supervisor@acme.dev",
        role: "supervisor",
        passwordHash,
        isBlocked: false,
        createdAt
      },
      {
        id: "user-operator",
        tenantId: "tenant-acme",
        name: "Оператор поддержки",
        email: "operator@acme.dev",
        role: "operator",
        passwordHash,
        isBlocked: false,
        createdAt
      }
    ];

    const topics: Topic[] = [
      {
        id: "topic-payments",
        tenantId: "tenant-acme",
        title: "Оплата и возвраты",
        createdAt
      },
      {
        id: "topic-access",
        tenantId: "tenant-acme",
        title: "Доступ к личному кабинету",
        createdAt
      },
      {
        id: "topic-delivery",
        tenantId: "tenant-acme",
        title: "Заказы и доставка",
        createdAt
      }
    ];

    const faqArticles: FaqArticle[] = [
      {
        id: "faq-refund",
        tenantId: "tenant-acme",
        topicId: "topic-payments",
        question: "Как вернуть деньги за подписку?",
        answer:
          "Возврат можно оформить в течение 14 дней после оплаты. Для этого откройте раздел \"Платежи\" в личном кабинете и нажмите \"Запросить возврат\". Если оплата была по счёту, оператор запросит реквизиты вручную.",
        createdAt,
        updatedAt: createdAt
      },
      {
        id: "faq-cancel",
        tenantId: "tenant-acme",
        topicId: "topic-payments",
        question: "Как отменить автопродление подписки?",
        answer:
          "Автопродление отключается в личном кабинете в разделе \"Подписка\". После отключения доступ сохранится до конца уже оплаченного периода.",
        createdAt,
        updatedAt: createdAt
      },
      {
        id: "faq-password",
        tenantId: "tenant-acme",
        topicId: "topic-access",
        question: "Как восстановить пароль?",
        answer:
          "На странице входа нажмите \"Забыли пароль?\" и укажите почту, привязанную к аккаунту. На неё придёт письмо со ссылкой для восстановления доступа.",
        createdAt,
        updatedAt: createdAt
      },
      {
        id: "faq-delivery-status",
        tenantId: "tenant-acme",
        topicId: "topic-delivery",
        question: "Как узнать статус заказа?",
        answer:
          "Статус заказа отображается в личном кабинете в карточке заказа. Если нужен детальный трек-номер или заказ оформлен на другое лицо, уточните номер заказа в чате.",
        createdAt,
        updatedAt: createdAt
      }
    ];

    const widgetConfigs: WidgetConfig[] = [
      {
        id: "widget-acme",
        tenantId: "tenant-acme",
        brandColor: "#1F7AE0",
        welcomeMessage: "Здравствуйте! Я SupportPulse AI. Подскажу по FAQ или передам диалог оператору.",
        toneOfVoice: "дружелюбный, точный, спокойный",
        showPrivacyNotice: true,
        privacyNotice: "Отправляя сообщение, вы соглашаетесь на обработку данных для решения обращения.",
        createdAt,
        updatedAt: createdAt
      }
    ];

    for (const tenant of tenants) this.tenants.set(tenant.id, clone(tenant));
    for (const user of users) this.users.set(user.id, clone(user));
    for (const topic of topics) this.topics.set(topic.id, clone(topic));
    for (const article of faqArticles) this.faqArticles.set(article.id, clone(article));
    for (const config of widgetConfigs) this.widgetConfigs.set(config.tenantId, clone(config));
  }
}

export class UuidIdGenerator implements IdGenerator {
  next(prefix: string): string {
    return `${prefix}-${uuidv4()}`;
  }
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class InMemoryTenantRepository implements TenantRepository {
  constructor(private readonly database: InMemoryDatabase) {}

  async list(): Promise<Tenant[]> {
    return [...this.database.tenants.values()].map((value) => clone(value));
  }

  async getById(id: string): Promise<Tenant | null> {
    const tenant = this.database.tenants.get(id);
    return tenant ? clone(tenant) : null;
  }

  async create(tenant: Tenant): Promise<Tenant> {
    this.database.tenants.set(tenant.id, clone(tenant));
    return clone(tenant);
  }

  async update(tenant: Tenant): Promise<Tenant> {
    this.database.tenants.set(tenant.id, clone(tenant));
    return clone(tenant);
  }
}

export class InMemoryUserRepository implements UserRepository {
  constructor(private readonly database: InMemoryDatabase) {}

  async findByEmail(email: string): Promise<User | null> {
    const user = [...this.database.users.values()].find((entry) => entry.email.toLowerCase() === email.toLowerCase());
    return user ? clone(user) : null;
  }

  async findById(id: string): Promise<User | null> {
    const user = this.database.users.get(id);
    return user ? clone(user) : null;
  }

  async listByTenant(tenantId: string): Promise<User[]> {
    return [...this.database.users.values()]
      .filter((user) => user.tenantId === tenantId)
      .map((value) => clone(value));
  }

  async update(user: User): Promise<User> {
    this.database.users.set(user.id, clone(user));
    return clone(user);
  }
}

export class InMemoryTopicRepository implements TopicRepository {
  constructor(private readonly database: InMemoryDatabase) {}

  async listByTenant(tenantId: string): Promise<Topic[]> {
    return [...this.database.topics.values()]
      .filter((topic) => topic.tenantId === tenantId)
      .sort((left, right) => left.title.localeCompare(right.title, "ru"))
      .map((value) => clone(value));
  }

  async getById(id: string): Promise<Topic | null> {
    const topic = this.database.topics.get(id);
    return topic ? clone(topic) : null;
  }
}

export class InMemoryFaqRepository implements FaqRepository {
  constructor(private readonly database: InMemoryDatabase) {}

  async listByTenant(tenantId: string): Promise<FaqArticle[]> {
    return [...this.database.faqArticles.values()]
      .filter((article) => article.tenantId === tenantId)
      .sort((left, right) => left.question.localeCompare(right.question, "ru"))
      .map((value) => clone(value));
  }

  async searchByTenant(tenantId: string, query: string): Promise<FaqArticle[]> {
    const normalizedQuery = query.trim().toLowerCase();
    return (await this.listByTenant(tenantId)).filter((article) => {
      const haystack = `${article.question} ${article.answer}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }

  async getById(id: string): Promise<FaqArticle | null> {
    const article = this.database.faqArticles.get(id);
    return article ? clone(article) : null;
  }

  async create(article: FaqArticle): Promise<FaqArticle> {
    this.database.faqArticles.set(article.id, clone(article));
    return clone(article);
  }

  async update(article: FaqArticle): Promise<FaqArticle> {
    this.database.faqArticles.set(article.id, clone(article));
    return clone(article);
  }
}

export class InMemoryWidgetConfigRepository implements WidgetConfigRepository {
  constructor(private readonly database: InMemoryDatabase) {}

  async getByTenantId(tenantId: string): Promise<WidgetConfig | null> {
    const config = this.database.widgetConfigs.get(tenantId);
    return config ? clone(config) : null;
  }

  async upsert(config: WidgetConfig): Promise<WidgetConfig> {
    this.database.widgetConfigs.set(config.tenantId, clone(config));
    return clone(config);
  }
}

export class InMemoryDialogueSessionRepository implements DialogueSessionRepository {
  constructor(private readonly database: InMemoryDatabase) {}

  async listByTenant(tenantId: string): Promise<DialogueSession[]> {
    return [...this.database.sessions.values()]
      .filter((session) => session.tenantId === tenantId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((value) => clone(value));
  }

  async getById(id: string): Promise<DialogueSession | null> {
    const session = this.database.sessions.get(id);
    return session ? clone(session) : null;
  }

  async create(session: DialogueSession): Promise<DialogueSession> {
    this.database.sessions.set(session.id, clone(session));
    return clone(session);
  }

  async update(session: DialogueSession): Promise<DialogueSession> {
    this.database.sessions.set(session.id, clone(session));
    return clone(session);
  }
}

export class InMemoryMessageRepository implements MessageRepository {
  constructor(private readonly database: InMemoryDatabase) {}

  async listBySession(sessionId: string): Promise<Message[]> {
    return [...this.database.messages.values()]
      .filter((message) => message.sessionId === sessionId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((value) => clone(value));
  }

  async listByTicket(ticketId: string): Promise<Message[]> {
    return [...this.database.messages.values()]
      .filter((message) => message.ticketId === ticketId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((value) => clone(value));
  }

  async create(message: Message): Promise<Message> {
    this.database.messages.set(message.id, clone(message));
    return clone(message);
  }
}

export class InMemoryTicketRepository implements TicketRepository {
  constructor(private readonly database: InMemoryDatabase) {}

  async listAll(): Promise<Ticket[]> {
    return [...this.database.tickets.values()]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((value) => clone(value));
  }

  async listByTenant(tenantId: string): Promise<Ticket[]> {
    return (await this.listAll()).filter((ticket) => ticket.tenantId === tenantId);
  }

  async findBySessionId(sessionId: string): Promise<Ticket | null> {
    const ticket = [...this.database.tickets.values()]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .find((entry) => entry.sessionId === sessionId);

    return ticket ? clone(ticket) : null;
  }

  async getById(id: string): Promise<Ticket | null> {
    const ticket = this.database.tickets.get(id);
    return ticket ? clone(ticket) : null;
  }

  async create(ticket: Ticket): Promise<Ticket> {
    this.database.tickets.set(ticket.id, clone(ticket));
    return clone(ticket);
  }

  async update(ticket: Ticket): Promise<Ticket> {
    this.database.tickets.set(ticket.id, clone(ticket));
    return clone(ticket);
  }
}

export class InMemoryAuditLogRepository implements AuditLogRepository {
  constructor(private readonly database: InMemoryDatabase) {}

  async add(entry: AuditLog): Promise<AuditLog> {
    this.database.auditLogs.set(entry.id, clone(entry));
    return clone(entry);
  }

  async listByTenant(tenantId: string | null): Promise<AuditLog[]> {
    return [...this.database.auditLogs.values()]
      .filter((entry) => entry.tenantId === tenantId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((value) => clone(value));
  }
}

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly database: InMemoryDatabase) {}

  async save(record: RefreshTokenRecord): Promise<void> {
    this.database.refreshTokens.set(record.token, clone(record));
  }

  async get(token: string): Promise<RefreshTokenRecord | null> {
    const record = this.database.refreshTokens.get(token);
    return record ? clone(record) : null;
  }

  async revoke(token: string): Promise<void> {
    this.database.refreshTokens.delete(token);
  }
}

export const createInMemoryRepositories = () => {
  const database = new InMemoryDatabase();

  return {
    tenantRepository: new InMemoryTenantRepository(database),
    userRepository: new InMemoryUserRepository(database),
    topicRepository: new InMemoryTopicRepository(database),
    faqRepository: new InMemoryFaqRepository(database),
    widgetConfigRepository: new InMemoryWidgetConfigRepository(database),
    sessionRepository: new InMemoryDialogueSessionRepository(database),
    messageRepository: new InMemoryMessageRepository(database),
    ticketRepository: new InMemoryTicketRepository(database),
    auditLogRepository: new InMemoryAuditLogRepository(database),
    refreshTokenRepository: new InMemoryRefreshTokenRepository(database)
  };
};
