# SupportPulse

> AI-виджет поддержки с эскалацией на оператора — мультитенантная SaaS-платформа

## Главная идея

Компания встраивает на сайт один тег `<script>` и получает полноценный канал поддержки:

- клиент задаёт вопрос в виджете;
- AI отвечает мгновенно, опираясь на базу знаний (FAQ);
- если ответа нет или клиент просит оператора — создаётся тикет;
- оператор забирает тикет, переписывается с клиентом прямо в той же сессии;
- все данные изолированы по тенанту; платформа обслуживает сколько угодно компаний.

---

## MVP-сценарий

```
1. Клиент открывает сайт компании
       ↓
2. Загружается виджет (embed.js → iframe)
       ↓
3. Клиент вводит вопрос
       ↓
4. AI ищет ответ в базе знаний (FAQ RAG)
       ↓
5a. Найден ответ → AI отвечает клиенту
5b. Ответ не найден / клиент просит оператора → создаётся тикет
       ↓
6. Оператор видит тикет в очереди, забирает его (claim)
       ↓
7. Оператор переписывается с клиентом через панель
       ↓
8. Оператор закрывает тикет
```

---

## Ключевые возможности

| Область | Что умеет |
|---|---|
| **Виджет (клиент)** | Приветствие, FAQ-поиск, AI-чат, эскалация на оператора |
| **AI / база знаний** | FAQ RAG с токенизацией и префиксным поиском; LangChain + GPT-4o-mini при наличии ключа |
| **Эскалация / тикеты** | Создание тикета, статусная машина, история сообщений |
| **Операторская панель** | Очередь тикетов, принятие (claim), ответы, смена статуса |
| **Панель компании** | Управление темами и статьями FAQ, настройка виджета (цвет, тон, privacy) |
| **Панель платформы** | Создание тенантов, блокировка, базовые метрики |
| **Встраивание** | `GET /api/public/tenants/:id/embed.js` — один тег `<script>` |
| **Мультитенантность** | Каждая компания — изолированный тенант; данные не пересекаются |

---

## Архитектура

```mermaid
flowchart TD
    subgraph Client["Браузер клиента"]
        W[Виджет\nPreact iframe]
    end

    subgraph Operator["Браузер оператора / компании"]
        A[Админ-панель\nPreact SPA]
    end

    subgraph Backend["Backend — Node.js / Express"]
        direction TB
        PUB[Public API\n/api/public/...]
        OPR[Operator API\n/api/operator/...]
        CMP[Company API\n/api/company/...]
        PLT[Platform API\n/api/platform/...]
        APP[Application Services]
        AI[AI / FAQ RAG\nLangChain + OpenAI]
        PUB & OPR & CMP & PLT --> APP
        APP --> AI
    end

    subgraph Storage["Хранилище"]
        DB[(Supabase\nPostgreSQL)]
    end

    W -->|REST| PUB
    A -->|REST + JWT| OPR & CMP & PLT
    APP <-->|Supabase client| DB
```

---

## ER-диаграмма

```mermaid
erDiagram
    TENANTS ||--o{ USERS : has
    TENANTS ||--|| WIDGET_CONFIGS : has
    TENANTS ||--o{ TOPICS : has
    TOPICS ||--o{ FAQ_ARTICLES : contains
    TENANTS ||--o{ DIALOGUE_SESSIONS : has
    DIALOGUE_SESSIONS ||--o| TICKETS : escalates_to
    DIALOGUE_SESSIONS ||--o{ MESSAGES : contains
    TICKETS ||--o{ MESSAGES : contains
    USERS ||--o{ TICKETS : claims

    TENANTS {
        uuid id PK
        string name
        bool is_blocked
    }
    USERS {
        uuid id PK
        uuid tenant_id FK
        string email
        string role
    }
    WIDGET_CONFIGS {
        uuid id PK
        uuid tenant_id FK
        string brand_color
        string welcome_message
        string tone_of_voice
    }
    TOPICS {
        uuid id PK
        uuid tenant_id FK
        string title
    }
    FAQ_ARTICLES {
        uuid id PK
        uuid topic_id FK
        string question
        string answer
    }
    DIALOGUE_SESSIONS {
        uuid id PK
        uuid tenant_id FK
        string customer_name
        string customer_email
    }
    TICKETS {
        uuid id PK
        uuid session_id FK
        uuid tenant_id FK
        uuid assigned_to FK
        string status
        string reason
    }
    MESSAGES {
        uuid id PK
        uuid session_id FK
        uuid ticket_id FK
        string sender_type
        text content
        timestamp created_at
    }
```

---

## Доменная модель

```mermaid
classDiagram
    class Tenant {
        +string id
        +string name
        +boolean isBlocked
    }
    class WidgetConfig {
        +string brandColor
        +string welcomeMessage
        +string toneOfVoice
        +boolean showPrivacyNotice
    }
    class Topic {
        +string id
        +string tenantId
        +string title
        +FaqArticle[] articles
    }
    class FaqArticle {
        +string id
        +string topicId
        +string question
        +string answer
    }
    class DialogueSession {
        +string id
        +string tenantId
        +string customerName
        +string customerEmail
    }
    class Ticket {
        +string id
        +string sessionId
        +TicketStatus status
        +string reason
        +string assignedTo
    }
    class Message {
        +string id
        +string sessionId
        +SenderType senderType
        +string content
    }
    class User {
        +string id
        +string tenantId
        +UserRole role
        +string email
    }

    Tenant "1" --> "1" WidgetConfig
    Tenant "1" --> "*" Topic
    Topic "1" --> "*" FaqArticle
    Tenant "1" --> "*" DialogueSession
    DialogueSession "1" --> "0..1" Ticket
    DialogueSession "1" --> "*" Message
    Tenant "1" --> "*" User
```

---

## Жизненный цикл тикета

```mermaid
stateDiagram-v2
    [*] --> new : эскалация из AI-чата
    new --> in_progress : оператор забирает (claim)
    in_progress --> waiting_client : оператор ответил, ждёт клиента
    waiting_client --> in_progress : клиент ответил
    in_progress --> closed : оператор закрывает
    waiting_client --> closed : оператор закрывает
    closed --> [*]
```

---

## Роли и взаимодействие

```mermaid
flowchart LR
    subgraph Roles
        CL((Клиент))
        OP((Оператор))
        CA((Company\nAdmin))
        PA((Platform\nAdmin))
    end

    CL -->|виджет| FAQ[Поиск по FAQ]
    CL -->|виджет| CHAT[AI-чат]
    CL -->|виджет| ESC[Запрос оператора]

    OP -->|панель| QUEUE[Очередь тикетов]
    OP -->|панель| REPLY[Ответ клиенту]
    OP -->|панель| STATUS[Смена статуса]

    CA -->|панель| KB[База знаний]
    CA -->|панель| WC[Настройка виджета]

    PA -->|панель| TEN[Управление тенантами]
    PA -->|панель| MET[Метрики платформы]
```

---

## Стек технологий

| Слой | Технология |
|---|---|
| **Виджет (клиент)** | Preact + Vite (iframe embed) |
| **Админ-панель** | Preact + Vite (SPA) |
| **Backend** | Node.js + Express + TypeScript |
| **Архитектура** | Clean Architecture (domain / application / infrastructure) |
| **База данных** | Supabase (PostgreSQL) |
| **AI** | LangChain + OpenAI GPT-4o-mini; локальный fallback без ключа |
| **Авторизация** | JWT (access + refresh) + RBAC |
| **Встраивание** | Динамический `embed.js` → iframe |
| **Деплой** | Vercel (frontend) + Render / Railway (backend) |

---

## Быстрый старт

Смотри [SETUP.md](SETUP.md) — там пошаговая инструкция по локальному запуску, переменным окружения, демо-аккаунтам и API.
