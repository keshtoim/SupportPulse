# SupportPulse — Запуск и настройка

## Требования

- Node.js 20+
- npm 9+
- Supabase-проект (или запуск на in-memory адаптерах без внешней БД)

---

## Установка зависимостей

```bash
# Backend
npm install

# Frontend (виджет + панель)
npm --prefix apps/widget-ui install
```

---

## Переменные окружения

Скопируй шаблон и заполни значения:

```bash
cp .env.example .env
cp apps/widget-ui/.env.example apps/widget-ui/.env
```

### Backend `.env`

| Переменная | Описание |
|---|---|
| `PORT` | Порт backend (по умолчанию 3000) |
| `NODE_ENV` | `development` или `production` |
| `JWT_SECRET` | Секрет для подписи access-токенов |
| `JWT_REFRESH_SECRET` | Секрет для refresh-токенов |
| `FRONTEND_ORIGIN` | URL frontend-сервера в dev-режиме (например, `http://localhost:5173`) |
| `SUPABASE_URL` | URL Supabase-проекта |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role ключ (bypasses RLS) |
| `OPENAI_API_KEY` | Ключ OpenAI (опционально — без него работает fallback по FAQ) |
| `OPENAI_MODEL` | Модель OpenAI (по умолчанию `gpt-4o-mini`) |

### Frontend `apps/widget-ui/.env`

| Переменная | Описание |
|---|---|
| `VITE_API_BASE_URL` | URL backend API (например, `http://localhost:3000/api`) |

---

## Локальный запуск

### Вариант 1 — один терминал (backend + frontend одновременно)

```bash
npm run dev:all
```

Backend запустится на `:3000`, frontend — на `:5173`.

### Вариант 2 — раздельно

```bash
# Терминал 1 — backend
npm run dev

# Терминал 2 — frontend
npm run dev:frontend
```

---

## Тест встраивания виджета

Открой `demo.html` в браузере (нужен запущенный backend + frontend):

```
demo.html   ← в корне проекта, имитирует сайт компании
```

Виджет загружается через:

```html
<script src="http://localhost:3000/api/public/tenants/11111111-1111-1111-1111-111111111111/embed.js"></script>
```

---

## Supabase

SQL-миграции и тестовые данные:

```
supabase/migrations/001_init.sql   — схема БД
supabase/seed.sql                  — тестовые данные
```

Применить через Supabase Dashboard → SQL Editor, или:

```bash
supabase db push
```

> Без Supabase система запускается на in-memory адаптерах — данные теряются при перезапуске.

---

## Production-сборка

```bash
# Собрать backend + frontend в единый дистрибутив
npm run build:fullstack

# Запустить собранное приложение (backend раздаёт frontend по /)
npm start
```

После сборки:
- `/` → frontend SPA
- `/api` → backend REST API

---

## Тесты

```bash
npm test
```

---

## Демо-аккаунты

Пароль для всех: `Admin123!`

| Email | Роль |
|---|---|
| `platform@supportpulse.dev` | Администратор платформы |
| `admin@acme.dev` | Администратор компании |
| `supervisor@acme.dev` | Супервизор |
| `operator@acme.dev` | Оператор |

---

## API — краткий справочник

### Auth

```
POST /api/auth/login
POST /api/auth/refresh
```

### Public Widget

```
GET  /api/public/tenants/:tenantId/widget
GET  /api/public/tenants/:tenantId/faq/search?q=...
GET  /api/public/tenants/:tenantId/embed.js
POST /api/public/tenants/:tenantId/dialogue-sessions
GET  /api/public/tenants/:tenantId/dialogue-sessions/:sessionId/messages
POST /api/public/tenants/:tenantId/dialogue-sessions/:sessionId/messages
POST /api/public/tenants/:tenantId/dialogue-sessions/:sessionId/escalate
```

### Operator

```
GET  /api/operator/tickets
GET  /api/operator/tickets/:ticketId/messages
POST /api/operator/tickets/:ticketId/claim
POST /api/operator/tickets/:ticketId/status
POST /api/operator/tickets/:ticketId/messages
```

### Company Admin

```
GET /api/company/knowledge-base
POST /api/company/faq
PUT  /api/company/faq/:faqId
GET  /api/company/widget-config
PUT  /api/company/widget-config
```

### Platform Admin

```
GET  /api/platform/tenants
POST /api/platform/tenants
POST /api/platform/tenants/:tenantId/block
GET  /api/platform/metrics
```

---

## Структура проекта

```
src/
  app/                      композиция приложения
  config/                   env-конфиг
  domain/                   сущности и ошибки
  application/
    ports/                  интерфейсы репозиториев и сервисов
    use-cases/              бизнес-логика
  infrastructure/
    ai/                     AI/RAG-адаптер (LangChain + OpenAI)
    auth/                   JWT и password service
    http/                   роуты и middleware
    persistence/            репозитории (Supabase / in-memory)
supabase/
  migrations/               SQL-схема
  seed.sql                  тестовые данные
apps/widget-ui/
  src/                      frontend виджета и панели (Preact)
demo.html                   тестовая страница для проверки embed
test/
  supportpulse-api.test.ts
```
