import WebSocket from 'ws'

const socket = new WebSocket(process.argv[2] || 'ws://127.0.0.1:8001/game')
const send = (command, data) => socket.send(JSON.stringify({ command, game: 'Local sample game', ...(data ? { data } : {}) }))
socket.on('open', () => {
  send('startup')
  send('actions/register', { actions: [{ name: 'wave', description: 'Wave the selected hand', schema: { type: 'object', required: ['side'], properties: { side: { type: 'string', enum: ['left', 'right'] } } } }] })
  send('context', { message: 'The player arrived at the stage.', silent: true })
  send('actions/force', { query: 'Greet the arriving player with a wave.', action_names: ['wave'], silent: true })
})
socket.on('message', raw => {
  const message = JSON.parse(raw.toString())
  console.log('Server:', message)
  if (message.command === 'action') {
    const data = JSON.parse(message.data.data || '{}')
    const success = message.data.name === 'wave' && ['left', 'right'].includes(data.side)
    console.log(success ? `Game accepted: wave ${data.side}` : 'Game rejected the action')
    send('actions/unregister', { action_names: ['wave'] })
    send('action/result', { id: message.data.id, success, message: success ? 'Wave accepted' : 'Invalid wave' })
    socket.close()
  }
})
socket.on('error', error => { console.error(error.message); process.exitCode = 1 })
const timer = setTimeout(() => { console.error('No action received within 10 seconds. Use the scripted demo or connect a decision host.'); process.exitCode = 1; socket.close() }, 10_000)
socket.on('close', () => clearTimeout(timer))
