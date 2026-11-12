# Contributing

Issues and pull requests are welcome. Please be kind.

There is no CLA. Contributions are under the GNU AGPL version 3 with the same additional terms as the rest of the code ([LICENSE-ADDITIONAL-TERMS.md](LICENSE-ADDITIONAL-TERMS.md)).

## Pull requests

- Keep each one small and about one thing. For a new feature or a larger change, open an issue first.
- Say what it fixes or adds and how you checked it. For cameras, phones, gamepads, OBS or co-streaming, say which hardware, system and app versions you used.
- Understand and test what you send, whatever tools helped you write it.
- Interface text goes through `tr()`, with all four languages in `stage/src/locales/messages.ts`.
- Rendering, motion and file formats belong to [LivLiv Player](https://github.com/livliv-dev/player); Stage uses only its public API.

For a code change, run this first:

```sh
npm --prefix stage run check && npm --prefix stage test && npm --prefix desktop test && npm --prefix collab test
```

For a change to the interface, also run `npm --prefix stage run test:browser` (see the README for the Playwright setup).

## What we can't take

- Changes to the featured characters in `stage/public/characters/`, or new ones. See their [licence](stage/public/characters/LICENSE.md) and [credits](stage/public/characters/CREDITS.md).
- Code or assets that can't be released under the GNU AGPL version 3, including anything that needs a vendor's licence (for example the Live2D Cubism SDK).
