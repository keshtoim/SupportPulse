import type { AuditLogRepository, Clock, DialogueSessionRepository, IdGenerator, MessageRepository, TicketRepository } from "../ports";
import { AppError, type AuthenticatedUser, type TicketStatus } from "../../domain/model";
import { addAuditEntry, ensureRole, ensureTenantAccess, mapTicketPayload, operatorRoles } from "./support";

type OperatorServiceDependencies = {
  ticketRepository: TicketRepository;
  sessionRepository: DialogueSessionRepository;
  messageRepository: MessageRepository;
  auditLogRepository: AuditLogRepository;
  idGenerator: IdGenerator;
  clock: Clock;
};

export class OperatorWorkbenchApplicationService {
  constructor(private readonly dependencies: OperatorServiceDependencies) {}

  async listTickets(actor: AuthenticatedUser, filters?: { status?: TicketStatus }) {
    ensureRole(actor, operatorRoles);

    const tickets =
      actor.role === "platform_admin"
        ? await this.dependencies.ticketRepository.listAll()
        : await this.dependencies.ticketRepository.listByTenant(actor.tenantId as string);

    return tickets.filter((ticket) => (filters?.status ? ticket.status === filters.status : true));
  }

  async getTicketMessages(actor: AuthenticatedUser, ticketId: string) {
    ensureRole(actor, operatorRoles);
    const ticket = await this.requireTicket(actor, ticketId);
    return this.dependencies.messageRepository.listByTicket(ticket.id);
  }

  async claimTicket(actor: AuthenticatedUser, ticketId: string) {
    ensureRole(actor, operatorRoles);
    const ticket = await this.requireTicket(actor, ticketId);

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

    const session = await this.dependencies.sessionRepository.getById(ticket.sessionId);

    if (session) {
      await this.dependencies.sessionRepository.update({
        ...session,
        state: "operator_connected",
        updatedAt: now
      });
    }

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

  async changeTicketStatus(
    actor: AuthenticatedUser,
    ticketId: string,
    payload: {
      status: TicketStatus;
      closedReason?: string;
    }
  ) {
    ensureRole(actor, operatorRoles);
    const ticket = await this.requireTicket(actor, ticketId);

    if (actor.role === "operator" && ticket.assignedUserId && ticket.assignedUserId !== actor.id) {
      throw new AppError("Оператор не может менять статус чужого тикета.", 403, "TICKET_NOT_ASSIGNED_TO_OPERATOR");
    }

    const now = this.dependencies.clock.now().toISOString();
    const nextTicket = await this.dependencies.ticketRepository.update({
      ...ticket,
      status: payload.status,
      closedReason: payload.status === "closed" ? payload.closedReason?.trim() || "resolved" : null,
      updatedAt: now
    });

    const session = await this.dependencies.sessionRepository.getById(ticket.sessionId);

    if (session) {
      await this.dependencies.sessionRepository.update({
        ...session,
        state: payload.status === "closed" ? "closed" : "operator_connected",
        updatedAt: now
      });
    }

    await addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
      tenantId: ticket.tenantId,
      actorUserId: actor.id,
      action: "ticket_status_changed",
      entityType: "ticket",
      entityId: ticket.id,
      payload: {
        status: payload.status,
        closedReason: nextTicket.closedReason ?? ""
      }
    });

    return nextTicket;
  }

  async sendMessage(actor: AuthenticatedUser, ticketId: string, content: string) {
    ensureRole(actor, operatorRoles);
    const ticket = await this.requireTicket(actor, ticketId);
    const normalizedContent = content.trim();

    if (!normalizedContent) {
      throw new AppError("Сообщение не должно быть пустым.", 400, "EMPTY_MESSAGE");
    }

    const now = this.dependencies.clock.now().toISOString();
    const nextTicket =
      ticket.assignedUserId === actor.id && ticket.status === "in_progress"
        ? ticket
        : await this.dependencies.ticketRepository.update({
            ...ticket,
            assignedUserId: ticket.assignedUserId ?? actor.id,
            status: "in_progress",
            updatedAt: now
          });

    const session = await this.dependencies.sessionRepository.getById(ticket.sessionId);

    if (session) {
      await this.dependencies.sessionRepository.update({
        ...session,
        state: "operator_connected",
        updatedAt: now
      });
    }

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

  private async requireTicket(actor: AuthenticatedUser, ticketId: string) {
    const ticket = await this.dependencies.ticketRepository.getById(ticketId);

    if (!ticket) {
      throw new AppError("Тикет не найден.", 404, "TICKET_NOT_FOUND");
    }

    ensureTenantAccess(actor, ticket.tenantId);
    return ticket;
  }
}
