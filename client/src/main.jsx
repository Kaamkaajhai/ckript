import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/index.css'
// Courier Prime — the screenplay body font (regular, bold, and italic for parentheticals).
import '@fontsource/courier-prime/400.css'
import '@fontsource/courier-prime/700.css'
import '@fontsource/courier-prime/400-italic.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
