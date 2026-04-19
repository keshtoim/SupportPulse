import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import type { SupportAnswerService } from "../../application/ports";
import type { FaqArticle, Message, SupportReplyContext } from "../../domain/model";

type RankedArticle = {
  article: FaqArticle;
  score: number;
};

const operatorRequestPatterns = ["оператор", "человек", "менеджер", "специалист", "живой", "сотрудник"];

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 2);

const includesOperatorRequest = (value: string): boolean => {
  const normalizedValue = value.toLowerCase();
  return operatorRequestPatterns.some((pattern) => normalizedValue.includes(pattern));
};

const rankArticles = (question: string, articles: FaqArticle[]): RankedArticle[] => {
  const questionTokens = tokenize(question);

  return articles
    .map((article) => {
      const articleTokens = new Set(tokenize(`${article.question} ${article.answer}`));
      const score = questionTokens.reduce((total, token) => total + (articleTokens.has(token) ? 1 : 0), 0);

      return {
        article,
        score
      };
    })
    .sort((left, right) => right.score - left.score);
};

const extractResponseText = (response: Awaited<ReturnType<ChatOpenAI["invoke"]>>): string => {
  if (typeof response.content === "string") {
    return response.content.trim();
  }

  return response.content
    .map((chunk) => ("text" in chunk ? chunk.text : JSON.stringify(chunk)))
    .join(" ")
    .trim();
};

const mapRecentMessages = (history: Message[]) =>
  history
    .slice(-6)
    .map((message) => `${message.senderType}: ${message.content}`)
    .join("\n");

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

    if (topArticles.length === 0) {
      return {
        kind: "escalate" as const,
        message: "Не хочу вводить в заблуждение. Передаю вопрос оператору, чтобы вы получили точный ответ.",
        reason: "low_confidence"
      };
    }

    if (context.question.trim().length < 12 || topArticles[0].score === 1) {
      return {
        kind: "clarify" as const,
        message: "Чтобы ответить точнее, пожалуйста, уточните вопрос или добавьте номер заказа/деталь проблемы."
      };
    }

    const matchedArticleIds = topArticles.map((item) => item.article.id);
    const fallbackAnswer = topArticles[0].article.answer;

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

    try {
      const response = await prompt.pipe(this.llm).invoke({
        tenantName: context.tenant.name,
        toneOfVoice: context.widgetConfig.toneOfVoice,
        history: mapRecentMessages(context.history),
        knowledge: topArticles
          .map((item, index) => `${index + 1}. Вопрос: ${item.article.question}\nОтвет: ${item.article.answer}`)
          .join("\n\n"),
        question: context.question
      });

      const text = extractResponseText(response) || fallbackAnswer;

      return {
        kind: "answer" as const,
        message: text,
        matchedArticleIds,
        confidence: Math.min(0.98, 0.45 + topArticles[0].score / 4)
      };
    } catch {
      return {
        kind: "answer" as const,
        message: fallbackAnswer,
        matchedArticleIds,
        confidence: Math.min(0.9, 0.4 + topArticles[0].score / 4)
      };
    }
  }
}
