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

`public/characters` 是随应用提供的示例角色，`public/mediapipe` 是本地面捕资源。生产构建写入 `dist`，由桌面外壳的 `livliv-stage://app` 提供。普通浏览器开发页可单独运行。

开发模式的 `window.__stage` 暴露舞台、角色、对话和录制状态，用于测量与浏览器工作流测试；生产构建不提供这个调试入口。
