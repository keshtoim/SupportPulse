import type {
  WidgetConfigDTO,
  GetAdminTopicsResponse,
  CreateTopicRequest,
  CreateTopicResponse,
  UpdateTopicRequest,
  UpdateTopicResponse,
  DeleteTopicResponse,
  CreateFAQItemRequest,
  CreateFAQItemResponse,
  UpdateFAQItemRequest,
  UpdateFAQItemResponse,
  DeleteFAQItemResponse,
  UpdateWidgetConfigRequest,
  UpdateWidgetConfigResponse,
} from '@supportpulse/shared'
import { http } from './client'

export const adminApi = {
  getWidgetConfig: (tenantId: string) =>
    http.get<WidgetConfigDTO>(`/widget/${tenantId}/config`),

  updateWidgetConfig: (body: UpdateWidgetConfigRequest) =>
    http.put<UpdateWidgetConfigResponse>('/admin/widget-config', body),

  getTopics: () =>
    http.get<GetAdminTopicsResponse>('/admin/topics'),

  createTopic: (body: CreateTopicRequest) =>
    http.post<CreateTopicResponse>('/admin/topics', body),

  updateTopic: (topicId: string, body: UpdateTopicRequest) =>
    http.patch<UpdateTopicResponse>(`/admin/topics/${topicId}`, body),

  deleteTopic: (topicId: string) =>
    http.del<DeleteTopicResponse>(`/admin/topics/${topicId}`),

  createFAQ: (topicId: string, body: CreateFAQItemRequest) =>
    http.post<CreateFAQItemResponse>(`/admin/topics/${topicId}/faq`, body),

  updateFAQ: (faqId: string, body: UpdateFAQItemRequest) =>
    http.patch<UpdateFAQItemResponse>(`/admin/faq/${faqId}`, body),

  deleteFAQ: (faqId: string) =>
    http.del<DeleteFAQItemResponse>(`/admin/faq/${faqId}`),
}
