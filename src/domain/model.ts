export type UserRole = "operator" | "supervisor" | "company_admin" | "platform_admin";
export type TicketStatus = "new" | "in_progress" | "waiting_client" | "closed";
export type SessionState = "ai_active" | "waiting_operator" | "operator_connected" | "closed";
export type SenderType = "client" | "ai" | "operator" | "system";

export interface Tenant {
  id: string;
  name: string;
  isBlocked: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string | null;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  isBlocked: boolean;
  createdAt: string;
}

export interface Topic {
  id: string;
  tenantId: string;
  title: string;
  createdAt: string;
}

export interface FaqArticle {
  id: string;
  topicId: string;
  tenantId: string;
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}

export interface WidgetConfig {
  id: string;
  tenantId: string;
  brandColor: string;
  welcomeMessage: string;
  toneOfVoice: string;
  showPrivacyNotice: boolean;
  privacyNotice: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DialogueSession {
  id: string;
  tenantId: string;
  state: SessionState;
  customerName: string | null;
  customerEmail: string | null;
  lastKnowledgeArticleIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sessionId: string;
  ticketId: string | null;
  senderType: SenderType;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface Ticket {
  id: string;
  tenantId: string;
  sessionId: string;
  status: TicketStatus;
  assignedUserId: string | null;
  reason: string;
  requestedBy: string;
  closedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  tenantId: string | null;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export type PublicUser = Omit<User, "passwordHash">;

export interface AuthenticatedUser {
  id: string;
  tenantId: string | null;
  name: string;
  email: string;
  role: UserRole;
}

export interface SupportReplyContext {
  tenant: Tenant;
  widgetConfig: WidgetConfig;
  question: string;
  faqArticles: FaqArticle[];
  history: Message[];
}

export type SupportReplyDecision =
  | {
      kind: "answer";
      message: string;
      matchedArticleIds: string[];
      confidence: number;
    }
  | {
      kind: "clarify";
      message: string;
    }
  | {
      kind: "escalate";
      message: string;
      reason: string;
    };

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly code = "APP_ERROR",
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const toPublicUser = (user: User): PublicUser => {
  const { passwordHash: _, ...rest } = user;
  return rest;
};
