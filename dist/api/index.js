"use strict";
// ─── api/index.ts ─────────────────────────────────────────────────────────────
// API-контракт: типы всех запросов и ответов.
// Бек (Express) реализует эти типы в роутах.
// Фронт (React/Preact + Vite) использует их при вызове fetch.
//
// Аутентификация: Supabase Auth JWT в заголовке Authorization: Bearer <token>
// Бек проверяет токен через supabase.auth.getUser(token)
Object.defineProperty(exports, "__esModule", { value: true });
