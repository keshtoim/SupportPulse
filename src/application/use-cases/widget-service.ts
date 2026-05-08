import type {
  AuditLogRepository,
  Clock,
  DialogueSessionRepository,
  FaqRepository,
  IdGenerator,
  MessageRepository,
  SupportAnswerService,
  TenantRepository,
  TicketRepository,
  TopicRepository,
  WidgetConfigRepository
} from "../ports";
import { AppError, type DialogueSession, type Message, type Ticket } from "../../domain/model";
import { addAuditEntry, ensureTenantActive } from "./support";

type WidgetServiceDependencies = {
  tenantRepository: TenantRepository;
  topicRepository: TopicRepository;
  faqRepository: FaqRepository;
  widgetConfigRepository: WidgetConfigRepository;
  sessionRepository: DialogueSessionRepository;
  messageRepository: MessageRepository;
  ticketRepository: TicketRepository;
  auditLogRepository: AuditLogRepository;
  answerService: SupportAnswerService;
  idGenerator: IdGenerator;
  clock: Clock;
};

export class WidgetSupportApplicationService {
  constructor(private readonly dependencies: WidgetServiceDependencies) {}

  /** Возвращает публичные данные виджета: тенант, конфиг, темы с вложенными статьями FAQ */
  async getWidget(tenantId: string) {
    const tenant = await ensureTenantActive(this.dependencies.tenantRepository, tenantId);
    const [widgetConfig, topics, articles] = await Promise.all([
      this.dependencies.widgetConfigRepository.getByTenantId(tenantId),
      this.dependencies.topicRepository.listByTenant(tenantId),
      this.dependencies.faqRepository.listByTenant(tenantId),
    ]);

    if (!widgetConfig) {
      throw new AppError("Конфигурация виджета не найдена.", 404, "WIDGET_CONFIG_NOT_FOUND");
    }

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name
      },
      widgetConfig,
      topics: topics.map((topic) => ({
        ...topic,
        articles: articles.filter((article) => article.topicId === topic.id)
      }))
    };
  }

  /** Полнотекстовый поиск по FAQ тенанта */
  async searchFaq(tenantId: string, query: string) {
    await ensureTenantActive(this.dependencies.tenantRepository, tenantId);
    return this.dependencies.faqRepository.searchByTenant(tenantId, query);
  }

  /** Возвращает сообщения сессии вместе с привязанным тикетом (если есть) */
  async getSessionMessages(tenantId: string, sessionId: string) {
    await ensureTenantActive(this.dependencies.tenantRepository, tenantId);
    const session = await this.dependencies.sessionRepository.getById(sessionId);

    if (!session || session.tenantId !== tenantId) {
      throw new AppError("Сессия не найдена.", 404, "SESSION_NOT_FOUND");
    }

    const [ticket, messages] = await Promise.all([
      this.dependencies.ticketRepository.findBySessionId(sessionId),
      this.dependencies.messageRepository.listBySession(sessionId),
    ]);

    return {
      session,
      ticket,
      messages
    };
  }

  /** Создаёт новую сессию диалога в состоянии ai_active */
  async startSession(tenantId: string, payload: { customerName?: string; customerEmail?: string }) {
    await ensureTenantActive(this.dependencies.tenantRepository, tenantId);
    const now = this.dependencies.clock.now().toISOString();

    const session: DialogueSession = {
      id: this.dependencies.idGenerator.next("session"),
      tenantId,
      state: "ai_active",
      customerName: payload.customerName?.trim() || null,
      customerEmail: payload.customerEmail?.trim().toLowerCase() || null,
      lastKnowledgeArticleIds: [],
      createdAt: now,
      updatedAt: now
    };

    return this.dependencies.sessionRepository.create(session);
  }

  /**
   * Основная логика обработки сообщения клиента:
   * - Если оператор уже подключён — сообщение ставится в очередь к нему
   * - Иначе AI принимает решение: ответить / уточнить / эскалировать
   */
  async postClientMessage(tenantId: string, sessionId: string, content: string) {
    const [tenant, widgetConfig, session] = await Promise.all([
      ensureTenantActive(this.dependencies.tenantRepository, tenantId),
      this.dependencies.widgetConfigRepository.getByTenantId(tenantId),
      this.dependencies.sessionRepository.getById(sessionId),
    ]);

    if (!widgetConfig) {
      throw new AppError("Конфигурация виджета не найдена.", 404, "WIDGET_CONFIG_NOT_FOUND");
    }

    if (!session || session.tenantId !== tenantId) {
      throw new AppError("Сессия не найдена.", 404, "SESSION_NOT_FOUND");
    }

    const normalizedContent = content.trim();

    if (!normalizedContent) {
      throw new AppError("Сообщение не должно быть пустым.", 400, "EMPTY_MESSAGE");
    }

    const existingTicket = await this.dependencies.ticketRepository.findBySessionId(session.id);
    const clientMessage = await this.dependencies.messageRepository.create({
      id: this.dependencies.idGenerator.next("msg"),
      sessionId: session.id,
      ticketId: existingTicket?.id ?? null,
      senderType: "client",
      content: normalizedContent,
      createdAt: this.dependencies.clock.now().toISOString()
    });

    // Если сессия уже передана оператору — AI не отвечает, сообщение идёт в тикет
    if (session.state !== "ai_active" && existingTicket) {
      const queuedReply = await this.dependencies.messageRepository.create({
        id: this.dependencies.idGenerator.next("msg"),
        sessionId: session.id,
        ticketId: existingTicket.id,
        senderType: "system",
        content: "Ваше сообщение передано оператору. Ожидайте ответа в этом чате.",
        createdAt: this.dependencies.clock.now().toISOString()
      });

      return {
        decision: "queued_to_operator",
        session,
        ticket: existingTicket,
        reply: queuedReply,
        clientMessage
      };
    }

    const [history, faqArticles] = await Promise.all([
      this.dependencies.messageRepository.listBySession(session.id),
      this.dependencies.faqRepository.listByTenant(tenantId),
    ]);
    const replyDecision = await this.dependencies.answerService.answer({
      tenant,
      widgetConfig,
      question: normalizedContent,
      faqArticles,
      history
    });

    if (replyDecision.kind === "answer") {
      const nextSession = await this.dependencies.sessionRepository.update({
        ...session,
        lastKnowledgeArticleIds: replyDecision.matchedArticleIds,
        updatedAt: this.dependencies.clock.now().toISOString()
      });

      const replyMessage = await this.dependencies.messageRepository.create({
        id: this.dependencies.idGenerator.next("msg"),
        sessionId: session.id,
        ticketId: null,
        senderType: "ai",
        content: replyDecision.message,
        createdAt: this.dependencies.clock.now().toISOString(),
        metadata: {
          matchedArticleIds: replyDecision.matchedArticleIds,
          confidence: replyDecision.confidence
        }
      });

      void addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
        tenantId,
        actorUserId: null,
        action: "ai_answered",
        entityType: "dialogue_session",
        entityId: session.id,
        payload: {
          matchedArticleIds: replyDecision.matchedArticleIds,
          confidence: replyDecision.confidence
        }
      });

      return {
        decision: "answer",
        session: nextSession,
        reply: replyMessage,
        clientMessage
      };
    }

    if (replyDecision.kind === "clarify") {
      const nextSession = await this.dependencies.sessionRepository.update({
        ...session,
        updatedAt: this.dependencies.clock.now().toISOString()
      });

      const replyMessage = await this.dependencies.messageRepository.create({
        id: this.dependencies.idGenerator.next("msg"),
        sessionId: session.id,
        ticketId: null,
        senderType: "ai",
        content: replyDecision.message,
        createdAt: this.dependencies.clock.now().toISOString()
      });

      return {
        decision: "clarify",
        session: nextSession,
        reply: replyMessage,
        clientMessage
      };
    }

    // AI решил эскалировать (низкая уверенность или явный запрос оператора)
    return this.escalateSessionToOperator(session, {
      requestedBy: "ai",
      reason: replyDecision.reason,
      responseMessage: replyDecision.message,
      clientMessage
    });
  }

  /** Явная эскалация к оператору по запросу клиента */
  async requestOperator(
    tenantId: string,
    sessionId: string,
    payload: {
      reason?: string;
      customerName?: string;
      customerEmail?: string;
    }
  ) {
    await ensureTenantActive(this.dependencies.tenantRepository, tenantId);

    const session = await this.dependencies.sessionRepository.getById(sessionId);

    if (!session || session.tenantId !== tenantId) {
      throw new AppError("Сессия не найдена.", 404, "SESSION_NOT_FOUND");
    }

    // Обновляем контактные данные клиента, если переданы
    const nextSession = await this.dependencies.sessionRepository.update({
      ...session,
      customerName: payload.customerName?.trim() || session.customerName,
      customerEmail: payload.customerEmail?.trim().toLowerCase() || session.customerEmail,
      updatedAt: this.dependencies.clock.now().toISOString()
    });

    return this.escalateSessionToOperator(nextSession, {
      requestedBy: "client",
      reason: payload.reason?.trim() || "requested_operator",
      responseMessage: "Передаю диалог оператору. Вся переписка сохранена, специалист подключится в этом же окне."
    });
  }

  /**
   * Общая логика эскалации: создаёт тикет и переводит сессию в waiting_operator.
   * Если активный тикет уже существует — не создаёт дубликат.
   */
  private async escalateSessionToOperator(
    session: DialogueSession,
    escalation: {
      requestedBy: string;
      reason: string;
      responseMessage: string;
      clientMessage?: Message;
    }
  ) {
    const existingTicket = await this.dependencies.ticketRepository.findBySessionId(session.id);

    // Защита от двойной эскалации
    if (existingTicket && existingTicket.status !== "closed") {
      const reminderMessage = await this.dependencies.messageRepository.create({
        id: this.dependencies.idGenerator.next("msg"),
        sessionId: session.id,
        ticketId: existingTicket.id,
        senderType: "system",
        content: "Диалог уже находится в очереди оператора. Пожалуйста, дождитесь ответа специалиста.",
        createdAt: this.dependencies.clock.now().toISOString()
      });

      return {
        decision: "escalate",
        session,
        ticket: existingTicket,
        reply: reminderMessage,
        clientMessage: escalation.clientMessage
      };
    }

    const now = this.dependencies.clock.now().toISOString();
    const ticket: Ticket = {
      id: this.dependencies.idGenerator.next("ticket"),
      tenantId: session.tenantId,
      sessionId: session.id,
      status: "new",
      assignedUserId: null,
      reason: escalation.reason,
      requestedBy: escalation.requestedBy,
      closedReason: null,
      createdAt: now,
      updatedAt: now
    };

    const [updatedSession, savedTicket] = await Promise.all([
      this.dependencies.sessionRepository.update({
        ...session,
        state: "waiting_operator",
        updatedAt: now
      }),
      this.dependencies.ticketRepository.create(ticket),
    ]);

    const replyMessage = await this.dependencies.messageRepository.create({
      id: this.dependencies.idGenerator.next("msg"),
      sessionId: session.id,
      ticketId: savedTicket.id,
      senderType: "system",
      content: escalation.responseMessage,
      createdAt: now,
      metadata: {
        reason: escalation.reason
      }
    });

    void addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
      tenantId: session.tenantId,
      actorUserId: null,
      action: "ticket_created",
      entityType: "ticket",
      entityId: savedTicket.id,
      payload: {
        requestedBy: escalation.requestedBy,
        reason: escalation.reason
      }
    });

    return {
      decision: "escalate",
      session: updatedSession,
      ticket: savedTicket,
      reply: replyMessage,
      clientMessage: escalation.clientMessage
    };
  }
}
