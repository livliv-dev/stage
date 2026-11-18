# Stage 本机控制 API

在桌面「设置 → 通用 → 外部控制 API」启用。默认关闭，只监听 127.0.0.1。界面提供实际地址、令牌和可复制的查询/动作示例。

`GET /api/stage/state` 需 `Authorization: Bearer YOUR_TOKEN`，返回当前舞台、角色实例 ID、格式、显隐/静音、输入状态、表情/动作与 AI/语音输入状态；不返回人设、台词、模型文件或服务密钥。

`POST /api/stage/command` 使用 JSON，例如 `{"do":"act","id":"nod","character":"AVATAR_ID"}`。

| do | 其他字段 | 行为 |
| --- | --- | --- |
| expr | id，可选 character、weight 0–1、on、duration 0.5–30 | 设置表情；on:false 只关闭该表情 |
| act | id: nod/shake/tilt/hop/shy/away，可选 character | 动作或暂离 |
| clear | 可选 character | 恢复表情与暂离状态 |
| calibrate | 可选 character | 对有有效输入的摄像头、回放、手柄或网络追踪校准 |
| mute | 可选 character、on | 指定角色或全部角色静音；缺少 on 时切换 |
| mic | 可选 character | 切换麦克风口型与自动动作 |
| ai-pause | 可选 on | 暂停/继续；缺少 on 时切换 |
| ai-stop | — | 停止 AI 与相关语音输入 |
| ptt | — | 开始/结束语音输入；未接识别时返回409 |

未指定 character 时选择当前选中的可见角色，或可见的人工角色/第一个本机角色。实例 ID 从 state 获取；朋友的表情与动作由本人控制，本机可静音收到的声音。

200 表示已应用；202 带 pending，表示录音、识别或设备切换已接受，通过 state 查询结果。400 无效指令，403 鉴权/来源不允许，404 角色或表情不存在，409 当前状态不支持，503 编辑器未就绪或超时。

原 URL 形式 `/api/live/cmd?do=act:nod&m=AVATAR_ID` 仍可用，m 是 Stage 角色实例 ID。建议令牌放 Authorization 头。

输出窗口不能取得令牌或修改服务；关闭服务会终止未接收完的请求。支持查询和切换命名镜头。没有部署公网服务，也不兼容完整 VTS 插件协议。

## 命名镜头

状态包含当前 `scene.id` 和 `scenes: [{ id, name }]`。发送 `{ "do": "scene", "id": "SCENE_ID" }` 切换构图，返回实际镜头 ID；未知 ID 返回404。切换保留角色、摄像头和 AI 会话。显隐控制画面，设备与 AI 各自控制。

临时表情可在 expr 命令中增加 duration（0.5–30 秒），例如：

```json
{ "do": "expr", "id": "smile", "character": "avatar-id", "duration": 2 }
```

到时恢复默认表情；新的手动或 AI 表情会取代这次计时。duration 不与 on:false 同用。

角色查询中的 parameters 和 view 是 Player 最终绘制的标准参数与取景快照；未载入时为 null。
可用来观察手机/OSC/手柄输入及校准结果，不包含摄像头画面。
