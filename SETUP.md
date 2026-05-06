# SupportPulse — Запуск и настройка

## Быстрый старт

```bash
# 1. Клонировать репозиторий
git clone https://github.com/keshtoim/SupportPulse.git
cd SupportPulse

# 2. Установить зависимости
npm install
npm --prefix apps/widget-ui install

# 3. Создать файлы окружения
cp .env.example .env
cp apps/widget-ui/.env.example apps/widget-ui/.env

# 4. Заполнить .env:
#    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — из Supabase Dashboard → Settings → API
#    JWT_ACCESS_SECRET, JWT_REFRESH_SECRET — любые случайные строки (мин. 32 символа)
#    OPENAI_API_KEY — опционально

# 5. Запустить
npm run dev:all
```

В логах должно появиться `Persistence: Supabase` — значит БД подключена.

---

## Подробное описание

## Требования

- Node.js 20+
- npm 9+

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
| `PORT` | Порт backend (по умолчанию `3000`) |
| `NODE_ENV` | `development` или `production` |
| `FRONTEND_ORIGIN` | URL frontend-сервера в dev-режиме (`http://localhost:5173`) |
| `JWT_ACCESS_SECRET` | Секрет для подписи access-токенов (мин. 32 символа) |
| `JWT_REFRESH_SECRET` | Секрет для refresh-токенов |
| `ACCESS_TOKEN_TTL` | Время жизни access-токена (например, `15m`) |
| `REFRESH_TOKEN_TTL` | Время жизни refresh-токена (например, `7d`) |
| `SUPABASE_URL` | URL Supabase-проекта |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role ключ (bypasses RLS) |
| `OPENAI_API_KEY` | Ключ OpenAI (опционально — без него fallback по FAQ) |
| `OPENAI_MODEL` | Модель OpenAI (по умолчанию `gpt-4o-mini`) |

Если `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` заполнены — backend автоматически использует Supabase. Без них запускается на in-memory адаптерах (данные теряются при перезапуске).

### Frontend `apps/widget-ui/.env`

| Переменная | Описание |
|---|---|
| `VITE_API_BASE_URL` | URL backend API (в dev: `/api`, proxied Vite → `:3000`) |
| `VITE_DEFAULT_TENANT_ID` | UUID тенанта по умолчанию |

---

## Supabase

Схема и тестовые данные уже применены к проекту. Если разворачиваешь с нуля — выполни в Supabase Dashboard → SQL Editor:

```
supabase/migrations/001_init.sql   — схема БД
supabase/seed.sql                  — тестовые данные (тенант, пользователи, FAQ)
```

---

## Локальный запуск

### Вариант 1 — один терминал

```bash
npm run dev:all
```

Backend на `:3000`, frontend на `:5173`. В логах должно появиться `Persistence: Supabase`.

### Вариант 2 — раздельно

```bash
# Терминал 1
npm run dev

# Терминал 2
npm run dev:frontend
```

---

## Тест встраивания виджета

Открой `demo.html` в браузере при запущенном backend + frontend. Файл в корне проекта имитирует сайт компании и загружает виджет через:

```html
<script src="http://localhost:3000/api/public/tenants/11111111-1111-1111-1111-111111111111/embed.js"></script>
```

---

## Production-сборка

```bash
npm run build:fullstack
npm start
```

После сборки backend раздаёт frontend по `/`, API доступен по `/api`.

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
GET  /api/company/knowledge-base
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
    persistence/
      supabase/             репозитории Supabase (основные)
      in-memory/            fallback без БД
supabase/
  migrations/               SQL-схема
  seed.sql                  тестовые данные
apps/widget-ui/
  src/                      frontend виджета и панели (Preact)
demo.html                   тестовая страница для проверки embed
test/
  supportpulse-api.test.ts
```
