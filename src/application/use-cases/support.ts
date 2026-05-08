import type { AuditLogRepository, Clock, IdGenerator, TenantRepository } from "../ports";
import { AppError, type AuthenticatedUser, type Ticket, type UserRole } from "../../domain/model";

// Наборы ролей для проверки доступа к эндпоинтам
export const operatorRoles: UserRole[] = ["operator", "supervisor", "company_admin", "platform_admin"];
export const companyAdminRoles: UserRole[] = ["company_admin", "platform_admin"];
export const platformRoles: UserRole[] = ["platform_admin"];

/** Выбрасывает 403, если роль актора не входит в allowedRoles */
export const ensureRole = (actor: AuthenticatedUser, allowedRoles: UserRole[]): void => {
  if (!allowedRoles.includes(actor.role)) {
    throw new AppError("Недостаточно прав для выполнения действия.", 403, "FORBIDDEN");
  }
};

/** Выбрасывает 403 при попытке доступа к данным чужого тенанта; platform_admin обходит проверку */
export const ensureTenantAccess = (actor: AuthenticatedUser, tenantId: string): void => {
  if (actor.role === "platform_admin") {
    return;
  }

  if (actor.tenantId !== tenantId) {
    throw new AppError("Доступ к данным другого тенанта запрещен.", 403, "TENANT_SCOPE_VIOLATION");
  }
};

/** Загружает тенанта и проверяет, что он существует и не заблокирован */
export const ensureTenantActive = async (tenantRepository: TenantRepository, tenantId: string) => {
  const tenant = await tenantRepository.getById(tenantId);

  if (!tenant) {
    throw new AppError("Тенант не найден.", 404, "TENANT_NOT_FOUND");
  }

  if (tenant.isBlocked) {
    throw new AppError("Тенант заблокирован.", 403, "TENANT_BLOCKED");
  }

  return tenant;
};

/** Строит запись аудита без сохранения в БД */
export const buildAuditEntry = (
  idGenerator: IdGenerator,
  clock: Clock,
  params: {
    tenantId: string | null;
    actorUserId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
  }
) => ({
  id: idGenerator.next("audit"),
  tenantId: params.tenantId,
  actorUserId: params.actorUserId,
  action: params.action,
  entityType: params.entityType,
  entityId: params.entityId,
  payload: params.payload,
  createdAt: clock.now().toISOString()
});

/** Строит и сохраняет запись аудита */
export const addAuditEntry = async (
  auditLogRepository: AuditLogRepository,
  idGenerator: IdGenerator,
  clock: Clock,
  params: {
    tenantId: string | null;
    actorUserId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
  }
) => {
  await auditLogRepository.add(buildAuditEntry(idGenerator, clock, params));
};

/** Формирует плоский payload тикета для записи в аудит */
export const mapTicketPayload = (ticket: Ticket) => ({
  id: ticket.id,
  tenantId: ticket.tenantId,
  sessionId: ticket.sessionId,
  status: ticket.status,
  assignedUserId: ticket.assignedUserId,
  reason: ticket.reason,
  requestedBy: ticket.requestedBy,
  closedReason: ticket.closedReason,
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt
});
