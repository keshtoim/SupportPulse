import { useState } from 'preact/hooks'
import './app.css'
import { AdminExperience } from './admin-experience'
import { WidgetExperience } from './widget-experience'
import type { AdminScreen, AppMode, WidgetScreen } from './api'
import { DEFAULT_TENANT_ID } from './api'

function getEmbedParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    isEmbed: params.get('embed') === '1',
    tenantId: params.get('tenantId') ?? DEFAULT_TENANT_ID,
  }
}

export function App() {
  const { isEmbed, tenantId } = getEmbedParams()

  if (isEmbed) {
    document.documentElement.classList.add('embed-mode')
    return (
      <WidgetExperience
        active
        tenantId={tenantId}
        screen="home"
        onScreenChange={() => {}}
        onOpenAdmin={() => {}}
      />
    )
  }

  return <NormalApp tenantId={tenantId} />
}

function NormalApp({ tenantId }: { tenantId: string }) {
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
        tenantId={tenantId}
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
