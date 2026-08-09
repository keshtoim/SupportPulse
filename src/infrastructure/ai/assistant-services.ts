import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import type { SupportAnswerService } from "../../application/ports";
import type { FaqArticle, Message, RankedKnowledgeChunk, SupportReplyContext } from "../../domain/model";

type RankedArticle = {
  article: FaqArticle;
  score: number;
};

// Минимальное косинусное сходство, при котором фрагмент документа считается релевантным ответу.
// Подобрано ориентировочно (типичный диапазон для OpenAI text-embedding-3-small) — при появлении
// реального трафика с LLM-ключом стоит откалибровать по факту, здесь это сделать нельзя (нет сети до OpenAI).
const CHUNK_MATCH_THRESHOLD = 0.3;

// Ключевые слова, по которым определяется запрос на подключение живого оператора
const operatorRequestPatterns = ["оператор", "человек", "менеджер", "специалист", "живой", "сотрудник"];

/** Разбивает строку на токены (слова), отфильтровывая короткие */
const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 2);

/** Проверяет, содержит ли сообщение запрос на оператора */
const includesOperatorRequest = (value: string): boolean => {
  const normalizedValue = value.toLowerCase();
  return operatorRequestPatterns.some((pattern) => normalizedValue.includes(pattern));
};

// Exact match or prefix match (length ≥ 4) to handle Russian case endings:
// "заказ" matches "заказа", "заказом"; "статус" matches "статусе" etc.
const tokenMatches = (queryToken: string, articleTokens: Set<string>): boolean => {
  if (articleTokens.has(queryToken)) return true;
  if (queryToken.length < 4) return false;
  for (const articleToken of articleTokens) {
    if (articleToken.length < 4) continue;
    if (articleToken.startsWith(queryToken) || queryToken.startsWith(articleToken)) return true;
  }
  return false;
};

/** Ранжирует статьи FAQ по количеству совпадающих токенов с вопросом */
const rankArticles = (question: string, articles: FaqArticle[]): RankedArticle[] => {
  const questionTokens = tokenize(question);

  return articles
    .map((article) => {
      const articleTokens = new Set(tokenize(`${article.question} ${article.answer}`));
      const score = questionTokens.reduce((total, token) => total + (tokenMatches(token, articleTokens) ? 1 : 0), 0);

      return {
        article,
        score
      };
    })
    .sort((left, right) => right.score - left.score);
};

/** Извлекает текст из ответа LLM (строка или массив чанков) */
const extractResponseText = (response: Awaited<ReturnType<ChatOpenAI["invoke"]>>): string => {
  if (typeof response.content === "string") {
    return response.content.trim();
  }

  return response.content
    .map((chunk) => ("text" in chunk ? chunk.text : JSON.stringify(chunk)))
    .join(" ")
    .trim();
};

/** Форматирует последние 6 сообщений истории для контекста LLM */
const mapRecentMessages = (history: Message[]) =>
  history
    .slice(-6)
    .map((message) => `${message.senderType}: ${message.content}`)
    .join("\n");

/** Форматирует фрагменты документов (RAG) для вставки в промпт LLM */
const formatChunksForPrompt = (chunks: RankedKnowledgeChunk[]) =>
  chunks.map((chunk, index) => `Фрагмент документа ${index + 1}: ${chunk.content}`).join("\n\n");

/**
 * AI-сервис поддержки: keyword-ранжирование по FAQ + опциональный векторный RAG-поиск по документам.
 * Если OpenAI ключ не задан — работает в режиме fallback (возвращает лучшую статью/фрагмент напрямую).
 * Логика решения:
 *  1. Запрос оператора → escalate
 *  2. Нет совпадений в FAQ, но есть релевантный фрагмент документа (RAG) → answer по документу
 *  3. Нет совпадений нигде → clarify
 *  4. Есть совпадение в FAQ, но вопрос слишком короткий → clarify
 *  5. Иначе → answer (через LLM с учётом FAQ и документов, или fallback)
 */
export class FaqRagAnswerService implements SupportAnswerService {
  private readonly llm?: ChatOpenAI;

  constructor(options?: { apiKey?: string; model: string }) {
    if (options?.apiKey) {
      this.llm = new ChatOpenAI({
        apiKey: options.apiKey,
        model: options.model,
        temperature: 0.2
      });
    }
  }

  isLlmEnabled(): boolean {
    return !!this.llm;
  }

  async answer(context: SupportReplyContext) {
    if (includesOperatorRequest(context.question)) {
      return {
        kind: "escalate" as const,
        message: "Понял запрос на подключение человека. Передаю диалог оператору.",
        reason: "requested_operator"
      };
    }

    const rankedArticles = rankArticles(context.question, context.faqArticles);
    const topArticles = rankedArticles.filter((item) => item.score > 0).slice(0, 3);
    const strongChunks = (context.retrievedChunks ?? []).filter((chunk) => chunk.similarity >= CHUNK_MATCH_THRESHOLD);

    if (topArticles.length === 0) {
      // В FAQ совпадений нет, но векторный поиск нашёл релевантный фрагмент загруженного документа
      if (strongChunks.length > 0) {
        return this.answerFromChunks(context, strongChunks);
      }

      return {
        kind: "clarify" as const,
        message: "Не нашёл подходящего ответа в базе знаний. Попробуйте уточнить вопрос — или мне позвать оператора?"
      };
    }

    if (context.question.trim().length < 12) {
      return {
        kind: "clarify" as const,
        message: "Чтобы ответить точнее, пожалуйста, уточните вопрос или добавьте номер заказа/деталь проблемы."
      };
    }

    const matchedArticleIds = topArticles.map((item) => item.article.id);
    const fallbackAnswer = topArticles[0].article.answer;

    // Режим без LLM: возвращаем лучшую статью напрямую
    if (!this.llm) {
      return {
        kind: "answer" as const,
        message: fallbackAnswer,
        matchedArticleIds,
        confidence: Math.min(0.95, 0.4 + topArticles[0].score / 4)
      };
    }

    const prompt = ChatPromptTemplate.fromTemplate(
      [
        "Ты AI-помощник платформы поддержки компании {tenantName}.",
        "Стиль ответа: {toneOfVoice}.",
        "Отвечай только на основе базы знаний ниже. Не придумывай новые факты.",
        "Если данных недостаточно, честно скажи об этом и попроси уточнение.",
        "Контекст последних сообщений:",
        "{history}",
        "",
        "База знаний:",
        "{knowledge}",
        "",
        "Вопрос клиента: {question}"
      ].join("\n")
    );

    const matchedChunkIds = strongChunks.map((chunk) => chunk.chunkId);
    const knowledgeSections = [
      topArticles.map((item, index) => `${index + 1}. Вопрос: ${item.article.question}\nОтвет: ${item.article.answer}`).join("\n\n")
    ];
    if (strongChunks.length > 0) {
      knowledgeSections.push(formatChunksForPrompt(strongChunks));
    }

    try {
      const response = await prompt.pipe(this.llm).invoke({
        tenantName: context.tenant.name,
        toneOfVoice: context.widgetConfig.toneOfVoice,
        history: mapRecentMessages(context.history),
        knowledge: knowledgeSections.join("\n\n"),
        question: context.question
      });

      const text = extractResponseText(response) || fallbackAnswer;

      return {
        kind: "answer" as const,
        message: text,
        matchedArticleIds,
        matchedChunkIds,
        confidence: Math.min(0.98, 0.45 + topArticles[0].score / 4)
      };
    } catch {
      // При ошибке LLM — деградируем к fallback-ответу
      return {
        kind: "answer" as const,
        message: fallbackAnswer,
        matchedArticleIds,
        matchedChunkIds,
        confidence: Math.min(0.9, 0.4 + topArticles[0].score / 4)
      };
    }
  }

  /**
   * Отвечает на основе фрагментов документов, когда в FAQ совпадений не нашлось.
   * Без LLM возвращает лучший фрагмент как есть — это сырой текст документа, а не готовый ответ,
   * поэтому уверенность ниже, чем у FAQ-фолбэка.
   */
  private async answerFromChunks(context: SupportReplyContext, strongChunks: RankedKnowledgeChunk[]) {
    const matchedChunkIds = strongChunks.map((chunk) => chunk.chunkId);
    const bestChunk = strongChunks[0];

    if (!this.llm) {
      return {
        kind: "answer" as const,
        message: bestChunk.content,
        matchedArticleIds: [],
        matchedChunkIds,
        confidence: Math.min(0.7, bestChunk.similarity)
      };
    }

    const prompt = ChatPromptTemplate.fromTemplate(
      [
        "Ты AI-помощник платформы поддержки компании {tenantName}.",
        "Стиль ответа: {toneOfVoice}.",
        "Отвечай только на основе фрагментов документов ниже. Не придумывай новые факты.",
        "Если данных недостаточно, честно скажи об этом и попроси уточнение.",
        "Контекст последних сообщений:",
        "{history}",
        "",
        "База знаний:",
        "{knowledge}",
        "",
        "Вопрос клиента: {question}"
      ].join("\n")
    );

    try {
      const response = await prompt.pipe(this.llm).invoke({
        tenantName: context.tenant.name,
        toneOfVoice: context.widgetConfig.toneOfVoice,
        history: mapRecentMessages(context.history),
        knowledge: formatChunksForPrompt(strongChunks),
        question: context.question
      });

      const text = extractResponseText(response) || bestChunk.content;

      return {
        kind: "answer" as const,
        message: text,
        matchedArticleIds: [],
        matchedChunkIds,
        confidence: Math.min(0.9, bestChunk.similarity + 0.1)
      };
    } catch {
      return {
        kind: "answer" as const,
        message: bestChunk.content,
        matchedArticleIds: [],
        matchedChunkIds,
        confidence: Math.min(0.7, bestChunk.similarity)
      };
    }
  }
}
