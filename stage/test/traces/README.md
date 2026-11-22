# Behaviour traces

What each way of starting a session does today, written down as the events a user or the bill would notice. A change
to how sessions run (a new runner, a refactor of `conversation.ts`) has to give the same events: `npm run test:traces`
runs every scenario in `test/traces.mjs` against fixture services and compares it with its file here.

```sh
npm run test:traces                      # every scenario, compared with its file
npm run test:traces -- chat duet         # only these
npm run test:traces -- --update [names]  # write the files anew from this run, then read the diff
```

One file per scenario, one JSON event per line. The first line names the scenario and says what it does.

## Events

| `t` | When | Fields |
|---|---|---|
| `record` | a conversation record is opened (the one the app opened before the scenario, then each one a session opens) | `scope`, `earlier`: lines already in it |
| `start` | a session starts | `mode` (`conversation` = 对谈 and one-shot lines, `chat` = 持续聊天, `live` = AI 直播), `scope`, `engine` when it is AIRI |
| `line` | a line appears in the conversation | `from` (`ai`, `you`, `viewer`, `game`), `name`, `text`, `scope` |
| `cut` | a line is cut off part way | `name`, `text` |
| `drop` | a line is taken out (重说, 忘掉) | `name`, `text` |
| `scope` | a running session changes scope (an output came on) | `scope` |
| `save` | the record is saved with a different number of lines | `scope`, `lines`, `summary` when it carries a new summary |
| `remember` | a memory is written | `scope`, `for` (the character), `text` |
| `memory-edit` | a memory is edited (the scenario does it, as the memory panel would) | `from`, `to` (`scope: text`) |
| `pause`, `resume` | a running session is paused or resumed | |
| `retry` | AI 直播 will try a failed turn again | `seconds` until it does |
| `model` | a request to a model (each one is paid) | `engine` (`openai`: a model of one's own, `airi`, `livliv`: livliv.ai's text, points), `via` (`livliv` on an AIRI request to livliv.ai's text), `speaker`, `scope` (as the prompt says it), `memories` it carried (`scope: text`), `viewer`, `event`, `input` (AIRI's turn input) |
| `voice` | a voice request | `via` (`livliv`: one `/say` call, points; `api`: your own speech API), `text` |
| `error`, `need-model` | the conversation shows an error, or asks for a model | `text`, `intent` |
| `end` | a session ends | `mode`, `scope`, `turns`, `generations`, `ended` (the limit or reason shown), `error` |

## How they are compared

The story (every event except `model` and `voice`) must match in order. Model requests must match in their own order,
and voice requests in theirs, but not where they fall among the lines: a line may be made, and its voice fetched,
while the one before is still being said.

Saves are part of the story: the record is saved after every change to its lines, so what a user reopens after a crash
or a closed window is the conversation up to the last line. A runner must save the same line counts in the same order
(it may save more often: a save with the same count as the one before is not written down).

## What keeps a run the same

- The fixture model answers `<speaker>的第<n>句。我接着说下去。`, where `n` is one more than the speaker's lines in
  the history the request carries (each sentence of a reply said sentence by sentence is a line of its own). AIRI gets
  the same text, streamed. livliv.ai's text (`/api/stage/v1`) answers the same way.
- Voices are short tones (a scenario may make them longer, to start something while a line is said).
- The session's chance draws all come from `src/sessions/chance.ts`, which the scenarios pin to the first choice
  (`setChance(() => 0)`): who speaks next in free order, whether a line answers a waiting viewer, whether an AI cuts in
  and when, the pause between lines, a glance. A runner draws from it too.
- The fixture model can be made slow (`modelDelay`) or fail a number of times (`modelFailures`, a 503), for the
  scenarios that change memories while a line is made and that retry.
- A time limit is a minute at least: in a scenario that ends at one (`fastClock`), a timer of half a minute or more runs
  60 times sooner, so a minute's limit ends after a second.
- Scenarios drive Stage the way its console does (`talk.*`, the hands-free switch, a recording), never through the UI.
- Memories are told apart by their ids in what a request carries, never by text in the history.
- Each scenario has a fresh browser context: nothing saved carries over.
