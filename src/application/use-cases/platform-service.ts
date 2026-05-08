import type {
  AuditLogRepository,
  Clock,
  DialogueSessionRepository,
  IdGenerator,
  TenantRepository,
  TicketRepository,
  UserRepository,
  WidgetConfigRepository
} from "../ports";
import { AppError, type AuthenticatedUser } from "../../domain/model";
import { addAuditEntry, ensureRole, platformRoles } from "./support";

type PlatformServiceDependencies = {
  tenantRepository: TenantRepository;
  widgetConfigRepository: WidgetConfigRepository;
  userRepository: UserRepository;
  ticketRepository: TicketRepository;
  sessionRepository: DialogueSessionRepository;
  auditLogRepository: AuditLogRepository;
  idGenerator: IdGenerator;
  clock: Clock;
};

export class PlatformAdministrationApplicationService {
  constructor(private readonly dependencies: PlatformServiceDependencies) {}

  /** Возвращает список всех тенантов платформы */
  async listTenants(actor: AuthenticatedUser) {
    ensureRole(actor, platformRoles);
    return this.dependencies.tenantRepository.list();
  }

  /** Создаёт нового тенанта с дефолтной конфигурацией виджета */
  async createTenant(actor: AuthenticatedUser, payload: { name: string }) {
    ensureRole(actor, platformRoles);
    const now = this.dependencies.clock.now().toISOString();
    const tenant = await this.dependencies.tenantRepository.create({
      id: this.dependencies.idGenerator.next("tenant"),
      name: payload.name.trim(),
      isBlocked: false,
      createdAt: now
    });

    // Сразу создаём дефолтный виджет-конфиг для нового тенанта
    await this.dependencies.widgetConfigRepository.upsert({
      id: this.dependencies.idGenerator.next("widget"),
      tenantId: tenant.id,
      brandColor: "#2B7FFF",
      welcomeMessage: `Здравствуйте! Я AI-помощник ${tenant.name}. Расскажите, чем могу помочь.`,
      toneOfVoice: "дружелюбный, точный, деловой",
      showPrivacyNotice: true,
      privacyNotice: "Продолжая диалог, вы соглашаетесь на обработку данных для решения обращения.",
      createdAt: now,
      updatedAt: now
    });

    await addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
      tenantId: tenant.id,
      actorUserId: actor.id,
      action: "tenant_created",
      entityType: "tenant",
      entityId: tenant.id,
      payload: {
        name: tenant.name
      }
    });

    return tenant;
  }

  /** Блокирует или разблокирует тенанта */
  async setTenantBlocked(actor: AuthenticatedUser, tenantId: string, isBlocked: boolean) {
    ensureRole(actor, platformRoles);
    const tenant = await this.dependencies.tenantRepository.getById(tenantId);

    if (!tenant) {
      throw new AppError("Тенант не найден.", 404, "TENANT_NOT_FOUND");
    }

    const updated = await this.dependencies.tenantRepository.update({
      ...tenant,
      isBlocked
    });

    await addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
      tenantId,
      actorUserId: actor.id,
      action: isBlocked ? "tenant_blocked" : "tenant_unblocked",
      entityType: "tenant",
      entityId: tenantId,
      payload: {
        isBlocked
      }
    });

    return updated;
  }

  /** Агрегированные метрики по всей платформе */
  async getMetrics(actor: AuthenticatedUser) {
    ensureRole(actor, platformRoles);

    const [tenants, tickets] = await Promise.all([
      this.dependencies.tenantRepository.list(),
      this.dependencies.ticketRepository.listAll()
    ]);
    const userBuckets = await Promise.all(tenants.map((tenant) => this.dependencies.userRepository.listByTenant(tenant.id)));
    const sessionBuckets = await Promise.all(tenants.map((tenant) => this.dependencies.sessionRepository.listByTenant(tenant.id)));
    const usersTotal = userBuckets.reduce((total, bucket) => total + bucket.length, 0);
    const sessionsTotal = sessionBuckets.reduce((total, bucket) => total + bucket.length, 0);

    return {
      tenantsTotal: tenants.length,
      tenantsBlocked: tenants.filter((tenant) => tenant.isBlocked).length,
      usersTotal,
      sessionsTotal,
      tickets: {
        total: tickets.length,
        new: tickets.filter((ticket) => ticket.status === "new").length,
        inProgress: tickets.filter((ticket) => ticket.status === "in_progress").length,
        waitingClient: tickets.filter((ticket) => ticket.status === "waiting_client").length,
        closed: tickets.filter((ticket) => ticket.status === "closed").length
      }
    };
  }
}
