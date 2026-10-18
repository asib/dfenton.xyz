import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import MiscPage from './MiscPage.tsx'
import './index.css'
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {(window.location.pathname === '/misc' || window.location.pathname.startsWith('/misc/')) ? <MiscPage /> : <App />}
  </StrictMode>,
)
