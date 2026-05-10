# SupportPulse — Запуск и настройка

## Шаг 1 — Установи нужные программы

Если программа уже установлена — пропусти этот шаг.

### Git
Нужен для скачивания кода.
1. Зайди на https://git-scm.com/download/win и скачай установщик
2. Запусти его и нажимай **Next** до конца — настройки по умолчанию подходят

### Node.js
Нужен для запуска проекта.
1. Зайди на https://nodejs.org и скачай версию **LTS** (левая кнопка)
2. Запусти установщик и нажимай **Next** до конца

### Проверка установки
Открой VS Code, нажми **Ctrl+`** (кнопка под Escape) — откроется терминал.
Введи команды и нажимай Enter после каждой:

```
git --version
node --version
npm --version
```

Если каждая команда вывела номер версии (например, `v20.11.0`) — всё установлено правильно.

---

## Шаг 2 — Скачай проект

В том же терминале VS Code:

```
git clone https://github.com/keshtoim/SupportPulse.git
```

Затем открой скачанную папку в VS Code: **File → Open Folder** → выбери папку `SupportPulse`.

После этого снова открой терминал (**Ctrl+`**) и убедись, что в строке терминала написано что-то вроде `PS K:\SupportPulse>`.

---

## Шаг 3 — Установи зависимости проекта

В терминале выполни по очереди:

```
npm install
npm --prefix apps/widget-ui install
```

Это займёт 1–2 минуты. Это нормально.

---

## Шаг 4 — Создай файлы настроек

В терминале:

```
cp .env.example .env
cp apps/widget-ui/.env.example apps/widget-ui/.env
```

В левой панели VS Code появятся два новых файла: `.env` и `apps/widget-ui/.env`.

---

## Шаг 5 — Заполни настройки

Открой файл `.env` в VS Code (он в корне проекта) и заполни значения.

### Без Supabase (для быстрого старта)

Минимальный набор для запуска на локальных данных — заполни только секреты:

```
JWT_ACCESS_SECRET=вставь_любую_длинную_случайную_строку_минимум_32_символа
JWT_REFRESH_SECRET=вставь_другую_длинную_случайную_строку_минимум_32_символа
```

Как сгенерировать случайную строку: открой https://passwords-generator.org, выбери длину 40, скопируй и вставь.

В этом режиме данные хранятся в памяти и сбрасываются при перезапуске. Подходит для знакомства с проектом.

### С Supabase (полноценная БД)

Дополнительно заполни:

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...
```

Где взять: зайди в [Supabase Dashboard](https://supabase.com/dashboard) → твой проект → **Settings → API** → скопируй **Project URL** и **service_role** ключ.

После этого выполни SQL-миграции в Supabase Dashboard → **SQL Editor**:
- сначала содержимое файла `supabase/migrations/001_init.sql`
- затем содержимое `supabase/seed.sql`

### OpenAI (опционально)

Без него AI отвечает напрямую текстом из FAQ — этого достаточно для тестирования.
Если хочешь умные ответы через GPT:

```
OPENAI_API_KEY=sk-...
```

---

## Шаг 6 — Запусти проект

```
npm run dev:all
```

Подожди несколько секунд. В терминале должно появиться:
```
Backend listening on http://localhost:3000
```

Теперь открой браузер и зайди на **http://localhost:5173** — это панель управления.

---

## Шаг 7 — Войди в систему

На странице входа используй один из демо-аккаунтов. Пароль для всех: `Admin123!`

| Email | Роль |
|---|---|
| `platform@supportpulse.dev` | Администратор платформы |
| `admin@acme.dev` | Администратор компании |
| `supervisor@acme.dev` | Супервизор |
| `operator@acme.dev` | Оператор |

---

## Шаг 8 — Протестируй виджет

Открой файл `demo.html` в браузере (двойной клик по файлу в проводнике или в VS Code через **правую кнопку → Reveal in File Explorer**).

Убедись, что проект запущен (`npm run dev:all` в терминале). В правом нижнем углу страницы появится кнопка виджета.

> **Примечание:** если используешь Supabase free tier, первый запрос может занять до 2 минут — база "засыпает" после периода неактивности. Последующие запросы быстрые.

---

## Остановка проекта

В терминале нажми **Ctrl+C**.

---

## Повторный запуск

После того как проект настроен, для следующего запуска достаточно:

```
npm run dev:all
```

---

## Возможные проблемы

**`npm` не найден** — перезапусти VS Code после установки Node.js.

**`git` не найден** — перезапусти VS Code после установки Git.

**Порт 3000 уже занят** — измени `PORT=3001` в файле `.env`.

**Ошибка `Cannot find module`** — запусти `npm install` ещё раз.

---

## Production-сборка

```
npm run build:fullstack
npm start
```

После сборки backend раздаёт frontend по `/`, API доступен по `/api`.

---

## Тесты

```
npm test
```

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
