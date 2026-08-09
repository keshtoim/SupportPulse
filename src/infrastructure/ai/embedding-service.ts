import { OpenAIEmbeddings } from "@langchain/openai";
import type { EmbeddingService } from "../../application/ports";

/**
 * Эмбеддинги на основе OpenAI. Без apiKey работает в выключенном режиме —
 * вызывающий код обязан проверять isEnabled() и деградировать до keyword-поиска.
 */
export class OpenAiEmbeddingService implements EmbeddingService {
  private readonly client?: OpenAIEmbeddings;

  constructor(options?: { apiKey?: string; model?: string }) {
    if (options?.apiKey) {
      this.client = new OpenAIEmbeddings({
        apiKey: options.apiKey,
        model: options.model ?? "text-embedding-3-small"
      });
    }
  }

  isEnabled(): boolean {
    return !!this.client;
  }

  async embed(text: string): Promise<number[]> {
    if (!this.client) {
      throw new Error("EmbeddingService выключен: не задан OPENAI_API_KEY.");
    }
    return this.client.embedQuery(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.client) {
      throw new Error("EmbeddingService выключен: не задан OPENAI_API_KEY.");
    }
    return this.client.embedDocuments(texts);
  }
}
