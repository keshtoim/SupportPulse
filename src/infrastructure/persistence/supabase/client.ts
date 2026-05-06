import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import type { IdGenerator } from "../../../application/ports";
import type { AppEnv } from "../../../config/env";

export const createSupabaseClient = (env: AppEnv): SupabaseClient => {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY обязательны для Supabase-репозиториев.");
  }
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });
};

export class SupabaseIdGenerator implements IdGenerator {
  next(_prefix: string): string {
    return uuidv4();
  }
}
