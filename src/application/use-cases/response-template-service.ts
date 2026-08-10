import type { AuditLogRepository, Clock, IdGenerator, ResponseTemplateRepository } from "../ports";
import { AppError, type AuthenticatedUser, type ResponseTemplate } from "../../domain/model";
import { addAuditEntry, ensureRole, operatorRoles, templateManagerRoles } from "./support";

type ResponseTemplateServiceDependencies = {
  responseTemplateRepository: ResponseTemplateRepository;
  auditLogRepository: AuditLogRepository;
  idGenerator: IdGenerator;
  clock: Clock;
};

/** Управление шаблонами быстрых ответов оператора (FR-044) — не зависит от тикетов, вынесено из operator-service отдельным ресурсом */
export class ResponseTemplateApplicationService {
  constructor(private readonly dependencies: ResponseTemplateServiceDependencies) {}

  /** Возвращает шаблоны ответов тенанта; platform_admin не привязан к тенанту — пустой список */
  async listTemplates(actor: AuthenticatedUser) {
    ensureRole(actor, operatorRoles);

    if (actor.role === "platform_admin") {
      return [];
    }

    return this.dependencies.responseTemplateRepository.listByTenant(actor.tenantId as string);
  }

  /** Создаёт шаблон ответа (супервизор/админ компании) */
  async createTemplate(actor: AuthenticatedUser, payload: { title: string; content: string }) {
    ensureRole(actor, templateManagerRoles);
    const tenantId = actor.tenantId as string;
    const now = this.dependencies.clock.now().toISOString();

    const template: ResponseTemplate = {
      id: this.dependencies.idGenerator.next("template"),
      tenantId,
      title: payload.title.trim(),
      content: payload.content.trim(),
      createdAt: now,
      updatedAt: now
    };

    const created = await this.dependencies.responseTemplateRepository.create(template);

    await addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
      tenantId,
      actorUserId: actor.id,
      action: "template_created",
      entityType: "response_template",
      entityId: created.id,
      payload: { title: created.title }
    });

    return created;
  }

  /** Обновляет шаблон ответа (супервизор/админ компании) */
  async updateTemplate(actor: AuthenticatedUser, templateId: string, payload: { title: string; content: string }) {
    ensureRole(actor, templateManagerRoles);
    const tenantId = actor.tenantId as string;
    const template = await this.dependencies.responseTemplateRepository.getById(templateId);

    if (!template || template.tenantId !== tenantId) {
      throw new AppError("Шаблон не найден.", 404, "TEMPLATE_NOT_FOUND");
    }

    const updated = await this.dependencies.responseTemplateRepository.update({
      ...template,
      title: payload.title.trim(),
      content: payload.content.trim(),
      updatedAt: this.dependencies.clock.now().toISOString()
    });

    await addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
      tenantId,
      actorUserId: actor.id,
      action: "template_updated",
      entityType: "response_template",
      entityId: templateId,
      payload: { title: updated.title }
    });

    return updated;
  }

  /** Удаляет шаблон ответа (супервизор/админ компании) */
  async deleteTemplate(actor: AuthenticatedUser, templateId: string) {
    ensureRole(actor, templateManagerRoles);
    const tenantId = actor.tenantId as string;
    const template = await this.dependencies.responseTemplateRepository.getById(templateId);

    if (!template || template.tenantId !== tenantId) {
      throw new AppError("Шаблон не найден.", 404, "TEMPLATE_NOT_FOUND");
    }

    await this.dependencies.responseTemplateRepository.delete(templateId);

    await addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
      tenantId,
      actorUserId: actor.id,
      action: "template_deleted",
      entityType: "response_template",
      entityId: templateId,
      payload: { title: template.title }
    });
  }
}
