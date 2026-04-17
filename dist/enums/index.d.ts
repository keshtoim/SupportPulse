export type UserRole = "client" | "operator" | "supervisor" | "company_admin" | "platform_admin";
export declare const UserRole: {
    Client: "client";
    Operator: "operator";
    Supervisor: "supervisor";
    CompanyAdmin: "company_admin";
    PlatformAdmin: "platform_admin";
};
export type TicketStatus = "new" | "in_queue" | "in_progress" | "waiting_client" | "closed";
export declare const TicketStatus: {
    New: "new";
    InQueue: "in_queue";
    InProgress: "in_progress";
    WaitingClient: "waiting_client";
    Closed: "closed";
};
export type SessionState = "active" | "escalated" | "closed";
export declare const SessionState: {
    Active: "active";
    Escalated: "escalated";
    Closed: "closed";
};
export type SenderType = "client" | "ai" | "operator";
export declare const SenderType: {
    Client: "client";
    AI: "ai";
    Operator: "operator";
};
