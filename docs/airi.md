# 用 AIRI 做对话，用 Stage 做角色

[Project AIRI](https://github.com/moeru-ai/airi)（MIT）负责对话。LivLiv Stage 负责角色、出声、口型和表情。Stage 不实现 AIRI 的模型或人设。

这项连接默认关闭。打开方式：桌面版 Stage → 设置 → 通用 → **AIRI 角色主持**。

核对过的 AIRI 版本是源码提交 `473112a3051fd599dba744b5257b890f5ea05b14`，包 `@proj-airi/server-sdk` / `@proj-airi/server-runtime` **0.15.4**（2026-11-18 仍是 `main` 的头）。Stage 没有把 SDK 打进应用，而是按这份源码里的握手来连接：

1. 可选 `module:authenticate`，等 `module:authenticated`。
2. 发送 `extension:module:announce`，等 `extension:module:announced`。
3. 听 `output:gen-ai:chat:complete`，正文在 `data.message`。
4. 需要时发送 `input:text`。这个事件在 AIRI 里是 `chat-ingestion` 消费者组。接收它的是 AIRI 自己的对话模块，所以 Stage **不会**把自己注册成这个消费者，否则会把输入从 AIRI 手里抢走。

服务端地址默认 `ws://127.0.0.1:6121/ws`，只接受 `ws://` 或 `wss://`。令牌只在这条连接上发送。

## 在本机试一次

1. 按 AIRI 自己的说明启动 server-runtime，并让它的对话模块处于运行中（Stage 不代它跑模型）。
2. 打开 Stage 的外部控制 API（设置 → 通用 → 外部控制 API），如果还要用本机 HTTP 喂台词。AIRI 面板本身用的是上面的 WebSocket，不依赖这个 HTTP。
3. 在 AIRI 角色主持里填写地址，需要的话填写令牌，选择角色，点连接。
4. 在 AIRI 里说一句。Stage 收到完成回复后，用所选角色说出来。
5. 若要让 Stage 控制台的文字也进入 AIRI，打开「把控制台输入发给 AIRI」。这时 Stage 自己的模型不再回答这句。请先停止 Stage 里已经在进行的聊天，避免两个说话流程抢同一个角色。

完成回复里没有单独的情绪或 viseme。表情只用台词接口上的 `emotion`；AIRI 这条文本路径使用 `neutral`，角色已有的对应表情才会动。AIRI 源码里的原生 TTS、viseme 和远程打断没有接到 Stage 上，因为这次核对没有确认一条可以交给角色播放的音频协议。

## 声音从哪来

| 情况 | 行为 |
| --- | --- |
| 台词带有内联音频 | Player 按这段音频做口型 |
| 只有文字 | 用角色已经配置的声音：系统语音、已保存的语音接口，或 LivLiv 声音 |

系统语音没有音频采样，口型是按音节估算的。已经配置的语音接口能返回音频时，口型跟音频。这里不新增 VOICEVOX，也不调用需要付费密钥的新服务。

外部程序也可以把一句台词 POST 到本机的 `/api/stage/speech`。格式、鉴权和「不能变成任意 URL 代理」写在 [stage-api.md](stage-api.md)。AIRI 完成回复走的是同一套播放所有者：同时只有一句，新的一句会打断，迟到的分片丢掉。

## 测试里的 AIRI

`stage/test/airi.test.ts` 使用一个标明为 mock 的本机 WebSocket。它只复述上面核对过的握手和 `output:gen-ai:chat:complete`，不是 AIRI 的 server-runtime，也没有模型。
