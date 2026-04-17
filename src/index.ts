// ─── index.ts — единая точка входа ───────────────────────────────────────────
// import { UserDTO, LoginRequest, ErrorCode } from "@supportpulse/shared"

export * from "./enums";
export * from "./dto";
export * from "./api";
export * from "./errors";

// domain/ намеренно НЕ реэкспортируется отсюда —
// его импортирует только бек напрямую: import { User } from "@supportpulse/shared/domain"
