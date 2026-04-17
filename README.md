# SupportPulse

**SupportPulse** — это учебный client-server проект AI-платформы поддержки для сайтов компаний.  
Система позволяет встроить на сайт виджет поддержки с темами, FAQ и чатом, где пользователь может получить ответ от AI-ассистента на основе базы знаний компании, а при необходимости — переключиться на оператора через механизм эскалации в тикет.  

Проект разрабатывается как **MVP учебной командой** с фокусом на архитектуру, multi-tenant подход, работу с базой знаний и демонстрацию полного пользовательского сценария поддержки.

---

## Основная идея проекта

SupportPulse решает задачу быстрого запуска службы поддержки для компаний, которым невыгодно разрабатывать собственную инфраструктуру с нуля.

Пользователь открывает виджет на сайте компании, просматривает темы и FAQ, задаёт вопрос в чат и получает AI-ответ на основе материалов базы знаний. Если AI не может помочь или пользователь хочет перейти к человеку, система создаёт тикет, после чего оператор продолжает диалог в административной панели.

---

## MVP-сценарий

В рамках учебного MVP реализуется следующий основной сценарий:

1. Клиент открывает виджет поддержки на сайте
2. Просматривает темы и FAQ
3. Переходит в чат
4. Получает ответ от AI
5. При необходимости нажимает **«Позвать оператора»**
6. Система создаёт тикет
7. Оператор видит тикет в админке и берёт его в работу
8. Переписка продолжается в рамках одного обращения

---

## Основные возможности

### Клиентский виджет
- отображение тем поддержки
- отображение FAQ
- поиск по FAQ
- чат с AI
- кнопка вызова оператора
- статус ожидания ответа оператора

### AI и база знаний
- ответы на основе FAQ и загруженных материалов компании
- использование базы знаний конкретного tenant
- сохранение истории диалога
- передача контекста переписки в AI

### Эскалация и тикеты
- создание тикета при запросе оператора
- привязка чата к тикету
- назначение обращения в очередь
- работа оператора с обращением

### Админка оператора
- список тикетов
- фильтрация по статусу
- взятие тикета в работу
- просмотр истории переписки
- ответ клиенту в рамках тикета

### Админка компании
- настройка базы знаний
- управление FAQ
- загрузка файлов для обучения базы знаний
- настройка внешнего вида виджета

### Админ-функции платформы
- создание tenant-компаний
- блокировка tenant-компаний
- управление компаниями на уровне платформы

---

## Архитектурная идея

Система строится как **multi-tenant платформа**, где каждая компания-клиент является отдельным tenant.  
Это позволяет:
- логически изолировать данные компаний
- хранить отдельные FAQ, настройки и обращения
- использовать отдельную базу знаний для AI-ответов каждой компании

Верхнеуровнево проект включает:
- клиентский виджет
- админку оператора
- админку компании
- backend API
- AI/RAG-слой
- слой хранения данных

---

## Технологический стек

### Frontend
- **React**
- **Vite**
- **Tailwind CSS**
- **shadcn/ui**

Используется для:
- админки оператора
- админки компании

### Widget Frontend
- **Preact**
- **Vite**
- **Tailwind CSS**

Используется для:
- встраиваемого клиентского виджета на сайт

### Backend
- **Node.js**
- **Express**

Используется для:
- REST API
- бизнес-логики
- работы с тикетами, пользователями, FAQ и чатами
- интеграции с AI-слоем

### Database / Auth / Realtime / Storage
- **Supabase**

Используется для:
- хранения данных
- авторизации
- realtime-механизмов
- хранения файлов базы знаний

### AI / RAG
- **LangChain.js**
- **OpenAI API**
- **gpt-4o-mini**
- **text-embedding-3-small**

Используется для:
- генерации AI-ответов
- embedding текстов
- retrieval по базе знаний
- формирования ответа на основе контекста

### Deploy
- **Vercel** — frontend
- **Render / Railway** — backend

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
