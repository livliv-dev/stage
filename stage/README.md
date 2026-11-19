# Stage 前端

运行、功能、格式限制和验证命令见 [仓库 README](../README.md)。

```sh
npm ci
npm run dev
npm run check
npm test
npm run test:browser
npm run build
```

`npm test` 是不开浏览器的单元测试（`test/*.test.ts`，含 `src/sessions/` 的会话小块、引擎选择和人设）。`test:*` 是浏览器测试，CI 分组运行。`test:traces` 把每种开始方式的实际行为（说了什么、读写了哪些记忆、调用了几次模型和配音、怎么结束）和 `test/traces/` 对照，`test:prompts` 把人设提示词和 `test/prompts/` 逐字对照；改动会话逻辑后两者都要通过，确实要改时用 `-- --update` 重录并检查差异。

`public/characters` 是随应用提供的示例角色，`public/mediapipe` 是本地面捕资源。生产构建写入 `dist`，由桌面外壳的 `livliv-stage://app` 提供。普通浏览器开发页可单独运行。

开发模式的 `window.__stage` 暴露舞台、角色、对话和录制状态，用于测量与浏览器工作流测试；生产构建不提供这个调试入口。
