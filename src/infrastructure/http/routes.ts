import { Router, type Request, type RequestHandler, type Response } from "express";
import { z } from "zod";
import type { ApplicationContext } from "../../app/application-context";
import { AppError } from "../../domain/model";
import { createAuthMiddleware, getRequiredAuthUser, requireRoles } from "./middlewares/auth-middleware";

const asyncHandler =
  (handler: (request: Request, response: Response) => Promise<void>): RequestHandler =>
  (request, response, next) => {
    handler(request, response).catch(next);
  };

const getSingleValue = (value: string | string[] | undefined, fieldName: string): string =>
  z
    .string({
      error: `Поле ${fieldName} должно быть строкой.`
    })
    .min(1)
    .parse(Array.isArray(value) ? value[0] : value);

const ticketStatuses = ["new", "in_progress", "waiting_client", "closed"] as const;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10)
});

const startSessionSchema = z.object({
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional()
});

const sendMessageSchema = z.object({
  content: z.string().min(1)
});

const escalateSchema = z.object({
  reason: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional()
});

const createFaqSchema = z.object({
  topicId: z.string().min(1),
  question: z.string().min(5),
  answer: z.string().min(5)
});

const updateFaqSchema = z.object({
  question: z.string().min(5),
  answer: z.string().min(5)
});

const updateWidgetConfigSchema = z.object({
  brandColor: z.string().min(4),
  welcomeMessage: z.string().min(5),
  toneOfVoice: z.string().min(3),
  showPrivacyNotice: z.boolean(),
  privacyNotice: z.string().nullable()
});

const createTenantSchema = z.object({
  name: z.string().min(3)
});

const blockTenantSchema = z.object({
  isBlocked: z.boolean()
});

const changeTicketStatusSchema = z.object({
  status: z.enum(ticketStatuses),
  closedReason: z.string().optional()
});

export const createApiRouter = (context: ApplicationContext) => {
  const router = Router();
  const authMiddleware = createAuthMiddleware({
    tokenService: context.tokenService,
    userRepository: context.userRepository
  });

  router.get(
    "/health",
    asyncHandler(async (_, response) => {
      response.json({
        status: "ok",
        service: "supportpulse-backend",
        timestamp: new Date().toISOString()
      });
    })
  );

  router.post(
    "/auth/login",
    asyncHandler(async (request, response) => {
      const payload = loginSchema.parse(request.body);
      const result = await context.authService.login(payload.email, payload.password);
      response.json(result);
    })
  );

  router.post(
    "/auth/refresh",
    asyncHandler(async (request, response) => {
      const payload = refreshSchema.parse(request.body);
      const result = await context.authService.refresh(payload.refreshToken);
      response.json(result);
    })
  );

  router.get(
    "/public/tenants/:tenantId/widget",
    asyncHandler(async (request, response) => {
      const result = await context.widgetService.getWidget(getSingleValue(request.params.tenantId, "tenantId"));
      response.json(result);
    })
  );

  router.get(
    "/public/tenants/:tenantId/faq/search",
    asyncHandler(async (request, response) => {
      const query = z.string().min(2).parse(request.query.q);
      const result = await context.widgetService.searchFaq(getSingleValue(request.params.tenantId, "tenantId"), query);
      response.json(result);
    })
  );

  router.post(
    "/public/tenants/:tenantId/dialogue-sessions",
    asyncHandler(async (request, response) => {
      const payload = startSessionSchema.parse(request.body ?? {});
      const result = await context.widgetService.startSession(getSingleValue(request.params.tenantId, "tenantId"), payload);
      response.status(201).json(result);
    })
  );

  router.get(
    "/public/tenants/:tenantId/dialogue-sessions/:sessionId/messages",
    asyncHandler(async (request, response) => {
      const result = await context.widgetService.getSessionMessages(
        getSingleValue(request.params.tenantId, "tenantId"),
        getSingleValue(request.params.sessionId, "sessionId")
      );
      response.json(result);
    })
  );

  router.post(
    "/public/tenants/:tenantId/dialogue-sessions/:sessionId/messages",
    asyncHandler(async (request, response) => {
      const payload = sendMessageSchema.parse(request.body);
      const result = await context.widgetService.postClientMessage(
        getSingleValue(request.params.tenantId, "tenantId"),
        getSingleValue(request.params.sessionId, "sessionId"),
        payload.content
      );
      response.json(result);
    })
  );

  router.post(
    "/public/tenants/:tenantId/dialogue-sessions/:sessionId/escalate",
    asyncHandler(async (request, response) => {
      const payload = escalateSchema.parse(request.body ?? {});
      const result = await context.widgetService.requestOperator(
        getSingleValue(request.params.tenantId, "tenantId"),
        getSingleValue(request.params.sessionId, "sessionId"),
        payload
      );
      response.json(result);
    })
  );

  const operatorRouter = Router();
  operatorRouter.use(authMiddleware, requireRoles(["operator", "supervisor", "company_admin", "platform_admin"]));
  operatorRouter.get(
    "/tickets",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const status = request.query.status ? z.enum(ticketStatuses).parse(request.query.status) : undefined;
      const result = await context.operatorService.listTickets(actor, { status });
      response.json(result);
    })
  );
  operatorRouter.get(
    "/tickets/:ticketId/messages",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const result = await context.operatorService.getTicketMessages(actor, getSingleValue(request.params.ticketId, "ticketId"));
      response.json(result);
    })
  );
  operatorRouter.post(
    "/tickets/:ticketId/claim",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const result = await context.operatorService.claimTicket(actor, getSingleValue(request.params.ticketId, "ticketId"));
      response.json(result);
    })
  );
  operatorRouter.post(
    "/tickets/:ticketId/status",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const payload = changeTicketStatusSchema.parse(request.body);
      const result = await context.operatorService.changeTicketStatus(actor, getSingleValue(request.params.ticketId, "ticketId"), payload);
      response.json(result);
    })
  );
  operatorRouter.post(
    "/tickets/:ticketId/messages",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const payload = sendMessageSchema.parse(request.body);
      const result = await context.operatorService.sendMessage(actor, getSingleValue(request.params.ticketId, "ticketId"), payload.content);
      response.json(result);
    })
  );
  router.use("/operator", operatorRouter);

  const companyRouter = Router();
  companyRouter.use(authMiddleware, requireRoles(["company_admin"]));
  companyRouter.get(
    "/knowledge-base",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const result = await context.companyService.getKnowledgeBase(actor);
      response.json(result);
    })
  );
  companyRouter.post(
    "/faq",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const payload = createFaqSchema.parse(request.body);
      const result = await context.companyService.createFaq(actor, payload);
      response.status(201).json(result);
    })
  );
  companyRouter.put(
    "/faq/:faqId",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const payload = updateFaqSchema.parse(request.body);
      const result = await context.companyService.updateFaq(actor, getSingleValue(request.params.faqId, "faqId"), payload);
      response.json(result);
    })
  );
  companyRouter.get(
    "/widget-config",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const result = await context.companyService.getWidgetConfig(actor);
      response.json(result);
    })
  );
  companyRouter.put(
    "/widget-config",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const payload = updateWidgetConfigSchema.parse(request.body);
      const result = await context.companyService.updateWidgetConfig(actor, payload);
      response.json(result);
    })
  );
  router.use("/company", companyRouter);

  const platformRouter = Router();
  platformRouter.use(authMiddleware, requireRoles(["platform_admin"]));
  platformRouter.get(
    "/tenants",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const result = await context.platformService.listTenants(actor);
      response.json(result);
    })
  );
  platformRouter.post(
    "/tenants",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const payload = createTenantSchema.parse(request.body);
      const result = await context.platformService.createTenant(actor, payload);
      response.status(201).json(result);
    })
  );
  platformRouter.post(
    "/tenants/:tenantId/block",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const payload = blockTenantSchema.parse(request.body);
      const result = await context.platformService.setTenantBlocked(
        actor,
        getSingleValue(request.params.tenantId, "tenantId"),
        payload.isBlocked
      );
      response.json(result);
    })
  );
  platformRouter.get(
    "/metrics",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const result = await context.platformService.getMetrics(actor);
      response.json(result);
    })
  );
  router.use("/platform", platformRouter);

  router.use((_, __, next) => next(new AppError("Маршрут не найден.", 404, "ROUTE_NOT_FOUND")));

  return router;
};
