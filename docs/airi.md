# AIRI

和角色聊天：在开始页选「和角色聊天」，点控制台的「开始聊天」，或者直接发送第一句话。控制台状态行的「引擎」标签写明这次用 AIRI 还是标准引擎，以及原因；旁边是对话范围标签（「私聊」或「公开记忆」）。日常聊天默认用私聊，没有输出开着时点这个标签切换。开播：在开始页选「AI 来开播」，Twitch 弹幕在开始按钮旁的选项里；游戏连接在准备清单的「游戏」一项（打开「直播间」卡片），开播后这张卡片显示游戏状态，也可以给角色下游戏任务。

场景里只有一个设为「AI 来演」的本地角色时，OpenAI 兼容模型默认优先使用 AIRI。模型可运行在本机，也可通过云端 API 接入。AIRI 绑定这个角色的档案，画布选中项不影响绑定。多角色会话沿用 Stage 的角色调度。可以在「设置 → 连接 → 文字模型」更改单角色会话的 AIRI 偏好。网页版（livliv.ai/stage，或自己部署的网页版）的「和角色聊天」也用 AIRI，用 livliv.ai 的文字（livliv.ai/stage）或能在浏览器里直接调用的模型；网页版的 AI 直播用标准引擎，游戏和窗口画面只在桌面版。普通聊天可接收一次性回复。选择游戏连接或游戏窗口时，需要支持流式输出的模型。

AIRI 使用当前角色的姓名、人设、口吻、关系和立场。Stage 负责弹幕、语音、字幕、口型、录制和输出。首个完整句段可边生成边播放。按住说话、发送新输入或点「下一句」会打断当前回应。下一轮会记得已经说完的内容。使用自配语音接口可保留声音到录制和输出。系统朗读在本机播放，也可以选择仅字幕。

## 导入角色卡

AIRI 的角色卡（Character Card V3）可以导入成 Stage 角色的人设：选中一个「AI 来演」的角色，打开「人设和声音」，点「导入角色卡」，选 AIRI 或 SillyTavern 导出的 `.png` 或 `.json`（V3、V2 和最早的 TavernAI 格式都可以）。导入的是名字、人设（描述，没有描述时用性格）、说话风格（有描述时用性格）、开场白和示例对话里这个角色说的话；`{{char}}` 和 `{{user}}` 换成名字和「你」，`*动作*` 去掉。开场白是聊天开始、还没人说话时角色的第一句。

角色的身体、声音和其他设置保持不变。AIRI 的形象模型、声音和其他模块设置（`extensions.airi`）不导入，场景、世界书、其他开场白和系统提示也不导入，导入结果里会列出这张卡带了哪些没导入的内容。太长的内容会截短。导入后可以马上撤销。暂不支持 `.charx`。

## 游戏

### Minecraft

启动 [Airicraft](https://github.com/proj-airi/airicraft) 的 Minecraft 1.21.8 Fabric 客户端并进入游戏世界。在「直播 → 游戏连接」选「Minecraft / Fabric」。Stage 默认读取 Airicraft 生成的 `~/.airicraft/bridge-state.json`。使用不同游戏目录时，可以选择相应的连接文件。

打开「发送 Minecraft 画面给模型」后，Stage 直接从 Airicraft 获取游戏内截图。模型需要支持图片输入。要让角色收集资源或获取物品，使用直播面板的「游戏指令」，例如「背包至少有两块橡木原木」。该功能需要模型支持工具调用。Airicraft 负责规划和执行游戏内步骤，并通过任务回执更新 Stage 的直播会话。麦克风插话会打断说话。需要结束当前 Minecraft 任务时，点「停止游戏任务」。

让 Stage 决定何时执行游戏任务时，可以用 JVM 参数 `-Dairicraft.externalDriver=true` 启动 Airicraft，暂停游戏端自带的规划模型。Airicraft 允许在 Minecraft 服务器或已开放的局域网存档中执行动作。上游开发版会自动把单人存档开放到局域网。独立本机测试可以使用只监听回环地址的服务器。

如果 macOS 上的 Airicraft 截图卡在 Java 图形初始化，可在 Minecraft 启动器增加 JVM 参数 `-Djava.awt.headless=true` 后重启游戏。也可以保持 Fabric 连接，关闭原生截图，然后在 Stage 的窗口选择器采集 Minecraft 画面。

### Factorio

启动 [AIRI Factorio](https://github.com/moeru-ai/airi-factorio) 的 Autorio 模组、Factorio Wrapper 和 [RCON API](https://github.com/nekomeowww/factorio-rcon-api)。在「直播 → 游戏连接」选择「Factorio / Autorio」，填同一存档的 Wrapper 日志端口和 RCON API 端口。可用通过回环地址访问的服务，默认端口为 8080 和 24180。

用专用存档，保证只有一个在线玩家。Stage 可以向 Autorio 提交走到目标、采集和合成任务，入队后的任务由游戏执行。游戏日志会进入公开会话。上游 Wrapper 在 ARM64 上依赖 Linux 的 Box64，可以在 Linux 游戏环境运行后将两个端口转发到本机。Factorio 的画面从 Stage 的窗口选择器接入。

### 其他游戏

在「直播」使用「选择游戏窗口」。开启画面后，Stage 会把所选窗口的一帧发给当前模型，需要系统屏幕录制权限。支持 [Neuro SDK](../neuro/README.md) 的游戏仍可从「设置 → 游戏互动」连接，事件和动作回执也进入当前直播会话。

## 记忆

对角色说「记住……」可保存长期记忆，也可以在 Stage 的「记忆」面板编辑或删除。直播回复和游戏指令共用同一角色的公开记录。直播输出、录制或好友联播开着时，聊天自动用公开记录，AIRI 的记忆工具也只读公开记忆；私聊中途打开它们，会从下一句起转成公开。

## 构建和桌面验证

`vendor/airi-core/core.mjs` 由 [Project AIRI 473112a](https://github.com/moeru-ai/airi/tree/473112a3051fd599dba744b5257b890f5ea05b14) 的对话运行时、流式模型适配、Spark、记忆工具和语音分段源码生成。正常的 Stage 构建会直接打包它。应用资源 `licenses/` 内附 AIRI 和第三方依赖许可。

从相应的 AIRI 源码更新模块和许可时，使用 Node.js 22 或 24 运行以下命令。

```sh
npm --prefix vendor/airi-core ci
npm --prefix vendor/airi-core run build -- /path/to/airi
```

构建时会对打包结果应用 Stage 自己的修正（`vendor/airi-core/patches.mjs`，每条写明修什么）。每条修正必须在打包代码里恰好找到一次，上游代码变了找不到时构建会失败，不会悄悄发出没修过的版本。`npm --prefix vendor/airi-core run patch` 把这些修正应用到已提交的 `core.mjs`。目前的修正：流式工具调用的参数增量为 `null` 时不再被拼成文本 `"null"`（百炼等 OpenAI 兼容服务会这样结束一次工具调用，@xsai/stream-text 0.5.1 会把参数拼坏）；读记忆的工具一次最多读 4 条（工具说明里写明；给了更多 id 时读前 4 条，不拒绝，免得再多一次调用），免得一次把索引里的记忆全读出来。

在安装 Stage 和桌面的 npm 依赖之后，可运行本地 Electron 验收。脚本使用独立用户目录、本地流式模型测试服务和模拟弹幕。macOS 上可用 `STAGE_TEST_VOICES=1` 将测试音频换成系统语音。

```sh
npm --prefix desktop run test:airi-stage
```

脚本会先构建桌面外壳，再把 Stage 的开发版构建到 `stage/dist-dev`。

macOS 上可从顶栏走一遍 Airicraft 桌面流程。

```sh
npm --prefix desktop run test:airi-native-games
```

可选参数 `STAGE_TEST_MINECRAFT_BRIDGE`、`STAGE_TEST_VISION_API` 和 `STAGE_TEST_TWITCH` 分别接入独立测试存档、本地视觉模型和真实公开弹幕。脚本使用固定的工具调用和转录结果，便于单独验证真实游戏与画面生成链路。重复用同一存档测试时，可用 `STAGE_TEST_MINECRAFT_LOGS` 把采集目标设在已有库存以上。
