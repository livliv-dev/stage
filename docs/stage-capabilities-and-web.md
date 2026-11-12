# 功能范围与平台差异

这份说明记录 Stage 做了什么、刻意没做什么，以及浏览器和桌面版的差异。同类产品的情况来自它们的官方文档和源码，没有逐一实际运行。

## 项目关系

LivLiv 的模型构建流程在 livliv.ai 上运行，不在这个仓库；Player 是独立的加载、渲染、输入和口型库；Stage 用 Player 组织舞台、设备、AI、声音、联播和输出。Player 是 Stage 的上游依赖，Stage 只调用它的公开接口，不复制它的运行时代码。

人工出镜和 AI 直播是两个工作流，人工出镜不需要 AI 密钥。

## 和 VTube Studio、OpenVT 比较后的取舍

VTube Studio（VTS）以 Live2D 模型为主，支持手机追踪、控制器、道具场景、Twitch 热键触发和口型校准。[VTS](https://store.steampowered.com/app/1325860/VTube_Studio/)、[道具场景](https://github.com/DenchiSoft/VTubeStudio/wiki/Item-Scenes-and-Item-Hotkeys)、[Twitch 触发](https://github.com/DenchiSoft/VTubeStudio/wiki/Twitch-Hotkey-Triggers)、[口型](https://github.com/DenchiSoft/VTubeStudio/wiki/Lipsync)。OpenVT 以兼容 VTS 资源为目标，但把插件兼容和 VNet 排除在外。[OpenVT](https://github.com/erodozer/open-vt)

Stage 提供的是较少但完整的操作，不搬入全量参数编辑器：

- 动作细调与预设：逐参数范围、反向、曲线、独立平滑，实时预览、恢复、导入导出。三种格式没有任意 Live2D 参数的统一语义，所以不做节点式参数编辑器。
- 本机控制 API：面向 Stream Deck / Streamer.bot，见 [本机控制 API](stage-api.md)。
- 命名镜头：切换时保留角色、设备与 AI 会话。
- 带素材的项目文件，见 [项目文件](project-format.md)。
- 统一的声音控制：自己的麦克风、角色、朋友三组音量、静音、校准和试听。
- 道具跟随：图片绑定头部或身体，随输出和录制同步。
- 观众触发：固定的弹幕规则触发表情/动作，有冷却和测试按钮，不经过模型。
- 手机面捕（iFacialMocap）、OSC/VMC、手柄、像素 PNG 缩放，见 [追踪输入](tracking-inputs.md)。

目前没有：Live2D/Cubism 播放、VTS 插件协议、手部追踪、虚拟摄像头、Spout/Syphon/VBAN、完整的特效目录。不能宣传现有 VTS 模型可以直接迁移。鼠标跟随只接页面内的指针，不读取其他软件里的系统鼠标。

## Stage 使用的 Player 设置

配置保存在角色的 `tuning` 中，随场景文件、自动保存和撤销恢复；旧场景由 `readTuning` 补默认值。

| Stage 设置 | Player 公共入口 | 范围 |
| --- | --- | --- |
| 面捕平滑 | `FaceTrackingOptions.smoothing` | 松开滑杆后应用，避免拖动时反复重启摄像头 |
| 随身体移动 | `FaceTrackingOptions.follow`，0–2 | 面捕/追踪回放的侧移、上下和靠近缩放；不等于转头幅度 |
| 面捕帧率 | `FaceTrackingOptions.maxFps` | 自动 / 15 / 30 fps；实际帧率仍取决于设备与负载 |
| 待机动作 | `player.idle` | 可关闭；鼠标跟随依赖它，所以该模式下保持开启 |
| 说话时轻跳 | `LipSyncOptions.bounce` | 接口或 LivLiv 角色语音；面捕、系统朗读与仅麦克风口型不显示 |
| 角色语音音量 | `Speech.volume`，0–1 | 本机、朋友收到的声音和录制使用相同增益 |

界面按当前驱动、语音路径和格式只显示会生效的选项；PNG 没有独立表情图时不显示表情按钮。表情名称随界面语言读取模型的多语言标签。Player 尚未公开的内部参数不从 Stage 直接访问，需要先在 Player 设计公共接口。代码见 [tuning.ts](../stage/src/tuning.ts)、[actors.ts](../stage/src/actors.ts)。

## 朋友联播

VTS 的多人功能写明最多 6 人、依赖 Steam，同步模型、物件和动作。[VTS Multiplayer](https://github.com/DenchiSoft/VTubeStudio/wiki/Multiplayer)

Stage 的联播最多 4 人，使用独立信令服务和 WebRTC。每人选自己的一个角色，房主接纳后才开始交换数据。每对参与者直接交换角色包、最终姿势、麦克风和该角色的接口语音，所有人互听。发送的混音只包含本人的麦克风和所选角色的声音，不把收到的声音再发回去。系统朗读无法从浏览器取得音频，只在本机播放，界面会显示这一点。

每个人各自安排画面中的位置、大小、层级、显隐和静音。远程角色由本人驱动，不开放别人的设备、AI 密钥或场景控制。收到的模型只在内存中，离开后移除，不写入场景文件或角色库。参与者能拿到可渲染的模型文件，这不是防复制协议。[VNet Security](https://github.com/DenchiSoft/VTubeStudio/wiki/VNet-Security)

目前只在本机和自托管环境测试过。公开使用还需要 WSS 信令和 STUN/TURN，并验证跨 NAT、重连、长时间运行和带宽。P2P 可能向对方暴露 IP，需要隐藏时应只走 TURN 中继。启动方式和限制见 [collab/README.md](../collab/README.md)。

## 三种语音路径

| 路径 | 状态 | 说明 |
| --- | --- | --- |
| 文本模型 + TTS/ASR | 已支持 | 按键录音 → 识别成文字 → 文本模型 → 语音。适合弹幕互动和多角色，本地或云端声音都可以 |
| 一次请求的音频输入 | 未支持 | 把音频直接交给模型并返回文本/声音，需要新的请求处理 |
| 持续的语音对话（Realtime） | 未支持 | 需要单独的「实时对话」模式：音频流、增量字幕、打断、时长和费用上限 |

已支持的语音接口：百炼千问原生 TTS、OpenAI、硅基流动 CosyVoice/SenseVoice、Kokoro、其他兼容接口、LivLiv 角色声音和系统朗读。有接口不代表每家的音色质量或费用都实际测过。[硅基 TTS](https://docs.siliconflow.cn/docs/userguide/capabilities/text-to-speech)、[Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI)、[OpenAI Realtime](https://developers.openai.com/api/docs/guides/realtime)

## 浏览器与桌面版

| 能力 | 浏览器 | 桌面版 |
| --- | --- | --- |
| 角色、场景、字幕、AI、联播 | 支持 | 同一份 Stage 代码和 Player |
| 摄像头/麦克风 | 需要 HTTPS 或本机地址和用户授权 | 遵守系统权限 |
| 热键 | 页面有焦点时的快捷键 | 全局热键 |
| 手柄 | 浏览器 Gamepad API，页面须有焦点 | 相同 |
| 手机/OSC/VMC | 浏览器不能监听 UDP | iFacialMocap、部分 VMC 和标准 OSC 参数，默认关闭 |
| 本机控制 API | 无 | 有鉴权的本机 HTTP API |
| 后台运行 | 隐藏的页面可能被节流，不能保证 30/60 fps | 原生窗口可设置后台策略 |
| OBS 画面 | 输出窗口只能通过同一浏览器的 BroadcastChannel 连接，OBS 的浏览器源连不上 | 透明独立窗口，OBS 用窗口采集 |
| 模型服务 | 第三方接口受 CORS 和本地网络策略限制 | 通过桌面的请求转发，可以连本机服务（如 Ollama） |

依据：[getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)、[页面可见性](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)、[BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)、[OBS 浏览器源](https://obsproject.com/kb/browser-source)、[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)、[Electron globalShortcut](https://www.electronjs.org/docs/latest/api/global-shortcut)。

追踪输入分三层：桌面的 UDP 接收与协议解析、标准参数驱动、Player 参数映射。只有编辑器取得原始输入，输出窗口只接最终姿势。浏览器可以复用后两层。

## 尚未验证

真实摄像头和麦克风的长时间使用、OBS 声画同步、第三方语音服务、跨公网的 TURN、多小时运行，以及 Windows/Linux 的安装体验。
