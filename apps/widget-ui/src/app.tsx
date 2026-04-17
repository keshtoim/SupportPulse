import { useState } from 'preact/hooks'
import './app.css'

export function App() {
  const [screen, setScreen] = useState<'home' | 'chat'>('home')

  return (
    <main class="widget-shell">
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
            <button class="primary-button" type="button" onClick={() => setScreen('chat')}>
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
          onClick={() => setScreen('home')}
        >
          Дом
        </button>
        <button
          class={`tab-button ${screen === 'chat' ? 'active' : ''}`}
          type="button"
          onClick={() => setScreen('chat')}
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
    </main>
  )
}
