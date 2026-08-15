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
import recoverFromStaleBuild, { clearStaleBuildFlag } from './utils/recoverFromStaleBuild.js'
import { announceIfCalendarPopup } from './utils/googleCalendarPopup.js'

// Registered before render so a chunk that goes missing during the very first navigation is caught.
recoverFromStaleBuild()

// If this window is the Google Calendar consent popup coming back, tell the opener and close. Done
// before render because nobody is going to see this app — the window is about to disappear.
if (!announceIfCalendarPopup()) {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

// We got here, so this build's entry bundle is intact — arm the one-shot reload for next time.
clearStaleBuildFlag()
