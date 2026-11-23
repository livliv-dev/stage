<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="media/livliv-stage-wordmark-white.svg">
    <img alt="LivLiv Stage" src="media/livliv-stage-wordmark-2000.png" width="360">
  </picture>
</p>

<h3 align="center">あなたの AI VTuber スタジオ</h3>

<p align="center">
  キャラクターに性格を設定すれば、数分であなたとおしゃべりしたり、そのまま配信したり。自分で演じることもできます。
</p>

<p align="center"><a href="README.md">English</a> · <a href="README.zh-CN.md">中文</a> · <b>日本語</b></p>

<p align="center"><img src="media/demo.gif" alt="Ruri、Nana、Konatsu がひとつのステージで会話する様子（吹き出し付き）" width="720"></p>

## 1.0 プレビュー版の新機能

Stage を「何をしたいか」から組み立て直しました。[1.0 プレビュー版をダウンロード](https://github.com/livliv-dev/stage/releases/tag/v1.0.0-preview)。

- **やりたいことから始める**：**自分で演じる**、**AI が配信**、**キャラと話す**、**動画を作る**。必要な準備だけが表示され、ボタンひとつで開始
- **このコンピューター上の無料の声**：[Voicebox](https://voicebox.sh) に対応（デスクトップ版）
- **キャラクターカードの読み込み**：SillyTavern と AIRI に対応

## そのほかの機能

- ひとつのステージに最大 30 体：LivLiv、VRM、PNGTuber、Mesh Avatar Studio（`.mavatar`）。厳選キャラクター 27 体付き
- キャラクター同士の掛け合い、Twitch コメントへの返事、記憶（[Project AIRI](https://github.com/moeru-ai/airi)）とリアルタイム通話
- フェイストラッキング、OBS 出力、録画、ゲーム接続、Neuro SDK

AI は自分のモデルの API キー（OpenAI、Qwen、DeepSeek など）か、LivLiv.ai アカウントで動きます。

## 試してみる

- **デスクトップ版**（macOS、Windows）：[1.0 プレビュー版](https://github.com/livliv-dev/stage/releases/tag/v1.0.0-preview)、または[安定版](https://github.com/livliv-dev/stage/releases/latest)（[予備のダウンロード](https://downloads.livliv.ai/stage/index.html)）。
  macOS は 1 行で安定版をインストールでき、初回の確認は出ません：`curl -fsSL https://livliv.ai/stage/install.sh | bash`
- **オンライン（Web版・機能制限あり）**：[livliv.ai/stage](https://livliv.ai/stage)
- **ソースから**：[開発](#開発)を参照

<p align="center"><img src="media/editor.jpg" alt="Stage 1.0：Sena、Nana、Kai が同じステージに。Nana が話しているところ" width="720"></p>

## キャラクター

厳選キャラクターには[専用のライセンス](stage/public/characters/LICENSE.md)があります。自分のキャラクターは「インポート」から：
[livliv.ai](https://livliv.ai) のモデルパッケージ（`.livliv`）、VRM、PNGTuber、[Mesh Avatar Studio](https://github.com/shinshin86/mesh-avatar-studio) で書き出した `.mavatar`。

## Project LivLiv

誰もが、思い描いたキャラクターをかたちにできるように。それが私たちの願いです。

AI を使ったキャラクター制作のツール群、[プレイヤーとその再生プロトコル](https://github.com/livliv-dev/player)、そして[キャラクターをお披露目できる舞台](https://github.com/livliv-dev/stage)をオープンソース化しています。

ぜひ [Discord](https://discord.gg/ac5qF36T2H) に遊びに来てください。[X（Twitter）](https://x.com/livliv_ai) でも LivLiv をフォローしてもらえたらうれしいです。

## 開発

Node.js 22.18 以降が必要です。次の Player リリースまで、Stage は一時的な LivLiv Player ビルドを使います（[vendor/player-temporary](vendor/player-temporary/README.md)）。

```sh
git clone https://github.com/livliv-dev/stage
cd stage
npm --prefix stage ci && npm --prefix stage run dev            # Web 版、http://127.0.0.1:5222
npm --prefix desktop ci && npm --prefix desktop run stage:dev  # デスクトップ版（stage:mac と stage:win でインストーラーを作成）
```

テスト：`npm --prefix stage run check && npm --prefix stage test`、`npm --prefix desktop test`、`npm --prefix collab test`。
ブラウザのテストは [stage/package.json](stage/package.json) の `test:*` スクリプトです。プルリクエストごとに GitHub Actions がこれらを実行します。
AI チャットと記憶は [docs/ai-conversations.md](docs/ai-conversations.md)、リアルタイム通話は [docs/realtime-voice.md](docs/realtime-voice.md)、
Neuro SDK ブリッジは [neuro/README.md](neuro/README.md)、ローカル制御 API は [docs/stage-api.md](docs/stage-api.md)、フレンドコラボは [collab/README.md](collab/README.md) にあります。
モデルの API キーはブラウザかアプリの中にだけ保存され、サービスへ直接送られます。デスクトップ版はキーと LivLiv のログインをシステムの暗号化（キーチェーン、DPAPI、Linux のキーリング）で保存し、書き込めたらページのストレージから移します。コントリビュートは [CONTRIBUTING.md](CONTRIBUTING.md)、
セキュリティの報告は [SECURITY.md](SECURITY.md) へ。

## ライセンス

コードは [Apache License 2.0](LICENSE) で公開しています。`.mavatar` のキャラクターは [mesh-avatar](https://www.npmjs.com/package/mesh-avatar)（MIT）が描画します。厳選キャラクターには[独自のライセンス](stage/public/characters/LICENSE.md)があります。
LivLiv の名前とロゴは、公式版を名乗らない限り、あなたのバージョンでもそのまま使えます：[TRADEMARKS.md](TRADEMARKS.md)。
