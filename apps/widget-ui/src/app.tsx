import { useState } from 'preact/hooks'
import './app.css'
import { AdminExperience } from './admin-experience'
import { WidgetExperience } from './widget-experience'
import type { AdminScreen, AppMode, WidgetScreen } from './api'

export function App() {
  const [mode, setMode] = useState<AppMode>('widget')
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

      <WidgetExperience
        active={mode === 'widget'}
        screen={widgetScreen}
        onScreenChange={setWidgetScreen}
        onOpenAdmin={(screen) => {
          setAdminScreen(screen)
          setMode('admin')
        }}
      />

      <AdminExperience
        active={mode === 'admin'}
        screen={adminScreen}
        onScreenChange={setAdminScreen}
        onBackToWidget={() => {
          setWidgetScreen('chat')
          setMode('widget')
        }}
      />
    </main>
  )
}
