import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { applyBrandTheme, savedAccent } from './config/theme.js'

// Restore the last-used accent BEFORE first paint so every page — including a
// hard-refreshed login screen — starts in the school's theme colour rather than
// flashing the default blue. ThemeApplier (once the school loads) and the login
// page's public-branding fetch refine it afterwards.
applyBrandTheme(savedAccent() || undefined)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
