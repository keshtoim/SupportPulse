"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketChannel = exports.TicketPriorityLabel = exports.TicketPriority = exports.SenderTypeLabel = exports.SenderType = exports.SessionState = exports.TicketStatusLabel = exports.TicketStatusFilter = exports.TicketStatus = exports.UserRole = void 0;
exports.UserRole = {
    Client: "client",
    Operator: "operator",
    Supervisor: "supervisor",
    CompanyAdmin: "company_admin",
    PlatformAdmin: "platform_admin",
};
exports.TicketStatus = {
    New: "new",
    InQueue: "in_queue",
    InProgress: "in_progress",
    WaitingClient: "waiting_client",
    Closed: "closed",
};
exports.TicketStatusFilter = {
    All: "all",
};
// Человекочитаемые подписи для бейджей и фильтров
exports.TicketStatusLabel = {
    new: "New",
    in_queue: "In queue",
    in_progress: "In progress",
    waiting_client: "Waiting for client",
    closed: "Closed",
};
exports.SessionState = {
    Active: "active",
    Escalated: "escalated",
    Closed: "closed",
};
exports.SenderType = {
    Client: "client",
    AI: "ai",
    Operator: "operator",
};
exports.SenderTypeLabel = {
    client: "Client",
    ai: "AI assistant",
    operator: "Operator",
};
exports.TicketPriority = {
    Low: "low",
    Medium: "medium",
    High: "high",
    Urgent: "urgent",
};
exports.TicketPriorityLabel = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
};
exports.TicketChannel = {
    Widget: "widget",
    Email: "email",
    Phone: "phone",
};
