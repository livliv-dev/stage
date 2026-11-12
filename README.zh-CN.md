<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="media/livliv-stage-wordmark-white.svg">
    <img alt="LivLiv Stage" src="media/livliv-stage-wordmark-2000.png" width="360">
  </picture>
</p>

<h3 align="center">你的 AI 原生 VTuber 工作室<br><sub>很多角色，同一张舞台。</sub></h3>

<p align="center">
  2D 角色的舞台，浏览器和桌面都能用。把很多角色放上同一张舞台，用摄像头扮演其中一个，让 AI 主播彼此聊天、回应直播弹幕，
  再录成视频，或者通过 OBS 开播。<br>
  基于 <a href="https://github.com/livliv-dev/player">LivLiv Player</a>，自带 23 个精选角色，开箱即用。
</p>

<p align="center"><a href="README.md">English</a> · <b>中文</b> · <a href="README.ja.md">日本語</a></p>

<p align="center"><img src="media/demo.gif" alt="Nana、Sena 和 Kai 在同一张舞台上对话，带对话气泡" width="720"></p>

- **很多角色，同一张舞台**：LivLiv、VRM 和 PNGTuber 角色可以站在一起，每个角色有自己的驱动方式、声音和字幕。
- **AI 主播**：角色之间互相接话，也回应 Twitch 弹幕。用你自己的模型密钥（OpenAI、DeepSeek、通义千问、Kimi、智谱、
  OpenRouter、Ollama，或任何兼容 OpenAI 的接口），声音来自你自己的语音接口或 LivLiv。
- **你也能上台**：摄像头面捕、麦克风口型和鼠标；桌面版还支持手机面捕 App（iFacialMocap）、VMC/OSC 和全局热键；也能用手柄。
- **做完就能发**：整张舞台录成 MP4，或打开透明输出窗口给 OBS。场景和镜头、跟着角色走的道具、用弹幕命令触发表情。
- **和朋友同台**：最多 4 个人，各带一个角色，通过你自己部署的信令服务用 WebRTC 连接。

<p align="center"><img src="media/crowd.jpg" alt="13 个精选角色站在同一张舞台上" width="720"></p>

## 试一试

需要 Node.js 22.18 或更新版本。

```sh
git clone https://github.com/livliv-dev/stage
cd stage
npm --prefix stage ci
npm --prefix stage run dev          # http://127.0.0.1:5222
```

桌面版（Electron）用的是同一套代码，推荐用它：

```sh
npm --prefix desktop ci
npm --prefix desktop run stage:dev   # stage:mac、stage:win 打安装包
```

安装包还没有发布，构建出来的应用也没有签名。第一次打开时点「看演示」，听 Nana、Sena 和 Kai 聊一段（录好的声音，不需要密钥）；
或者选一个模板、接上模型，让他们自由对话。

<p align="center"><img src="media/editor.png" alt="Stage 编辑器：左边是角色列表，中间是舞台，右边是设置" width="720"></p>

## 角色

[`stage/public/characters/`](stage/public/characters/) 里有 23 个精选角色。它们不在代码许可的范围内：个人非商业的视频和直播可以免费使用，
请署名「角色：LivLiv（livliv.ai）」。条款见 [LICENSE.md](stage/public/characters/LICENSE.md)。

用「导入」放上你自己的角色：

- **LivLiv 模型**：在 [livliv.ai](https://livliv.ai) 用一张图做出角色，下载它的模型包（`.livliv`）。全身角色要等之后版本的 LivLiv Player。
- **VRM**：VRoid Studio 等能导出 VRM 0.x 或 1.0 的工具做的模型。
- **PNGTuber**：两张图（闭嘴、张嘴），有闭眼的再加两张。

## 你的密钥和数据

- 模型和语音的密钥只存在这个浏览器或应用里。请求从你的电脑直接发给服务商（桌面版经过应用本身转发），不经过 LivLiv；项目文件不包含密钥。费用由服务商向你收取。
- 面捕在你的电脑上运行 Google 的 MediaPipe，摄像头画面不离开这台电脑。
- 登录 livliv.ai 是可选的。登录后可以用你在那里的角色和它们自己的声音，消耗 livliv.ai 积分。
- 你用 Stage 做出来的视频、录像和项目文件归你。

## 现状

这是开发预览版（0.2.2-preview.1），在 macOS 的 Chromium 和桌面版上测试过。还没测过：Windows、手机、真实手柄、OBS 的音画同步、
通过公网中继的联播。Stage 不播放 Live2D（Cubism）模型。

## Project LivLiv

我们希望，创造角色这件事能属于每一个人。

我们正在开源 AI 角色创作工具链、播放器与播放协议，还有一方舞台，让你创作的角色与大家见面。

欢迎来 [Discord](https://discord.gg/ac5qF36T2H) 聊聊角色创作，也可以在 [X（Twitter）](https://x.com/livliv_ai) 上关注我们。

## 开发

```sh
npm --prefix stage run check && npm --prefix stage test
npm --prefix desktop test
npm --prefix collab test
```

设计说明见 [docs/](docs/)，本机控制接口见 [docs/stage-api.md](docs/stage-api.md)，联播服务见 [collab/README.md](collab/README.md)。
欢迎贡献：[CONTRIBUTING.md](CONTRIBUTING.md)。安全问题请按 [SECURITY.md](SECURITY.md) 私下报告。

## 许可

代码采用 [GNU AGPL 第 3 版](LICENSE)，另有[附加条款](LICENSE-ADDITIONAL-TERMS.md)：你用 Stage 做出来的东西归你；副本和修改版要在
「设置 → 关于」里保留「© LivLiv（livliv.ai）」的署名，修改版要用自己的名字和图标。精选角色有[自己的许可](stage/public/characters/LICENSE.md)。
LivLiv 的名称和标志不随代码授权，见 [TRADEMARKS.md](TRADEMARKS.md)。
