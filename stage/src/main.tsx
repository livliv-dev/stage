import '@fontsource-variable/inter/wght.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import Output from './Output'
import { isOutput } from './link'
import { actors, onHeard } from './actors'
import { conversation, onConv, talk } from './conversation'
import { store } from './scene'
import { rec, recording } from './recording'
import './styles.css'

// the dev server only: the live objects, for measuring motion and testing from the console
if (import.meta.env.DEV) Object.assign(window, { __stage: { onHeard, onConv, actors, store, talk, conversation, rec, recording } })

// ?output=1: the output window (Output.tsx), else the editor
createRoot(document.getElementById('root')!).render(<StrictMode>{isOutput ? <Output /> : <App />}</StrictMode>)
