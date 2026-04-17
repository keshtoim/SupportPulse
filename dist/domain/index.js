"use strict";
// ─── domain/index.ts ─────────────────────────────────────────────────────────
// Базовые доменные модели SupportPulse.
// Эти типы можно использовать как на беке, так и на фронте в слоях данных.
//
// Примечания по типам:
//   • id-поля: string (UUID v4)
//   • timestamps: string (ISO 8601)
//   • null используется там, где поле может отсутствовать в БД/API
Object.defineProperty(exports, "__esModule", { value: true });
