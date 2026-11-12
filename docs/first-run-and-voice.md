# 首次使用与声音

## 首次体验

空舞台提供 Nana（精修版）、Sena 与 Kai 的一键三人对谈演示「第一次同台」：15 句、约 52 秒，声音、动作与字幕都随应用提供。看演示不需要账户或 API Key，也不消耗模型用量。英文/日文界面会标明演示使用中文语音。旧的 8 句双人脚本仍可打开。

人工出镜和 AI 主播默认用 Nana 精修版；双人对谈默认 Sena/Kai；三人闲聊由 Nana 精修版居中主持。精选角色优先显示 Nana 精修版、Sena、Kai，其余角色仍可添加。角色栏里的上手引导直接通向角色设置、模型与声音和输出，不遮挡舞台。人设与风格默认折叠。

左右侧栏使用同一个收纳组件：左边「舞台内容」，右边按选中内容显示「角色设置」或「舞台设置」。收起时释放舞台空间，角色实例保留。

演示字幕标明姓名、整句呈现、按语义换行，并短暂保留上一句。声音提前准备一条，停顿按台本设置；演示不受 AI 对话的句数上限影响，结束后可从头重播，停止会取消正在准备的声音。

## 推荐的对话设置

1. 在「模型与声音」选择阿里云百炼，填写自己的 Key。新设置优先选择 qwen-flash，采用非思考模式，适合短句交互。
2. 没有单独设置语音时，同一份百炼 Key 自动接 qwen-audio-3.1-tts-flash。Nana、Sena、Kai 分别默认龙安灵希、龙安欢、龙安朗，可以按角色改音色与语速。默认角色换顺序或单人使用时音色不变；明确选择的角色或全局音色优先。
3. 百炼 Key 同时接 qwen-audio-3.0-asr-flash：按住底部麦克风说话、松开发送，不需要登录 livliv.ai。麦克风驱动角色和录进自己的声音也不需要帐号。
4. 连接了 livliv.ai 且角色有站内声音时，「自动」优先使用角色自己的声音（使用 livliv.ai 积分）。明确选「我的接口」时仍使用自己的语音接口。

其他文本模型也可以用：OpenAI、DeepSeek、Kimi、智谱、硅基流动、OpenRouter、本机的 Ollama，或任何 OpenAI 兼容的接口。切换服务商会清空另一家的密钥，进行中的模型列表请求会取消。演示模式不覆盖先前的 API 配置。声音文件下载不转发生成接口的 Authorization。

OpenAI 旧 Speech API 保留为需要明确选择的兼容配置。它的 gpt-4o-mini-tts 将于 2027-01-06 停用，接替模型的接口流程不同，所以不会从 OpenAI 文本 Key 自动启用。[OpenAI 说明](https://developers.openai.com/api/docs/guides/text-to-speech)

语音识别把静音返回为错误时，界面显示「没听清，请再说一次」；其他接口错误照常报告。

参考：[百炼语音选型](https://help.aliyun.com/zh/model-studio/tts-model)、[原生 HTTP 参数](https://help.aliyun.com/zh/model-studio/qwen-audio-tts-http-api)、[百炼音色列表](https://help.aliyun.com/zh/model-studio/qwen-audio-tts-voice-list)、[语音识别接口](https://help.aliyun.com/zh/model-studio/qwen-audio-3-0-asr-flash)。

## 动作细调

「动作细调与预设」独立于输入来源。待机、鼠标、摄像头、回放、麦克风、手柄、网络追踪和 AI 语音在最后合成角色参数时使用同一份映射。支持 Player 的 12 个标准通道，不是任意模型内部参数的编辑器。摄像头校准、帧率和手柄死区留在设备设置中，动作预设不改变它们。

Player 的最终姿势已包含映射，独立输出、朋友联播与录制通过 `renderPose` 回放，不重复映射。旧的 tracking 预设文件仍可读取。
