export type ErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "INVALID_CREDENTIALS" | "TENANT_MISMATCH" | "TENANT_BLOCKED" | "NOT_FOUND" | "ALREADY_EXISTS" | "TICKET_ALREADY_CLOSED" | "TICKET_NOT_ASSIGNABLE" | "AI_UNAVAILABLE" | "AI_RATE_LIMITED" | "KB_INDEX_UPDATING" | "FILE_TOO_LARGE" | "FILE_TYPE_NOT_SUPPORTED" | "VALIDATION_ERROR" | "INTERNAL_ERROR";
export declare const ErrorCode: {
    Unauthorized: "UNAUTHORIZED";
    Forbidden: "FORBIDDEN";
    InvalidCredentials: "INVALID_CREDENTIALS";
    TenantMismatch: "TENANT_MISMATCH";
    TenantBlocked: "TENANT_BLOCKED";
    NotFound: "NOT_FOUND";
    AlreadyExists: "ALREADY_EXISTS";
    TicketAlreadyClosed: "TICKET_ALREADY_CLOSED";
    TicketNotAssignable: "TICKET_NOT_ASSIGNABLE";
    AIUnavailable: "AI_UNAVAILABLE";
    AIRateLimited: "AI_RATE_LIMITED";
    KBIndexUpdating: "KB_INDEX_UPDATING";
    FileTooLarge: "FILE_TOO_LARGE";
    FileTypeNotSupported: "FILE_TYPE_NOT_SUPPORTED";
    ValidationError: "VALIDATION_ERROR";
    InternalError: "INTERNAL_ERROR";
};
/** Стандартное тело ошибки от Express-бека */
export interface ApiError {
    code: ErrorCode;
    message: string;
    details?: Record<string, string[]>;
}
