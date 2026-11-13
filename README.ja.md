<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="media/livliv-stage-wordmark-white.svg">
    <img alt="LivLiv Stage" src="media/livliv-stage-wordmark-2000.png" width="360">
  </picture>
</p>

<h3 align="center">あなたの AI ネイティブ VTuber スタジオ<br><sub>たくさんのキャラクター、ひとつのステージ。</sub></h3>

<p align="center">
  たくさんの 2D キャラクターをひとつのステージに。Web カメラで自分が演じ、AI VTuber どうしの掛け合いやコメントへの返事を任せて、
  動画に書き出したり OBS で配信したりできます。ブラウザでもデスクトップアプリでも動きます。
</p>

<p align="center"><a href="README.md">English</a> · <a href="README.zh-CN.md">中文</a> · <b>日本語</b></p>

<p align="center"><img src="media/demo.gif" alt="Nana、Sena、Kai がひとつのステージで会話する様子（吹き出し付き）" width="720"></p>

- たくさんのキャラクターを同じステージに：LivLiv（半身・全身）、VRM、PNGTuber。キャラクターごとに動かし方と声を設定
- AI VTuber どうしの会話と Twitch コメントへの返事。LivLiv の AI（キー不要）か、自分のモデルで
- Web カメラのフェイストラッキングとマイクのリップシンク。デスクトップ版はスマホのトラッキングアプリ、VMC/OSC、グローバルホットキーにも対応
- ステージ全体を MP4 に録画、または OBS へ
- 厳選キャラクター 27 体を同梱。[LivLiv Player](https://github.com/livliv-dev/player) がベース

## 試してみる

- **オンライン**：[livliv.ai/stage](https://livliv.ai/stage)
- **デスクトップ版**：macOS と Windows 版を [Releases](https://github.com/livliv-dev/stage/releases/latest) から
- **ソースから**：[開発](#開発)を参照

<p align="center"><img src="media/crowd.jpg" alt="厳選キャラクターがひとつのステージに並んだ様子" width="720"></p>

## キャラクター

[`stage/public/characters/`](stage/public/characters/) に厳選キャラクター 27 体（うち 4 体は全身）が入っています。個人の非商用の
動画や配信では、クレジットを入れれば無料で使えます。[キャラクターのライセンス](stage/public/characters/LICENSE.md)をご覧ください。

自分のキャラクターは「インポート」から：[livliv.ai](https://livliv.ai) のモデルパッケージ（`.livliv`）、VRM、PNGTuber（2 枚か 4 枚の画像）。

## Project LivLiv

誰もが、思い描いたキャラクターをかたちにできるように。それが私たちの願いです。

AI を使ったキャラクター制作のツール群、プレイヤーとその再生プロトコル、そしてキャラクターをお披露目できる舞台をオープンソース化しています。

ぜひ [Discord](https://discord.gg/ac5qF36T2H) に遊びに来てください。[X（Twitter）](https://x.com/livliv_ai) でも LivLiv をフォローしてもらえたらうれしいです。

## 開発

Node.js 22.18 以降が必要です。

```sh
git clone https://github.com/livliv-dev/stage
cd stage
npm --prefix stage ci && npm --prefix stage run dev            # Web 版、http://127.0.0.1:5222
npm --prefix desktop ci && npm --prefix desktop run stage:dev  # デスクトップ版（stage:mac と stage:win でインストーラーを作成）
```

テスト：`npm --prefix stage run check && npm --prefix stage test`、`npm --prefix desktop test`、`npm --prefix collab test`。
ローカル制御 API は [docs/stage-api.md](docs/stage-api.md)、共同配信は [collab/README.md](collab/README.md) にあります。
モデルの API キーはブラウザかアプリの中にだけ保存され、サービスへ直接送られます。コントリビュートは [CONTRIBUTING.md](CONTRIBUTING.md)、
セキュリティの報告は [SECURITY.md](SECURITY.md) へ。

## ライセンス

コードは [GNU AGPL バージョン 3](LICENSE) で公開しています。厳選キャラクターには[独自のライセンス](stage/public/characters/LICENSE.md)があります。
LivLiv の名前とロゴは、公式版を名乗らない限り、あなたのバージョンでもそのまま使えます：[TRADEMARKS.md](TRADEMARKS.md)。
