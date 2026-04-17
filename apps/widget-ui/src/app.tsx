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
        <WidgetPreview
          screen={widgetScreen}
          onScreenChange={setWidgetScreen}
          onOpenAdmin={(screen) => {
            setAdminScreen(screen)
            setMode('admin')
          }}
        />
      ) : (
        <AdminPreview
          screen={adminScreen}
          onScreenChange={setAdminScreen}
          onBackToWidget={() => {
            setWidgetScreen('home')
            setMode('widget')
          }}
        />
      )}
    </main>
  )
}

function WidgetPreview({
  screen,
  onScreenChange,
  onOpenAdmin,
}: {
  screen: WidgetScreen
  onScreenChange: (screen: WidgetScreen) => void
  onOpenAdmin: (screen: AdminScreen) => void
}) {
  const [message, setMessage] = useState('')

  return (
    <section class="widget-shell">
      <header class="widget-header">
        <button
          class="icon-button"
          type="button"
          aria-label="Назад"
          onClick={() => {
            if (screen === 'chat') onScreenChange('home')
          }}
        >
          ←
        </button>
        <div class="brand-chip">
          <img class="app-icon sm" src="/app-icon.png" alt="SupportPulse" />
          <div class="brand-copy">
            <strong>Помощник</strong>
            <span>ИИ-ассистент</span>
          </div>
        </div>
        <button class="icon-button" type="button" aria-label="Меню" onClick={() => onOpenAdmin('settings')}>
          −
        </button>
      </header>

      {screen === 'home' ? (
        <section class="screen-body">
          <div class="hero-banner">
            <h1>Свяжитесь с нами!</h1>
          </div>

          <article class="card intro-card">
            <img class="app-icon intro-icon" src="/app-icon.png" alt="SupportPulse" />
            <p>Здравствуйте, добро пожаловать в SupportPulse. Пожалуйста, опишите вашу проблему...</p>
            <button class="primary-button" type="button" onClick={() => onScreenChange('chat')}>
              Задать вопрос
            </button>
          </article>

          {[
            { title: 'Функция 1', target: 'chats' as const },
            { title: 'Функция 2', target: 'settings' as const },
            { title: 'Функция 3', target: 'profile' as const },
          ].map((item) => (
            <button class="feature-card" type="button" key={item.title} onClick={() => onOpenAdmin(item.target)}>
              <span>{item.title}</span>
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
          <span class="tab-icon">⌂</span>
          Дом
        </button>
        <button
          class={`tab-button ${screen === 'chat' ? 'active' : ''}`}
          type="button"
          onClick={() => onScreenChange('chat')}
        >
          <span class="tab-icon">💬</span>
          Чат
        </button>
      </footer>

      {screen === 'chat' && (
        <div class="composer">
          <button class="composer-icon" type="button" aria-label="Вложение" onClick={() => onOpenAdmin('chats')}>
            +
          </button>
          <input type="text" placeholder="Сообщение..." value={message} onInput={(e) => setMessage((e.target as HTMLInputElement).value)} />
          <button class="composer-send" type="button" aria-label="Отправить" onClick={() => setMessage('')}>
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
  onBackToWidget,
}: {
  screen: AdminScreen
  onScreenChange: (screen: AdminScreen) => void
  onBackToWidget: () => void
}) {
  const adminTitle = screen === 'dashboard' ? 'Главная' : screen === 'chats' ? 'Мои чаты' : screen === 'settings' ? 'Настройки' : 'Профиль'

  return (
    <section class="admin-shell">
      <aside class="admin-sidebar">
        <div class="panel-header">
          <img class="app-icon xs" src="/app-icon.png" alt="SupportPulse" />
          <button class="back-button" type="button" onClick={() => onBackToWidget()}>
            ‹
          </button>
          <strong>{adminTitle}</strong>
        </div>

        {screen === 'dashboard' ? (
          <section class="dashboard-menu">
            <div class="dashboard-brand">
              <img class="app-icon md" src="/app-icon.png" alt="SupportPulse" />
              <div>
                <strong>Главная</strong>
                <p>SupportPulse</p>
              </div>
            </div>

            <div class="dashboard-grid">
              {['Профиль', 'Сообщения', 'Настройки', 'О сервисе'].map((item) => (
                <button
                  class="dashboard-tile"
                  type="button"
                  key={item}
                  onClick={() =>
                    onScreenChange(item === 'Профиль' ? 'profile' : item === 'Сообщения' ? 'chats' : item === 'Настройки' ? 'settings' : 'dashboard')
                  }
                >
                  <div class="tile-icon" />
                  <span>{item}</span>
                </button>
              ))}
            </div>

            <button class="dashboard-wide-tile" type="button" onClick={() => onScreenChange('dashboard')}>
              <div class="tile-icon" />
              <span>База знаний</span>
            </button>
          </section>
        ) : (
          <nav class="admin-nav">
            <button class={`admin-nav-item ${screen === 'profile' ? 'active' : ''}`} type="button" onClick={() => onScreenChange('profile')}>
              <span class="dot-circle" />
              Основная информация
            </button>
            <button class="admin-nav-item" type="button">
              <span class="dot-circle" />
              Настройка
            </button>
            <button class="admin-nav-item" type="button">
              <span class="dot-circle" />
              Настройка
            </button>
          </nav>
        )}

        <div class="side-bottom-nav">
          {[
            { icon: 'П', target: 'profile' as const },
            { icon: 'Ч', target: 'chats' as const },
            { icon: 'Н', target: 'settings' as const },
            { icon: 'О', target: 'dashboard' as const },
          ].map((item) => (
            <button
              class={`mini-nav-button ${screen === item.target ? 'active' : ''}`}
              type="button"
              key={item.icon}
              onClick={() => onScreenChange(item.target)}
            >
              {item.icon}
            </button>
          ))}
        </div>
      </aside>

      <section class="admin-content">
        {screen === 'dashboard' && (
          <div class="admin-page">
            <header class="knowledge-header">
              <h2>База знаний</h2>
              <div class="profile-circle">◔</div>
            </header>

            <article class="knowledge-card">
              <img class="app-icon md" src="/app-icon.png" alt="SupportPulse" />
              <div>
                <h3>Долгожданный запуск</h3>
                <p>Спустя долгий период разработки SupportPulse наконец-то стал доступен для использования.</p>
                <button class="primary-button compact" type="button">
                  Использовать
                </button>
              </div>
            </article>
          </div>
        )}

        {screen === 'chats' && (
          <div class="admin-page chats-page">
            <header class="chat-controls">
              <button class="chip" type="button">
                Дата
              </button>
              <button class="chip circle" type="button" aria-label="Фильтр" />
            </header>

            <div class="chat-canvas">
              <div class="message-row right">
                <div class="message-meta">Имя</div>
                <div class="avatar-circle" />
                <div class="bubble-line" />
              </div>

              <div class="message-row left">
                <div class="avatar-circle" />
                <div>
                  <div class="message-meta">Имя</div>
                  <div class="bubble-line medium" />
                </div>
              </div>
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
              Адрес сайта<span class="required">*</span>
            </label>
            <p class="form-hint">На нем будет размещен виджет поддержки</p>
            <input id="site-url" class="text-input" type="text" placeholder="https://www.example.com" />
          </div>
        )}

        {screen === 'profile' && (
          <div class="profile-layout">
            <div class="profile-main">
              <label class="form-label" for="display-name">
                Отображаемое имя
              </label>
              <input id="display-name" class="text-input" type="text" placeholder="Имя профиля" />
              <label class="form-label" for="bio">
                Биография
              </label>
              <textarea id="bio" class="text-area" />
            </div>
            <div class="profile-side">
              <h3>Аватар профиля</h3>
              <div class="avatar-big">
                <img class="app-icon md" src="/app-icon.png" alt="Аватар" />
              </div>
              <button class="primary-button compact" type="button">
                Изменить
              </button>
            </div>
          </div>
        )}
      </section>
    </section>
  )
}
