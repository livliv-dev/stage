import { briefLine } from './brains/memoryBrief'
import { indexLine, memoryBody } from './brains/airiMemory'
import '@fontsource-variable/inter/wght.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import Output from './Output'
import { TabGate } from './TabGate'
import { isOutput } from './link'
import { actors, onHeard } from './actors'
import { conversation, onConv, talk } from './conversation'
import { store } from './scene'
import { rec, recording } from './recording'
import { activeSpeech, asrReady, saveSpeech, transcribeApi } from './voiceApi'
import { saveBrainConfig, savedBrain } from './brain'
import { logout } from './livliv'
import { detectVoicebox, voiceboxState } from './voicebox'
import { lostKey, migrateKeys } from './core/secrets'
import './styles.css'

// the dev server only: the live objects, for measuring motion and testing from the console
if (import.meta.env.DEV) Object.assign(window, { __stage: { onHeard, onConv, actors, store, talk, conversation, rec, recording, voice: { activeSpeech, asrReady, saveSpeech, transcribeApi, voicebox: voiceboxState, detectVoicebox }, brain: savedBrain, keys: { lostKey, saveBrain: saveBrainConfig, logout }, memoryLines: { brief: briefLine, index: indexLine, body: memoryBody } } })

// the desktop app: keys saved the old way move to the system's encrypted store, all at once as it starts
if (!isOutput) void migrateKeys()

// ?output=1: the output window (Output.tsx), else the editor
createRoot(document.getElementById('root')!).render(<StrictMode>{isOutput ? <Output /> : <TabGate><App /></TabGate>}</StrictMode>)
