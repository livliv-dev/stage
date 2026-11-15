import { createNeuroServer, type NeuroEvent, type ForceRequest } from '../index.js'

const seen: NeuroEvent[] = []
const server = createNeuroServer({
  character: { id: 'contract-check', name: 'Contract check' },
  onEvent: event => { seen.push(event) },
  decideAction: (request: ForceRequest, session, signal) => {
    signal.throwIfAborted()
    const available = session.actions.find(action => request.actionNames.includes(action.name))
    return available ? { name: available.name, data: {} } : null
  },
})
void server.close()
