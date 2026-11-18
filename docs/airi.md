# 用 AIRI 做对话，用 Stage 做角色

[Project AIRI](https://github.com/moeru-ai/airi)（MIT）负责对话。LivLiv Stage 负责角色、出声、口型和表情。Stage 不实现 AIRI 的模型或人设。

这项连接默认关闭。打开方式：桌面版 Stage → 设置 → 通用 → **AIRI 角色主持**。

核对过的 AIRI 版本是源码提交 `473112a3051fd599dba744b5257b890f5ea05b14`，包 `@proj-airi/server-sdk` / `@proj-airi/server-runtime` **0.15.4**（2026-11-18 仍是 `main` 的头）。Stage 没有把 SDK 打进应用，而是按这份源码里的握手来连接：

1. 有令牌时先 `module:authenticate`，等 `module:authenticated`。没有令牌时不发认证。真实 runtime 仍可能随后发来 `module:authenticated`；Stage 只宣布自己一次，不再因此重复 `extension:module:announce`。
2. 发送一次 `extension:module:announce`，等 `extension:module:announced`。`possibleEvents` 只列 Stage **发出**的事件：`input:text`、`context:update`、`spark:emit`。
3. 听 `output:gen-ai:chat:complete`，正文在 `data.message`。若事件另带 `outputText`、`rawText` 或 `raw`，并且里面还有 `<|ACT …|>`，Stage 会按标记安排表情和动作。当前 AIRI 会把标记从 `message.content` 里剥掉，所以没有这个字段时只按普通文本说。
4. 听 `spark:command`。能认出的表情、点头一类动作、暂停和继续会做到角色上，并用 `spark:emit` 回答。计划和提议不执行。
5. 需要时发送 `input:text`。这个事件在 AIRI 里是 `chat-ingestion` 消费者组。接收它的是 AIRI 自己的对话模块，所以 Stage **不会**把自己注册成这个消费者，否则会把输入从 AIRI 手里抢走。

同一个角色的会话绑定是 `livliv-stage:<角色 ID>`，整段对话复用这一条，AIRI 才能记住上下文。轮次放在 `livlivTurn`，不放进绑定；否则每一句都会被 AIRI 当成新会话。连接时和更换角色时，Stage 用 `context:update`（`replace-self`，lane 为 `livliv-stage:character`）送上名字、人设、已载入的表情和舞台动作。

长回复按 Stage 聊天已经使用的分句（`。！？!?` 和换行）拆开，先说第一句，并在这一句播放时准备下一句。英文句号不另作分句，以免和角色自己的聊天切得不一样。新的一句仍会打断正在说的整段，没轮到的句子不再说。

服务端地址默认 `ws://127.0.0.1:6121/ws`，只接受 `ws://` 或 `wss://`。令牌只在这条连接上发送。

## 在本机试一次

1. 按 AIRI 自己的说明启动 server-runtime，并让它的对话模块处于运行中（Stage 不代它跑模型）。在 AIRI 里关掉它自己的语音，并藏起它自己的模型，否则会和 Stage 上的角色同时出声、同时出现。
2. 打开 Stage 的外部控制 API（设置 → 通用 → 外部控制 API），如果还要用本机 HTTP 喂台词。AIRI 面板本身用的是上面的 WebSocket，不依赖这个 HTTP。
3. 在 AIRI 角色主持里填写地址，需要的话填写令牌，选择角色，点连接。
4. 在 AIRI 里说一句。Stage 收到完成回复后，用所选角色说出来。
5. 若要让 Stage 控制台的文字也进入 AIRI，打开「把控制台输入发给 AIRI」。这时 Stage 自己的模型不再回答这句。请先停止 Stage 里已经在进行的聊天，避免两个说话流程抢同一个角色。

AIRI 现在的完成回复不含 viseme，也不含还带着 `<|ACT …|>` 的原文。表情映射已经接好：一旦 `outputText`（或 `raw` / `rawText`）里有标记，角色会按它在句子中的位置换表情、做 nod / shake / tilt / hop / shy。没有标记时仍用 `neutral`。AIRI 自己的 TTS 和口型没有接到 Stage 上。

## 声音从哪来

| 情况 | 行为 |
| --- | --- |
| 台词带有内联音频 | Player 按这段音频做口型 |
| 只有文字 | 用角色已经配置的声音：系统语音、已保存的语音接口，或 LivLiv 声音 |

系统语音没有音频采样，口型是按音节估算的。已经配置的语音接口能返回音频时，口型跟音频。这里不新增 VOICEVOX，也不调用需要付费密钥的新服务。

外部程序也可以把一句台词 POST 到本机的 `/api/stage/speech`。格式、鉴权和「不能变成任意 URL 代理」写在 [stage-api.md](stage-api.md)。AIRI 完成回复走的是同一套播放所有者：同时只有一句，新的一句会打断，迟到的分片丢掉。

## 测试里的 AIRI

`stage/test/airi.test.ts` 使用一个标明为 mock 的本机 WebSocket。它只复述上面核对过的握手和 `output:gen-ai:chat:complete`，不是 AIRI 的 server-runtime，也没有模型。
