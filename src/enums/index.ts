// ─── enums/index.ts ───────────────────────────────────────────────────────────
// Единственный источник правды для всех строковых констант системы.
// Используется и на фронте, и на беке — никаких дублирующих строк.
//
// ⚠️  Используем string union types вместо TypeScript enum по двум причинам:
//   1. Supabase возвращает строки из БД — union types совместимы напрямую,
//      enum потребовал бы приведения типов на каждом запросе.
//   2. Preact + Vite лучше tree-shaking'ует plain-объекты, чем enum-объекты.
//
// Паттерн: тип + объект-константа с теми же значениями.
// Тип используется для аннотаций, объект — вместо enum.XXX в коде.

// ── UserRole ──────────────────────────────────────────────────────────────────

export type UserRole =
  | "client"
  | "operator"
  | "supervisor"
  | "company_admin"
  | "platform_admin";

export const UserRole = {
  Client:        "client"         as const,
  Operator:      "operator"       as const,
  Supervisor:    "supervisor"     as const,
  CompanyAdmin:  "company_admin"  as const,
  PlatformAdmin: "platform_admin" as const,
} satisfies Record<string, UserRole>;

// ── TicketStatus ──────────────────────────────────────────────────────────────

export type TicketStatus =
  | "new"            // создан при эскалации, ещё не принят
  | "in_queue"       // в очереди оператора
  | "in_progress"    // оператор взял в работу
  | "waiting_client" // ждём ответа клиента
  | "closed";

export const TicketStatus = {
  New:           "new"            as const,
  InQueue:       "in_queue"       as const,
  InProgress:    "in_progress"    as const,
  WaitingClient: "waiting_client" as const,
  Closed:        "closed"         as const,
} satisfies Record<string, TicketStatus>;

// ── SessionState ──────────────────────────────────────────────────────────────

export type SessionState =
  | "active"
  | "escalated"
  | "closed";

export const SessionState = {
  Active:    "active"    as const,
  Escalated: "escalated" as const,
  Closed:    "closed"    as const,
} satisfies Record<string, SessionState>;

// ── SenderType ────────────────────────────────────────────────────────────────

export type SenderType =
  | "client"
  | "ai"
  | "operator";

export const SenderType = {
  Client:   "client"   as const,
  AI:       "ai"       as const,
  Operator: "operator" as const,
} satisfies Record<string, SenderType>;
