import { UserRole, TicketStatus, SessionState, SenderType } from "../enums";
export interface Tenant {
    tenant_id: string;
    name: string;
    is_blocked: boolean;
    created_at: string;
}
export interface User {
    user_id: string;
    tenant_id: string;
    name: string;
    email: string;
    role: UserRole;
    is_active: boolean;
    created_at: string;
}
export interface Topic {
    topic_id: string;
    tenant_id: string;
    title: string;
    is_published: boolean;
}
export interface FAQItem {
    faq_id: string;
    topic_id: string;
    tenant_id: string;
    question: string;
    answer: string;
    is_published: boolean;
}
export interface DialogueSession {
    session_id: string;
    tenant_id: string;
    state: SessionState;
    client_contact_info: {
        name?: string;
        email?: string;
        phone?: string;
    } | null;
    created_at: string;
    updated_at: string;
}
export interface Message {
    message_id: string;
    session_id: string;
    ticket_id: string | null;
    sender_type: SenderType;
    sender_id: string | null;
    content: string;
    sent_at: string;
    used_kb_sources: string[] | null;
}
export interface Ticket {
    ticket_id: string;
    tenant_id: string;
    session_id: string;
    status: TicketStatus;
    assigned_user_id: string | null;
    internal_notes: string | null;
    closure_category: string | null;
    created_at: string;
    updated_at: string;
}
export interface WidgetConfig {
    config_id: string;
    tenant_id: string;
    brand_color: string;
    welcome_message: string;
    logo_url: string | null;
    privacy_policy_url: string | null;
}
export interface TicketListItemView {
    ticketId: string;
    status: TicketStatus;
    clientName: string;
    assignedOperatorName: string | null;
    lastMessagePreview: string | null;
    unreadCount: number;
    updatedAt: string;
}
export interface TicketFiltersView {
    status: TicketStatus | "all";
    search: string;
    onlyUnassigned: boolean;
}
export interface ChatMessageView {
    id: string;
    senderType: SenderType;
    senderName: string | null;
    content: string;
    sentAt: string;
    isPending?: boolean;
}
export interface WidgetTopicView {
    topicId: string;
    title: string;
    itemsCount: number;
}
