"use strict";
// ─── errors/index.ts ──────────────────────────────────────────────────────────
// Коды ошибок — единый список для фронта и бека.
// Бек кидает эти коды в теле ответа, фронт показывает нужный текст.
//
// Supabase Auth ошибки (AuthError) бек перехватывает и маппит в эти коды
// перед отправкой клиенту — фронт не работает с сырыми Supabase-ошибками.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = void 0;
exports.ErrorCode = {
    Unauthorized: "UNAUTHORIZED",
    Forbidden: "FORBIDDEN",
    InvalidCredentials: "INVALID_CREDENTIALS",
    TenantMismatch: "TENANT_MISMATCH",
    TenantBlocked: "TENANT_BLOCKED",
    NotFound: "NOT_FOUND",
    AlreadyExists: "ALREADY_EXISTS",
    TicketAlreadyClosed: "TICKET_ALREADY_CLOSED",
    TicketNotAssignable: "TICKET_NOT_ASSIGNABLE",
    AIUnavailable: "AI_UNAVAILABLE",
    AIRateLimited: "AI_RATE_LIMITED",
    KBIndexUpdating: "KB_INDEX_UPDATING",
    FileTooLarge: "FILE_TOO_LARGE",
    FileTypeNotSupported: "FILE_TYPE_NOT_SUPPORTED",
    ValidationError: "VALIDATION_ERROR",
    InternalError: "INTERNAL_ERROR",
};
