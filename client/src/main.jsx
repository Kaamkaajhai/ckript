import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/index.css'
// Courier Prime — the screenplay body font. All four faces (regular, bold, italic, bold-italic) so
// inline emphasis (*italic* **bold** ***both***) renders with a REAL face. `body` sets
// font-synthesis:none, so a missing face would silently render plain — load every variant we use.
import '@fontsource/courier-prime/400.css'
import '@fontsource/courier-prime/700.css'
import '@fontsource/courier-prime/400-italic.css'
import '@fontsource/courier-prime/700-italic.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
