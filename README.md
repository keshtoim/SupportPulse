# SupportPulse Fullstack

Fullstack-проект для колледжного приложения SupportPulse: AI-виджет поддержки, операторская панель, база знаний, эскалация на оператора и backend API.

## Что уже реализовано

- `Express + TypeScript` backend с разделением на `domain / application / infrastructure`.
- `Preact + Vite` frontend в `apps/widget-ui`.
- JWT-авторизация с `access + refresh` токенами.
- Middleware проверки ролей и tenant isolation.
- Публичные API для виджета: темы, FAQ, поиск, старт сессии, сообщения, эскалация.
- Публичный API для получения истории сообщений сессии.
- API оператора: очередь тикетов, принятие тикета, смена статуса, ответы в диалоге.
- API компании: управление FAQ и конфигурацией виджета.
- API платформы: создание и блокировка тенантов, базовые метрики.
- Интеграция frontend c backend:
  виджет отправляет сообщения в API;
  админ-панель выполняет логин, получает тикеты и отвечает клиенту;
  backend умеет раздавать собранный frontend как единое приложение.
- AI-слой через FAQ/RAG-подход:
  если `OPENAI_API_KEY` указан, используется `LangChain + OpenAI`;
  если ключа нет, работает безопасный fallback по локальной базе FAQ.
- SQL-схема и сиды для будущего переноса в `Supabase`.

## Архитектурный подход

Проект собран по принципам `SOLID`:

- доменные модели изолированы от HTTP и внешних адаптеров;
- бизнес-логика вынесена в application services;
- репозитории и сервисы подключаются через интерфейсы;
- текущий runtime использует `in-memory` адаптеры, поэтому систему можно запустить без внешней БД;
- подготовлены SQL-артефакты для следующего шага интеграции с `Supabase`.

## Структура проекта

```text
src/
  app/                      композиция приложения
  config/                   env-конфиг
  domain/                   сущности и ошибки
  application/
    ports/                  интерфейсы репозиториев и сервисов
    use-cases/              бизнес-логика
  infrastructure/
    ai/                     AI/RAG-адаптер
    auth/                   JWT и password service
    http/                   роуты и middleware
    persistence/in-memory/  временное хранилище
supabase/
  migrations/               SQL-схема
  seed.sql                  тестовые данные
apps/widget-ui/
  src/                      frontend виджета и панели
test/
  supportpulse-api.test.ts
```

## Локальный запуск

1. Установить backend-зависимости:

```bash
npm install
```

2. Установить frontend-зависимости:

```bash
npm --prefix apps/widget-ui install
```

3. Создать `.env` на основе `.env.example`.

4. При необходимости создать `apps/widget-ui/.env` на основе `apps/widget-ui/.env.example`.

5. Запустить backend:

```bash
npm run dev
```

6. В отдельном терминале запустить frontend:

```bash
npm run dev:frontend
```

7. Собрать fullstack production:

```bash
npm run build:fullstack
```

8. Прогнать backend-тесты:

```bash
npm test
```

9. Запустить собранное приложение единым сервером:

```bash
npm start
```

После `npm run build:fullstack` backend раздаёт frontend по `/`, а API остаётся доступным по `/api`.

## Демо-аккаунты

Все тестовые аккаунты используют пароль `Admin123!`.

- `platform@supportpulse.dev` — администратор платформы
- `admin@acme.dev` — администратор компании
- `supervisor@acme.dev` — супервизор
- `operator@acme.dev` — оператор

## Основные эндпоинты

### Auth

- `POST /api/auth/login`
- `POST /api/auth/refresh`

### Public Widget

- `GET /api/public/tenants/:tenantId/widget`
- `GET /api/public/tenants/:tenantId/faq/search?q=...`
- `POST /api/public/tenants/:tenantId/dialogue-sessions`
- `GET /api/public/tenants/:tenantId/dialogue-sessions/:sessionId/messages`
- `POST /api/public/tenants/:tenantId/dialogue-sessions/:sessionId/messages`
- `POST /api/public/tenants/:tenantId/dialogue-sessions/:sessionId/escalate`

### Operator

- `GET /api/operator/tickets`
- `GET /api/operator/tickets/:ticketId/messages`
- `POST /api/operator/tickets/:ticketId/claim`
- `POST /api/operator/tickets/:ticketId/status`
- `POST /api/operator/tickets/:ticketId/messages`

### Company Admin

- `GET /api/company/knowledge-base`
- `POST /api/company/faq`
- `PUT /api/company/faq/:faqId`
- `GET /api/company/widget-config`
- `PUT /api/company/widget-config`

### Platform Admin

- `GET /api/platform/tenants`
- `POST /api/platform/tenants`
- `POST /api/platform/tenants/:tenantId/block`
- `GET /api/platform/metrics`

## Supabase

SQL-файлы лежат в:

- `supabase/migrations/001_init.sql`
- `supabase/seed.sql`

Текущий код пока не пишет в `Supabase` напрямую. Следующий инкремент логично посвятить:

- переносу репозиториев с `in-memory` на `Supabase`;
- подключению `Supabase Auth` вместо локальной модели пользователей;
- добавлению realtime-обновлений очереди и чата;
- загрузке файлов и индексации базы знаний;
- полноценной RAG-цепочке на embeddings.

## Что проверено

- `npm run build`
- `npm run build:frontend`
- `npm run build:fullstack`
- `npm test`
- живой запуск backend на локальном порту с проверкой:
  `/` отдаёт собранный frontend;
  `/api/health` отвечает;
  JS-ассеты frontend доступны через backend.
