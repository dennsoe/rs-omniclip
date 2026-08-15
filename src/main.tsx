import React from 'react'
import ReactDOM from 'react-dom/client'
// Font premium aplikasi (bundel lokal; import via JS agar Vite menyalin file woff2).
import '@fontsource-variable/plus-jakarta-sans'
import App from './App'
import './assets/main.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
