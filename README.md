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

## Архитектура системы

Система состоит из клиентских интерфейсов, единого бэкенда, AI-подсистемы и изолированного хранилища данных.

```mermaid
flowchart TD
    subgraph Users [" "]
        direction LR
        AdminC["Администратор компании"]
        Client["Клиент"]
        Operator["Оператор"]
        AdminP["Администратор платформы"]
    end

    subgraph Interfaces ["Клиентские интерфейсы"]
        direction LR
        AdminCompanyUI["Админка компании"]
        WidgetUI["Виджет поддержки"]
        OperatorUI["Админка оператора"]
        AdminPlatformUI["Админка платформы"]
    end

    AdminC --> AdminCompanyUI
    Client --> WidgetUI
    Operator --> OperatorUI
    AdminP --> AdminPlatformUI

    subgraph Backend ["Серверная часть"]
        Core["Backend платформы"]
    end

    AdminCompanyUI --> Core
    WidgetUI --> Core
    OperatorUI --> Core
    AdminPlatformUI --> Core

    subgraph AI ["Подсистема базы знаний и AI"]
        KB["База знаний и AI-агент"]
    end

    subgraph DB ["Хранение данных"]
        Storage[(Хранилище данных системы)]
    end

    Core <--> KB
    Core <--> Storage
```

---

## Схема базы данных (ER Diagram)

Основа системы — строгая изоляция данных по компаниям-клиентам (tenant_id).

```mermaid
erDiagram
    TENANTS ||--o{ TOPICS : "1:N - каждый Tenant имеет темы"
    TENANTS ||--o{ FAQ_ARTICLES : "1:N - каждый Tenant владеет FAQ"
    TENANTS ||--o{ USERS : "1:N - каждый Tenant имеет пользователей"
    TENANTS ||--o{ DIALOGUE_SESSIONS : "1:N - каждый Tenant имеет сессии"

    TENANTS {
        uuid tenant_id PK
        string name
    }

    TOPICS {
        uuid topic_id PK
        uuid tenant_id FK
        string title
    }

    FAQ_ARTICLES {
        uuid faq_id PK
        uuid topic_id FK
        uuid tenant_id FK
        string question
        text answer
    }
    
    TOPICS ||--o{ FAQ_ARTICLES : "1:N - каждая тема содержит FAQ"

    USERS {
        uuid user_id PK
        uuid tenant_id FK
        string role
    }

    TICKETS {
        uuid ticket_id PK
        uuid tenant_id FK
        uuid session_id FK
        string status
        uuid assigned_user_id FK
    }

    USERS ||--o{ TICKETS : "1:N - пользователь может быть назначен на тикеты"

    DIALOGUE_SESSIONS {
        uuid session_id PK
        uuid tenant_id FK
        string state
    }
    
    DIALOGUE_SESSIONS ||--o| TICKETS : "0..1 - сессия может создавать тикет"

    MESSAGES {
        uuid message_id PK
        uuid session_id FK
        uuid ticket_id FK
        text content
        string sender_type
    }

    DIALOGUE_SESSIONS ||--o{ MESSAGES : "1:N - каждая сессия содержит сообщения"
```

---

## Доменная модель (Class Diagram)

Структура основных сущностей приложения и их базовые методы.

```mermaid
classDiagram
    class Tenant {
        +int tenantId
        +string name
        +bool isBlocked
        +rename(newName: string)
        +block()
        +unblock()
    }

    class WidgetConfig {
        +int configId
        +int tenantId
        +string brandColor
        +string welcomeMessage
        +updateBrandColor(color: string)
        +updateWelcomeMessage(message: string)
        +resetToDefault()
    }

    class Topic {
        +int topicId
        +int tenantId
        +string title
        +rename(title: string)
        +publish()
    }

    class FAQArticle {
        +int faqId
        +int topicId
        +string question
        +string answer
        +editQuestion(text: string)
        +editAnswer(text: string)
        +publish()
    }

    class DialogueSession {
        +int sessionId
        +int tenantId
        +string status
        +datetime createdAt
        +open()
        +close()
        +escalate()
    }

    class Message {
        +int messageId
        +int sessionId
        +string content
        +string senderType
        +datetime sentAt
        +send()
        +edit()
    }

    class User {
        +int userId
        +int tenantId
        +string name
        +string email
        +string role
        +login()
        +changeRole(role: string)
        +deactivate()
    }

    class Ticket {
        +int ticketId
        +int tenantId
        +string status
        +int assignedTo
        +assignTo(userId: int)
        +changeStatus(status: string)
        +close()
    }

    Tenant "1" --> "1" WidgetConfig : has
    Tenant "1" --> "many" Topic : has
    Tenant "1" --> "many" DialogueSession : has
    Tenant "1" --> "many" User : has
    
    Topic "1" --> "many" FAQArticle : contains
    DialogueSession "1" --> "many" Message : contains
    User "1" --> "many" Ticket : handles
    DialogueSession "1" --> "0..1" Ticket : has
```

---

## Жизненный цикл обращения (Activity Diagram)

Процесс обработки запроса: от открытия виджета до закрытия тикета.

```mermaid
flowchart TD
    Start(( )) --> Widget[Виджет]
    Widget --> ViewFAQ[Просмотр FAQ]
    ViewFAQ --> ChatAI[Чат AI]
    
    ChatAI -- "AI ответ найден" --> AnsAI[Ответ AI]
    ChatAI -- "недостающие данные" --> Clarify[Уточнение]
    ChatAI -- "клиент позвал оператора" --> Escalate[Эскалация]
    
    Escalate --> TicketCreated[Тикет Создан]
    TicketCreated --> InQueue[В Очереди]
    InQueue -- "оператор взял" --> InProgress[В Работе]
    InProgress -- "тикет решён" --> Closed[Закрыт]
    Closed --> End(( ))
    AnsAI --> End
    Clarify --> End
```

---

## Карта прецедентов (Use Case Diagram)

Взаимодействие ролей с функциональными модулями системы.

```mermaid
flowchart LR
    Client[Клиент]
    Operator[Оператор]
    Supervisor[Супервизор]
    AdminComp[Админ компании]
    AdminPlat[Админ платформы]

    UC_FAQ((Просмотр FAQ / Темы))
    UC_Search((Поиск по FAQ))
    UC_Wait((Статус ожидания))
    UC_ChatAI((Чат с AI))
    UC_Escalate((Эскалация на оператора))
    UC_Tickets((Управление тикетами))
    UC_Settings((Настройка виджета и KB))
    UC_Global((Tenant / Метрики / Аудит))

    Client --> UC_FAQ
    Client --> UC_Search
    Client --> UC_Wait
    Client --> UC_ChatAI
    Client --> UC_Escalate
    
    UC_ChatAI --> UC_Escalate
    UC_Escalate --> UC_Tickets

    Operator --> UC_Tickets
    Supervisor --> UC_Tickets
    AdminComp --> UC_Settings
    AdminPlat --> UC_Global
```

---

## Быстрый старт

Смотри [SETUP.md](SETUP.md) — там пошаговая инструкция по локальному запуску, переменным окружения, демо-аккаунтам и API.
