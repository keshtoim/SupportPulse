import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import type { IdGenerator } from "../../../application/ports";
import type { AppEnv } from "../../../config/env";

const fetchWithTimeout = (timeout: number) =>
  (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return fetch(url, { ...init, signal: controller.signal }).finally(() =>
      clearTimeout(timer)
    );
  };

export const createSupabaseClient = (env: AppEnv): SupabaseClient => {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY обязательны для Supabase-репозиториев.");
  }
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false },
    global: { fetch: fetchWithTimeout(8000) }
  });
};

export class SupabaseIdGenerator implements IdGenerator {
  next(_prefix: string): string {
    return uuidv4();
  }
}
