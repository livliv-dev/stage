# 桌面 AIRI

在桌面顶栏打开「AIRI」，选择「游戏直播」或「私聊」。先准备一个本地「AI 来演」角色，再选择支持流式输出的 OpenAI 兼容模型。模型可以运行在本机，也可以通过云端 API 接入。选中的角色档案同时用于说话、回忆和决定游戏动作。可以在游戏直播面板连接 Twitch 公开弹幕。

AIRI 使用当前角色的姓名、人设、口吻、关系和立场。Stage 负责弹幕、语音、字幕、口型、录制和输出。首个完整句段可边生成边播放。按住说话、发送新输入或点「下一句」会打断当前回应。下一轮会记得已经说完的内容。使用自配语音接口可保留声音到录制和输出。系统朗读在本机播放，也可以选择仅字幕。

## 游戏

### Minecraft

启动 [Airicraft](https://github.com/proj-airi/airicraft) 的 Minecraft 1.21.8 Fabric 客户端并进入游戏世界。在「AIRI → 游戏直播」选「Minecraft / Fabric」。Stage 默认读取 Airicraft 生成的 `~/.airicraft/bridge-state.json`。使用不同游戏目录时，可以选择相应的连接文件。

打开「发送 Minecraft 画面给模型」后，Stage 直接从 Airicraft 获取游戏内截图。模型需要支持图片输入。要让角色收集资源或获取物品，使用直播面板的「游戏指令」，例如「背包至少有两块橡木原木」。该功能需要模型支持工具调用。Airicraft 负责规划和执行游戏内步骤，并通过任务回执更新 Stage 的直播会话。麦克风插话会打断说话。需要结束当前 Minecraft 任务时，点「停止游戏任务」。

让 Stage 决定何时执行游戏任务时，可以用 JVM 参数 `-Dairicraft.externalDriver=true` 启动 Airicraft，暂停游戏端自带的规划模型。Airicraft 允许在 Minecraft 服务器或已开放的局域网存档中执行动作。上游开发版会自动把单人存档开放到局域网。独立本机测试可以使用只监听回环地址的服务器。

如果 macOS 上的 Airicraft 截图卡在 Java 图形初始化，可在 Minecraft 启动器增加 JVM 参数 `-Djava.awt.headless=true` 后重启游戏。也可以保持 Fabric 连接，关闭原生截图，然后在 Stage 的窗口选择器采集 Minecraft 画面。

### Factorio

启动 [AIRI Factorio](https://github.com/moeru-ai/airi-factorio) 的 Autorio 模组、Factorio Wrapper 和 [RCON API](https://github.com/nekomeowww/factorio-rcon-api)。在「AIRI → 游戏直播」选择「Factorio / Autorio」，填同一存档的 Wrapper 日志端口和 RCON API 端口。可用通过回环地址访问的服务，默认端口为 8080 和 24180。

用专用存档，保证只有一个在线玩家。Stage 可以向 Autorio 提交走到目标、采集和合成任务，入队后的任务由游戏执行。游戏日志会进入公开会话。上游 Wrapper 在 ARM64 上依赖 Linux 的 Box64，可以在 Linux 游戏环境运行后将两个端口转发到本机。Factorio 的画面从 Stage 的窗口选择器接入。

### 其他游戏

在「游戏直播」选择「任选窗口或只聊天」。开启画面后，Stage 会把所选窗口的一帧发给当前模型，需要系统屏幕录制权限。支持 [Neuro SDK](../neuro/README.md) 的游戏仍可从「设置 → 游戏互动」连接，事件和动作回执也进入当前直播会话。

## 记忆

对角色说「记住……」可保存长期记忆，也可以在 Stage 的「记忆」面板编辑或删除。直播回复和游戏指令共用同一角色的公开记录。AIRI 私聊需要先停掉 Stage 的直播输出、录制和联播。

## 构建和桌面验证

`vendor/airi-core/core.mjs` 由 [Project AIRI 473112a](https://github.com/moeru-ai/airi/tree/473112a3051fd599dba744b5257b890f5ea05b14) 的对话运行时、流式模型适配、Spark、记忆工具和语音分段源码生成。正常的 Stage 构建会直接打包它。应用资源 `licenses/` 内附 AIRI 和第三方依赖许可。

从相应的 AIRI 源码更新模块和许可时，使用 Node.js 22 或 24 运行以下命令。

```sh
npm --prefix vendor/airi-core ci
npm --prefix vendor/airi-core run build -- /path/to/airi
```

在安装 Stage 和桌面的 npm 依赖之后，可运行本地 Electron 验收。脚本使用独立用户目录、本地流式模型测试服务和模拟弹幕。macOS 上可用 `STAGE_TEST_VOICES=1` 将测试音频换成系统语音。

```sh
npm --prefix desktop run build
(cd stage && NODE_ENV=development ./node_modules/.bin/vite build --outDir /tmp/stage-airi-test)
STAGE_TEST_RESOURCES=/tmp/stage-airi-test node desktop/test/airi-stage.mjs
```

macOS 上可从顶栏走一遍 Airicraft 桌面流程。

```sh
STAGE_TEST_RESOURCES=/tmp/stage-airi-test node desktop/test/airi-native-games.mjs
```

可选参数 `STAGE_TEST_MINECRAFT_BRIDGE`、`STAGE_TEST_VISION_API` 和 `STAGE_TEST_TWITCH` 分别接入独立测试存档、本地视觉模型和真实公开弹幕。脚本使用固定的工具调用和转录结果，便于单独验证真实游戏与画面生成链路。重复用同一存档测试时，可用 `STAGE_TEST_MINECRAFT_LOGS` 把采集目标设在已有库存以上。
