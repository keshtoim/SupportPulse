import type {
  AuditLogRepository,
  Clock,
  DocumentTextExtractor,
  FaqRepository,
  IdGenerator,
  KnowledgeDocumentRepository,
  TopicRepository,
  WidgetConfigRepository
} from "../ports";
import { AppError, type AuthenticatedUser, type FaqArticle, type KnowledgeDocument, type Topic, type WidgetConfig } from "../../domain/model";
import { addAuditEntry, companyAdminRoles, ensureRole } from "./support";
import type { KnowledgeIndexingService } from "./knowledge-indexing-service";

// Ограничения на загружаемые файлы базы знаний
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

type CompanyServiceDependencies = {
  faqRepository: FaqRepository;
  topicRepository: TopicRepository;
  widgetConfigRepository: WidgetConfigRepository;
  knowledgeDocumentRepository: KnowledgeDocumentRepository;
  documentTextExtractor: DocumentTextExtractor;
  knowledgeIndexingService: KnowledgeIndexingService;
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

  /** Создаёт новую тему базы знаний */
  async createTopic(actor: AuthenticatedUser, payload: { title: string }) {
    ensureRole(actor, companyAdminRoles);
    const tenantId = actor.tenantId as string;

    const topic: Topic = {
      id: this.dependencies.idGenerator.next("topic"),
      tenantId,
      title: payload.title.trim(),
      createdAt: this.dependencies.clock.now().toISOString()
    };

    const created = await this.dependencies.topicRepository.create(topic);

    await addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
      tenantId,
      actorUserId: actor.id,
      action: "topic_created",
      entityType: "topic",
      entityId: created.id,
      payload: {
        title: created.title
      }
    });

    return created;
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

  /** Возвращает список загруженных файлов базы знаний (без текста — для списка в админке) */
  async listKnowledgeDocuments(actor: AuthenticatedUser) {
    ensureRole(actor, companyAdminRoles);
    return this.dependencies.knowledgeDocumentRepository.listByTenant(actor.tenantId as string);
  }

  /**
   * Загружает файл (PDF/DOCX), извлекает из него текст, сохраняет как источник базы знаний
   * и (если включены эмбеддинги) индексирует для векторного RAG-поиска.
   */
  async uploadKnowledgeDocument(actor: AuthenticatedUser, file: { buffer: Buffer; mimeType: string; fileName: string; sizeBytes: number }) {
    ensureRole(actor, companyAdminRoles);
    const tenantId = actor.tenantId as string;

    if (file.sizeBytes > MAX_UPLOAD_SIZE_BYTES) {
      throw new AppError("Файл слишком большой (максимум 10 МБ).", 400, "FILE_TOO_LARGE");
    }

    if (!SUPPORTED_MIME_TYPES.has(file.mimeType)) {
      throw new AppError("Поддерживаются только файлы PDF и DOCX.", 400, "UNSUPPORTED_FILE_TYPE");
    }

    const now = this.dependencies.clock.now().toISOString();
    const baseDocument: KnowledgeDocument = {
      id: this.dependencies.idGenerator.next("doc"),
      tenantId,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      status: "processed",
      extractedText: null,
      errorMessage: null,
      createdAt: now
    };

    let document: KnowledgeDocument;

    try {
      const extractedText = await this.dependencies.documentTextExtractor.extract(file);
      document = { ...baseDocument, status: "processed", extractedText };
    } catch (error) {
      const message = error instanceof AppError ? error.message : "Не удалось обработать файл.";
      document = { ...baseDocument, status: "failed", errorMessage: message };
    }

    const created = await this.dependencies.knowledgeDocumentRepository.create(document);

    // Индексация — best-effort: сбой эмбеддинга не должен ронять уже успешную загрузку документа
    try {
      await this.dependencies.knowledgeIndexingService.indexDocument(created);
    } catch {
      // Документ остаётся сохранённым, просто временно недоступен для RAG-поиска
    }

    await addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
      tenantId,
      actorUserId: actor.id,
      action: created.status === "processed" ? "knowledge_document_uploaded" : "knowledge_document_upload_failed",
      entityType: "knowledge_document",
      entityId: created.id,
      payload: {
        fileName: created.fileName,
        status: created.status
      }
    });

    return created;
  }

  /** Удаляет ранее загруженный документ базы знаний */
  async deleteKnowledgeDocument(actor: AuthenticatedUser, documentId: string) {
    ensureRole(actor, companyAdminRoles);
    const tenantId = actor.tenantId as string;
    const document = await this.dependencies.knowledgeDocumentRepository.getById(documentId);

    if (!document || document.tenantId !== tenantId) {
      throw new AppError("Документ не найден.", 404, "KNOWLEDGE_DOCUMENT_NOT_FOUND");
    }

    await this.dependencies.knowledgeDocumentRepository.delete(documentId);
    await this.dependencies.knowledgeIndexingService.removeDocument(documentId);

    await addAuditEntry(this.dependencies.auditLogRepository, this.dependencies.idGenerator, this.dependencies.clock, {
      tenantId,
      actorUserId: actor.id,
      action: "knowledge_document_deleted",
      entityType: "knowledge_document",
      entityId: documentId,
      payload: {
        fileName: document.fileName
      }
    });
  }
}
