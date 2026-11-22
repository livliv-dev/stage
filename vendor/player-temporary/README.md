# A temporary LivLiv Player build

`livliv-dev-player-0.6.0-hairsway.5e92c26.tgz` is [LivLiv Player](https://github.com/livliv-dev/player) built ahead of
its next release for one change: long hair swings gently below the shoulders when a character tilts, turns or leans, more
toward the tips. Still frames are unchanged, and the 长发和饰品晃动 slider at 0 draws every frame exactly as Player 0.5.1.

Stage depends on it from [stage/package.json](../../stage/package.json); the lock pins its sha512. It is committed here
(the repository otherwise ignores `*.tgz`) so that a fresh clone installs it.

When the Player release with this change is on npm, depend on that version and delete this folder.
