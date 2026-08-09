import type { EmbeddingService, KnowledgeChunkRepository } from "../ports";
import type { RankedKnowledgeChunk } from "../../domain/model";

type KnowledgeRetrievalServiceDependencies = {
  embeddingService: EmbeddingService;
  knowledgeChunkRepository: KnowledgeChunkRepository;
};

const DEFAULT_MATCH_COUNT = 4;

/**
 * Векторный поиск релевантных фрагментов документов по вопросу клиента (RAG-retrieval).
 * Без ключа эмбеддингов возвращает [] — AI-сервис в этом случае деградирует до keyword-поиска по FAQ.
 */
export class KnowledgeRetrievalService {
  constructor(private readonly dependencies: KnowledgeRetrievalServiceDependencies) {}

  isEnabled(): boolean {
    return this.dependencies.embeddingService.isEnabled();
  }

  async search(tenantId: string, query: string, limit = DEFAULT_MATCH_COUNT): Promise<RankedKnowledgeChunk[]> {
    if (!this.isEnabled()) {
      return [];
    }

    try {
      const queryEmbedding = await this.dependencies.embeddingService.embed(query);
      return await this.dependencies.knowledgeChunkRepository.searchByTenant(tenantId, queryEmbedding, limit);
    } catch {
      // Деградация: недоступность эмбеддингов не должна ронять диалог с клиентом
      return [];
    }
  }
}
