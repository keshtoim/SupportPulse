import mammoth from "mammoth";
// Импорт из index.js пакета триггерит его debug-режим (пытается прочитать
// несуществующий тестовый PDF из репозитория pdf-parse) при module.parent === undefined,
// что ломается под некоторыми раннерами/бандлерами. lib/pdf-parse.js — сама реализация без обёртки.
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import type { DocumentTextExtractor } from "../../application/ports";
import { AppError } from "../../domain/model";

// Ограничение на длину извлечённого текста: защита БД и промпта LLM от чрезмерно больших документов
const MAX_EXTRACTED_LENGTH = 200_000;

const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Извлекает текст из PDF (pdf-parse) и DOCX (mammoth); другие форматы отклоняет */
export class FileDocumentTextExtractor implements DocumentTextExtractor {
  async extract(file: { buffer: Buffer; mimeType: string; fileName: string }): Promise<string> {
    let rawText: string;

    if (file.mimeType === "application/pdf") {
      const result = await pdfParse(file.buffer);
      rawText = result.text;
    } else if (file.mimeType === DOCX_MIME_TYPE) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      rawText = result.value;
    } else {
      throw new AppError("Поддерживаются только файлы PDF и DOCX.", 400, "UNSUPPORTED_FILE_TYPE");
    }

    const normalizedText = rawText.replace(/\s+/g, " ").trim();

    if (!normalizedText) {
      throw new AppError(
        "Не удалось извлечь текст из файла — возможно, это скан без текстового слоя.",
        422,
        "EMPTY_EXTRACTED_TEXT"
      );
    }

    return normalizedText.slice(0, MAX_EXTRACTED_LENGTH);
  }
}
