import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/app/App'
import '@/index.css'

// After a new deployment, a tab that was already open may ask for page files that no longer
// exist. Reload once to pick up the new version (the flag stops a reload loop).
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem('innovprocure.reloaded')) return
    sessionStorage.setItem('innovprocure.reloaded', '1')
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
