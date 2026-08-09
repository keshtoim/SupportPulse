import { Router, type Request, type RequestHandler, type Response } from "express";
import multer from "multer";
import { z } from "zod";
import type { ApplicationContext } from "../../app/application-context";
import { AppError } from "../../domain/model";
import { createAuthMiddleware, getRequiredAuthUser, requireRoles } from "./middlewares/auth-middleware";
import { generateEmbedScript } from "./embed-script";

// Файлы принимаются в память (без записи на диск) — извлечённый текст сразу уходит в БД, сам файл не хранится
const knowledgeDocumentUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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
const ticketCloseCategories = ["resolved", "no_response", "duplicate", "out_of_scope", "other"] as const;

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

const createTopicSchema = z.object({
  title: z.string().min(2)
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

const changeTicketStatusSchema = z
  .object({
    status: z.enum(ticketStatuses),
    closedCategory: z.enum(ticketCloseCategories).optional(),
    closedReason: z.string().optional()
  })
  .refine((data) => data.status !== "closed" || !!data.closedCategory, {
    message: "При закрытии тикета нужно указать категорию.",
    path: ["closedCategory"]
  });

const addTicketNoteSchema = z.object({
  content: z.string().min(1)
});

const createTemplateSchema = z.object({
  title: z.string().min(2),
  content: z.string().min(2)
});

const updateTemplateSchema = z.object({
  title: z.string().min(2),
  content: z.string().min(2)
});

export const createApiRouter = (context: ApplicationContext) => {
  const router = Router();
  const authMiddleware = createAuthMiddleware({
    tokenService: context.tokenService,
    userRepository: context.userRepository
  });

  // --- Health check ---

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

  // --- Auth ---

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

  // --- Public widget API (без авторизации) ---

  router.get(
    "/public/tenants/:tenantId/widget",
    asyncHandler(async (request, response) => {
      const result = await context.widgetService.getWidget(getSingleValue(request.params.tenantId, "tenantId"));
      response.json(result);
    })
  );

  router.get(
    "/public/tenants/:tenantId/embed.js",
    asyncHandler(async (request, response) => {
      const tenantId = getSingleValue(request.params.tenantId, "tenantId");
      const widget = await context.widgetService.getWidget(tenantId);
      const isDev = context.env.nodeEnv === "development";
      const baseUrl = isDev
        ? context.env.frontendOrigin
        : `${request.protocol}://${request.get("host")}`;
      const script = generateEmbedScript(tenantId, baseUrl, widget.widgetConfig.brandColor);
      response.setHeader("Content-Type", "application/javascript; charset=utf-8");
      response.setHeader("Cache-Control", isDev ? "no-store" : "public, max-age=3600");
      response.send(script);
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

  // --- Operator API (operator, supervisor, company_admin, platform_admin) ---

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
  operatorRouter.get(
    "/tickets/:ticketId/notes",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const result = await context.operatorService.listTicketNotes(actor, getSingleValue(request.params.ticketId, "ticketId"));
      response.json(result);
    })
  );
  operatorRouter.post(
    "/tickets/:ticketId/notes",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const payload = addTicketNoteSchema.parse(request.body);
      const result = await context.operatorService.addTicketNote(actor, getSingleValue(request.params.ticketId, "ticketId"), payload.content);
      response.status(201).json(result);
    })
  );
  operatorRouter.get(
    "/templates",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const result = await context.operatorService.listTemplates(actor);
      response.json(result);
    })
  );
  operatorRouter.post(
    "/templates",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const payload = createTemplateSchema.parse(request.body);
      const result = await context.operatorService.createTemplate(actor, payload);
      response.status(201).json(result);
    })
  );
  operatorRouter.put(
    "/templates/:templateId",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const payload = updateTemplateSchema.parse(request.body);
      const result = await context.operatorService.updateTemplate(actor, getSingleValue(request.params.templateId, "templateId"), payload);
      response.json(result);
    })
  );
  operatorRouter.delete(
    "/templates/:templateId",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      await context.operatorService.deleteTemplate(actor, getSingleValue(request.params.templateId, "templateId"));
      response.status(204).send();
    })
  );
  router.use("/operator", operatorRouter);

  // --- Company admin API (company_admin, platform_admin) ---

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
    "/topics",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const payload = createTopicSchema.parse(request.body);
      const result = await context.companyService.createTopic(actor, payload);
      response.status(201).json(result);
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
  companyRouter.get(
    "/knowledge/documents",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      const result = await context.companyService.listKnowledgeDocuments(actor);
      response.json(result);
    })
  );
  companyRouter.post(
    "/knowledge/documents",
    knowledgeDocumentUpload.single("file"),
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);

      if (!request.file) {
        throw new AppError("Файл не передан.", 400, "FILE_MISSING");
      }

      const result = await context.companyService.uploadKnowledgeDocument(actor, {
        buffer: request.file.buffer,
        mimeType: request.file.mimetype,
        fileName: request.file.originalname,
        sizeBytes: request.file.size
      });
      response.status(201).json(result);
    })
  );
  companyRouter.delete(
    "/knowledge/documents/:documentId",
    asyncHandler(async (request, response) => {
      const actor = getRequiredAuthUser(request);
      await context.companyService.deleteKnowledgeDocument(actor, getSingleValue(request.params.documentId, "documentId"));
      response.status(204).send();
    })
  );
  router.use("/company", companyRouter);

  // --- Platform admin API (platform_admin only) ---

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
