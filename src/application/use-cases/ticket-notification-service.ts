import type { AuditLogRepository, Clock, EmailService, IdGenerator, TenantRepository, UserRepository, WidgetConfigRepository } from "../ports";
import type { Ticket } from "../../domain/model";
import { addAuditEntry, operatorRoles } from "./support";

type TicketNotificationServiceDependencies = {
  tenantRepository: TenantRepository;
  userRepository: UserRepository;
  widgetConfigRepository: WidgetConfigRepository;
  emailService: EmailService;
  auditLogRepository: AuditLogRepository;
  idGenerator: IdGenerator;
  clock: Clock;
};

/** Email-уведомления о тикетах (FR-062) — вынесено из widget-service, чтобы диалоговая логика не зависела от почты напрямую */
export class TicketNotificationApplicationService {
  constructor(private readonly dependencies: TicketNotificationServiceDependencies) {}

  /** Уведомляет operator/supervisor/company_admin тенанта о новом тикете, если включено в настройках виджета */
  async notifyNewTicket(ticket: Ticket): Promise<void> {
    if (!this.dependencies.emailService.isEnabled()) {
      return;
    }

    const widgetConfig = await this.dependencies.widgetConfigRepository.getByTenantId(ticket.tenantId);

    if (!widgetConfig?.emailNotificationsEnabled) {
      return;
    }

    const [tenant, tenantUsers] = await Promise.all([
      this.dependencies.tenantRepository.getById(ticket.tenantId),
      this.dependencies.userRepository.listByTenant(ticket.tenantId)
    ]);

    const recipients = tenantUsers
      .filter((user) => operatorRoles.includes(user.role) && !user.isBlocked)
      .map((user) => user.email);

    if (recipients.length === 0) {
      return;
    }

    try {
      await this.dependencies.emailService.send({
        to: recipients,
        subject: `Новый тикет — ${tenant?.name ?? "SupportPulse"}`,
        text: `Причина обращения: ${ticket.reason}\nТикет: ${ticket.id}\nОткрыть в админке SupportPulse, раздел "Очередь".`
      });

      await addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
        tenantId: ticket.tenantId,
        actorUserId: null,
        action: "ticket_email_notification_sent",
        entityType: "ticket",
        entityId: ticket.id,
        payload: { recipients: recipients.length }
      });
    } catch (error) {
      await addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
        tenantId: ticket.tenantId,
        actorUserId: null,
        action: "ticket_email_notification_failed",
        entityType: "ticket",
        entityId: ticket.id,
        payload: { message: error instanceof Error ? error.message : "unknown error" }
      });
    }
  }
}
