import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app/create-app";
import { createApplicationContext } from "../src/app/application-context";
import type { AppEnv } from "../src/config/env";

const testEnv: AppEnv = {
  port: 3100,
  nodeEnv: "test",
  frontendOrigin: "*",
  jwtAccessSecret: "test-access-secret",
  jwtRefreshSecret: "test-refresh-secret",
  accessTokenTtl: "15m",
  refreshTokenTtl: "7d",
  openAiModel: "gpt-4o-mini"
};

const buildTestApp = () => createApp(createApplicationContext(testEnv));

describe("SupportPulse API", () => {
  it("авторизует оператора и возвращает пару токенов", async () => {
    const app = buildTestApp();

    const response = await request(app).post("/api/auth/login").send({
      email: "operator@acme.dev",
      password: "Admin123!"
    });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("operator@acme.dev");
    expect(response.body.tokens.accessToken).toBeTypeOf("string");
    expect(response.body.tokens.refreshToken).toBeTypeOf("string");
  });

  it("отвечает клиенту на вопрос из FAQ без эскалации", async () => {
    const app = buildTestApp();

    const sessionResponse = await request(app)
      .post("/api/public/tenants/tenant-acme/dialogue-sessions")
      .send({ customerName: "Иван" });

    const sessionId = sessionResponse.body.id;

    const messageResponse = await request(app)
      .post(`/api/public/tenants/tenant-acme/dialogue-sessions/${sessionId}/messages`)
      .send({ content: "Как вернуть деньги за подписку?" });

    expect(messageResponse.status).toBe(200);
    expect(messageResponse.body.decision).toBe("answer");
    expect(messageResponse.body.reply.senderType).toBe("ai");
    expect(messageResponse.body.reply.metadata.matchedArticleIds).toContain("faq-refund");
  });

  it("эскалирует диалог оператору и показывает тикет в очереди", async () => {
    const app = buildTestApp();

    const sessionResponse = await request(app)
      .post("/api/public/tenants/tenant-acme/dialogue-sessions")
      .send({ customerName: "Пётр" });

    const sessionId = sessionResponse.body.id;

    const escalateResponse = await request(app)
      .post(`/api/public/tenants/tenant-acme/dialogue-sessions/${sessionId}/messages`)
      .send({ content: "Мне нужен живой оператор прямо сейчас" });

    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "operator@acme.dev",
      password: "Admin123!"
    });

    const ticketsResponse = await request(app)
      .get("/api/operator/tickets")
      .set("Authorization", `Bearer ${loginResponse.body.tokens.accessToken}`);

    expect(escalateResponse.status).toBe(200);
    expect(escalateResponse.body.decision).toBe("escalate");
    expect(escalateResponse.body.ticket.status).toBe("new");
    expect(ticketsResponse.status).toBe(200);
    expect(ticketsResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: escalateResponse.body.ticket.id,
          sessionId,
          status: "new"
        })
      ])
    );
  });
});
