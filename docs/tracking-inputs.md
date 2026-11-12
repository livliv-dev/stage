# 追踪输入

摄像头、回放、手柄与网络输入都通过 Player 的标准参数驱动角色。角色的校准、反向、曲线、平滑和预设在切镜头时保留；道具、输出与录制跟随最终姿势。

## 从界面连接

- 摄像头：选「我来演 → 摄像头」，选择设备并校准正面。人工出镜无需模型密钥。
- 手柄：在「动作与更多设置」选择「手柄」，操作一次手柄后选择设备。默认左摇杆转头、右摇杆左右歪头；可改轴、死区、灵敏度、反向以及按钮动作/表情。偏离中心时点「校准正面」。校准中心在调整灵敏度、死区或映射后保留。
- OSC/VMC：桌面角色选择「手机 / OSC」，输入来源选 OSC/VMC，点「开始接收」。默认仅本机 UDP 39539；发送端填界面显示的地址和端口。同一网络设备需改「本机与局域网」，可限制来源 IP。
- iFacialMocap：手机和电脑连同一网络，手机 App 保持打开；来源选 iFacialMocap，填写手机局域网 IPv4，再点「连接手机」。Stage 发起官方 UDP 启动消息，使用 49983 端口接收。可在角色面板校准。

接收器也可从「设置 → 通用」启停。它是桌面的单一接收入口，角色各自选择是否使用这份输入。默认不监听；启用状态和连接设置保存在本机，不随项目导出。停止后释放端口，端口占用或权限问题在操作旁显示，可修改后重试。

## 当前协议范围

| 输入 | 已支持 | 范围 |
| --- | --- | --- |
| VMC | OSC 消息及嵌套 bundle；Blend/Val、Bone/Pos、Root/Pos、OK | 常见表情名称/ARKit 系数映射到标准眼睛、眉、嘴；头/颈及躯干旋转映射到角色头部/身体。初始骨骼姿态作为参考，支持原始局部旋转链 |
| iFacialMocap | 官方 v1/v2 文本帧、头部 Euler 角度及常用表情系数 | 先归一化再应用角色校准；不传输手机摄像头画面 |
| 自定义 OSC | `/livliv/face/<参数名>`，类型 `f`；或 `/livliv/param`，类型 `sf` | 角度单位为度；其他范围见下表 |
| Gamepad | 浏览器 axes/buttons、设备选择、断开后回中 | 仅混合绑定且设备实际提供的轴，不覆盖未绑定的眨眼或口型 |

| 标准参数 | 范围 |
| --- | --- |
| angleX / angleY / angleZ / bodyX / bodyZ | 输入保留 ±180 度，校准、角度环绕后限制到 Player 的对应范围 |
| eyeLOpen / eyeROpen / mouthOpen / smile | 0–1 |
| eyeBallX / eyeBallY / browLY / browRY / vowel | −1–1 |

VMC 只提取当前角色能够表示的旋转和表情，不提供全身骨骼重定向、手指、IK、位置追踪或完整 52 blendshape 播放。未知地址不会变成控制命令；网络输入不能加载模型、文件或 URL。无效包不替换上一份有效姿势。数据失联后驱动渐退，新的有效数据自动恢复。

来源使用本机/局域网 IPv4，不是公网追踪服务。浏览器不能直接接收 UDP，所以浏览器里只有摄像头、回放、手柄和共用的参数调整；没有手机网页配对或 WebRTC 桥接。桌面 UDP/协议解析位于原生层，标准参数和 Player 映射可在两端复用。

## 已验证与未验证

桌面检查实际运行 UDP 接收、解码、可信 IPC、Player、独立输出、校准/反向与 MP4 保存；包含端口占用恢复、失联、停止和四语布局。手机协议数据由本机模拟发送器提供，尚未使用实体 iPhone/手柄，也没有验证所有第三方 VMC 发送应用。macOS 包含四语摄像头、麦克风和本地网络权限用途说明；系统权限弹窗与跨平台实机仍需验收。

协议依据：[VMC 官方协议](https://protocol.vmc.info/english.html)、[OSC 1.0](https://opensoundcontrol.stanford.edu/spec-1_0.html)、[iFacialMocap 开发说明](https://www.ifacialmocap.com/for-developer/)、[Gamepad 规范](https://www.w3.org/TR/gamepad/)、[Apple 本地网络权限](https://developer.apple.com/documentation/technotes/tn3179-understanding-local-network-privacy)。这些是支持范围的依据，不代表已经测试过对应硬件或全部 App。
