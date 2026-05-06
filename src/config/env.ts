import { config } from "dotenv";
import { z } from "zod";

config();

const DEV_SECRETS = ["dev-access-secret", "dev-refresh-secret"];

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(3000),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    ACCESS_TOKEN_TTL: z.string().default("15m"),
    REFRESH_TOKEN_TTL: z.string().default("7d"),
    OPENAI_API_KEY: z.string().optional().transform((value) => value?.trim() || undefined),
    OPENAI_MODEL: z.string().default("gpt-4o-mini"),
    SUPABASE_URL: z.url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== "production") return;

    if (DEV_SECRETS.includes(data.JWT_ACCESS_SECRET) || DEV_SECRETS.includes(data.JWT_REFRESH_SECRET)) {
      ctx.addIssue({ code: "custom", message: "JWT_ACCESS_SECRET и JWT_REFRESH_SECRET должны быть изменены перед запуском в production." });
    }

    if (data.FRONTEND_ORIGIN === "*") {
      ctx.addIssue({ code: "custom", message: "FRONTEND_ORIGIN не может быть '*' в production. Укажите конкретный домен." });
    }
  });

export type AppEnv = {
  port: number;
  nodeEnv: "development" | "test" | "production";
  frontendOrigin: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  accessTokenTtl: string;
  refreshTokenTtl: string;
  openAiApiKey?: string;
  openAiModel: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
};

export const loadEnv = (): AppEnv => {
  const parsed = envSchema.parse(process.env);

  return {
    port: parsed.PORT,
    nodeEnv: parsed.NODE_ENV,
    frontendOrigin: parsed.FRONTEND_ORIGIN,
    jwtAccessSecret: parsed.JWT_ACCESS_SECRET,
    jwtRefreshSecret: parsed.JWT_REFRESH_SECRET,
    accessTokenTtl: parsed.ACCESS_TOKEN_TTL,
    refreshTokenTtl: parsed.REFRESH_TOKEN_TTL,
    openAiApiKey: parsed.OPENAI_API_KEY,
    openAiModel: parsed.OPENAI_MODEL,
    supabaseUrl: parsed.SUPABASE_URL,
    supabaseServiceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY
  };
};
