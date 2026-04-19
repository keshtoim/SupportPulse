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

export const createApplicationContext = (env: AppEnv) => {
  const logger = pino({
    level: env.nodeEnv === "production" ? "info" : "debug"
  });

  const repositories = createInMemoryRepositories();
  const idGenerator = new UuidIdGenerator();
  const clock = new SystemClock();
  const passwordService = new BcryptPasswordService();
  const tokenService = new JwtTokenService({
    accessSecret: env.jwtAccessSecret,
    refreshSecret: env.jwtRefreshSecret,
    accessTtl: env.accessTokenTtl,
    refreshTtl: env.refreshTokenTtl
  });
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
