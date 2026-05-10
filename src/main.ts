import { createApp } from "./app/create-app";
import { createApplicationContext } from "./app/application-context";
import { loadEnv } from "./config/env";

// Точка входа: загружает конфиг, собирает контекст и запускает HTTP-сервер
const bootstrap = async () => {
  const env = loadEnv();
  const context = createApplicationContext(env);
  const app = createApp(context);

  app.listen(env.port, () => {
    context.logger.info({ port: env.port }, "SupportPulse backend запущен.");
  });
};

bootstrap().catch((error) => {
  console.error("Не удалось запустить приложение.", error);
  process.exit(1);
});
