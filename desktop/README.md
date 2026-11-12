# LivLiv Stage 桌面版（Electron 外壳）

这个目录打包 LivLiv Stage 桌面应用：Stage 的网页构建在应用里由 `livliv-stage://app` 提供，另加全局热键、透明输出窗口、本机控制 API 和手机/OSC 输入。同一份外壳代码也能打包 livliv.ai 网站的桌面外壳（`electron-builder.yml`）；网站本身的代码不在这个仓库。

```sh
npm ci                  # 安装依赖并下载 Electron
npm test                # 指令语法、地址白名单、本机端点、热键、请求生命周期
npm run stage:dev       # 构建 ../stage 并以 Stage 方式启动
npm run stage:pack      # 本机的免安装包，写入 release-stage/，不签名
npm run stage:mac       # macOS DMG + ZIP
npm run stage:win       # Windows NSIS 安装包
```

`npm run test:stage`、`test:stage-api` 和 `test:stage-contexts`（在 Stage 的开发服务上放 20 个角色，看 WebGL 上下文够不够）启动真实的 Electron 窗口，需要先在 `stage/` 装好 Playwright；脚本目前使用 macOS 的 Electron 可执行文件路径。

网站外壳：`npm run dev` 连本机网页开发服务（`LIVLIV_URL`，默认 `http://127.0.0.1:5173`），`npm start` 连 https://livliv.ai，`npm run pack` 写入 `release/`。

开发时可用的参数（打包后忽略）：

- `--app=stage`：以 Stage 方式启动。
- `--api=<origin>`：LivLiv 接口地址，默认 https://livliv.ai。
- `--url=<origin>`：加载别的页面，比如 Stage 的 Vite 开发服务。
- `--stage-dir=<dir>`、`--user-data=<dir>`：换 Stage 的构建目录、使用独立的数据目录。
- `--probe=<file> [--probe-scenario] [--probe-throttle]`：记录窗口的出帧，用 `node scripts/probe_summary.mjs <file>` 汇总。
