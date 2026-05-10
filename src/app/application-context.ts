import pino from "pino";
import { AuthenticationApplicationService } from "../application/use-cases/authentication-service";
import { CompanyAdministrationApplicationService } from "../application/use-cases/company-service";
import { OperatorWorkbenchApplicationService } from "../application/use-cases/operator-service";
import { PlatformAdministrationApplicationService } from "../application/use-cases/platform-service";
import { WidgetSupportApplicationService } from "../application/use-cases/widget-service";
import type { AppEnv } from "../config/env";
import { FaqRagAnswerService } from "../infrastructure/ai/assistant-services";
import { BcryptPasswordService, JwtTokenService } from "../infrastructure/auth/security";
import { SystemClock, UuidIdGenerator, createInMemoryRepositories } from "../infrastructure/persistence/in-memory/app-memory";
import { createSupabaseClient, SupabaseIdGenerator } from "../infrastructure/persistence/supabase/client";
import { createSupabaseRepositories, SupabaseAuditLogRepository } from "../infrastructure/persistence/supabase/repositories";

/**
 * Точка сборки всех зависимостей приложения (DI-контейнер).
 * Автоматически выбирает Supabase или in-memory хранилище по наличию env-переменных.
 */
export const createApplicationContext = (env: AppEnv) => {
  const logger = pino({
    level: env.nodeEnv === "production" ? "info" : "debug"
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
      auditLogRepository: repositories.auditLogRepository,
      answerService,
      idGenerator,
      clock
    }),
    operatorService: new OperatorWorkbenchApplicationService({
      ticketRepository: repositories.ticketRepository,
      sessionRepository: repositories.sessionRepository,
      messageRepository: repositories.messageRepository,
      auditLogRepository: repositories.auditLogRepository,
      idGenerator,
      clock
    }),
    companyService: new CompanyAdministrationApplicationService({
      faqRepository: repositories.faqRepository,
      topicRepository: repositories.topicRepository,
      widgetConfigRepository: repositories.widgetConfigRepository,
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
