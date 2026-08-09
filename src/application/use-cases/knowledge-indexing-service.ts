import type { Clock, EmbeddingService, IdGenerator, KnowledgeChunkRepository } from "../ports";
import type { KnowledgeChunk, KnowledgeDocument } from "../../domain/model";
import { chunkText } from "../../infrastructure/documents/chunker";

type KnowledgeIndexingServiceDependencies = {
  embeddingService: EmbeddingService;
  knowledgeChunkRepository: KnowledgeChunkRepository;
  idGenerator: IdGenerator;
  clock: Clock;
};

/**
 * Поддерживает векторный индекс документов в актуальном состоянии (FR-053).
 * Без ключа эмбеддингов — no-op: документы остаются доступны только в исходном виде, без RAG-поиска.
 */
export class KnowledgeIndexingService {
  constructor(private readonly dependencies: KnowledgeIndexingServiceDependencies) {}

  isEnabled(): boolean {
    return this.dependencies.embeddingService.isEnabled();
  }

  /** Чанкует и переиндексирует документ; безопасно вызывать повторно (полная замена фрагментов) */
  async indexDocument(document: KnowledgeDocument): Promise<void> {
    if (!this.isEnabled() || document.status !== "processed" || !document.extractedText) {
      return;
    }

    const pieces = chunkText(document.extractedText);
    if (pieces.length === 0) {
      return;
    }

    const embeddings = await this.dependencies.embeddingService.embedBatch(pieces);
    const now = this.dependencies.clock.now().toISOString();

    const chunks: KnowledgeChunk[] = pieces.map((content, index) => ({
      id: this.dependencies.idGenerator.next("chunk"),
      tenantId: document.tenantId,
      documentId: document.id,
      chunkIndex: index,
      content,
      embedding: embeddings[index],
      createdAt: now
    }));

    await this.dependencies.knowledgeChunkRepository.deleteByDocumentId(document.id);
    await this.dependencies.knowledgeChunkRepository.createMany(chunks);
  }

  async removeDocument(documentId: string): Promise<void> {
    await this.dependencies.knowledgeChunkRepository.deleteByDocumentId(documentId);
  }
}
