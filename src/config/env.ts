import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  FRONTEND_ORIGIN: z.string().default("*"),
  JWT_ACCESS_SECRET: z.string().min(8).default("dev-access-secret"),
  JWT_REFRESH_SECRET: z.string().min(8).default("dev-refresh-secret"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("7d"),
  OPENAI_API_KEY: z.string().optional().transform((value) => value?.trim() || undefined),
  OPENAI_MODEL: z.string().default("gpt-4o-mini")
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
    openAiModel: parsed.OPENAI_MODEL
  };
};
