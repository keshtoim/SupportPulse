import { existsSync } from "node:fs";
import path from "node:path";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import pinoHttp from "pino-http";
import type { ApplicationContext } from "./application-context";
import { AppError } from "../domain/model";
import { createApiRouter } from "../infrastructure/http/routes";

/**
 * Создаёт Express-приложение:
 * - CORS, JSON, HTTP-логгер
 * - API-роутер по пути /api
 * - Раздача статики фронтенда (если собран dist)
 * - Централизованная обработка ошибок
 */
export const createApp = (context: ApplicationContext) => {
  const app = express();
  const frontendDistPath = path.resolve(process.cwd(), "apps/widget-ui/dist");

  app.use(
    cors({
      origin: context.env.frontendOrigin === "*" ? true : context.env.frontendOrigin,
      credentials: true
    })
  );
  app.use(express.json());
  app.use(
    pinoHttp({
      logger: context.logger
    })
  );

  app.use("/api", createApiRouter(context));

  // Раздаём статику фронтенда, если dist собран (production-режим)
  if (existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    // SPA fallback: все не-API пути отдают index.html
    app.get(/^(?!\/api).*/, (_request, response) => {
      response.sendFile(path.join(frontendDistPath, "index.html"));
    });
  }

  // Централизованный обработчик ошибок
  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof AppError) {
      response.status(error.statusCode).json({
        error: error.code,
        message: error.message,
        details: error.details ?? null
      });
      return;
    }

    const unknownError = error as Error;
    context.logger.error({ err: unknownError, message: unknownError?.message }, "Непредвиденная ошибка backend.");
    response.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "На сервере произошла непредвиденная ошибка."
    });
  });

  return app;
};
