// Разбиение текста документа на перекрывающиеся фрагменты для последующего эмбеддинга.
// Символьное (не токенное) чанкование — достаточно для MVP, без дополнительной зависимости-токенизатора.
const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_OVERLAP = 100;

/** Разбивает текст на фрагменты фиксированного размера с перекрытием; короткие хвосты не отбрасываются */
export const chunkText = (text: string, chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_OVERLAP): string[] => {
  const normalized = text.trim();

  if (!normalized) {
    return [];
  }

  if (normalized.length <= chunkSize) {
    return [normalized];
  }

  const chunks: string[] = [];
  const step = chunkSize - overlap;
  let start = 0;

  while (start < normalized.length) {
    const chunk = normalized.slice(start, start + chunkSize).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    start += step;
  }

  return chunks;
};
