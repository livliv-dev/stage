# @livliv-dev/stage-protocol

What LivLiv Stage's desktop shell (`desktop/`) and its editor page (`stage/`) say to each other, in one place, so the
two sides can't drift apart:

| module | what |
| --- | --- |
| `bridge` | `window.livlivDesktop`: everything the page can ask of the shell. The preload is type-checked against it |
| `commands` | the live-window commands (`expr:1`, `act:nod`, `clear`…) and their grammar |
| `stageCommands` | the local control API's commands and results |
| `tracking` | face tracking from a phone or a tracking app (VMC, iFacialMocap): settings, state, frames |
| `neuro` | the Neuro game protocol bridge: configuration, state, decisions |
| `airiGame` | AIRI's game bridges (Minecraft, Factorio) |
| `collab` | the friend-collab relay the desktop app hosts: configuration and state |
| `voicebox` | Voicebox on this computer: voice profiles and results |

The relay's own wire rules stay in `collab/protocol.mjs`, which the self-hosted relay and the editor already share.

Plain TypeScript with no dependencies; nothing here may touch Node or the DOM, since both sides load it. The desktop
app's build compiles it into its own output (`desktop/tsconfig.json` references this project, which writes to
`desktop/dist/protocol`) and imports it as `#protocol/<module>` (`desktop/package.json` `imports`), so the packaged app
carries it like any of its own files. The editor imports the sources and bundles them.
