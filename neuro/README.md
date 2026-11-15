# Neuro game-protocol bridge

An independent local server for the [public Neuro game protocol](https://github.com/VedalAI/neuro-sdk/blob/main/API/SPECIFICATION.md). The package handles game messages and action results. A host supplies the character, model decisions, context storage, and speech scheduling. It has no Stage, React, Electron, Player, or memory dependency, and creating a server does not open a port.

This is protocol compatibility for your own AI character. It does not contain Neuro-sama's model, persona, voice, or API access. Integrations that hardcode the `neuro` or `evil` identity need changes before use with another character. The private package is not a publication; the upstream MIT notice is retained in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Independent use

Requires Node.js 22.18 or newer.

```sh
npm ci
npm test
npm run check
```

Run the two terminals below to exercise a complete game action without Stage, an API key, or a paid model:

```sh
npm start -- --scripted
```

```sh
node examples/game.js ws://127.0.0.1:8001/game
```

Without `--scripted`, the demo only logs events and declines action decisions. The example game registers one `wave` action, requests it, validates the result, and closes. The default sample port can be changed with `NEURO_PORT`.

## Host interface

```js
import { createNeuroServer } from '@livliv-dev/neuro-bridge'

const server = createNeuroServer({
  character: { id: 'my-character', name: 'My character' },
  onEvent(event, session) {
    // Persist context as data, not as system instructions.
    // Only a non-silent context may invite a response.
    // A dialogue event drives yielding; a reply event permits an answer.
  },
  async decideAction(request, session, signal) {
    // The host applies request.priority before making this decision.
    // request.silent means the decision must not produce speech.
    // request.ephemeralContext means its state/query must not become lasting memory.
    // Return a registered action and JSON object, or null to decline.
    return null
  },
  onError(error, sessionId) { console.error(sessionId, error.message) },
})

const address = await server.listen(0) // Binds only 127.0.0.1; 0 selects an unused port.
console.log(address.url)
// On application shutdown:
await server.close()
```

See [index.d.ts](index.d.ts) for the complete small interface. All `onEvent` values are JSON-serializable. The separate `session` argument owns callable operations; keep it on the host side when events cross IPC. `session.actions` returns a copy of the current catalog. `session.perform(name, data, { signal })` sends a chosen action and waits for the matching result. `session.speechFinished(...)` reports the host's speech ending or cancellation to the game.

The package does not silently turn game context into speech. `silent`, `priority`, and `ephemeralContext` are supplied to the host because only the host controls its own voice and memory. Game text, action descriptions, and action-result messages are untrusted application data.

## Implemented protocol

| Direction | Messages |
| --- | --- |
| Game → server | `startup`, `context`, `actions/register`, `actions/unregister`, `actions/force`, `action/result`, `speech/started`, `speech/ended` |
| Server → game | `startup` acknowledgement, `action`, `speech_finished` |

Startup binds a game name and clears its registered actions and pending work on that connection. Messages for another game, unknown commands, malformed JSON, binary frames, and malformed message shapes are ignored as the official protocol specifies. Registration errors are reported to the host and leave the existing catalog intact.

A force invokes one host decision at a time, including while game dialogue is playing. Its priority is passed unchanged. The selected action is checked against the force's allowed names, the current registration, and its schema before sending. A default force has **one attempt**: a failed result is reported without automatically paying for another model decision. Set `maxForceAttempts` to 2 or 3 to allow bounded retries. The host must account for each decision in its budget.

Results are correlated by unique IDs; duplicate and late results are ignored. Unregistering an action before returning its result is supported. Removing every offered action cancels a decision in progress. Restart, disconnect, host cancellation, and server shutdown discard pending work. Cancelling an action already sent cannot undo a game action; it stops waiting and does not resend it. A result times out after 20 seconds by default.

Dialogue IDs are deduplicated across connections to the same game. The most recent 512 ended IDs are retained per active game. Dialogue suppresses the host's speech through `dialogue` events. Once quiet for 100 ms, `reply` is emitted only for the last ended line's `maybe` or `always` policy and a matching responder. A following line cancels that pending reply. Disconnect closes an open line without prompting a reply. Missing end events expire after the expected duration plus 1 second, or after 31 seconds when no duration was supplied.

## Schema support and local limits

Action schemas may be omitted, empty, or top-level `type: "object"`. The validated subset includes:

- Single `type`: object, array, string, number, integer, boolean, or null.
- `properties`, `required`, `items`, `enum`, `const`, and boolean `additionalProperties`.
- Numeric minimum/maximum and exclusive bounds; string length and array item-count bounds.
- `description`, `title`, and `default` annotations.

Other keywords, including `$ref`, pattern matching, combinators, and tuple schemas, are rejected during registration; unsupported constraints are never silently ignored. Schemas are limited to 8 nested levels and 512 schema objects. There can be at most 128 actions per connection. Incoming messages are limited to 64 KiB and outgoing action data to 32 KiB.

The server binds only to loopback and accepts `/` or `/game`. The default is one connection. Native clients without an Origin header are accepted; browser clients require an exact entry in `allowedOrigins`. A stalled host is limited to 128 queued events before the game connection is closed. No remote service, authentication provider, or public relay is configured. Voice-chat audio transport and proposed protocol extensions are outside this version.

## Validation scope

The test suite uses real local WebSocket clients for startup, registration, parameter validation, force decisions, bounded retry, interruption, duplicate/late results, disconnect, dialogue grouping, browser-Origin rejection, and start/stop races. It does not run a third-party game or a production model. Official Randy is another protocol **server**; use a game client or SDK integration to test this server, not a Randy-to-server connection.
