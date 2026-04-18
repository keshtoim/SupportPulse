import type {
  GetTicketsResponse,
  GetTicketDetailResponse,
  AssignTicketRequest,
  AssignTicketResponse,
  UpdateTicketStatusRequest,
  UpdateTicketStatusResponse,
  ReplyToTicketRequest,
  ReplyToTicketResponse,
  UpdateInternalNotesRequest,
  UpdateInternalNotesResponse,
  CloseTicketRequest,
  CloseTicketResponse,
} from '@supportpulse/shared'
import type { TicketStatus } from '@supportpulse/shared'
import { http } from './client'

export const ticketsApi = {
  list: (params?: { status?: TicketStatus; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams()
    if (params?.status)   q.set('status',   params.status)
    if (params?.page)     q.set('page',     String(params.page))
    if (params?.pageSize) q.set('pageSize', String(params.pageSize))
    return http.get<GetTicketsResponse>(`/tickets?${q.toString()}`)
  },

  get: (ticketId: string) =>
    http.get<GetTicketDetailResponse>(`/tickets/${ticketId}`),

  assign: (ticketId: string, body: AssignTicketRequest) =>
    http.patch<AssignTicketResponse>(`/tickets/${ticketId}/assign`, body),

  setStatus: (ticketId: string, body: UpdateTicketStatusRequest) =>
    http.patch<UpdateTicketStatusResponse>(`/tickets/${ticketId}/status`, body),

  reply: (ticketId: string, body: ReplyToTicketRequest) =>
    http.post<ReplyToTicketResponse>(`/tickets/${ticketId}/messages`, body),

  updateNotes: (ticketId: string, body: UpdateInternalNotesRequest) =>
    http.patch<UpdateInternalNotesResponse>(`/tickets/${ticketId}/notes`, body),

  close: (ticketId: string, body: CloseTicketRequest) =>
    http.post<CloseTicketResponse>(`/tickets/${ticketId}/close`, body),
}
