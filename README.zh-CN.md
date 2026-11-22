<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="media/livliv-stage-wordmark-white.svg">
    <img alt="LivLiv Stage" src="media/livliv-stage-wordmark-2000.png" width="360">
  </picture>
</p>

<h3 align="center">你的 AI 虚拟主播工作室</h3>

<p align="center">
  给角色设定好性格，几分钟它就能和你聊天，或者直接开播。也可以自己来演。
</p>

<p align="center"><a href="README.md">English</a> · <b>中文</b> · <a href="README.ja.md">日本語</a></p>

<p align="center"><img src="media/demo.gif" alt="Ruri、Nana 和 Konatsu 在同一个舞台上聊天，带对话气泡" width="720"></p>

## 1.0 预览版新功能

Stage 按「你来做什么」重新整理了一遍。[下载 1.0 预览版](https://github.com/livliv-dev/stage/releases/tag/v1.0.0-preview)。

- **从目标开始**：**我来演**、**AI 来开播**、**和角色聊天**、**做一段视频**，每个目标只列它需要的准备，一个按钮开始
- **本机免费的声音**：接入 [Voicebox](https://voicebox.sh)（桌面版）
- **导入角色卡**：支持 SillyTavern 和 AIRI

## 其他功能

- 一张舞台最多 30 个角色：LivLiv、VRM、PNGTuber，自带 27 个精选角色
- 角色之间对话、回应 Twitch 弹幕，有记忆（[Project AIRI](https://github.com/moeru-ai/airi)）和实时通话
- 面捕、OBS 输出、录视频、游戏连接和 Neuro SDK

AI 可以用你自己的模型密钥（OpenAI、通义千问、DeepSeek 等），也可以用 LivLiv.ai 帐号。

## 试一试

- **桌面版**（macOS、Windows）：[1.0 预览版](https://github.com/livliv-dev/stage/releases/tag/v1.0.0-preview)，或[稳定版](https://github.com/livliv-dev/stage/releases/latest)（[备用下载](https://downloads.livliv.ai/stage/index.html)）。
  macOS 也可以用一行命令装稳定版，打开时不会被拦：`curl -fsSL https://livliv.ai/stage/install.sh | bash`
- **在线（网页版，功能受限）**：[livliv.ai/stage](https://livliv.ai/stage)
- **从源码运行**：见[开发](#开发)

<p align="center"><img src="media/editor.jpg" alt="Stage 1.0：Sena、Nana 和 Kai 同台，Nana 正在说话" width="720"></p>

## 角色

精选角色有[单独的许可](stage/public/characters/LICENSE.md)。用「导入」放上你自己的角色：[livliv.ai](https://livliv.ai) 的模型包（`.livliv`）、
VRM 或 PNGTuber。

## Project LivLiv

我们希望，创造角色这件事能属于每一个人。

我们正在开源 AI 角色创作工具链、[播放器与播放协议](https://github.com/livliv-dev/player)，还有[一方舞台，让你创作的角色与大家见面](https://github.com/livliv-dev/stage)。

欢迎来 [Discord](https://discord.gg/ac5qF36T2H) 聊聊角色创作，也可以在 [X（Twitter）](https://x.com/livliv_ai) 上关注我们。

## 开发

需要 Node.js 22.18 或更新版本。在 Player 下一个版本发布前，Stage 使用一个临时的 LivLiv Player 构建（[vendor/player-temporary](vendor/player-temporary/README.md)）。

```sh
git clone https://github.com/livliv-dev/stage
cd stage
npm --prefix stage ci && npm --prefix stage run dev            # 网页版，http://127.0.0.1:5222
npm --prefix desktop ci && npm --prefix desktop run stage:dev  # 桌面版（stage:mac、stage:win 打安装包）
```

测试：`npm --prefix stage run check && npm --prefix stage test`、`npm --prefix desktop test`、`npm --prefix collab test`；
浏览器测试是 [stage/package.json](stage/package.json) 里的 `test:*` 脚本。每个 PR 都会在 GitHub Actions 上跑这些测试。
AI 聊天和记忆见 [docs/ai-conversations.md](docs/ai-conversations.md)，实时通话见 [docs/realtime-voice.md](docs/realtime-voice.md)，
Neuro SDK 桥接见 [neuro/README.md](neuro/README.md)，本机控制接口见 [docs/stage-api.md](docs/stage-api.md)，好友联播见 [collab/README.md](collab/README.md)。
模型密钥只存在浏览器或应用里，请求直接发给服务商；桌面版用系统加密保存密钥和 LivLiv 登录（钥匙串、DPAPI 或 Linux 密钥环），写好后从页面存储中移走。欢迎贡献：[CONTRIBUTING.md](CONTRIBUTING.md)。
安全问题：[SECURITY.md](SECURITY.md)。

## 许可

代码采用 [Apache License 2.0](LICENSE)。精选角色有[自己的许可](stage/public/characters/LICENSE.md)。
你的版本可以继续用 LivLiv 的名字和标志，只要不自称官方版本，见 [TRADEMARKS.md](TRADEMARKS.md)。
