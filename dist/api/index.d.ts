import { UserDTO, TopicWithFAQDTO, FAQItemDTO, TopicDTO, MessageDTO, TicketSummaryDTO, TicketDetailDTO, DialogueSessionDTO, WidgetConfigDTO, PaginatedResponse } from "../dto";
import { TicketStatus, UserRole } from "../enums";
export interface LoginRequest {
    email: string;
    password: string;
}
export interface LoginResponse {
    accessToken: string;
    user: UserDTO;
}
export interface LogoutResponse {
    success: boolean;
}
export type GetWidgetConfigResponse = WidgetConfigDTO;
export type GetTopicsResponse = TopicWithFAQDTO[];
export interface SearchFAQRequest {
    q: string;
}
export interface SearchFAQResponse {
    results: FAQItemDTO[];
}
export interface CreateSessionRequest {
    tenantId: string;
    clientContactInfo?: {
        name?: string;
        email?: string;
        phone?: string;
    };
}
export interface CreateSessionResponse {
    session: DialogueSessionDTO;
}
export interface SendMessageRequest {
    content: string;
}
export interface SendMessageResponse {
    userMessage: MessageDTO;
    aiReply: MessageDTO | null;
    escalated: boolean;
    ticket: TicketSummaryDTO | null;
}
export interface EscalateSessionRequest {
    reason?: string;
}
export interface EscalateSessionResponse {
    ticket: TicketSummaryDTO;
    session: DialogueSessionDTO;
}
export type GetSessionMessagesResponse = MessageDTO[];
export interface GetTicketsRequest {
    status?: TicketStatus;
    page?: number;
    pageSize?: number;
}
export type GetTicketsResponse = PaginatedResponse<TicketSummaryDTO>;
export type GetTicketDetailResponse = TicketDetailDTO;
export interface AssignTicketRequest {
    assignedUserId: string;
}
export interface AssignTicketResponse {
    ticket: TicketSummaryDTO;
}
export interface UpdateTicketStatusRequest {
    status: TicketStatus;
}
export interface UpdateTicketStatusResponse {
    ticket: TicketSummaryDTO;
}
export interface ReplyToTicketRequest {
    content: string;
}
export interface ReplyToTicketResponse {
    message: MessageDTO;
}
export interface UpdateInternalNotesRequest {
    internalNotes: string;
}
export interface UpdateInternalNotesResponse {
    ticket: TicketDetailDTO;
}
export interface CloseTicketRequest {
    closureCategory: string;
}
export interface CloseTicketResponse {
    ticket: TicketSummaryDTO;
}
export type GetAdminTopicsResponse = TopicDTO[];
export interface CreateTopicRequest {
    title: string;
}
export interface CreateTopicResponse {
    topic: TopicDTO;
}
export interface UpdateTopicRequest {
    title?: string;
    isPublished?: boolean;
}
export interface UpdateTopicResponse {
    topic: TopicDTO;
}
export interface DeleteTopicResponse {
    success: boolean;
}
export interface CreateFAQItemRequest {
    question: string;
    answer: string;
}
export interface CreateFAQItemResponse {
    item: FAQItemDTO;
}
export interface UpdateFAQItemRequest {
    question?: string;
    answer?: string;
    isPublished?: boolean;
}
export interface UpdateFAQItemResponse {
    item: FAQItemDTO;
}
export interface DeleteFAQItemResponse {
    success: boolean;
}
export interface UpdateWidgetConfigRequest {
    brandColor?: string;
    welcomeMessage?: string;
    logoUrl?: string;
    privacyPolicyUrl?: string;
}
export interface UpdateWidgetConfigResponse {
    config: WidgetConfigDTO;
}
export type GetUsersResponse = UserDTO[];
export interface CreateUserRequest {
    name: string;
    email: string;
    password: string;
    role: UserRole;
}
export interface CreateUserResponse {
    user: UserDTO;
}
export interface UpdateUserRequest {
    name?: string;
    role?: UserRole;
    isActive?: boolean;
}
export interface UpdateUserResponse {
    user: UserDTO;
}
export interface TenantDTO {
    tenantId: string;
    name: string;
    isBlocked: boolean;
    createdAt: string;
}
export type GetTenantsResponse = TenantDTO[];
export interface CreateTenantRequest {
    name: string;
}
export interface CreateTenantResponse {
    tenant: TenantDTO;
}
export interface UpdateTenantRequest {
    isBlocked?: boolean;
    name?: string;
}
export interface UpdateTenantResponse {
    tenant: TenantDTO;
}
