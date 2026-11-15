import { createRoot } from 'react-dom/client'
import { MemoryPanel } from '../src/MemoryPanel'
import { memory } from '../src/memory'
import '../src/styles.css'

async function mount() {
  const stored = await memory.session('browser-chat')
  createRoot(document.getElementById('root')!).render(<MemoryPanel profileIds={['nana']} profileNames={{ nana: 'Nana' }} scope="private" source={stored ? { sessionId: stored.id, lineIds: ['browser-source'], text: '我喜欢安静的种田游戏。' } : undefined} />)
}
void mount()
