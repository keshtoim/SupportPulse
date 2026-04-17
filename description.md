# @supportpulse/shared

Общий TypeScript-пакет для проекта SupportPulse.  
Содержит типы, которые используют и фронт, и бек — единственный источник правды о структуре данных.

**Стек:** Supabase · Express (Node.js) · LangChain.js · OpenAI · React+Vite (админка) · Preact+Vite (виджет) · Vercel / Render·Railway

---

## Структура

```
src/
  enums/      — UserRole, TicketStatus, SenderType... (string union + объект-константа)
  domain/     — доменные модели (только бек, snake_case как в Supabase)
  dto/        — DTO для передачи по сети, camelCase (фронт + бек)
  api/        — типы всех Request/Response (фронт + бек)
  errors/     — ErrorCode + ApiError (фронт + бек)
  index.ts    — реэкспорт всего, кроме domain/
```

> **Важно**: `domain/` намеренно не реэкспортируется из `index.ts`.  
> Фронт **никогда** не импортирует доменные модели — только DTO.

---

## Ключевые решения под стек

### Supabase: snake_case → camelCase
Supabase возвращает поля в `snake_case` (как в PostgreSQL).  
**Бек** получает `domain.User` с `user_id`, `tenant_id` и маппит в `UserDTO` с `userId`, `tenantId` перед отправкой.  
**Фронт** всегда работает с camelCase DTO — никакой трансформации на клиенте.

```typescript
// бек (Express route)
import { User } from "@supportpulse/shared/domain";
import { UserDTO } from "@supportpulse/shared";

function toUserDTO(u: User): UserDTO {
  return {
    userId:   u.user_id,
    tenantId: u.tenant_id,
    name:     u.name,
    email:    u.email,
    role:     u.role,
    isActive: u.is_active,
  };
}
```

### Supabase Auth: паролей нет в нашей БД
`passwordHash` отсутствует в доменных моделях — Supabase Auth управляет паролями сам.

```typescript
// бек: логин
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
// data.session.access_token → возвращаем как LoginResponse.accessToken

// бек: проверка токена в middleware
const { data: { user } } = await supabase.auth.getUser(bearerToken);
```

### String union types вместо TypeScript enum
Supabase возвращает строки из БД — union types совместимы напрямую без приведения типов.

```typescript
// ✅ работает без приведения
const status: TicketStatus = row.status; // "in_queue" из Supabase

// используем объект-константу вместо Enum.Value
if (ticket.status === TicketStatus.Closed) { ... }
```

### LangChain.js + SSE стриминг
AI-ответы стримятся через Server-Sent Events. Тип чанка — `AIStreamChunk` из dto/.

```typescript
// виджет (Preact)
import { AIStreamChunk } from "@supportpulse/shared";

const es = new EventSource(`/sessions/${sessionId}/stream?content=${encodeURIComponent(text)}`);
es.onmessage = (e) => {
  const chunk: AIStreamChunk = JSON.parse(e.data);
  setBuffer(prev => prev + chunk.delta);
  if (chunk.done) es.close();
  if (chunk.escalate) handleEscalation();
};
```

### Supabase Realtime в админке
Операторская панель (React+Vite) не поллит тикеты — подписывается на канал.

```typescript
// админка оператора (React)
import { RealtimeEvent, TicketSummaryDTO } from "@supportpulse/shared";

supabase
  .channel(`tickets:${tenantId}`)
  .on("broadcast", { event: "ticket.created" }, (payload) => {
    const event = payload as RealtimeEvent<TicketSummaryDTO>;
    setTickets(prev => [event.payload, ...prev]);
  })
  .subscribe();
```

---

## Структура монорепо

```
supportpulse/
  packages/
    shared/              ← этот пакет
  apps/
    backend/             ← Express + LangChain.js (деплой на Render/Railway)
    admin/               ← React + Vite + Tailwind + shadcn/ui (деплой на Vercel)
    widget/              ← Preact + Vite + Tailwind (деплой на Vercel / CDN)
  package.json           ← workspaces
```

В корневом `package.json`:
```json
{ "workspaces": ["packages/*", "apps/*"] }
```

В каждом `apps/*/package.json`:
```json
{ "dependencies": { "@supportpulse/shared": "workspace:*" } }
```

---

## Сборка

```bash
cd packages/shared
npm install
npm run build   # → dist/ с .js + .d.ts
```

---

## Правила, которые нельзя нарушать

| Правило | Почему |
|---|---|
| Фронт импортирует только из `@supportpulse/shared` | Нет утечки серверных полей |
| Бек маппит `domain → DTO` перед `res.json()` | snake_case не попадает на фронт |
| Новый endpoint = новые типы в `api/index.ts` | Контракт в одном месте |
| Новый статус/роль = новое значение в `enums/` | Нет магических строк |
| Supabase Auth ошибки маппятся в `ErrorCode` на беке | Фронт не зависит от Supabase SDK |


Общий TypeScript-пакет для проекта SupportPulse.  
Содержит типы, которые используют и фронт, и бек — единственный источник правды о структуре данных.

---

## Структура

```
src/
  enums/      — UserRole, TicketStatus, SenderType и т.д.
  domain/     — доменные модели (только бек, отражают схему БД)
  dto/        — DTO для передачи по сети (фронт + бек)
  api/        — типы всех Request/Response (фронт + бек)
  errors/     — коды ошибок ApiError (фронт + бек)
  index.ts    — реэкспорт всего, кроме domain/
```

> **Важно**: `domain/` намеренно не реэкспортируется из `index.ts`.  
> Фронт **никогда** не должен знать о `passwordHash` и других серверных полях.

---

## Что делать с этим пакетом

### 1. Разместить в монорепо (рекомендуется)

Структура проекта:

```
supportpulse/
  packages/
    shared/          ← этот пакет
  apps/
    backend/         ← NestJS / Express
    frontend/        ← React / Next.js
    widget/          ← встраиваемый виджет
  package.json       ← workspaces
```

В корневом `package.json` (npm workspaces или pnpm):

```json
{
  "workspaces": ["packages/*", "apps/*"]
}
```

В `apps/backend/package.json` и `apps/frontend/package.json`:

```json
{
  "dependencies": {
    "@supportpulse/shared": "workspace:*"
  }
}
```

### 2. Собрать пакет

```bash
cd packages/shared
npm install
npm run build    # генерирует dist/ с .js + .d.ts файлами
```

Или в watch-режиме при разработке:

```bash
npm run dev
```

---

## Как использовать на беке (NestJS / Express)

```typescript
// Импорт DTO и типов API
import { UserDTO, LoginRequest, LoginResponse } from "@supportpulse/shared";

// Импорт доменных моделей (только бек)
import { User } from "@supportpulse/shared/domain";

// Пример контроллера
@Post("/auth/login")
async login(@Body() body: LoginRequest): Promise<LoginResponse> {
  const user = await this.authService.validate(body.email, body.password);
  const token = this.jwtService.sign({ userId: user.userId });

  // Маппинг: User (domain) → UserDTO (не включает passwordHash)
  const userDTO: UserDTO = {
    userId: user.userId,
    tenantId: user.tenantId,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };

  return { accessToken: token, user: userDTO };
}
```

---

## Как использовать на фронте (React)

```typescript
import {
  TicketSummaryDTO,
  GetTicketsRequest,
  GetTicketsResponse,
  TicketStatus,
  ErrorCode,
  ApiError,
} from "@supportpulse/shared";

// Пример fetch-обёртки
async function getTickets(params: GetTicketsRequest): Promise<GetTicketsResponse> {
  const query = new URLSearchParams({
    ...(params.status && { status: params.status }),
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
  });

  const res = await fetch(`/api/tickets?${query}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (!res.ok) {
    const err: ApiError = await res.json();
    if (err.code === ErrorCode.UNAUTHORIZED) redirectToLogin();
    throw err;
  }

  return res.json();
}

// В компоненте
const [tickets, setTickets] = useState<TicketSummaryDTO[]>([]);
```

---

## Правила, которые нельзя нарушать

| Правило | Почему |
|---|---|
| Фронт импортирует только из `@supportpulse/shared`, не из `domain/` | `passwordHash` и серверные поля не должны утечь |
| Даты в DTO — `string` (ISO 8601), не `Date` | JSON не сериализует `Date`, будет `{}` |
| Бек всегда маппит `User → UserDTO` перед отправкой | Защита от случайной утечки хеша пароля |
| Новый endpoint = новые типы в `api/index.ts` | Контракт живёт в одном месте |
| Новый статус/роль = новое значение в `enums/` | Нет магических строк в коде |
