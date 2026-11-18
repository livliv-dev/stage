# 桌面单角色使用 AIRI

准备一个本地「AI 来演」角色，在「AI 模型」选择支持流式输出的 OpenAI 兼容接口，勾选「内置 AIRI」并保存。直播面板也可以修改同一个开关。它适用于单角色持续聊天、AI 直播和公开游戏互动。

AIRI 使用当前角色的姓名、人设、口吻、关系和立场。Stage 负责弹幕、语音、字幕、口型、录制和输出。首个完整句段可边生成边播放。按住说话、发送新输入或点「下一句」会打断当前回应。下一轮会记得已经说完的内容。使用自配语音接口可保留声音到录制和输出。系统朗读在本机播放，也可以选择仅字幕。

## 游戏

在「AI 直播」选择一个游戏窗口。每轮回应和游戏动作决策会将所选窗口的一帧发给本次配置的模型。模型需要支持图片输入，Stage 需要系统屏幕录制权限。可以从直播面板关闭画面输入。

在「设置 → 游戏互动」连接支持 [Neuro SDK](../neuro/README.md) 的游戏，直播期间也可以连接同一角色。游戏上报的事件由 AIRI Spark 处理。游戏可以要求角色回应，也可以让 AIRI 判断要不要开口。支持工具调用的模型可以选择游戏注册的动作。游戏执行后把结果发回同一会话，角色在后续回应中可以引用它。Minecraft 和 Factorio 使用各自的上游连接器。

## 记忆

对角色说「记住……」可保存长期记忆，也可以在 Stage 的「记忆」面板编辑或删除。AIRI 使用同一角色档案下的记忆工具和记录。公开直播与游戏互动只读取公开记录。AIRI 私聊需要先停掉 Stage 的直播输出、录制和联播。

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
