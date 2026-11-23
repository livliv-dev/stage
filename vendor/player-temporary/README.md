# A temporary LivLiv Player build

`livliv-dev-player-0.7.0-mavatar.5ca9096.tgz` is [LivLiv Player](https://github.com/livliv-dev/player) built ahead of
its next release, from the public commit 5ca9096 (branch `feat/mavatar`): Player 0.6 (long hair swings gently below
the shoulders, long hair lying on the body goes with it, the blink hand-over, feel settings, the review fixes) and Mesh
Avatar Studio avatars (`.mavatar`) through `@livliv-dev/player/mavatar`, drawn by mesh-avatar 0.9.0 (MIT), which Stage
depends on beside it.

Stage depends on it from [stage/package.json](../../stage/package.json); the lock pins its sha512. It is committed here
(the repository otherwise ignores `*.tgz`) so that a fresh clone installs it.

When the Player release with these changes is on npm, depend on that version and delete this folder.
