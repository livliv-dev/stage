<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="media/livliv-stage-wordmark-white.svg">
    <img alt="LivLiv Stage" src="media/livliv-stage-wordmark-2000.png" width="360">
  </picture>
</p>

<h3 align="center">Your AI-Native VTuber Studio<br><sub>Many characters. One stage.</sub></h3>

<p align="center">
  A stage for 2D characters, in the browser or as a desktop app. Put many characters on one canvas, play one with your
  webcam, let AI VTubers talk to each other and to your live chat, then record a video or go live through OBS.<br>
  Built on <a href="https://github.com/livliv-dev/player">LivLiv Player</a>, with 23 featured characters ready to use.
</p>

<p align="center"><b>English</b> · <a href="README.zh-CN.md">中文</a> · <a href="README.ja.md">日本語</a></p>

<p align="center"><img src="media/demo.gif" alt="Nana, Sena and Kai talking on one stage, with speech bubbles" width="720"></p>

- **Many characters, one stage**: LivLiv, VRM and PNGTuber characters side by side, each with its own driver, voice and
  subtitles.
- **AI VTubers**: characters talk to each other and answer your Twitch chat, with your own model key (OpenAI, DeepSeek,
  Qwen, Kimi, Zhipu, OpenRouter, Ollama or any OpenAI-compatible API) and voices from your own speech API or from LivLiv.
- **You on stage**: webcam face tracking, microphone lip sync and the mouse; on desktop also phone tracking apps
  (iFacialMocap), VMC/OSC and global hotkeys; gamepads.
- **Ready to post**: record the whole stage to MP4, or open a transparent output window for OBS. Scenes and shots, props
  that follow a character, chat commands that trigger expressions.
- **Friends on the same stage**: up to four people, each bringing a character, over WebRTC through a signalling server
  you host.

<p align="center"><img src="media/crowd.jpg" alt="Thirteen featured characters on one stage" width="720"></p>

## Try it

You need Node.js 22.18 or later.

```sh
git clone https://github.com/livliv-dev/stage
cd stage
npm --prefix stage ci
npm --prefix stage run dev          # http://127.0.0.1:5222
```

The desktop app (Electron) runs the same code and is the recommended way to use Stage:

```sh
npm --prefix desktop ci
npm --prefix desktop run stage:dev   # stage:mac and stage:win build installers
```

Installers are not released yet, and builds are not signed. On first start, press **Try demo** to hear Nana, Sena and
Kai talk (recorded voices, no key needed), or pick a template and connect a model to let them talk freely.

<p align="center"><img src="media/editor.png" alt="The Stage editor: cast on the left, the stage in the middle, settings on the right" width="720"></p>

## Characters

23 featured characters come with Stage in [`stage/public/characters/`](stage/public/characters/). They are not covered
by the code licence: use them free for personal, non-commercial videos and streams, with credit ("Characters: LivLiv
(livliv.ai)"). The terms are in [LICENSE.md](stage/public/characters/LICENSE.md).

Bring your own with **Import**:

- **A LivLiv model**: make one from a single picture on [livliv.ai](https://livliv.ai) and download its model package
  (`.livliv`). Full-body characters come with a later version of LivLiv Player.
- **A VRM**: from VRoid Studio or any tool that exports VRM 0.x or 1.0.
- **A PNGTuber**: two pictures (mouth closed, mouth open), and two more with the eyes closed if you have them.

## Your keys and your data

- Model and speech keys stay in this browser or app. Requests go from your computer straight to the provider (through
  the app itself on desktop), never through LivLiv. Project files leave the keys out. The provider bills you.
- Face tracking runs Google's MediaPipe on your computer; camera images stay on it.
- Signing in to livliv.ai is optional. Signed in, you can use your characters there and their own voices, paid with
  livliv.ai points.
- Videos, recordings and projects you make with Stage are yours.

## Status

This is a development preview (0.2.2-preview.1), tested on macOS with Chromium and the desktop app. Not tested yet:
Windows, phones, real gamepads, OBS audio sync, and co-streaming over a public relay. Stage does not play Live2D
(Cubism) models.

## Project LivLiv

We want the art of creating characters to belong to everyone.

We're open-sourcing our AI tools for character creation, the player and its playback protocol, and a stage
where your characters can meet an audience.

Come say hello on [Discord](https://discord.gg/ac5qF36T2H) and follow us on [X (Twitter)](https://x.com/livliv_ai).

## Develop

```sh
npm --prefix stage run check && npm --prefix stage test
npm --prefix desktop test
npm --prefix collab test
```

Design notes (in Chinese): [docs/](docs/), the local control API in [docs/stage-api.md](docs/stage-api.md), the
co-streaming server in [collab/README.md](collab/README.md). Contributions are welcome:
[CONTRIBUTING.md](CONTRIBUTING.md). Security reports: [SECURITY.md](SECURITY.md).

## License

The code is under the [GNU AGPL version 3](LICENSE) with [additional terms](LICENSE-ADDITIONAL-TERMS.md): what you make
with Stage is yours; a copy or modified version keeps the "© LivLiv (livliv.ai)" credit in Settings → About and a
modified one uses its own name and icon. The featured characters have [their own licence](stage/public/characters/LICENSE.md).
The LivLiv names and logos are not licensed with the code: [TRADEMARKS.md](TRADEMARKS.md).
