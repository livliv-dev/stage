import { createNeuroServer } from './index.js'

// This example makes no model call. The optional scripted mode handles only the included demo game's wave action.
const server = createNeuroServer({
  character: { id: 'local-demo', name: 'Local protocol demo' },
  onEvent(event, session) { console.log(session.game, event) },
  decideAction(request) {
    console.log('Action decision requested:', request)
    return process.argv.includes('--scripted') && request.availableActions.some(action => action.name === 'wave') ? { name: 'wave', data: { side: 'left' } } : null
  },
})
server.listen(Number(process.env.NEURO_PORT || 8001)).then(address => console.log(`Game client address: ${address.url}`)).catch(error => { console.error(error); process.exitCode = 1 })
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void server.close() })
