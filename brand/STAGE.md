# VTuber Stage 标志

名字用 LivLiv 字标的圆头笔画画出，Stage 为蓝色；下面一行「by livliv」就是 LivLiv 字标本身。平时只用文字标志，
图标只在需要图标的地方用（App、浏览器标签页、程序坞和任务栏、安装包）。

- `vtuber-stage-wordmark.svg`：名字和 by livliv，用于 README、关于、链接预览；`media/` 和 `stage/public/wordmark-full.svg` 是它的副本。
- `vtuber-stage-name.svg`：只有名字一行，用于窄处（顶栏），即 `stage/public/wordmark.svg`。
- `vtuber-stage-symbol.svg`：图标，对应 `stage/public/symbol.svg`。和 Player 共用深色圆弧和圆点：Stage 的右眼是蓝色四角星，Player 的右眼是红色播放三角。
- `vtuber-stage-icon.svg`：白色圆角底的桌面图标，渲染为 `desktop/build/stage/icon.png`。
- `vtuber-stage-lockup.svg`（图标、名字和 by livliv）和 `vtuber-stage-compact.svg`（图标和名字一行）：备用，默认不用。
- 以上各有 `-white` 版，用于深色背景。`png/` 是 2000 px 宽的位图。
- `stage/public/favicon.svg`：浏览器图标，适配深色标签栏。

除图标外的 SVG 由 `make_logo.py` 生成（`python3 brand/make_logo.py`，只用标准库）。

这些标志不在代码许可的授权范围内，见 [TRADEMARKS.md](../TRADEMARKS.md)。
