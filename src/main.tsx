import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.tsx'

// The website (any browser) always uses the desktop-oriented layout — that's the
// default set in index.html. Only the Capacitor-wrapped native app gets the
// responsive mobile layout, since there's no scenario where a phone app should
// render the desktop view. No user-facing toggle: this is decided once, here.
// `?mobile` is a dev-only escape hatch so the mobile CSS can be previewed with
// Chrome's device toolbar before a real Capacitor build exists — not discoverable
// through any UI, so it doesn't reintroduce a user-facing toggle.
const previewMobile = import.meta.env.DEV && new URLSearchParams(location.search).has('mobile')
if (Capacitor.isNativePlatform() || previewMobile) {
  document.querySelector('meta[name="viewport"]')?.setAttribute(
    'content',
    'width=device-width, initial-scale=1.0'
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
