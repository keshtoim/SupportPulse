import { render } from 'preact'
import './index.css'
import { App, FloatingWidget } from './app'

const script = document.currentScript as HTMLScriptElement | null
const isEmbed =
  script?.hasAttribute('data-embed') ||
  new URLSearchParams(location.search).has('embed')

if (isEmbed) {
  const container = document.createElement('div')
  container.id = 'sp-root'
  document.body.appendChild(container)
  render(<FloatingWidget />, container)
} else {
  render(<App />, document.getElementById('app')!)
}
