import type { AuditLogRepository, Clock, FaqRepository, IdGenerator, TopicRepository, WidgetConfigRepository } from "../ports";
import { AppError, type AuthenticatedUser, type FaqArticle, type WidgetConfig } from "../../domain/model";
import { addAuditEntry, companyAdminRoles, ensureRole } from "./support";

type CompanyServiceDependencies = {
  faqRepository: FaqRepository;
  topicRepository: TopicRepository;
  widgetConfigRepository: WidgetConfigRepository;
  auditLogRepository: AuditLogRepository;
  idGenerator: IdGenerator;
  clock: Clock;
};

export class CompanyAdministrationApplicationService {
  constructor(private readonly dependencies: CompanyServiceDependencies) {}

  /** Возвращает базу знаний: темы с вложенными статьями FAQ */
  async getKnowledgeBase(actor: AuthenticatedUser) {
    ensureRole(actor, companyAdminRoles);
    const tenantId = actor.tenantId as string;
    const topics = await this.dependencies.topicRepository.listByTenant(tenantId);
    const articles = await this.dependencies.faqRepository.listByTenant(tenantId);

    return topics.map((topic) => ({
      ...topic,
      articles: articles.filter((article) => article.topicId === topic.id)
    }));
  }

  /** Создаёт новую статью FAQ под указанной темой */
  async createFaq(actor: AuthenticatedUser, payload: { topicId: string; question: string; answer: string }) {
    ensureRole(actor, companyAdminRoles);
    const tenantId = actor.tenantId as string;
    const topic = await this.dependencies.topicRepository.getById(payload.topicId);

    if (!topic || topic.tenantId !== tenantId) {
      throw new AppError("Тема не найдена.", 404, "TOPIC_NOT_FOUND");
    }

    const now = this.dependencies.clock.now().toISOString();
    const article: FaqArticle = {
      id: this.dependencies.idGenerator.next("faq"),
      tenantId,
      topicId: payload.topicId,
      question: payload.question.trim(),
      answer: payload.answer.trim(),
      createdAt: now,
      updatedAt: now
    };

    const created = await this.dependencies.faqRepository.create(article);

    await addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
      tenantId,
      actorUserId: actor.id,
      action: "faq_created",
      entityType: "faq_article",
      entityId: created.id,
      payload: {
        topicId: created.topicId
      }
    });

    return created;
  }

  /** Обновляет вопрос и ответ существующей статьи FAQ */
  async updateFaq(actor: AuthenticatedUser, faqId: string, payload: { question: string; answer: string }) {
    ensureRole(actor, companyAdminRoles);
    const tenantId = actor.tenantId as string;
    const article = await this.dependencies.faqRepository.getById(faqId);

    if (!article || article.tenantId !== tenantId) {
      throw new AppError("FAQ не найден.", 404, "FAQ_NOT_FOUND");
    }

    const updated = await this.dependencies.faqRepository.update({
      ...article,
      question: payload.question.trim(),
      answer: payload.answer.trim(),
      updatedAt: this.dependencies.clock.now().toISOString()
    });

    await addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
      tenantId,
      actorUserId: actor.id,
      action: "faq_updated",
      entityType: "faq_article",
      entityId: faqId,
      payload: {
        topicId: updated.topicId
      }
    });

    return updated;
  }

  /** Возвращает текущую конфигурацию виджета компании */
  async getWidgetConfig(actor: AuthenticatedUser) {
    ensureRole(actor, companyAdminRoles);
    const config = await this.dependencies.widgetConfigRepository.getByTenantId(actor.tenantId as string);

    if (!config) {
      throw new AppError("Конфигурация виджета не найдена.", 404, "WIDGET_CONFIG_NOT_FOUND");
    }

    return config;
  }

  /** Сохраняет конфигурацию виджета (upsert: создаёт, если ещё нет) */
  async updateWidgetConfig(
    actor: AuthenticatedUser,
    payload: Pick<WidgetConfig, "brandColor" | "welcomeMessage" | "toneOfVoice" | "showPrivacyNotice" | "privacyNotice">
  ) {
    ensureRole(actor, companyAdminRoles);
    const tenantId = actor.tenantId as string;
    const currentConfig = await this.dependencies.widgetConfigRepository.getByTenantId(tenantId);
    const now = this.dependencies.clock.now().toISOString();

    const nextConfig: WidgetConfig = currentConfig
      ? {
          ...currentConfig,
          ...payload,
          updatedAt: now
        }
      : {
          id: this.dependencies.idGenerator.next("widget"),
          tenantId,
          ...payload,
          createdAt: now,
          updatedAt: now
        };

    const savedConfig = await this.dependencies.widgetConfigRepository.upsert(nextConfig);

    await addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
      tenantId,
      actorUserId: actor.id,
      action: "widget_config_updated",
      entityType: "widget_config",
      entityId: savedConfig.id,
      payload: {
        brandColor: savedConfig.brandColor,
        showPrivacyNotice: savedConfig.showPrivacyNotice
      }
    });

    return savedConfig;
  }
}
