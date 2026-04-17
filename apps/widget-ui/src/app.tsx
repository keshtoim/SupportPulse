import { useState } from 'preact/hooks'
import './app.css'

type WidgetScreen = 'home' | 'chat'
type AdminScreen = 'dashboard' | 'chats' | 'settings' | 'profile'

export function App() {
  const [mode, setMode] = useState<'widget' | 'admin'>('widget')
  const [widgetScreen, setWidgetScreen] = useState<WidgetScreen>('home')
  const [adminScreen, setAdminScreen] = useState<AdminScreen>('dashboard')

  return (
    <main class="app-root">
      <section class="mode-switch">
        <button
          class={`mode-switch-button ${mode === 'widget' ? 'active' : ''}`}
          type="button"
          onClick={() => setMode('widget')}
        >
          Виджет
        </button>
        <button
          class={`mode-switch-button ${mode === 'admin' ? 'active' : ''}`}
          type="button"
          onClick={() => setMode('admin')}
        >
          Панель
        </button>
      </section>

      {mode === 'widget' ? (
        <WidgetPreview screen={widgetScreen} onScreenChange={setWidgetScreen} />
      ) : (
        <AdminPreview screen={adminScreen} onScreenChange={setAdminScreen} />
      )}
    </main>
  )
}

function WidgetPreview({
  screen,
  onScreenChange,
}: {
  screen: WidgetScreen
  onScreenChange: (screen: WidgetScreen) => void
}) {
  return (
    <section class="widget-shell">
      <header class="widget-header">
        <button class="icon-button" type="button" aria-label="Назад">
          ←
        </button>
        <div class="brand-chip">
          <div class="brand-icon" />
          <div class="brand-copy">
            <strong>Помощник</strong>
            <span>ИИ-ассистент</span>
          </div>
        </div>
        <button class="icon-button" type="button" aria-label="Меню">
          −
        </button>
      </header>

      {screen === 'home' ? (
        <section class="screen-body">
          <div class="hero-banner">
            <h1>Свяжитесь с нами!</h1>
          </div>

          <article class="card intro-card">
            <div class="brand-icon intro-icon" />
            <p>Здравствуйте, добро пожаловать в SupportPulse. Пожалуйста, опишите вашу проблему...</p>
            <button class="primary-button" type="button" onClick={() => onScreenChange('chat')}>
              Задать вопрос
            </button>
          </article>

          {['Функция 1', 'Функция 2', 'Функция 3'].map((item) => (
            <button class="feature-card" type="button" key={item}>
              {item}
            </button>
          ))}
        </section>
      ) : (
        <section class="screen-body chat-screen">
          <article class="chat-bubble assistant">
            <p>
              Доброе утро и добро пожаловать в SupportPulse. Рады снова вас видеть. Пожалуйста, опишите
              вашу ситуацию как можно подробнее, чтобы я мог эффективно вам помочь.
            </p>
          </article>
        </section>
      )}

      <footer class="widget-footer">
        <button
          class={`tab-button ${screen === 'home' ? 'active' : ''}`}
          type="button"
          onClick={() => onScreenChange('home')}
        >
          Дом
        </button>
        <button
          class={`tab-button ${screen === 'chat' ? 'active' : ''}`}
          type="button"
          onClick={() => onScreenChange('chat')}
        >
          Чат
        </button>
      </footer>

      {screen === 'chat' && (
        <div class="composer">
          <button class="composer-icon" type="button" aria-label="Вложение">
            +
          </button>
          <input type="text" placeholder="Сообщение..." />
          <button class="composer-send" type="button" aria-label="Отправить">
            ↑
          </button>
        </div>
      )}
    </section>
  )
}

function AdminPreview({
  screen,
  onScreenChange,
}: {
  screen: AdminScreen
  onScreenChange: (screen: AdminScreen) => void
}) {
  return (
    <section class="admin-shell">
      <aside class="admin-sidebar">
        <div class="admin-brand">
          <div class="brand-icon" />
          <div>
            <strong>SupportPulse</strong>
            <span>Панель управления</span>
          </div>
        </div>

        <nav class="admin-nav">
          <button
            class={`admin-nav-item ${screen === 'dashboard' ? 'active' : ''}`}
            type="button"
            onClick={() => onScreenChange('dashboard')}
          >
            Главная
          </button>
          <button
            class={`admin-nav-item ${screen === 'chats' ? 'active' : ''}`}
            type="button"
            onClick={() => onScreenChange('chats')}
          >
            Мои чаты
          </button>
          <button
            class={`admin-nav-item ${screen === 'settings' ? 'active' : ''}`}
            type="button"
            onClick={() => onScreenChange('settings')}
          >
            Настройки
          </button>
          <button
            class={`admin-nav-item ${screen === 'profile' ? 'active' : ''}`}
            type="button"
            onClick={() => onScreenChange('profile')}
          >
            Профиль
          </button>
        </nav>
      </aside>

      <section class="admin-content">
        {screen === 'dashboard' && (
          <div class="admin-page">
            <h2>База знаний</h2>
            <article class="admin-card">
              <div class="brand-icon large" />
              <div>
                <h3>Долгожданный запуск</h3>
                <p>Спустя долгий период разработки SupportPulse наконец-то стал доступен.</p>
                <button class="primary-button compact" type="button">
                  Использовать
                </button>
              </div>
            </article>
          </div>
        )}

        {screen === 'chats' && (
          <div class="admin-page">
            <h2>Мои чаты</h2>
            <div class="admin-list">
              {['Тикет #1024', 'Тикет #1025', 'Тикет #1026'].map((ticket) => (
                <article class="admin-list-item" key={ticket}>
                  <div class="avatar-circle" />
                  <div>
                    <strong>{ticket}</strong>
                    <p>Последнее сообщение от клиента...</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {screen === 'settings' && (
          <div class="admin-page">
            <h2>Активация виджета</h2>
            <div class="toggle-row">
              <button class="toggle-pill active" type="button">
                Включен
              </button>
              <button class="toggle-pill" type="button">
                Выключен
              </button>
            </div>
            <label class="form-label" for="site-url">
              Адрес сайта
            </label>
            <input id="site-url" class="text-input" type="text" placeholder="https://www.example.com" />
          </div>
        )}

        {screen === 'profile' && (
          <div class="admin-page">
            <h2>Профиль</h2>
            <label class="form-label" for="display-name">
              Отображаемое имя
            </label>
            <input id="display-name" class="text-input" type="text" placeholder="Имя профиля" />
            <label class="form-label" for="bio">
              Биография
            </label>
            <textarea id="bio" class="text-area" placeholder="Коротко о себе" />
          </div>
        )}
      </section>
    </section>
  )
}
