import pino from "pino";
import { AuthenticationApplicationService } from "../application/use-cases/authentication-service";
import { CompanyAdministrationApplicationService } from "../application/use-cases/company-service";
import { OperatorWorkbenchApplicationService } from "../application/use-cases/operator-service";
import { PlatformAdministrationApplicationService } from "../application/use-cases/platform-service";
import { WidgetSupportApplicationService } from "../application/use-cases/widget-service";
import type { AppEnv } from "../config/env";
import { FaqRagAnswerService } from "../infrastructure/ai/assistant-services";
import { OpenAiEmbeddingService } from "../infrastructure/ai/embedding-service";
import { BcryptPasswordService, JwtTokenService } from "../infrastructure/auth/security";
import { FileDocumentTextExtractor } from "../infrastructure/documents/text-extractor";
import { SmtpEmailService } from "../infrastructure/email/email-service";
import { SystemClock, UuidIdGenerator, createInMemoryRepositories } from "../infrastructure/persistence/in-memory/app-memory";
import { createSupabaseClient, SupabaseIdGenerator } from "../infrastructure/persistence/supabase/client";
import { createSupabaseRepositories, SupabaseAuditLogRepository } from "../infrastructure/persistence/supabase/repositories";
import { KnowledgeIndexingService } from "../application/use-cases/knowledge-indexing-service";
import { KnowledgeRetrievalService } from "../application/use-cases/knowledge-retrieval-service";

/**
 * Точка сборки всех зависимостей приложения (DI-контейнер).
 * Автоматически выбирает Supabase или in-memory хранилище по наличию env-переменных.
 */
export const createApplicationContext = (env: AppEnv) => {
  const logger = pino({
    level: env.nodeEnv === "production" ? "info" : "debug",
    // NFR-S-04: без этого pino-http пишет живой JWT из Authorization в каждую строку лога запроса
    redact: {
      paths: ["req.headers.authorization"],
      censor: "[REDACTED]"
    }
  });

  // Если заданы Supabase-переменные — используем Supabase, иначе in-memory (для разработки)
  const useSupabase = Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
  const repositories = useSupabase
    ? {
        ...createSupabaseRepositories(createSupabaseClient(env)),
        // Отдельный клиент для audit log: его fire-and-forget INSERT не блокирует основной connection pool
        auditLogRepository: new SupabaseAuditLogRepository(createSupabaseClient(env))
      }
    : createInMemoryRepositories();
  const idGenerator = useSupabase ? new SupabaseIdGenerator() : new UuidIdGenerator();
  const clock = new SystemClock();

  logger.info(`Persistence: ${useSupabase ? "Supabase" : "in-memory"}`);

  const passwordService = new BcryptPasswordService();
  const tokenService = new JwtTokenService({
    accessSecret: env.jwtAccessSecret,
    refreshSecret: env.jwtRefreshSecret,
    accessTtl: env.accessTokenTtl,
    refreshTtl: env.refreshTokenTtl
  });

  // Если OPENAI_API_KEY не задан — FaqRagAnswerService работает в режиме без LLM
  const answerService = new FaqRagAnswerService({
    apiKey: env.openAiApiKey,
    model: env.openAiModel
  });
  const documentTextExtractor = new FileDocumentTextExtractor();

  // Без полного набора SMTP_* переменных — выключен, уведомления просто не отправляются
  const emailService = new SmtpEmailService({
    host: env.smtpHost,
    port: env.smtpPort,
    user: env.smtpUser,
    pass: env.smtpPass,
    from: env.smtpFrom
  });

  // Тот же ключ, что и для LLM: без него эмбеддинги выключены, RAG деградирует до keyword-поиска по FAQ
  const embeddingService = new OpenAiEmbeddingService({ apiKey: env.openAiApiKey });
  const knowledgeIndexingService = new KnowledgeIndexingService({
    embeddingService,
    knowledgeChunkRepository: repositories.knowledgeChunkRepository,
    idGenerator,
    clock
  });
  const knowledgeRetrievalService = new KnowledgeRetrievalService({
    embeddingService,
    knowledgeChunkRepository: repositories.knowledgeChunkRepository
  });

  return {
    env,
    logger,
    tokenService,
    userRepository: repositories.userRepository,
    authService: new AuthenticationApplicationService(
      repositories.userRepository,
      repositories.refreshTokenRepository,
      passwordService,
      tokenService
    ),
    widgetService: new WidgetSupportApplicationService({
      tenantRepository: repositories.tenantRepository,
      topicRepository: repositories.topicRepository,
      faqRepository: repositories.faqRepository,
      widgetConfigRepository: repositories.widgetConfigRepository,
      sessionRepository: repositories.sessionRepository,
      messageRepository: repositories.messageRepository,
      ticketRepository: repositories.ticketRepository,
      userRepository: repositories.userRepository,
      auditLogRepository: repositories.auditLogRepository,
      answerService,
      knowledgeRetrievalService,
      emailService,
      idGenerator,
      clock
    }),
    operatorService: new OperatorWorkbenchApplicationService({
      ticketRepository: repositories.ticketRepository,
      sessionRepository: repositories.sessionRepository,
      messageRepository: repositories.messageRepository,
      ticketNoteRepository: repositories.ticketNoteRepository,
      responseTemplateRepository: repositories.responseTemplateRepository,
      auditLogRepository: repositories.auditLogRepository,
      idGenerator,
      clock
    }),
    companyService: new CompanyAdministrationApplicationService({
      faqRepository: repositories.faqRepository,
      topicRepository: repositories.topicRepository,
      widgetConfigRepository: repositories.widgetConfigRepository,
      knowledgeDocumentRepository: repositories.knowledgeDocumentRepository,
      documentTextExtractor,
      knowledgeIndexingService,
      auditLogRepository: repositories.auditLogRepository,
      idGenerator,
      clock
    }),
    platformService: new PlatformAdministrationApplicationService({
      tenantRepository: repositories.tenantRepository,
      widgetConfigRepository: repositories.widgetConfigRepository,
      userRepository: repositories.userRepository,
      ticketRepository: repositories.ticketRepository,
      sessionRepository: repositories.sessionRepository,
      auditLogRepository: repositories.auditLogRepository,
      idGenerator,
      clock
    })
  };
};

export type ApplicationContext = ReturnType<typeof createApplicationContext>;
