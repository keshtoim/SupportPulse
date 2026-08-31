import type { AuditLogRepository, Clock, DialogueSessionRepository, IdGenerator, MessageRepository, TicketNoteRepository, TicketRepository } from "../ports";
import { AppError, type AuthenticatedUser, type SessionState, type TicketCloseCategory, type TicketNote, type TicketStatus } from "../../domain/model";
import { addAuditEntry, ensureRole, ensureTenantAccess, mapTicketPayload, operatorRoles } from "./support";

type OperatorServiceDependencies = {
  ticketRepository: TicketRepository;
  sessionRepository: DialogueSessionRepository;
  messageRepository: MessageRepository;
  ticketNoteRepository: TicketNoteRepository;
  auditLogRepository: AuditLogRepository;
  idGenerator: IdGenerator;
  clock: Clock;
};

export class OperatorWorkbenchApplicationService {
  constructor(private readonly dependencies: OperatorServiceDependencies) {}

  /** Возвращает тикеты тенанта (или все для platform_admin) с опциональной фильтрацией по статусу */
  async listTickets(actor: AuthenticatedUser, filters?: { status?: TicketStatus }) {
    ensureRole(actor, operatorRoles);

    const tickets =
      actor.role === "platform_admin"
        ? await this.dependencies.ticketRepository.listAll()
        : await this.dependencies.ticketRepository.listByTenant(actor.tenantId as string);

    return tickets.filter((ticket) => (filters?.status ? ticket.status === filters.status : true));
  }

  /** Возвращает все сообщения тикета */
  async getTicketMessages(actor: AuthenticatedUser, ticketId: string) {
    ensureRole(actor, operatorRoles);
    const ticket = await this.requireTicket(actor, ticketId);
    // По sessionId, не по ticketId: сообщения до эскалации (вопрос клиента, попытки AI) создаются
    // раньше, чем появляется сам тикет, и ticketId у них не проставлен — listByTicket их бы потерял,
    // и оператор не увидел бы, с чего начался разговор.
    return this.dependencies.messageRepository.listBySession(ticket.sessionId);
  }

  /** Берёт тикет в работу: назначает оператора, переводит в in_progress и синхронизирует состояние сессии */
  async claimTicket(actor: AuthenticatedUser, ticketId: string) {
    ensureRole(actor, operatorRoles);
    const ticket = await this.requireTicket(actor, ticketId);

    // Оператор не может перехватить чужой тикет; supervisor/admin — могут
    if (ticket.assignedUserId && ticket.assignedUserId !== actor.id && actor.role === "operator") {
      throw new AppError("Тикет уже взят другим оператором.", 409, "TICKET_ALREADY_ASSIGNED");
    }

    const now = this.dependencies.clock.now().toISOString();
    const nextTicket = await this.dependencies.ticketRepository.update({
      ...ticket,
      assignedUserId: actor.id,
      status: "in_progress",
      updatedAt: now
    });

    await this.syncSessionState(ticket.sessionId, "operator_connected", now);

    await addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
      tenantId: ticket.tenantId,
      actorUserId: actor.id,
      action: "ticket_claimed",
      entityType: "ticket",
      entityId: ticket.id,
      payload: mapTicketPayload(nextTicket)
    });

    return nextTicket;
  }

  /** Меняет статус тикета и синхронизирует состояние сессии */
  async changeTicketStatus(
    actor: AuthenticatedUser,
    ticketId: string,
    payload: {
      status: TicketStatus;
      closedCategory?: TicketCloseCategory;
      closedReason?: string;
    }
  ) {
    ensureRole(actor, operatorRoles);
    const ticket = await this.requireTicket(actor, ticketId);

    // Оператор не может менять статус чужого тикета
    if (actor.role === "operator" && ticket.assignedUserId && ticket.assignedUserId !== actor.id) {
      throw new AppError("Оператор не может менять статус чужого тикета.", 403, "TICKET_NOT_ASSIGNED_TO_OPERATOR");
    }

    const now = this.dependencies.clock.now().toISOString();
    const nextTicket = await this.dependencies.ticketRepository.update({
      ...ticket,
      status: payload.status,
      // Категория/причина закрытия действительны только пока тикет закрыт — при переоткрытии сбрасываются
      closedCategory: payload.status === "closed" ? payload.closedCategory ?? "other" : null,
      closedReason: payload.status === "closed" ? payload.closedReason?.trim() || null : null,
      updatedAt: now
    });

    await this.syncSessionState(ticket.sessionId, payload.status === "closed" ? "closed" : "operator_connected", now);

    await addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
      tenantId: ticket.tenantId,
      actorUserId: actor.id,
      action: "ticket_status_changed",
      entityType: "ticket",
      entityId: ticket.id,
      payload: {
        status: payload.status,
        closedCategory: nextTicket.closedCategory ?? "",
        closedReason: nextTicket.closedReason ?? ""
      }
    });

    return nextTicket;
  }

  /** Отправляет сообщение оператора в чат; автоматически назначает тикет, если не был назначен */
  async sendMessage(actor: AuthenticatedUser, ticketId: string, content: string) {
    ensureRole(actor, operatorRoles);
    const ticket = await this.requireTicket(actor, ticketId);
    const normalizedContent = content.trim();

    if (!normalizedContent) {
      throw new AppError("Сообщение не должно быть пустым.", 400, "EMPTY_MESSAGE");
    }

    const now = this.dependencies.clock.now().toISOString();
    // Если оператор уже назначен и работает — не обновляем тикет лишний раз
    const nextTicket =
      ticket.assignedUserId === actor.id && ticket.status === "in_progress"
        ? ticket
        : await this.dependencies.ticketRepository.update({
            ...ticket,
            assignedUserId: ticket.assignedUserId ?? actor.id,
            status: "in_progress",
            updatedAt: now
          });

    await this.syncSessionState(ticket.sessionId, "operator_connected", now);

    const message = await this.dependencies.messageRepository.create({
      id: this.dependencies.idGenerator.next("msg"),
      sessionId: ticket.sessionId,
      ticketId: ticket.id,
      senderType: "operator",
      content: normalizedContent,
      createdAt: now,
      metadata: {
        operatorId: actor.id
      }
    });

    await addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
      tenantId: ticket.tenantId,
      actorUserId: actor.id,
      action: "operator_replied",
      entityType: "ticket",
      entityId: ticket.id,
      payload: {
        messageId: message.id,
        status: nextTicket.status
      }
    });

    return {
      ticket: nextTicket,
      message
    };
  }

  /** Возвращает внутренние заметки по тикету (FR-043) — не пересекаются с сообщениями клиента */
  async listTicketNotes(actor: AuthenticatedUser, ticketId: string) {
    ensureRole(actor, operatorRoles);
    const ticket = await this.requireTicket(actor, ticketId);
    return this.dependencies.ticketNoteRepository.listByTicket(ticket.id);
  }

  /** Добавляет внутреннюю заметку к тикету, не видимую клиенту */
  async addTicketNote(actor: AuthenticatedUser, ticketId: string, content: string) {
    ensureRole(actor, operatorRoles);
    const ticket = await this.requireTicket(actor, ticketId);
    const normalizedContent = content.trim();

    if (!normalizedContent) {
      throw new AppError("Заметка не должна быть пустой.", 400, "EMPTY_NOTE");
    }

    const note: TicketNote = {
      id: this.dependencies.idGenerator.next("note"),
      ticketId: ticket.id,
      tenantId: ticket.tenantId,
      authorUserId: actor.id,
      authorName: actor.name,
      content: normalizedContent,
      createdAt: this.dependencies.clock.now().toISOString()
    };

    const created = await this.dependencies.ticketNoteRepository.create(note);

    await addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
      tenantId: ticket.tenantId,
      actorUserId: actor.id,
      action: "ticket_note_added",
      entityType: "ticket",
      entityId: ticket.id,
      payload: { noteId: created.id }
    });

    return created;
  }

  /** Загружает тикет и проверяет право доступа актора к нему */
  private async requireTicket(actor: AuthenticatedUser, ticketId: string) {
    const ticket = await this.dependencies.ticketRepository.getById(ticketId);

    if (!ticket) {
      throw new AppError("Тикет не найден.", 404, "TICKET_NOT_FOUND");
    }

    ensureTenantAccess(actor, ticket.tenantId);
    return ticket;
  }

  /** Переводит сессию диалога в новое состояние вслед за изменением тикета; молча пропускает, если сессия уже удалена */
  private async syncSessionState(sessionId: string, state: SessionState, now: string): Promise<void> {
    const session = await this.dependencies.sessionRepository.getById(sessionId);

    if (session) {
      await this.dependencies.sessionRepository.update({
        ...session,
        state,
        updatedAt: now
      });
    }
  }
}
