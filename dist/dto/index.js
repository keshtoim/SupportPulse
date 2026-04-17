"use strict";
// ─── dto/index.ts ─────────────────────────────────────────────────────────────
// DTO (Data Transfer Objects) — то, что реально летит по сети.
// Этот файл импортируют и фронт (React/Preact), и бек (Express).
//
// Правила:
//   • camelCase — стандарт для JSON API и React/Preact компонентов
//   • Бек маппит snake_case Supabase → camelCase DTO перед отправкой
//   • Даты — string ISO 8601 (JSON не знает тип Date)
//   • null вместо undefined там, где Supabase возвращает NULL
//   • Вложенные объекты там, где фронту нужны данные за один запрос
Object.defineProperty(exports, "__esModule", { value: true });
