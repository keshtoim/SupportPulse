import { UserRole, TicketStatus, SessionState, SenderType } from "../enums";
export interface PaginationMeta {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}
export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
}
/** Безопасное представление пользователя для фронта.
 *  Supabase Auth управляет паролем — его здесь нет никогда. */
export interface UserDTO {
    userId: string;
    tenantId: string;
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
}
export interface TopicDTO {
    topicId: string;
    title: string;
    faqCount: number;
}
export interface FAQItemDTO {
    faqId: string;
    topicId: string;
    question: string;
    answer: string;
}
/** Тема со вложенными FAQ — один запрос для виджета (FR-010, FR-011) */
export interface TopicWithFAQDTO extends TopicDTO {
    items: FAQItemDTO[];
}
export interface DialogueSessionDTO {
    sessionId: string;
    state: SessionState;
    createdAt: string;
}
export interface MessageDTO {
    messageId: string;
    sessionId: string;
    ticketId: string | null;
    senderType: SenderType;
    senderName: string | null;
    content: string;
    sentAt: string;
}
export interface AIStreamChunk {
    sessionId: string;
    delta: string;
    done: boolean;
    escalate?: boolean;
}
/** Краткая карточка для списка / очереди (FR-040) */
export interface TicketSummaryDTO {
    ticketId: string;
    status: TicketStatus;
    clientName: string | null;
    assignedOperatorName: string | null;
    createdAt: string;
    updatedAt: string;
}
/** Полная карточка тикета с историей (FR-045) */
export interface TicketDetailDTO extends TicketSummaryDTO {
    sessionId: string;
    messages: MessageDTO[];
    internalNotes: string | null;
    closureCategory: string | null;
    assignedUserId: string | null;
}
export type RealtimeEventType = "ticket.created" | "ticket.assigned" | "ticket.status" | "message.new";
export interface RealtimeEvent<T = unknown> {
    type: RealtimeEventType;
    tenantId: string;
    payload: T;
}
export interface WidgetConfigDTO {
    brandColor: string;
    welcomeMessage: string;
    logoUrl: string | null;
    privacyPolicyUrl: string | null;
}
