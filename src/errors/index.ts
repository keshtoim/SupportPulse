// ─── errors/index.ts ──────────────────────────────────────────────────────────
// Коды ошибок — единый список для фронта и бека.
// Бек кидает эти коды в теле ответа, фронт показывает нужный текст.
//
// Supabase Auth ошибки (AuthError) бек перехватывает и маппит в эти коды
// перед отправкой клиенту — фронт не работает с сырыми Supabase-ошибками.

export type ErrorCode =
  // Auth / Supabase Auth
  | "UNAUTHORIZED"           // 401 — нет токена или истёк
  | "FORBIDDEN"              // 403 — нет прав по роли (RLS или бизнес-логика)
  | "INVALID_CREDENTIALS"    // 401 — неверный email/пароль

  // Tenant
  | "TENANT_MISMATCH"        // попытка доступа к чужому тенанту
  | "TENANT_BLOCKED"         // тенант заблокирован администратором платформы

  // Entities
  | "NOT_FOUND"              // 404
  | "ALREADY_EXISTS"         // 409

  // Ticket flow
  | "TICKET_ALREADY_CLOSED"
  | "TICKET_NOT_ASSIGNABLE"

  // AI / LangChain / OpenAI
  | "AI_UNAVAILABLE"         // OpenAI API недоступен → бек эскалирует (NFR-R-01)
  | "AI_RATE_LIMITED"        // превышен лимит OpenAI → бек делает retry сам
  | "KB_INDEX_UPDATING"      // индекс pgvector обновляется после загрузки файла

  // Supabase Storage (загрузка файлов KB)
  | "FILE_TOO_LARGE"
  | "FILE_TYPE_NOT_SUPPORTED"

  // Validation
  | "VALIDATION_ERROR"       // 422 — ошибки полей

  // Generic
  | "INTERNAL_ERROR";        // 500

export const ErrorCode = {
  Unauthorized:         "UNAUTHORIZED"           as const,
  Forbidden:            "FORBIDDEN"              as const,
  InvalidCredentials:   "INVALID_CREDENTIALS"    as const,
  TenantMismatch:       "TENANT_MISMATCH"        as const,
  TenantBlocked:        "TENANT_BLOCKED"         as const,
  NotFound:             "NOT_FOUND"              as const,
  AlreadyExists:        "ALREADY_EXISTS"         as const,
  TicketAlreadyClosed:  "TICKET_ALREADY_CLOSED"  as const,
  TicketNotAssignable:  "TICKET_NOT_ASSIGNABLE"  as const,
  AIUnavailable:        "AI_UNAVAILABLE"         as const,
  AIRateLimited:        "AI_RATE_LIMITED"        as const,
  KBIndexUpdating:      "KB_INDEX_UPDATING"      as const,
  FileTooLarge:         "FILE_TOO_LARGE"         as const,
  FileTypeNotSupported: "FILE_TYPE_NOT_SUPPORTED" as const,
  ValidationError:      "VALIDATION_ERROR"       as const,
  InternalError:        "INTERNAL_ERROR"         as const,
} satisfies Record<string, ErrorCode>;

/** Стандартное тело ошибки от Express-бека */
export interface ApiError {
  code: ErrorCode;
  message: string;                      // человекочитаемое, для логов
  details?: Record<string, string[]>;   // поля с ошибками валидации
}

