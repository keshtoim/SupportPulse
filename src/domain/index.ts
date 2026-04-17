// ─── domain/index.ts ─────────────────────────────────────────────────────────
// Базовые доменные модели SupportPulse.
// Эти типы можно использовать как на беке, так и на фронте в слоях данных.
//
// Примечания по типам:
//   • id-поля: string (UUID v4)
//   • timestamps: string (ISO 8601)
//   • null используется там, где поле может отсутствовать в БД/API

import { UserRole, TicketStatus, SessionState, SenderType } from "../enums";

export interface Tenant {
  tenant_id: string;   // uuid
  name: string;
  is_blocked: boolean;
  created_at: string;  // timestamptz → ISO string
}

export interface User {
  user_id: string;     // uuid — Supabase auth.users.id
  tenant_id: string;
  name: string;
  email: string;
  // ⚠️ passwordHash здесь отсутствует намеренно:
  // Supabase Auth управляет паролями сам, мы не храним хеши в своей таблице.
  // Аутентификация через supabase.auth.signInWithPassword() на беке.
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
  // embedding хранится в Supabase pgvector — здесь не отражаем,
  // это деталь реализации RAG-слоя (LangChain.js + text-embedding-3-small)
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
  } | null;            // jsonb в Supabase → null, не undefined
  created_at: string;
  updated_at: string;
}

export interface Message {
  message_id: string;
  session_id: string;
  ticket_id: string | null;
  sender_type: SenderType;
  sender_id: string | null;  // user_id оператора; null для AI и анонимного клиента
  content: string;
  sent_at: string;
  used_kb_sources: string[] | null; // faq_id[] — для аудита (FR-025)
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

// ── Frontend view models ─────────────────────────────────────────────────────
// UI-модели для React/Preact, когда нужно описать состояние интерфейса
// независимо от формата API DTO.

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
