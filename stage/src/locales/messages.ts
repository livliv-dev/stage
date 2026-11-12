// UI messages. Values such as model names and user dialogue are not translated.
export const messages: Record<string, Record<'zh-Hans' | 'zh-Hant' | 'en' | 'ja', string>> = {
  "已换成「{0}」，⌘Z 可以换回来": {
    "zh-Hans": "已换成「{0}」，⌘Z 可以换回来",
    "zh-Hant": "已換成「{0}」，⌘Z 可以換回來",
    "en": "Switched to “{0}”. Press ⌘Z to undo.",
    "ja": "「{0}」に切り替えました。⌘Zで元に戻せます。"
  },
  "{0} 个从文件导入的角色只存了名字：换一台电脑打开，要在那边再导入一次": {
    "zh-Hans": "{0} 个从文件导入的角色只存了名字：换一台电脑打开，要在那边再导入一次",
    "zh-Hant": "{0} 個從檔案導入的角色只存了名字：換一台電腦打開，要在那邊再導入一次",
    "en": "{0} imported avatars need their model files again on another computer.",
    "ja": "別のパソコンでは、読み込んだ{0}体のモデルを再度インポートしてください。"
  },
  "有 {0} 个从文件导入的角色这台电脑上没有，要重新导入": {
    "zh-Hans": "有 {0} 个从文件导入的角色这台电脑上没有，要重新导入",
    "zh-Hant": "有 {0} 個從檔案導入的角色這台電腦上沒有，要重新導入",
    "en": "{0} imported avatars are missing on this computer. Import their files again.",
    "ja": "このパソコンに{0}体のモデルがありません。再度インポートしてください。"
  },
  "舞台名字": {
    "zh-Hans": "舞台名字",
    "zh-Hant": "舞台名字",
    "en": "Scene name",
    "ja": "シーン名"
  },
  "编辑": {
    "zh-Hans": "编辑",
    "zh-Hant": "編輯",
    "en": "Edit",
    "ja": "編集"
  },
  "只留画面（Esc 回来）": {
    "zh-Hans": "只留画面（Esc 回来）",
    "zh-Hant": "只留畫面（Esc 回來）",
    "en": "Show only the stage (Esc to return)",
    "ja": "舞台のみ表示（Escで戻る）"
  },
  "预览": {
    "zh-Hans": "预览",
    "zh-Hant": "預覽",
    "en": "Preview",
    "ja": "プレビュー"
  },
  "撤销（⌘Z）": {
    "zh-Hans": "撤销（⌘Z）",
    "zh-Hant": "撤銷（⌘Z）",
    "en": "Undo (⌘Z)",
    "ja": "元に戻す（⌘Z）"
  },
  "重做（⇧⌘Z）": {
    "zh-Hans": "重做（⇧⌘Z）",
    "zh-Hant": "重做（⇧⌘Z）",
    "en": "Redo (⇧⌘Z)",
    "ja": "やり直す（⇧⌘Z）"
  },
  "模板": {
    "zh-Hans": "模板",
    "zh-Hant": "模板",
    "en": "Templates",
    "ja": "テンプレート"
  },
  "联播": {
    "zh-Hans": "联播",
    "zh-Hant": "聯播",
    "en": "Collab",
    "ja": "コラボ"
  },
  "输出到 OBS": {
    "zh-Hans": "输出到 OBS",
    "zh-Hant": "輸出到 OBS",
    "en": "OBS output",
    "ja": "OBS出力"
  },
  "打开场景文件": {
    "zh-Hans": "打开场景文件",
    "zh-Hant": "打開場景檔案",
    "en": "Open scene",
    "ja": "シーンを開く"
  },
  "存成场景文件": {
    "zh-Hans": "存成场景文件",
    "zh-Hant": "存成場景檔案",
    "en": "Save scene",
    "ja": "シーンを保存"
  },
  "设置：AI 用什么想台词、LivLiv 账号": {
    "zh-Hans": "设置：AI 用什么想台词、LivLiv 账号",
    "zh-Hant": "設置：AI 用什麼想台詞、LivLiv 賬號",
    "en": "Settings: models, voices and livliv.ai account",
    "ja": "設定：モデル・音声・livliv.aiアカウント"
  },
  "快捷键（?）": {
    "zh-Hans": "快捷键（?）",
    "zh-Hant": "快捷鍵（?）",
    "en": "Keyboard shortcuts (?)",
    "ja": "ショートカット（?）"
  },
  "双击改文字": {
    "zh-Hans": "双击改文字",
    "zh-Hant": "雙擊改文字",
    "en": "Double-click to edit",
    "ja": "ダブルクリックで編集"
  },
  "角色": {
    "zh-Hans": "角色",
    "zh-Hant": "角色",
    "en": "Avatar",
    "ja": "キャラ"
  },
  "字幕": {
    "zh-Hans": "字幕",
    "zh-Hant": "字幕",
    "en": "Captions",
    "ja": "字幕"
  },
  "文字": {
    "zh-Hans": "文字",
    "zh-Hant": "文字",
    "en": "Text",
    "ja": "テキスト"
  },
  "图片": {
    "zh-Hans": "图片",
    "zh-Hant": "圖片",
    "en": "Image",
    "ja": "画像"
  },
  "添加": {
    "zh-Hans": "添加",
    "zh-Hant": "新增",
    "en": "Add",
    "ja": "追加"
  },
  "展开添加工具": {
    "zh-Hans": "展开添加工具",
    "zh-Hant": "展開新增工具",
    "en": "Expand add tools",
    "ja": "追加ツールを開く"
  },
  "展开角色栏": {
    "zh-Hans": "展开角色栏",
    "zh-Hant": "展開角色欄",
    "en": "Expand cast",
    "ja": "キャストを開く"
  },
  "收起添加工具": {
    "zh-Hans": "收起添加工具",
    "zh-Hant": "收起新增工具",
    "en": "Collapse add tools",
    "ja": "追加ツールを閉じる"
  },
  "收起角色栏": {
    "zh-Hans": "收起角色栏",
    "zh-Hant": "收起角色欄",
    "en": "Collapse cast",
    "ja": "キャストを閉じる"
  },
  "放一个角色": {
    "zh-Hans": "放一个角色",
    "zh-Hant": "放一個角色",
    "en": "Add a avatar",
    "ja": "キャラクターを追加"
  },
  "关闭": {
    "zh-Hans": "关闭",
    "zh-Hant": "關閉",
    "en": "Close",
    "ja": "閉じる"
  },
  "导入": {
    "zh-Hans": "导入",
    "zh-Hant": "導入",
    "en": "Import",
    "ja": "インポート"
  },
  "LivLiv 模型包（文件夹）": {
    "zh-Hans": "LivLiv 模型包（文件夹）",
    "zh-Hant": "LivLiv 模型包（檔案夾）",
    "en": "LivLiv model folder",
    "ja": "LivLivモデルフォルダー"
  },
  "模型文件夹": {
    "zh-Hans": "模型文件夹",
    "zh-Hant": "模型檔案夾",
    "en": "Model folder",
    "ja": "モデルフォルダー"
  },
  "LivLiv 模型包（.livliv 或 zip），或 VRM（VRoid 等）": {
    "zh-Hans": "LivLiv 模型包（.livliv 或 zip），或 VRM（VRoid 等）",
    "zh-Hant": "LivLiv 模型包（.livliv 或 zip），或 VRM（VRoid 等）",
    "en": "LivLiv package (.livliv or ZIP), or VRM",
    "ja": "LivLivモデル（.livliv・ZIP）またはVRM"
  },
  "PNG 立绘": {
    "zh-Hans": "PNG 立绘",
    "zh-Hant": "PNG 立繪",
    "en": "PNG avatar",
    "ja": "PNGアバター"
  },
  "精选角色": {
    "zh-Hans": "精选角色",
    "zh-Hant": "精選角色",
    "en": "Featured avatars",
    "ja": "サンプルキャラクター"
  },
  "本机导入过的": {
    "zh-Hans": "本机导入过的",
    "zh-Hant": "本機導入過的",
    "en": "Imported on this device",
    "ja": "この端末のモデル"
  },
  "立绘": {
    "zh-Hans": "立绘",
    "zh-Hant": "立繪",
    "en": "PNG avatar",
    "ja": "PNGアバター"
  },
  "从这台电脑上删掉（用到它的角色会显示要重新导入）": {
    "zh-Hans": "从这台电脑上删掉（用到它的角色会显示要重新导入）",
    "zh-Hant": "從這台電腦上刪掉（用到它的角色會顯示要重新導入）",
    "en": "Remove from this device; scenes using it will need the files again",
    "ja": "この端末から削除します。使用中のシーンでは再インポートが必要です。"
  },
  "按 ID 添加": {
    "zh-Hans": "按 ID 添加",
    "zh-Hant": "按 ID 新增",
    "en": "Add from livliv.ai",
    "ja": "livliv.aiから追加"
  },
  "账号登录还没开放": {
    "zh-Hans": "账号登录还没开放",
    "zh-Hant": "賬號登錄還沒開放",
    "en": "Account sign-in is not available yet",
    "ja": "アカウントのログインは準備中です"
  },
  "需要 LivLiv 账号 · 去登录": {
    "zh-Hans": "需要 LivLiv 账号 · 去登录",
    "zh-Hant": "需要 LivLiv 賬號 · 去登錄",
    "en": "Sign in to livliv.ai",
    "ja": "livliv.aiにログイン"
  },
  "角色 ID，网址里 /c/ 后面那段": {
    "zh-Hans": "角色 ID，网址里 /c/ 后面那段",
    "zh-Hant": "角色 ID，網址里 /c/ 後面那段",
    "en": "Avatar ID, after /c/ in its URL",
    "ja": "キャラクターID（URLの /c/ 以降）"
  },
  "放上来": {
    "zh-Hans": "放上来",
    "zh-Hant": "放上來",
    "en": "Add to stage",
    "ja": "舞台に追加"
  },
  "去掉{0}": {
    "zh-Hans": "去掉{0}",
    "zh-Hant": "去掉{0}",
    "en": "Remove {0}",
    "ja": "{0}を削除"
  },
  "名字": {
    "zh-Hans": "名字",
    "zh-Hant": "名字",
    "en": "Name",
    "ja": "名前"
  },
  "今天，谁来上场？": {
    "zh-Hans": "今天，谁来上场？",
    "zh-Hant": "今天，誰來上場？",
    "en": "Who’s on stage today?",
    "ja": "今日は、誰と配信する？"
  },
  "先选一种方式，之后可以继续添加角色。": {
    "zh-Hans": "先选一种方式，之后可以继续添加角色。",
    "zh-Hant": "先選一種方式，之後可以繼續新增角色。",
    "en": "Choose a starting point. Add more avatars anytime.",
    "ja": "使い方を選んで始めましょう。キャラクターは後から追加できます。"
  },
  "自己放角色": {
    "zh-Hans": "自己放角色",
    "zh-Hant": "自己放角色",
    "en": "Add your own avatar",
    "ja": "自分のキャラクターを追加"
  },
  "角色列表": {
    "zh-Hans": "角色列表",
    "zh-Hant": "角色列表",
    "en": "Cast",
    "ja": "キャスト"
  },
  "添加角色后，在这里选择。": {
    "zh-Hans": "添加角色后，在这里选择。",
    "zh-Hant": "新增角色後，在這裡選擇。",
    "en": "Add a avatar to select it here.",
    "ja": "追加したキャラクターをここで選べます。"
  },
  "已隐藏": {
    "zh-Hans": "已隐藏",
    "zh-Hant": "已隱藏",
    "en": "Hidden",
    "ja": "非表示"
  },
  "朋友 · ": {
    "zh-Hans": "朋友 · ",
    "zh-Hant": "朋友 · ",
    "en": "Friend · ",
    "ja": "フレンド · "
  },
  "正在说话": {
    "zh-Hans": "正在说话",
    "zh-Hant": "正在說話",
    "en": "Speaking",
    "ja": "発話中"
  },
  "正在思考": {
    "zh-Hans": "正在思考",
    "zh-Hant": "正在思考",
    "en": "Thinking",
    "ja": "考え中"
  },
  "轮到你": {
    "zh-Hans": "轮到你",
    "zh-Hant": "輪到你",
    "en": "Your turn",
    "ja": "あなたの番"
  },
  "我来演": {
    "zh-Hans": "我来演",
    "zh-Hant": "我來演",
    "en": "You",
    "ja": "自分"
  },
  "只展示": {
    "zh-Hans": "只展示",
    "zh-Hant": "只展示",
    "en": "Display",
    "ja": "表示のみ"
  },
  "取消静音": {
    "zh-Hans": "取消静音",
    "zh-Hant": "取消靜音",
    "en": "Unmute",
    "ja": "ミュート解除"
  },
  "静音": {
    "zh-Hans": "静音",
    "zh-Hant": "靜音",
    "en": "Mute",
    "ja": "ミュート"
  },
  "静音角色声音": {
    "zh-Hans": "静音角色声音",
    "zh-Hant": "靜音角色聲音",
    "en": "Mute avatar voice",
    "ja": "キャラクター音声をミュート"
  },
  " 接着说": {
    "zh-Hans": " 接着说",
    "zh-Hant": " 接著說",
    "en": " speak next",
    "ja": "に次の発言を任せる"
  },
  "打开麦克风…": {
    "zh-Hans": "打开麦克风…",
    "zh-Hant": "打開麥克風…",
    "en": "Opening microphone…",
    "ja": "マイクを接続中…"
  },
  "正在听，再按一次热键结束": {
    "zh-Hans": "正在听，再按一次热键结束",
    "zh-Hant": "正在聽，再按一次熱鍵結束",
    "en": "Listening; press the shortcut again to finish",
    "ja": "録音中です。もう一度ショートカットを押すと送信します"
  },
  "正在听，松开就说出去": {
    "zh-Hans": "正在听，松开就说出去",
    "zh-Hant": "正在聽，松開就說出去",
    "en": "Listening; release to send",
    "ja": "録音中です。離すと送信します"
  },
  "正在识别…": {
    "zh-Hans": "正在识别…",
    "zh-Hant": "正在識別…",
    "en": "Transcribing…",
    "ja": "文字起こし中…"
  },
  "轮到你了：以 {0} 说…": {
    "zh-Hans": "轮到你了：以 {0} 说…",
    "zh-Hant": "輪到你了：以 {0} 說…",
    "en": "Your turn: speak as {0}…",
    "ja": "あなたの番です：{0}として話す…"
  },
  "以 {0} 说一句…": {
    "zh-Hans": "以 {0} 说一句…",
    "zh-Hant": "以 {0} 說一句…",
    "en": "Say something as {0}…",
    "ja": "{0}として話す…"
  },
  "以旁白说一句…": {
    "zh-Hans": "以旁白说一句…",
    "zh-Hant": "以旁白說一句…",
    "en": "Add a narrator line…",
    "ja": "ナレーションを入力…"
  },
  "话题，比如：周末去哪儿玩": {
    "zh-Hans": "话题，比如：周末去哪儿玩",
    "zh-Hant": "話題，比如：週末去哪兒玩",
    "en": "A topic, e.g. weekend plans",
    "ja": "話題（例：週末の予定）"
  },
  "话题": {
    "zh-Hans": "话题",
    "zh-Hant": "話題",
    "en": "Topic",
    "ja": "話題"
  },
  "AI 直播": {
    "zh-Hans": "AI 直播",
    "zh-Hant": "AI 直播",
    "en": "AI live",
    "ja": "AI配信"
  },
  "对谈": {
    "zh-Hans": "对谈",
    "zh-Hant": "對談",
    "en": "Chat",
    "ja": "対話"
  },
  "暂停": {
    "zh-Hans": "暂停",
    "zh-Hant": "暫停",
    "en": "Pause",
    "ja": "一時停止"
  },
  "继续": {
    "zh-Hans": "继续",
    "zh-Hant": "繼續",
    "en": "Resume",
    "ja": "再開"
  },
  "下一句：跳过等待，或者让正在说的停下": {
    "zh-Hans": "下一句：跳过等待，或者让正在说的停下",
    "zh-Hant": "下一句：跳過等待，或者讓正在說的停下",
    "en": "Next line: skip the wait or interrupt the current speaker",
    "ja": "次の発言：待ち時間を省略するか、現在の発言を中断します"
  },
  "停止": {
    "zh-Hans": "停止",
    "zh-Hant": "停止",
    "en": "Stop",
    "ja": "停止"
  },
  "已暂停": {
    "zh-Hans": "已暂停",
    "zh-Hant": "已暫停",
    "en": "Paused",
    "ja": "一時停止中"
  },
  "等待弹幕": {
    "zh-Hans": "等待弹幕",
    "zh-Hant": "等待彈幕",
    "en": "Waiting for chat",
    "ja": "コメント待ち"
  },
  "回应中": {
    "zh-Hans": "回应中",
    "zh-Hant": "回應中",
    "en": "Responding",
    "ja": "応答中"
  },
  "会话已结束": {
    "zh-Hans": "会话已结束",
    "zh-Hant": "會話已結束",
    "en": "Session ended",
    "ja": "セッション終了"
  },
  "对话设置：谁先说、抢话、语言、节奏、弹幕": {
    "zh-Hans": "对话设置：谁先说、抢话、语言、节奏、弹幕",
    "zh-Hant": "對話設置：誰先說、搶話、語言、節奏、彈幕",
    "en": "Chat settings: order, interruptions, language and pacing",
    "ja": "対話設定：順番・割り込み・言語・テンポ"
  },
  "对话记录": {
    "zh-Hans": "对话记录",
    "zh-Hant": "對話記錄",
    "en": "Transcript",
    "ja": "対話ログ"
  },
  "以谁的身份说": {
    "zh-Hans": "以谁的身份说",
    "zh-Hant": "以誰的身份說",
    "en": "Speak as",
    "ja": "話すキャラクター"
  },
  "旁白": {
    "zh-Hans": "旁白",
    "zh-Hant": "旁白",
    "en": "Narrator",
    "ja": "ナレーター"
  },
  "你说的话": {
    "zh-Hans": "你说的话",
    "zh-Hant": "你說的話",
    "en": "Your message",
    "ja": "メッセージ"
  },
  "正在识别，Esc 取消": {
    "zh-Hans": "正在识别，Esc 取消",
    "zh-Hant": "正在識別，Esc 取消",
    "en": "Transcribing; Esc to cancel",
    "ja": "文字起こし中（Escでキャンセル）"
  },
  "按住说话，松开说出去（也可以按住 ` 键）": {
    "zh-Hans": "按住说话，松开说出去（也可以按住 ` 键）",
    "zh-Hant": "按住說話，松開說出去（也可以按住 ` 鍵）",
    "en": "Hold to speak, release to send (or hold `)",
    "ja": "押して話し、離すと送信（`キーでも操作できます）"
  },
  "按住说话：在设置里接上语音识别后可用": {
    "zh-Hans": "按住说话：在设置里接上语音识别后可用",
    "zh-Hant": "按住說話：在設置里接上語音識別後可用",
    "en": "Set up speech recognition in Settings to use voice input",
    "ja": "設定で音声認識を接続すると利用できます"
  },
  "按住说话": {
    "zh-Hans": "按住说话",
    "zh-Hant": "按住說話",
    "en": "Push to talk",
    "ja": "押して話す"
  },
  "这次不说，跳过": {
    "zh-Hans": "这次不说，跳过",
    "zh-Hant": "這次不說，跳過",
    "en": "Skip your turn",
    "ja": "自分の番をスキップ"
  },
  "说": {
    "zh-Hans": "说",
    "zh-Hant": "說",
    "en": "Send",
    "ja": "送信"
  },
  "正在连接摄像头…": {
    "zh-Hans": "正在连接摄像头…",
    "zh-Hant": "正在連接攝影機…",
    "en": "Connecting camera…",
    "ja": "カメラを接続中…"
  },
  "面捕已连接": {
    "zh-Hans": "面捕已连接",
    "zh-Hant": "面捕已連接",
    "en": "Face tracking connected",
    "ja": "フェイストラッキング接続済み"
  },
  "未识别到面部": {
    "zh-Hans": "未识别到面部",
    "zh-Hant": "未識別到面部",
    "en": "No face detected",
    "ja": "顔が見つかりません"
  },
  "画面实时更新": {
    "zh-Hans": "画面实时更新",
    "zh-Hant": "畫面實時更新",
    "en": "Stage is live",
    "ja": "舞台を更新中"
  },
  "正在听…": {
    "zh-Hans": "正在听…",
    "zh-Hant": "正在聽…",
    "en": "Listening…",
    "ja": "録音中…"
  },
  "正在打开麦克风…": {
    "zh-Hans": "正在打开麦克风…",
    "zh-Hant": "正在打開麥克風…",
    "en": "Opening microphone…",
    "ja": "マイクを接続中…"
  },
  "结束语音输入": {
    "zh-Hans": "结束语音输入",
    "zh-Hant": "結束語音輸入",
    "en": "Finish voice input",
    "ja": "音声入力を終了"
  },
  "取消": {
    "zh-Hans": "取消",
    "zh-Hant": "取消",
    "en": "Cancel",
    "ja": "キャンセル"
  },
  "校准正面": {
    "zh-Hans": "校准正面",
    "zh-Hant": "校准正面",
    "en": "Calibrate neutral pose",
    "ja": "正面の姿勢を調整"
  },
  "还没有人说话": {
    "zh-Hans": "还没有人说话",
    "zh-Hant": "還沒有人說話",
    "en": "No one has spoken yet",
    "ja": "まだ発言がありません"
  },
  "从这里重来：删掉这句和后面的": {
    "zh-Hans": "从这里重来：删掉这句和后面的",
    "zh-Hant": "從這裡重來：刪掉這句和後面的",
    "en": "Restart here: remove this line and everything after it",
    "ja": "ここからやり直す：この発言以降を削除します"
  },
  "只删这一句（AI 不会再记得）": {
    "zh-Hans": "只删这一句（AI 不会再记得）",
    "zh-Hant": "只刪這一句（AI 不會再記得）",
    "en": "Remove this line from the conversation",
    "ja": "この発言を対話から削除"
  },
  "最后一句重说": {
    "zh-Hans": "最后一句重说",
    "zh-Hant": "最後一句重說",
    "en": "Redo the last line",
    "ja": "最後の発言をやり直す"
  },
  "清空": {
    "zh-Hans": "清空",
    "zh-Hant": "清空",
    "en": "Clear",
    "ja": "消去"
  },
  "开始对谈": {
    "zh-Hans": "开始对谈",
    "zh-Hant": "開始對談",
    "en": "Start chat",
    "ja": "対話を開始"
  },
  "停止录制，做成视频": {
    "zh-Hans": "停止录制，做成视频",
    "zh-Hant": "停止錄制，做成影片",
    "en": "Stop recording and export video",
    "ja": "録画を停止して動画を書き出す"
  },
  "停止录制": {
    "zh-Hans": "停止录制",
    "zh-Hant": "停止錄制",
    "en": "Stop recording",
    "ja": "録画を停止"
  },
  "回到编辑": {
    "zh-Hans": "回到编辑",
    "zh-Hant": "回到編輯",
    "en": "Back to editing",
    "ja": "編集に戻る"
  },
  "空格": {
    "zh-Hans": "空格",
    "zh-Hant": "空格",
    "en": "Space",
    "ja": "スペース"
  },
  "开始 / 暂停": {
    "zh-Hans": "开始 / 暂停",
    "zh-Hant": "開始 / 暫停",
    "en": "Start / pause",
    "ja": "開始 / 一時停止"
  },
  "撤销 / 重做": {
    "zh-Hans": "撤销 / 重做",
    "zh-Hant": "撤銷 / 重做",
    "en": "Undo / redo",
    "ja": "元に戻す / やり直す"
  },
  "复制选中的": {
    "zh-Hans": "复制选中的",
    "zh-Hant": "複製選中的",
    "en": "Duplicate selection",
    "ja": "選択項目を複製"
  },
  "删除选中的": {
    "zh-Hans": "删除选中的",
    "zh-Hant": "刪除選中的",
    "en": "Delete selection",
    "ja": "選択項目を削除"
  },
  "方向键": {
    "zh-Hans": "方向键",
    "zh-Hant": "方向鍵",
    "en": "Arrow keys",
    "ja": "矢印キー"
  },
  "移动 1 像素（按住 ⇧ 移动 10）": {
    "zh-Hans": "移动 1 像素（按住 ⇧ 移动 10）",
    "zh-Hant": "移動 1 像素（按住 ⇧ 移動 10）",
    "en": "Move 1 px (hold ⇧ for 10 px)",
    "ja": "1px移動（⇧を押すと10px）"
  },
  "拖动时按住 Alt": {
    "zh-Hans": "拖动时按住 Alt",
    "zh-Hant": "拖動時按住 Alt",
    "en": "Hold Alt while dragging",
    "ja": "Altを押しながらドラッグ"
  },
  "不吸附": {
    "zh-Hans": "不吸附",
    "zh-Hant": "不吸附",
    "en": "Disable snapping",
    "ja": "スナップを無効化"
  },
  "适应窗口 / 100%": {
    "zh-Hans": "适应窗口 / 100%",
    "zh-Hant": "適應視窗 / 100%",
    "en": "Fit / 100%",
    "ja": "画面に合わせる / 100%"
  },
  "收起 / 展开右边的面板": {
    "zh-Hans": "收起 / 展开右边的面板",
    "zh-Hant": "收起 / 展開右邊的面板",
    "en": "Collapse / expand the right panel",
    "ja": "右パネルを閉じる / 開く"
  },
  "按住 `": {
    "zh-Hans": "按住 `",
    "zh-Hant": "按住 `",
    "en": "Hold `",
    "ja": "`キーを長押し"
  },
  "按住说话，松开说出去": {
    "zh-Hans": "按住说话，松开说出去",
    "zh-Hant": "按住說話，松開說出去",
    "en": "Hold to speak, release to send",
    "ja": "押して話し、離すと送信"
  },
  "双击文字": {
    "zh-Hans": "双击文字",
    "zh-Hant": "雙擊文字",
    "en": "Double-click text",
    "ja": "テキストをダブルクリック"
  },
  "直接改字": {
    "zh-Hans": "直接改字",
    "zh-Hant": "直接改字",
    "en": "Edit text directly",
    "ja": "テキストを直接編集"
  },
  "右键": {
    "zh-Hans": "右键",
    "zh-Hant": "右鍵",
    "en": "Right-click",
    "ja": "右クリック"
  },
  "更多操作": {
    "zh-Hans": "更多操作",
    "zh-Hant": "更多操作",
    "en": "More actions",
    "ja": "その他の操作"
  },
  "取消选中 / 回到编辑": {
    "zh-Hans": "取消选中 / 回到编辑",
    "zh-Hant": "取消選中 / 回到編輯",
    "en": "Deselect / back to editing",
    "ja": "選択解除 / 編集に戻る"
  },
  "这张表": {
    "zh-Hans": "这张表",
    "zh-Hant": "這張表",
    "en": "This shortcut list",
    "ja": "このショートカット一覧"
  },
  "快捷键": {
    "zh-Hans": "快捷键",
    "zh-Hant": "快捷鍵",
    "en": "Shortcuts",
    "ja": "ショートカット"
  },
  "放角色": {
    "zh-Hans": "放角色",
    "zh-Hant": "放角色",
    "en": "Add a avatar",
    "ja": "キャラクターを追加"
  },
  "左边「角色」，或顶上「模板」": {
    "zh-Hans": "左边「角色」，或顶上「模板」",
    "zh-Hant": "左邊「角色」，或頂上「模板」",
    "en": "Use Avatar on the left or Templates above",
    "ja": "左の「キャラクター」か上の「テンプレート」から追加"
  },
  "接入模型": {
    "zh-Hans": "接入模型",
    "zh-Hant": "接入模型",
    "en": "Connect a model",
    "ja": "モデルを接続"
  },
  "底部「接入模型」，填你的 API 密钥": {
    "zh-Hans": "底部「接入模型」，填你的 API 密钥",
    "zh-Hant": "底部「接入模型」，填你的 API 金鑰",
    "en": "Use Connect a model below and enter your API key",
    "ja": "下の「モデルを接続」でAPIキーを入力"
  },
  "开始 AI": {
    "zh-Hans": "开始 AI",
    "zh-Hant": "開始 AI",
    "en": "Start AI",
    "ja": "AIを開始"
  },
  "写个话题，或在 AI 直播中等待观众": {
    "zh-Hans": "写个话题，或在 AI 直播中等待观众",
    "zh-Hant": "寫個話題，或在 AI 直播中等待觀眾",
    "en": "Choose a topic, or wait for viewers in AI live",
    "ja": "話題を入力するか、AI配信でコメントを待ちましょう"
  },
  "选择角色": {
    "zh-Hans": "选择角色",
    "zh-Hant": "選擇角色",
    "en": "Choose a avatar",
    "ja": "キャラクターを選択"
  },
  "面捕出镜，或导入自己的角色": {
    "zh-Hans": "面捕出镜，或导入自己的角色",
    "zh-Hant": "面捕出鏡，或導入自己的角色",
    "en": "Use face tracking or import your own avatar",
    "ja": "フェイストラッキングを使うか、自分のモデルをインポート"
  },
  "连接摄像头": {
    "zh-Hans": "连接摄像头",
    "zh-Hant": "連接攝影機",
    "en": "Connect a camera",
    "ja": "カメラを接続"
  },
  "选择角色，在右侧选择「我来演」": {
    "zh-Hans": "选择角色，在右侧选择「我来演」",
    "zh-Hant": "選擇角色，在右側選擇「我來演」",
    "en": "Select a avatar, then choose You control on the right",
    "ja": "キャラクターを選び、右側で「自分で操作」を選択"
  },
  "顶栏「输出到 OBS」，按提示添加采集源": {
    "zh-Hans": "顶栏「输出到 OBS」，按提示添加采集源",
    "zh-Hant": "頂欄「輸出到 OBS」，按提示新增採集源",
    "en": "Use OBS output above to set up capture",
    "ja": "上の「OBS出力」からキャプチャーを設定"
  },
  "都会了": {
    "zh-Hans": "都会了",
    "zh-Hant": "都會了",
    "en": "Got it",
    "ja": "完了"
  },
  "三步上手": {
    "zh-Hans": "三步上手",
    "zh-Hant": "三步上手",
    "en": "Get started",
    "ja": "3ステップで始める"
  },
  "复制": {
    "zh-Hans": "复制",
    "zh-Hant": "複製",
    "en": "Duplicate",
    "ja": "複製"
  },
  "往前一层": {
    "zh-Hans": "往前一层",
    "zh-Hant": "往前一層",
    "en": "Bring forward",
    "ja": "前面へ"
  },
  "往后一层": {
    "zh-Hans": "往后一层",
    "zh-Hant": "往後一層",
    "en": "Send backward",
    "ja": "背面へ"
  },
  "放到最前": {
    "zh-Hans": "放到最前",
    "zh-Hant": "放到最前",
    "en": "Bring to front",
    "ja": "最前面へ"
  },
  "放到最后": {
    "zh-Hans": "放到最后",
    "zh-Hant": "放到最後",
    "en": "Send to back",
    "ja": "最背面へ"
  },
  "隐藏": {
    "zh-Hans": "隐藏",
    "zh-Hant": "隱藏",
    "en": "Hide",
    "ja": "非表示"
  },
  "删除": {
    "zh-Hans": "删除",
    "zh-Hant": "刪除",
    "en": "Delete",
    "ja": "削除"
  },
  "把整张舞台录成视频": {
    "zh-Hans": "把整张舞台录成视频",
    "zh-Hant": "把整張舞台錄成影片",
    "en": "Record the whole stage",
    "ja": "舞台全体を録画"
  },
  "做视频": {
    "zh-Hans": "做视频",
    "zh-Hant": "做影片",
    "en": "Exporting",
    "ja": "書き出し中"
  },
  "视频好了": {
    "zh-Hans": "视频好了",
    "zh-Hant": "影片好了",
    "en": "Video ready",
    "ja": "動画ができました"
  },
  "录制": {
    "zh-Hans": "录制",
    "zh-Hant": "錄制",
    "en": "Record",
    "ja": "録画"
  },
  "这一轮 AI 说了几句 / 最多几句": {
    "zh-Hans": "这一轮 AI 说了几句 / 最多几句",
    "zh-Hant": "這一輪 AI 說了幾句 / 最多幾句",
    "en": "AI lines this round / maximum",
    "ja": "今回のAI発言数 / 上限"
  },
  "句": {
    "zh-Hans": "句",
    "zh-Hant": "句",
    "en": "lines",
    "ja": "発言"
  },
  "视频没有透明通道：透明背景录成绿幕": {
    "zh-Hans": "视频没有透明通道：透明背景录成绿幕",
    "zh-Hant": "影片沒有透明通道：透明背景錄成綠幕",
    "en": "Video uses a green screen for transparent backgrounds",
    "ja": "透明背景はグリーンバックで書き出します"
  },
  "绿幕": {
    "zh-Hans": "绿幕",
    "zh-Hant": "綠幕",
    "en": "Green screen",
    "ja": "グリーンバック"
  },
  "没有声音，只出字幕：设置里接上语音": {
    "zh-Hans": "没有声音，只出字幕：设置里接上语音",
    "zh-Hant": "沒有聲音，只出字幕：設置里接上語音",
    "en": "Captions only; connect a voice in Settings",
    "ja": "字幕のみです。設定で音声を接続できます"
  },
  "系统朗读录不进声音：设置里接上语音": {
    "zh-Hans": "系统朗读录不进声音：设置里接上语音",
    "zh-Hant": "系統朗讀錄不進聲音：設置里接上語音",
    "en": "System speech cannot be recorded; connect a voice in Settings",
    "ja": "システム読み上げは録音できません。設定で音声を接続できます"
  },
  "同时开始对话": {
    "zh-Hans": "同时开始对话",
    "zh-Hant": "同時開始對話",
    "en": "Start chat with recording",
    "ja": "録画と同時に対話を開始"
  },
  "建议戴耳机，不然角色的声音会被录两遍": {
    "zh-Hans": "建议戴耳机，不然角色的声音会被录两遍",
    "zh-Hant": "建議戴耳機，不然角色的聲音會被錄兩遍",
    "en": "Use headphones to avoid recording the avatar’s voice twice",
    "ja": "キャラクターの音声が二重に録音されないよう、ヘッドホンを使ってください"
  },
  "录进麦克风": {
    "zh-Hans": "录进麦克风",
    "zh-Hant": "錄進麥克風",
    "en": "Include microphone",
    "ja": "マイクも録音"
  },
  "录无声视频": {
    "zh-Hans": "录无声视频",
    "zh-Hant": "錄無聲影片",
    "en": "Record without audio",
    "ja": "無音で録画"
  },
  "开始录制": {
    "zh-Hans": "开始录制",
    "zh-Hant": "開始錄制",
    "en": "Start recording",
    "ja": "録画を開始"
  },
  "再录一段": {
    "zh-Hans": "再录一段",
    "zh-Hant": "再錄一段",
    "en": "Record again",
    "ja": "もう一度録画"
  },
  "存到电脑": {
    "zh-Hans": "存到电脑",
    "zh-Hant": "存到電腦",
    "en": "Save to computer",
    "ja": "パソコンに保存"
  },
  "知道了": {
    "zh-Hans": "知道了",
    "zh-Hant": "知道了",
    "en": "OK",
    "ja": "OK"
  },
  "演示": {
    "zh-Hans": "演示",
    "zh-Hant": "演示",
    "en": "Demo",
    "ja": "デモ"
  },
  "AI 角色用什么模型想台词": {
    "zh-Hans": "AI 角色用什么模型想台词",
    "zh-Hant": "AI 角色用什麼模型想台詞",
    "en": "The model that writes your avatars’ dialogue",
    "ja": "キャラクターの台詞を考えるモデル"
  },
  "两段准备好的对话：精选角色，用角色自己的声音": {
    "zh-Hans": "两段准备好的对话：精选角色，用角色自己的声音",
    "zh-Hant": "兩段準備好的對話：精選角色，用角色自己的聲音",
    "en": "Two prepared conversations with featured avatars and their voices",
    "ja": "サンプルキャラクターの音声付き対話を2種類体験"
  },
  "接口地址": {
    "zh-Hans": "接口地址",
    "zh-Hant": "介面地址",
    "en": "API endpoint",
    "ja": "APIエンドポイント"
  },
  "密钥": {
    "zh-Hans": "密钥",
    "zh-Hant": "金鑰",
    "en": "API key",
    "ja": "APIキー"
  },
  "只存在这台电脑上": {
    "zh-Hans": "只存在这台电脑上",
    "zh-Hant": "只存在這台電腦上",
    "en": "Stored on this device",
    "ja": "この端末に保存"
  },
  "获取": {
    "zh-Hans": "获取",
    "zh-Hant": "獲取",
    "en": "Get key",
    "ja": "キーを取得"
  },
  "模型": {
    "zh-Hans": "模型",
    "zh-Hant": "模型",
    "en": "Model",
    "ja": "モデル"
  },
  "正在拿模型列表…": {
    "zh-Hans": "正在拿模型列表…",
    "zh-Hant": "正在拿模型列表…",
    "en": "Loading models…",
    "ja": "モデルを取得中…"
  },
  "模型名": {
    "zh-Hans": "模型名",
    "zh-Hant": "模型名",
    "en": "Model name",
    "ja": "モデル名"
  },
  "从接口拿模型列表": {
    "zh-Hans": "从接口拿模型列表",
    "zh-Hant": "從介面拿模型列表",
    "en": "Load models from API",
    "ja": "APIからモデル一覧を取得"
  },
  "{0} 秒": {
    "zh-Hans": "{0} 秒",
    "zh-Hant": "{0} 秒",
    "en": "{0} s",
    "ja": "{0}秒"
  },
  "测试": {
    "zh-Hans": "测试",
    "zh-Hant": "測試",
    "en": "Test",
    "ja": "テスト"
  },
  "看演示": {
    "zh-Hans": "看演示",
    "zh-Hant": "看演示",
    "en": "Try demo",
    "ja": "デモを見る"
  },
  "开始": {
    "zh-Hans": "开始",
    "zh-Hant": "開始",
    "en": "Start",
    "ja": "開始"
  },
  "保存": {
    "zh-Hans": "保存",
    "zh-Hant": "保存",
    "en": "Save",
    "ja": "保存"
  },
  "你好，这是 LivLiv Stage 的声音测试。": {
    "zh-Hans": "你好，这是 LivLiv Stage 的声音测试。",
    "zh-Hant": "你好，這是 LivLiv Stage 的聲音測試。",
    "en": "Hello, this is a LivLiv Stage voice test.",
    "ja": "こんにちは。LivLiv Stageの音声テストです。"
  },
  "能说": {
    "zh-Hans": "能说",
    "zh-Hant": "能說",
    "en": "Voice works",
    "ja": "音声を確認しました"
  },
  "听到：{0}": {
    "zh-Hans": "听到：{0}",
    "zh-Hant": "聽到：{0}",
    "en": "Heard: {0}",
    "ja": "認識結果：{0}"
  },
  "用 AI 模型的密钥，不用再填": {
    "zh-Hans": "用 AI 模型的密钥，不用再填",
    "zh-Hant": "用 AI 模型的金鑰，不用再填",
    "en": "Use the AI model’s key without entering it again",
    "ja": "AIモデルと同じAPIキーを使用"
  },
  "跟模型一样": {
    "zh-Hans": "跟模型一样",
    "zh-Hant": "跟模型一樣",
    "en": "Same as model",
    "ja": "モデルと共通"
  },
  "没有语音接口：角色用 LivLiv 的声音，没有就只出字幕": {
    "zh-Hans": "没有语音接口：角色用 LivLiv 的声音，没有就只出字幕",
    "zh-Hant": "沒有語音介面：角色用 LivLiv 的聲音，沒有就只出字幕",
    "en": "Without a speech API, use LivLiv voices or captions",
    "ja": "音声APIなしでは、LivLivの音声または字幕を使用します"
  },
  "不用": {
    "zh-Hans": "不用",
    "zh-Hant": "不用",
    "en": "Off",
    "ja": "使わない"
  },
  "用 AI 模型的密钥": {
    "zh-Hans": "用 AI 模型的密钥",
    "zh-Hant": "用 AI 模型的金鑰",
    "en": "Use AI model’s key",
    "ja": "AIモデルのキーを使用"
  },
  "语音模型": {
    "zh-Hans": "语音模型",
    "zh-Hant": "語音模型",
    "en": "Speech model",
    "ja": "音声モデル"
  },
  "默认音色": {
    "zh-Hans": "默认音色",
    "zh-Hant": "預設音色",
    "en": "Default voice",
    "ja": "標準の声"
  },
  "识别模型": {
    "zh-Hans": "识别模型",
    "zh-Hant": "識別模型",
    "en": "Recognition model",
    "ja": "音声認識モデル"
  },
  "按住说话用": {
    "zh-Hans": "按住说话用",
    "zh-Hant": "按住說話用",
    "en": "For push to talk",
    "ja": "音声入力に使用"
  },
  "AI 模型": {
    "zh-Hans": "AI 模型",
    "zh-Hant": "AI 模型",
    "en": "AI model",
    "ja": "AIモデル"
  },
  "设置": {
    "zh-Hans": "设置",
    "zh-Hant": "設置",
    "en": "Settings",
    "ja": "設定"
  },
  "模型与声音": {
    "zh-Hans": "模型与声音",
    "zh-Hant": "模型與聲音",
    "en": "Models & voice",
    "ja": "モデルと音声"
  },
  "全局热键": {
    "zh-Hans": "全局热键",
    "zh-Hant": "全局熱鍵",
    "en": "Global hotkeys",
    "ja": "グローバルキー"
  },
  "LivLiv 账号": {
    "zh-Hans": "LivLiv 账号",
    "zh-Hant": "LivLiv 賬號",
    "en": "livliv.ai account",
    "ja": "livliv.ai アカウント"
  },
  "语音": {
    "zh-Hans": "语音",
    "zh-Hant": "語音",
    "en": "Speech",
    "ja": "音声"
  },
  "可选": {
    "zh-Hans": "可选",
    "zh-Hant": "可選",
    "en": "Optional",
    "ja": "任意"
  },
  "积分": {
    "zh-Hans": "积分",
    "zh-Hant": "積分",
    "en": "Credits",
    "ja": "ポイント"
  },
  "退出": {
    "zh-Hans": "退出",
    "zh-Hant": "退出",
    "en": "Sign out",
    "ja": "ログアウト"
  },
  "在浏览器里确认，网页要码时输入这串": {
    "zh-Hans": "在浏览器里确认，网页要码时输入这串",
    "zh-Hant": "在瀏覽器里確認，網頁要碼時輸入這串",
    "en": "Confirm in your browser. Enter this code if asked.",
    "ja": "ブラウザーで確認してください。コードが必要な場合はこれを入力します。"
  },
  "再打开网页": {
    "zh-Hans": "再打开网页",
    "zh-Hant": "再打開網頁",
    "en": "Open browser again",
    "ja": "ブラウザーを再度開く"
  },
  "角色声音": {
    "zh-Hans": "角色声音",
    "zh-Hant": "角色聲音",
    "en": "Avatar voice",
    "ja": "キャラクターの声"
  },
  "用浏览器登录": {
    "zh-Hans": "用浏览器登录",
    "zh-Hant": "用瀏覽器登錄",
    "en": "Sign in with browser",
    "ja": "ブラウザーでログイン"
  },
  "测试观众": {
    "zh-Hans": "测试观众",
    "zh-Hant": "測試觀眾",
    "en": "Test viewer",
    "ja": "テスト視聴者"
  },
  "观众弹幕": {
    "zh-Hans": "观众弹幕",
    "zh-Hant": "觀眾彈幕",
    "en": "Audience chat",
    "ja": "視聴者コメント"
  },
  "Twitch 频道名": {
    "zh-Hans": "Twitch 频道名",
    "zh-Hant": "Twitch 頻道名",
    "en": "Twitch channel",
    "ja": "Twitchチャンネル"
  },
  "断开": {
    "zh-Hans": "断开",
    "zh-Hant": "斷開",
    "en": "Disconnect",
    "ja": "切断"
  },
  "连接": {
    "zh-Hans": "连接",
    "zh-Hant": "連接",
    "en": "Connect",
    "ja": "接続"
  },
  "已连接 twitch.tv/": {
    "zh-Hans": "已连接 twitch.tv/",
    "zh-Hant": "已連接 twitch.tv/",
    "en": "Connected to twitch.tv/",
    "ja": "twitch.tv/ に接続中："
  },
  "· 只读取公开聊天": {
    "zh-Hans": "· 只读取公开聊天",
    "zh-Hant": "· 只讀取公開聊天",
    "en": "· Public chat only",
    "ja": "· 公開コメントのみ"
  },
  "正在连接…": {
    "zh-Hans": "正在连接…",
    "zh-Hant": "正在連接…",
    "en": "Connecting…",
    "ja": "接続中…"
  },
  "对谈时回应弹幕": {
    "zh-Hans": "对谈时回应弹幕",
    "zh-Hant": "對談時回應彈幕",
    "en": "Reply to chat during conversations",
    "ja": "対話中にコメントへ返信"
  },
  "不回": {
    "zh-Hans": "不回",
    "zh-Hant": "不回",
    "en": "Never",
    "ja": "返信しない"
  },
  "偶尔": {
    "zh-Hans": "偶尔",
    "zh-Hant": "偶爾",
    "en": "Sometimes",
    "ja": "ときどき"
  },
  "积极": {
    "zh-Hans": "积极",
    "zh-Hant": "積極",
    "en": "Often",
    "ja": "積極的に"
  },
  "试发一条弹幕": {
    "zh-Hans": "试发一条弹幕",
    "zh-Hant": "試發一條彈幕",
    "en": "Send a test message",
    "ja": "コメントを試す"
  },
  "模拟一条弹幕": {
    "zh-Hans": "模拟一条弹幕",
    "zh-Hant": "模擬一條彈幕",
    "en": "Simulate a chat message",
    "ja": "テストコメントを入力"
  },
  "发送": {
    "zh-Hans": "发送",
    "zh-Hant": "發送",
    "en": "Send",
    "ja": "送信"
  },
  "屏蔽 ": {
    "zh-Hans": "屏蔽 ",
    "zh-Hant": "屏蔽 ",
    "en": "Block ",
    "ja": "ブロック："
  },
  "屏蔽": {
    "zh-Hans": "屏蔽",
    "zh-Hant": "屏蔽",
    "en": "Block",
    "ja": "ブロック"
  },
  "已屏蔽": {
    "zh-Hans": "已屏蔽",
    "zh-Hant": "已屏蔽",
    "en": "Blocked",
    "ja": "ブロック済み"
  },
  "位观众": {
    "zh-Hans": "位观众",
    "zh-Hant": "位觀眾",
    "en": "viewers",
    "ja": "人"
  },
  "点击解除屏蔽": {
    "zh-Hans": "点击解除屏蔽",
    "zh-Hant": "點擊解除屏蔽",
    "en": "Click to unblock",
    "ja": "クリックでブロック解除"
  },
  "已同台": {
    "zh-Hans": "已同台",
    "zh-Hant": "已同台",
    "en": "On stage",
    "ja": "同じ舞台に参加中"
  },
  "接收角色 {0}%": {
    "zh-Hans": "接收角色 {0}%",
    "zh-Hant": "接收角色 {0}%",
    "en": "Receiving avatar {0}%",
    "ja": "キャラクターを受信中 {0}%"
  },
  "载入角色": {
    "zh-Hans": "载入角色",
    "zh-Hant": "載入角色",
    "en": "Loading avatar",
    "ja": "キャラクターを読み込み中"
  },
  "正在连接": {
    "zh-Hans": "正在连接",
    "zh-Hant": "正在連接",
    "en": "Connecting",
    "ja": "接続中"
  },
  "复制未完成，请选中邀请码复制": {
    "zh-Hans": "复制未完成，请选中邀请码复制",
    "zh-Hant": "複製未完成，請選中邀請碼複製",
    "en": "Couldn’t copy. Select the invite code to copy it.",
    "ja": "コピーできませんでした。招待コードを選択してコピーしてください。"
  },
  "朋友联播": {
    "zh-Hans": "朋友联播",
    "zh-Hant": "朋友聯播",
    "en": "Collab with friends",
    "ja": "フレンドとコラボ"
  },
  "各自演自己的角色，一起同台": {
    "zh-Hans": "各自演自己的角色，一起同台",
    "zh-Hant": "各自演自己的角色，一起同台",
    "en": "Bring your avatars together on one stage",
    "ja": "それぞれのキャラクターで、ひとつの舞台へ"
  },
  "邀请朋友": {
    "zh-Hans": "邀请朋友",
    "zh-Hant": "邀請朋友",
    "en": "Invite friends",
    "ja": "フレンドを招待"
  },
  "加入联播": {
    "zh-Hans": "加入联播",
    "zh-Hant": "加入聯播",
    "en": "Join a collab",
    "ja": "コラボに参加"
  },
  "你的名字": {
    "zh-Hans": "你的名字",
    "zh-Hant": "你的名字",
    "en": "Your name",
    "ja": "あなたの名前"
  },
  "朋友怎么称呼你": {
    "zh-Hans": "朋友怎么称呼你",
    "zh-Hant": "朋友怎麼稱呼你",
    "en": "What should friends call you?",
    "ja": "フレンドに表示する名前"
  },
  "分享哪个角色": {
    "zh-Hans": "分享哪个角色",
    "zh-Hant": "分享哪個角色",
    "en": "Avatar to share",
    "ja": "共有するキャラクター"
  },
  "选择自己的角色": {
    "zh-Hans": "选择自己的角色",
    "zh-Hant": "選擇自己的角色",
    "en": "Choose your avatar",
    "ja": "自分のキャラクターを選択"
  },
  "先在舞台上添加一个角色。": {
    "zh-Hans": "先在舞台上添加一个角色。",
    "zh-Hant": "先在舞台上新增一個角色。",
    "en": "Add a avatar to your stage first.",
    "ja": "先にキャラクターを舞台へ追加してください。"
  },
  "角色动作": {
    "zh-Hans": "角色动作",
    "zh-Hant": "角色動作",
    "en": "Avatar movement",
    "ja": "キャラクターの動き"
  },
  "同步": {
    "zh-Hans": "同步",
    "zh-Hant": "同步",
    "en": "Shared",
    "ja": "共有する"
  },
  "系统朗读 · 仅本机": {
    "zh-Hans": "系统朗读 · 仅本机",
    "zh-Hant": "系統朗讀 · 僅本機",
    "en": "System speech · this device only",
    "ja": "システム読み上げ · この端末のみ"
  },
  "未启用": {
    "zh-Hans": "未启用",
    "zh-Hant": "未啓用",
    "en": "Off",
    "ja": "未設定"
  },
  "接入语音接口": {
    "zh-Hans": "接入语音接口",
    "zh-Hant": "接入語音介面",
    "en": "Connect a voice API",
    "ja": "音声APIを接続"
  },
  "分享麦克风": {
    "zh-Hans": "分享麦克风",
    "zh-Hant": "分享麥克風",
    "en": "Share microphone",
    "ja": "マイクを共有"
  },
  "朋友的邀请码": {
    "zh-Hans": "朋友的邀请码",
    "zh-Hant": "朋友的邀請碼",
    "en": "Friend’s invite code",
    "ja": "フレンドの招待コード"
  },
  "将连接联播服务 {0}": {
    "zh-Hans": "将连接联播服务 {0}",
    "zh-Hant": "將連接聯播服務 {0}",
    "en": "Will connect to collab server {0}",
    "ja": "コラボサーバー {0} に接続します"
  },
  "粘贴邀请码": {
    "zh-Hans": "粘贴邀请码",
    "zh-Hant": "粘貼邀請碼",
    "en": "Paste invite code",
    "ja": "招待コードを貼り付け"
  },
  "联播服务": {
    "zh-Hans": "联播服务",
    "zh-Hant": "聯播服務",
    "en": "Collab server",
    "ja": "コラボサーバー"
  },
  "服务地址": {
    "zh-Hans": "服务地址",
    "zh-Hant": "服務地址",
    "en": "Server address",
    "ja": "サーバーのアドレス"
  },
  "本地测试或自托管服务 · 最多 4 人": {
    "zh-Hans": "本地测试或自托管服务 · 最多 4 人",
    "zh-Hant": "本地測試或自托管服務 · 最多 4 人",
    "en": "Local or self-hosted · up to 4 people",
    "ja": "ローカル・セルフホスト用 · 最大4人"
  },
  "所选角色文件会分享给加入的朋友。": {
    "zh-Hans": "所选角色文件会分享给加入的朋友。",
    "zh-Hant": "所選角色檔案會分享給加入的朋友。",
    "en": "Your selected avatar’s files will be shared with participants.",
    "ja": "選んだキャラクターのファイルを参加者に共有します。"
  },
  "分享并创建联播": {
    "zh-Hans": "分享并创建联播",
    "zh-Hant": "分享並創建聯播",
    "en": "Share & create collab",
    "ja": "共有してコラボを作成"
  },
  "分享并申请加入": {
    "zh-Hans": "分享并申请加入",
    "zh-Hant": "分享並申請加入",
    "en": "Share & request to join",
    "ja": "共有して参加を申請"
  },
  "邀请码": {
    "zh-Hans": "邀请码",
    "zh-Hant": "邀請碼",
    "en": "Invite code",
    "ja": "招待コード"
  },
  "已复制": {
    "zh-Hans": "已复制",
    "zh-Hant": "已複製",
    "en": "Copied",
    "ja": "コピーしました"
  },
  "复制邀请": {
    "zh-Hans": "复制邀请",
    "zh-Hant": "複製邀請",
    "en": "Copy invite",
    "ja": "招待をコピー"
  },
  "申请加入": {
    "zh-Hans": "申请加入",
    "zh-Hant": "申請加入",
    "en": "Join requests",
    "ja": "参加リクエスト"
  },
  "接纳": {
    "zh-Hans": "接纳",
    "zh-Hant": "接納",
    "en": "Admit",
    "ja": "承認"
  },
  "拒绝 ": {
    "zh-Hans": "拒绝 ",
    "zh-Hant": "拒絕 ",
    "en": "Decline ",
    "ja": "参加を拒否："
  },
  "联播成员": {
    "zh-Hans": "联播成员",
    "zh-Hant": "聯播成員",
    "en": "Collab members",
    "ja": "コラボ参加者"
  },
  "你": {
    "zh-Hans": "你",
    "zh-Hant": "你",
    "en": "You",
    "ja": "あなた"
  },
  "房主": {
    "zh-Hans": "房主",
    "zh-Hant": "房主",
    "en": "Host",
    "ja": "ホスト"
  },
  "正在分享角色": {
    "zh-Hans": "正在分享角色",
    "zh-Hant": "正在分享角色",
    "en": "Sharing your avatar",
    "ja": "キャラクターを共有中"
  },
  "听到 ": {
    "zh-Hans": "听到 ",
    "zh-Hant": "聽到 ",
    "en": "Unmute ",
    "ja": "ミュート解除："
  },
  "静音 ": {
    "zh-Hans": "静音 ",
    "zh-Hant": "靜音 ",
    "en": "Mute ",
    "ja": "ミュート："
  },
  "移除 ": {
    "zh-Hans": "移除 ",
    "zh-Hant": "移除 ",
    "en": "Remove ",
    "ja": "退出させる："
  },
  "启用朋友的声音": {
    "zh-Hans": "启用朋友的声音",
    "zh-Hant": "啓用朋友的聲音",
    "en": "Enable friends’ audio",
    "ja": "フレンドの音声を有効化"
  },
  "麦克风已开启": {
    "zh-Hans": "麦克风已开启",
    "zh-Hant": "麥克風已開啓",
    "en": "Microphone on",
    "ja": "マイク：オン"
  },
  "麦克风已关闭": {
    "zh-Hans": "麦克风已关闭",
    "zh-Hant": "麥克風已關閉",
    "en": "Microphone off",
    "ja": "マイク：オフ"
  },
  "重试麦克风": {
    "zh-Hans": "重试麦克风",
    "zh-Hant": "重試麥克風",
    "en": "Retry microphone",
    "ja": "マイクを再接続"
  },
  "等待房主接纳": {
    "zh-Hans": "等待房主接纳",
    "zh-Hant": "等待房主接納",
    "en": "Waiting for the host",
    "ja": "ホストの承認を待っています"
  },
  "正在连接联播": {
    "zh-Hans": "正在连接联播",
    "zh-Hant": "正在連接聯播",
    "en": "Connecting to collab",
    "ja": "コラボに接続中"
  },
  "{0} / 4 人": {
    "zh-Hans": "{0} / 4 人",
    "zh-Hant": "{0} / 4 人",
    "en": "{0} / 4 people",
    "ja": "{0} / 4人"
  },
  "结束联播": {
    "zh-Hans": "结束联播",
    "zh-Hant": "結束聯播",
    "en": "End collab",
    "ja": "コラボを終了"
  },
  "离开联播": {
    "zh-Hans": "离开联播",
    "zh-Hant": "離開聯播",
    "en": "Leave collab",
    "ja": "コラボから退出"
  },
  "正在打开设备…": {
    "zh-Hans": "正在打开设备…",
    "zh-Hant": "正在打開設備…",
    "en": "Opening device…",
    "ja": "デバイスを接続中…"
  },
  "面捕回放 · 无需摄像头": {
    "zh-Hans": "面捕回放 · 无需摄像头",
    "zh-Hant": "面捕回放 · 無需攝影機",
    "en": "Face replay · no camera needed",
    "ja": "フェイス再生 · カメラ不要"
  },
  "画面偏暗，请增加面部光照": {
    "zh-Hans": "画面偏暗，请增加面部光照",
    "zh-Hant": "畫面偏暗，請增加面部光照",
    "en": "Too dark; add some light on your face",
    "ja": "暗すぎます。顔に光を当ててください"
  },
  "已识别到面部": {
    "zh-Hans": "已识别到面部",
    "zh-Hant": "已識別到面部",
    "en": "Face detected",
    "ja": "顔を認識しました"
  },
  "没有识别到面部，请面向摄像头": {
    "zh-Hans": "没有识别到面部，请面向摄像头",
    "zh-Hant": "沒有識別到面部，請面向攝影機",
    "en": "No face detected; face the camera",
    "ja": "顔が見つかりません。カメラに顔を向けてください"
  },
  "麦克风已连接": {
    "zh-Hans": "麦克风已连接",
    "zh-Hant": "麥克風已連接",
    "en": "Microphone connected",
    "ja": "マイク接続済み"
  },
  "在下方选择动作驱动，或使用「我来演」开启面捕": {
    "zh-Hans": "在下方选择动作驱动，或使用「我来演」开启面捕",
    "zh-Hant": "在下方選擇動作驅動，或使用「我來演」開啓面捕",
    "en": "Choose a driver below, or select You control for face tracking",
    "ja": "下で動きの入力を選ぶか、「自分で操作」でフェイストラッキングを開始"
  },
  "系统默认": {
    "zh-Hans": "系统默认",
    "zh-Hant": "系統預設",
    "en": "System default",
    "ja": "システム標準"
  },
  "设备": {
    "zh-Hans": "设备",
    "zh-Hant": "設備",
    "en": "Device",
    "ja": "デバイス"
  },
  "摄像头": {
    "zh-Hans": "摄像头",
    "zh-Hant": "攝影機",
    "en": "Camera",
    "ja": "カメラ"
  },
  "麦克风": {
    "zh-Hans": "麦克风",
    "zh-Hant": "麥克風",
    "en": "Microphone",
    "ja": "マイク"
  },
  "摄像头预览": {
    "zh-Hans": "摄像头预览",
    "zh-Hant": "攝影機預覽",
    "en": "Camera preview",
    "ja": "カメラのプレビュー"
  },
  "已将刚才的姿势设为正面": {
    "zh-Hans": "已将刚才的姿势设为正面",
    "zh-Hant": "已將剛才的姿勢設為正面",
    "en": "Neutral pose calibrated",
    "ja": "正面の姿勢を設定しました"
  },
  "麦克风音量": {
    "zh-Hans": "麦克风音量",
    "zh-Hant": "麥克風音量",
    "en": "Microphone level",
    "ja": "マイクの音量"
  },
  "刷新设备": {
    "zh-Hans": "刷新设备",
    "zh-Hant": "刷新設備",
    "en": "Refresh devices",
    "ja": "デバイスを更新"
  },
  "重新连接": {
    "zh-Hans": "重新连接",
    "zh-Hant": "重新連接",
    "en": "Reconnect",
    "ja": "再接続"
  },
  "嘴型与眨眼通过切换立绘表现。": {
    "zh-Hans": "嘴型与眨眼通过切换立绘表现。",
    "zh-Hant": "嘴型與眨眼通過切換立繪表現。",
    "en": "Mouths and blinks use your avatar’s images.",
    "ja": "口やまばたきはアバター画像の切り替えで表現します。"
  },
  "全局热键在桌面版中可用，切到游戏窗口后仍能控制角色。网页中的编辑快捷键见「快捷键」。": {
    "zh-Hans": "全局热键在桌面版中可用，切到游戏窗口后仍能控制角色。网页中的编辑快捷键见「快捷键」。",
    "zh-Hant": "全局熱鍵在桌面版中可用，切到遊戲視窗後仍能控制角色。網頁中的編輯快捷鍵見「快捷鍵」。",
    "en": "Global hotkeys work in the desktop app, including while gaming. See Shortcuts for browser editing keys.",
    "ja": "グローバルキーはデスクトップ版で利用できます。ゲーム中も操作できます。ブラウザーの操作は「ショートカット」を参照してください。"
  },
  "表情和校准作用于选中的角色；未选中时，优先控制「我来演」的角色。语音输入按一次开始，再按一次结束。": {
    "zh-Hans": "表情和校准作用于选中的角色；未选中时，优先控制「我来演」的角色。语音输入按一次开始，再按一次结束。",
    "zh-Hant": "表情和校准作用於選中的角色；未選中時，優先控制「我來演」的角色。語音輸入按一次開始，再按一次結束。",
    "en": "Expressions and calibration use the selected avatar, or your own avatar if none is selected. Press once to record voice, again to finish.",
    "ja": "表情と正面調整は選択中のキャラクターに適用します。未選択時は「自分で操作」のキャラクターが対象です。音声入力は1回押して開始し、もう1回で終了します。"
  },
  "热键": {
    "zh-Hans": "热键",
    "zh-Hant": "熱鍵",
    "en": " hotkey",
    "ja": "のホットキー"
  },
  "恢复默认": {
    "zh-Hans": "恢复默认",
    "zh-Hant": "恢復預設",
    "en": "Reset defaults",
    "ja": "初期設定に戻す"
  },
  "保存热键": {
    "zh-Hans": "保存热键",
    "zh-Hant": "保存熱鍵",
    "en": "Save hotkeys",
    "ja": "ホットキーを保存"
  },
  "收起（⌘\\）": {
    "zh-Hans": "收起（⌘\\）",
    "zh-Hant": "收起（⌘\\）",
    "en": "Collapse (⌘\\)",
    "ja": "閉じる（⌘\\）"
  },
  "收起面板": {
    "zh-Hans": "收起面板",
    "zh-Hant": "收起面板",
    "en": "Collapse panel",
    "ja": "パネルを閉じる"
  },
  "复制（⌘D）": {
    "zh-Hans": "复制（⌘D）",
    "zh-Hant": "複製（⌘D）",
    "en": "Duplicate (⌘D)",
    "ja": "複製（⌘D）"
  },
  "隐藏朋友角色": {
    "zh-Hans": "隐藏朋友角色",
    "zh-Hant": "隱藏朋友角色",
    "en": "Hide friend’s avatar",
    "ja": "フレンドのキャラクターを非表示"
  },
  "删除（Delete）": {
    "zh-Hans": "删除（Delete）",
    "zh-Hant": "刪除（Delete）",
    "en": "Delete (Delete)",
    "ja": "削除（Delete）"
  },
  "它自己的声音": {
    "zh-Hans": "它自己的声音",
    "zh-Hant": "它自己的聲音",
    "en": "Their own voice",
    "ja": "キャラクター自身の声"
  },
  "你好，我是{0}。": {
    "zh-Hans": "你好，我是{0}。",
    "zh-Hant": "你好，我是{0}。",
    "en": "Hi, I’m {0}.",
    "ja": "こんにちは、{0}です。"
  },
  "声音": {
    "zh-Hans": "声音",
    "zh-Hant": "聲音",
    "en": "Voice",
    "ja": "声"
  },
  "角色在 LivLiv 上的声音": {
    "zh-Hans": "角色在 LivLiv 上的声音",
    "zh-Hant": "角色在 LivLiv 上的聲音",
    "en": "This avatar’s voice on livliv.ai",
    "ja": "livliv.aiのキャラクター音声"
  },
  "在设置里连上 LivLiv 账号后可用": {
    "zh-Hans": "在设置里连上 LivLiv 账号后可用",
    "zh-Hant": "在設置里連上 LivLiv 賬號後可用",
    "en": "Connect your livliv.ai account in Settings",
    "ja": "設定でlivliv.aiアカウントにログインすると利用できます"
  },
  "我的接口": {
    "zh-Hans": "我的接口",
    "zh-Hant": "我的介面",
    "en": "My API",
    "ja": "自分のAPI"
  },
  "在设置里接上语音接口后可用": {
    "zh-Hans": "在设置里接上语音接口后可用",
    "zh-Hant": "在設置里接上語音介面後可用",
    "en": "Connect a speech API in Settings",
    "ja": "設定で音声APIを接続すると利用できます"
  },
  "系统朗读": {
    "zh-Hans": "系统朗读",
    "zh-Hant": "系統朗讀",
    "en": "System speech",
    "ja": "システム読み上げ"
  },
  "用哪个声音": {
    "zh-Hans": "用哪个声音",
    "zh-Hant": "用哪個聲音",
    "en": "Choose a voice",
    "ja": "使う声を選ぶ"
  },
  "默认（{0}）": {
    "zh-Hans": "默认（{0}）",
    "zh-Hant": "預設（{0}）",
    "en": "Default ({0})",
    "ja": "標準（{0}）"
  },
  "默认": {
    "zh-Hans": "默认",
    "zh-Hant": "預設",
    "en": "Default",
    "ja": "標準"
  },
  "音色": {
    "zh-Hans": "音色",
    "zh-Hant": "音色",
    "en": "Voice",
    "ja": "声"
  },
  "接口的": {
    "zh-Hans": "接口的",
    "zh-Hant": "介面的",
    "en": "API default",
    "ja": "APIの標準"
  },
  "语速": {
    "zh-Hans": "语速",
    "zh-Hant": "語速",
    "en": "Speed",
    "ja": "話す速さ"
  },
  "按台词的语言自动选": {
    "zh-Hans": "按台词的语言自动选",
    "zh-Hant": "按台詞的語言自動選",
    "en": "Choose by dialogue language",
    "ja": "台詞の言語から選択"
  },
  "音调": {
    "zh-Hans": "音调",
    "zh-Hant": "音調",
    "en": "Pitch",
    "ja": "声の高さ"
  },
  "当前只显示字幕。选择系统朗读，或在设置里接入语音接口后出声。": {
    "zh-Hans": "当前只显示字幕。选择系统朗读，或在设置里接入语音接口后出声。",
    "zh-Hant": "當前只顯示字幕。選擇系統朗讀，或在設置里接入語音介面後出聲。",
    "en": "Captions only. Choose system speech or connect a voice API in Settings.",
    "ja": "現在は字幕のみです。システム読み上げを選ぶか、設定で音声APIを接続できます。"
  },
  "上一句没有出声：": {
    "zh-Hans": "上一句没有出声：",
    "zh-Hant": "上一句沒有出聲：",
    "en": "Last line had no audio: ",
    "ja": "前の台詞を再生できませんでした："
  },
  "试听": {
    "zh-Hans": "试听",
    "zh-Hant": "試聽",
    "en": "Listen",
    "ja": "試聴"
  },
  "联播角色": {
    "zh-Hans": "联播角色",
    "zh-Hant": "聯播角色",
    "en": "Friend’s avatar",
    "ja": "コラボキャラクター"
  },
  "由": {
    "zh-Hans": "由",
    "zh-Hant": "由",
    "en": "Controlled by ",
    "ja": "操作："
  },
  "角色名称": {
    "zh-Hans": "角色名称",
    "zh-Hant": "角色名稱",
    "en": "Avatar name",
    "ja": "キャラクター名"
  },
  "显示在舞台上": {
    "zh-Hans": "显示在舞台上",
    "zh-Hant": "顯示在舞台上",
    "en": "Show on stage",
    "ja": "舞台に表示"
  },
  "静音朋友声音": {
    "zh-Hans": "静音朋友声音",
    "zh-Hant": "靜音朋友聲音",
    "en": "Mute friend’s audio",
    "ja": "フレンドの音声をミュート"
  },
  "左右翻转": {
    "zh-Hans": "左右翻转",
    "zh-Hant": "左右翻轉",
    "en": "Flip horizontally",
    "ja": "左右反転"
  },
  "投影": {
    "zh-Hans": "投影",
    "zh-Hant": "投影",
    "en": "Shadow",
    "ja": "影"
  },
  "谁来控制": {
    "zh-Hans": "谁来控制",
    "zh-Hant": "誰來控制",
    "en": "Who controls it",
    "ja": "操作する人"
  },
  "外观": {
    "zh-Hans": "外观",
    "zh-Hant": "外觀",
    "en": "Appearance",
    "ja": "見た目"
  },
  "字幕颜色": {
    "zh-Hans": "字幕颜色",
    "zh-Hant": "字幕顏色",
    "en": "Caption color",
    "ja": "字幕の色"
  },
  "身后一层柔和的影子，浅色背景上更立体": {
    "zh-Hans": "身后一层柔和的影子，浅色背景上更立体",
    "zh-Hant": "身後一層柔和的影子，淺色背景上更立體",
    "en": "A soft shadow, especially visible on light backgrounds",
    "ja": "明るい背景で見やすい、柔らかな影"
  },
  "给它加一个字幕气泡": {
    "zh-Hans": "给它加一个字幕气泡",
    "zh-Hant": "給它加一個字幕氣泡",
    "en": "Add a speech bubble",
    "ja": "吹き出し字幕を追加"
  },
  "台词与人设": {
    "zh-Hans": "台词与人设",
    "zh-Hant": "台詞與人設",
    "en": "Dialogue & persona",
    "ja": "台詞と設定"
  },
  "人设": {
    "zh-Hans": "人设",
    "zh-Hant": "人設",
    "en": "Persona",
    "ja": "キャラクター設定"
  },
  "她是谁、怎么说话，一两句就够": {
    "zh-Hans": "她是谁、怎么说话，一两句就够",
    "zh-Hant": "她是誰、怎麼說話，一兩句就夠",
    "en": "Who they are and how they speak, in a sentence or two",
    "ja": "どんな人で、どう話すのかを簡潔に"
  },
  "说话风格": {
    "zh-Hans": "说话风格",
    "zh-Hant": "說話風格",
    "en": "Speaking style",
    "ja": "話し方"
  },
  "每句多长": {
    "zh-Hans": "每句多长",
    "zh-Hant": "每句多長",
    "en": "Line length",
    "ja": "台詞の長さ"
  },
  "发言频率": {
    "zh-Hans": "发言频率",
    "zh-Hant": "發言頻率",
    "en": "Talk frequency",
    "ja": "発言の頻度"
  },
  "少": {
    "zh-Hans": "少",
    "zh-Hant": "少",
    "en": "Less",
    "ja": "少なめ"
  },
  "多": {
    "zh-Hans": "多",
    "zh-Hant": "多",
    "en": "More",
    "ja": "多め"
  },
  "一般": {
    "zh-Hans": "一般",
    "zh-Hant": "一般",
    "en": "Normal",
    "ja": "標準"
  },
  "用角色的声音念出来": {
    "zh-Hans": "用角色的声音念出来",
    "zh-Hant": "用角色的聲音念出來",
    "en": "Read lines in the avatar’s voice",
    "ja": "キャラクターの声で読み上げる"
  },
  "关掉：你自己对着麦克风说，控制台打的字只当字幕": {
    "zh-Hans": "关掉：你自己对着麦克风说，控制台打的字只当字幕",
    "zh-Hant": "關掉：你自己對著麥克風說，控制台打的字只當字幕",
    "en": "Off: speak into your microphone; typed lines appear as captions",
    "ja": "オフの場合は自分のマイクで話し、入力した文字は字幕として表示します"
  },
  "动作与更多设置": {
    "zh-Hans": "动作与更多设置",
    "zh-Hant": "動作與更多設置",
    "en": "Movement & more",
    "ja": "動きと詳細設定"
  },
  "动作由什么驱动": {
    "zh-Hans": "动作由什么驱动",
    "zh-Hant": "動作由什麼驅動",
    "en": "Movement input",
    "ja": "動きの入力"
  },
  "面捕平滑": {
    "zh-Hans": "面捕平滑",
    "zh-Hant": "面捕平滑",
    "en": "Tracking smoothing",
    "ja": "トラッキングの滑らかさ"
  },
  "灵敏": {
    "zh-Hans": "灵敏",
    "zh-Hant": "靈敏",
    "en": "Responsive",
    "ja": "機敏"
  },
  "稳": {
    "zh-Hans": "稳",
    "zh-Hant": "穩",
    "en": "Steady",
    "ja": "安定"
  },
  "适中": {
    "zh-Hans": "适中",
    "zh-Hant": "適中",
    "en": "Balanced",
    "ja": "バランス"
  },
  "把现在的姿势设为正面": {
    "zh-Hans": "把现在的姿势设为正面",
    "zh-Hant": "把現在的姿勢設為正面",
    "en": "Use current pose as neutral",
    "ja": "現在の姿勢を正面に設定"
  },
  "麦克风灵敏度": {
    "zh-Hans": "麦克风灵敏度",
    "zh-Hant": "麥克風靈敏度",
    "en": "Microphone sensitivity",
    "ja": "マイクの感度"
  },
  "动作": {
    "zh-Hans": "动作",
    "zh-Hant": "動作",
    "en": "Movement",
    "ja": "動き"
  },
  "动作幅度": {
    "zh-Hans": "动作幅度",
    "zh-Hant": "動作幅度",
    "en": "Movement range",
    "ja": "動きの大きさ"
  },
  "说话时的动作": {
    "zh-Hans": "说话时的动作",
    "zh-Hant": "說話時的動作",
    "en": "Movement while speaking",
    "ja": "話しているときの動き"
  },
  "眼神": {
    "zh-Hans": "眼神",
    "zh-Hant": "眼神",
    "en": "Gaze",
    "ja": "視線"
  },
  "表情与动作": {
    "zh-Hans": "表情与动作",
    "zh-Hant": "表情與動作",
    "en": "Expressions & actions",
    "ja": "表情とアクション"
  },
  "恢复": {
    "zh-Hans": "恢复",
    "zh-Hant": "恢復",
    "en": "Reset",
    "ja": "戻す"
  },
  "点头": {
    "zh-Hans": "点头",
    "zh-Hant": "點頭",
    "en": "Nod",
    "ja": "うなずく"
  },
  "摇头": {
    "zh-Hans": "摇头",
    "zh-Hant": "搖頭",
    "en": "Shake head",
    "ja": "首を振る"
  },
  "歪头": {
    "zh-Hans": "歪头",
    "zh-Hant": "歪頭",
    "en": "Tilt head",
    "ja": "首をかしげる"
  },
  "跳一下": {
    "zh-Hans": "跳一下",
    "zh-Hant": "跳一下",
    "en": "Hop",
    "ja": "ジャンプ"
  },
  "害羞": {
    "zh-Hans": "害羞",
    "zh-Hant": "害羞",
    "en": "Shy",
    "ja": "照れる"
  },
  "谁说的话": {
    "zh-Hans": "谁说的话",
    "zh-Hant": "誰說的話",
    "en": "Whose dialogue",
    "ja": "字幕の対象"
  },
  "所有人": {
    "zh-Hans": "所有人",
    "zh-Hant": "所有人",
    "en": "Everyone",
    "ja": "全員"
  },
  "样式": {
    "zh-Hans": "样式",
    "zh-Hant": "樣式",
    "en": "Style",
    "ja": "スタイル"
  },
  "字号": {
    "zh-Hans": "字号",
    "zh-Hant": "字號",
    "en": "Font size",
    "ja": "文字サイズ"
  },
  "显示名字": {
    "zh-Hans": "显示名字",
    "zh-Hant": "顯示名字",
    "en": "Show name",
    "ja": "名前を表示"
  },
  "逐字出现": {
    "zh-Hans": "逐字出现",
    "zh-Hant": "逐字出現",
    "en": "Typewriter effect",
    "ja": "一文字ずつ表示"
  },
  "跟着说话的速度一个字一个字出来": {
    "zh-Hans": "跟着说话的速度一个字一个字出来",
    "zh-Hant": "跟著說話的速度一個字一個字出來",
    "en": "Reveal text in time with speech",
    "ja": "話す速さに合わせて字幕を表示します"
  },
  "说完后停留": {
    "zh-Hans": "说完后停留",
    "zh-Hant": "說完後停留",
    "en": "Keep after speaking",
    "ja": "発言後の表示時間"
  },
  "内容（也可以在舞台上双击改）": {
    "zh-Hans": "内容（也可以在舞台上双击改）",
    "zh-Hant": "內容（也可以在舞台上雙擊改）",
    "en": "Text (or double-click on stage)",
    "ja": "テキスト（舞台でダブルクリックでも編集）"
  },
  "颜色": {
    "zh-Hans": "颜色",
    "zh-Hant": "顏色",
    "en": "Color",
    "ja": "色"
  },
  "底色": {
    "zh-Hans": "底色",
    "zh-Hant": "底色",
    "en": "Background color",
    "ja": "背景色"
  },
  "米白": {
    "zh-Hans": "米白",
    "zh-Hant": "米白",
    "en": "Ivory",
    "ja": "アイボリー"
  },
  "白": {
    "zh-Hans": "白",
    "zh-Hant": "白",
    "en": "White",
    "ja": "白"
  },
  "浅蓝": {
    "zh-Hans": "浅蓝",
    "zh-Hant": "淺藍",
    "en": "Light blue",
    "ja": "ライトブルー"
  },
  "浅粉": {
    "zh-Hans": "浅粉",
    "zh-Hant": "淺粉",
    "en": "Light pink",
    "ja": "ライトピンク"
  },
  "粉蓝渐变": {
    "zh-Hans": "粉蓝渐变",
    "zh-Hant": "粉藍漸變",
    "en": "Pink-blue gradient",
    "ja": "ピンクとブルー"
  },
  "暖橙渐变": {
    "zh-Hans": "暖橙渐变",
    "zh-Hant": "暖橙漸變",
    "en": "Warm orange gradient",
    "ja": "暖かなオレンジ"
  },
  "晴空": {
    "zh-Hans": "晴空",
    "zh-Hant": "晴空",
    "en": "Sky",
    "ja": "青空"
  },
  "夜晚": {
    "zh-Hans": "夜晚",
    "zh-Hant": "夜晚",
    "en": "Night",
    "ja": "夜"
  },
  "深色": {
    "zh-Hans": "深色",
    "zh-Hant": "深色",
    "en": "Dark",
    "ja": "ダーク"
  },
  "透明（给 OBS）": {
    "zh-Hans": "透明（给 OBS）",
    "zh-Hant": "透明（給 OBS）",
    "en": "Transparent (OBS)",
    "ja": "透明（OBS用）"
  },
  "面板": {
    "zh-Hans": "面板",
    "zh-Hant": "面板",
    "en": "Panel",
    "ja": "パネル"
  },
  "展开（⌘\\）": {
    "zh-Hans": "展开（⌘\\）",
    "zh-Hant": "展開（⌘\\）",
    "en": "Expand (⌘\\)",
    "ja": "開く（⌘\\）"
  },
  "舞台": {
    "zh-Hans": "舞台",
    "zh-Hant": "舞台",
    "en": "Stage",
    "ja": "舞台"
  },
  "画面": {
    "zh-Hans": "画面",
    "zh-Hant": "畫面",
    "en": "Canvas",
    "ja": "画面"
  },
  "背景": {
    "zh-Hans": "背景",
    "zh-Hant": "背景",
    "en": "Background",
    "ja": "背景"
  },
  "用一张图片": {
    "zh-Hans": "用一张图片",
    "zh-Hant": "用一張圖片",
    "en": "Use an image",
    "ja": "画像を使う"
  },
  "自动排好角色": {
    "zh-Hans": "自动排好角色",
    "zh-Hant": "自動排好角色",
    "en": "Arrange avatars",
    "ja": "キャラクターを自動配置"
  },
  "安全区参考线": {
    "zh-Hans": "安全区参考线",
    "zh-Hant": "安全區參考線",
    "en": "Safe area guides",
    "ja": "セーフエリア"
  },
  "标题安全区（90%）和动作安全区（93%）：字幕和角色别放到外面": {
    "zh-Hans": "标题安全区（90%）和动作安全区（93%）：字幕和角色别放到外面",
    "zh-Hant": "標題安全區（90%）和動作安全區（93%）：字幕和角色別放到外面",
    "en": "Title safe (90%) and action safe (93%): keep captions and avatars inside",
    "ja": "タイトル90%・アクション93%の範囲内に字幕やキャラクターを配置します"
  },
  "抖音 / TikTok 界面遮罩": {
    "zh-Hans": "抖音 / TikTok 界面遮罩",
    "zh-Hant": "抖音 / TikTok 界面遮罩",
    "en": "Douyin / TikTok overlay",
    "ja": "抖音・TikTokのUIガイド"
  },
  "竖屏发到短视频平台时，顶栏、评论区和右侧按钮会盖住的地方": {
    "zh-Hans": "竖屏发到短视频平台时，顶栏、评论区和右侧按钮会盖住的地方",
    "zh-Hant": "竪屏發到短影片平台時，頂欄、評論區和右側按鈕會蓋住的地方",
    "en": "Areas covered by app headers, comments and buttons in portrait videos",
    "ja": "縦動画でアプリの見出し、コメント、ボタンに隠れる範囲"
  },
  "9:16 裁切框": {
    "zh-Hans": "9:16 裁切框",
    "zh-Hant": "9:16 裁切框",
    "en": "9:16 crop guide",
    "ja": "9:16の切り抜きガイド"
  },
  "同一场再剪竖屏时，中间这一块会留下": {
    "zh-Hans": "同一场再剪竖屏时，中间这一块会留下",
    "zh-Hant": "同一場再剪竪屏時，中間這一塊會留下",
    "en": "This area remains when cropping to portrait",
    "ja": "縦動画に切り抜くと、この範囲が残ります"
  },
  "对话设置": {
    "zh-Hans": "对话设置",
    "zh-Hant": "對話設置",
    "en": "Chat settings",
    "ja": "対話設定"
  },
  "谁先说、谁接话": {
    "zh-Hans": "谁先说、谁接话",
    "zh-Hant": "誰先說、誰接話",
    "en": "Speaking order",
    "ja": "発言の順番"
  },
  "主持人": {
    "zh-Hans": "主持人",
    "zh-Hant": "主持人",
    "en": "Host",
    "ja": "司会"
  },
  "AI 抢话": {
    "zh-Hans": "AI 抢话",
    "zh-Hant": "AI 搶話",
    "en": "AI interruptions",
    "ja": "AIの割り込み"
  },
  "不抢": {
    "zh-Hans": "不抢",
    "zh-Hant": "不搶",
    "en": "Never",
    "ja": "しない"
  },
  "经常": {
    "zh-Hans": "经常",
    "zh-Hant": "經常",
    "en": "Often",
    "ja": "よくする"
  },
  "你在控制台说话时": {
    "zh-Hans": "你在控制台说话时",
    "zh-Hant": "你在控制台說話時",
    "en": "When you send a line",
    "ja": "自分が発言したとき"
  },
  "等这句说完": {
    "zh-Hans": "等这句说完",
    "zh-Hant": "等這句說完",
    "en": "Wait for this line",
    "ja": "今の発言が終わるまで待つ"
  },
  "立刻打断": {
    "zh-Hans": "立刻打断",
    "zh-Hant": "立刻打斷",
    "en": "Interrupt now",
    "ja": "すぐに割り込む"
  },
  "说什么语言": {
    "zh-Hans": "说什么语言",
    "zh-Hant": "說什麼語言",
    "en": "Dialogue language",
    "ja": "対話の言語"
  },
  "跟话题一样": {
    "zh-Hans": "跟话题一样",
    "zh-Hant": "跟話題一樣",
    "en": "Follow the topic",
    "ja": "話題に合わせる"
  },
  "中文": {
    "zh-Hans": "中文",
    "zh-Hant": "中文",
    "en": "Chinese",
    "ja": "中国語"
  },
  "日本語": {
    "zh-Hans": "日本語",
    "zh-Hant": "日本語",
    "en": "日本語",
    "ja": "日本語"
  },
  "节奏": {
    "zh-Hans": "节奏",
    "zh-Hant": "節奏",
    "en": "Pacing",
    "ja": "テンポ"
  },
  "一轮最多几句（AI）": {
    "zh-Hans": "一轮最多几句（AI）",
    "zh-Hant": "一輪最多幾句（AI）",
    "en": "Maximum AI lines per round",
    "ja": "1ラウンドのAI発言上限"
  },
  "句子之间停多久": {
    "zh-Hans": "句子之间停多久",
    "zh-Hant": "句子之間停多久",
    "en": "Pause between lines",
    "ja": "発言の間隔"
  },
  "所有人的字幕": {
    "zh-Hans": "所有人的字幕",
    "zh-Hant": "所有人的字幕",
    "en": "Everyone’s captions",
    "ja": "全員の字幕"
  },
  "{0} 的字幕": {
    "zh-Hans": "{0} 的字幕",
    "zh-Hant": "{0} 的字幕",
    "en": "{0}’s captions",
    "ja": "{0}の字幕"
  },
  "图层（{0}）": {
    "zh-Hans": "图层（{0}）",
    "zh-Hant": "圖層（{0}）",
    "en": "Layers ({0})",
    "ja": "レイヤー（{0}）"
  },
  "还没有东西": {
    "zh-Hans": "还没有东西",
    "zh-Hant": "還沒有東西",
    "en": "Nothing here yet",
    "ja": "まだ項目がありません"
  },
  "解锁": {
    "zh-Hans": "解锁",
    "zh-Hant": "解鎖",
    "en": "Unlock",
    "ja": "ロック解除"
  },
  "锁定": {
    "zh-Hans": "锁定",
    "zh-Hant": "鎖定",
    "en": "Lock",
    "ja": "ロック"
  },
  "显示": {
    "zh-Hans": "显示",
    "zh-Hant": "顯示",
    "en": "Show",
    "ja": "表示"
  },
  "已暂停 · 当前句说完后等待": {
    "zh-Hans": "已暂停 · 当前句说完后等待",
    "zh-Hant": "已暫停 · 當前句說完後等待",
    "en": "Paused · waiting after the current line",
    "ja": "一時停止中 · 今の発言後に待機"
  },
  "正在准备回应…": {
    "zh-Hans": "正在准备回应…",
    "zh-Hant": "正在準備回應…",
    "en": "Preparing a reply…",
    "ja": "応答を準備中…"
  },
  "正在回应观众": {
    "zh-Hans": "正在回应观众",
    "zh-Hant": "正在回應觀眾",
    "en": "Replying to viewers",
    "ja": "視聴者に応答中"
  },
  "等待新弹幕": {
    "zh-Hans": "等待新弹幕",
    "zh-Hant": "等待新彈幕",
    "en": "Waiting for new messages",
    "ja": "新しいコメントを待っています"
  },
  "开播准备": {
    "zh-Hans": "开播准备",
    "zh-Hant": "開播準備",
    "en": "Ready to go",
    "ja": "配信の準備"
  },
  " 位 AI 角色已就绪": {
    "zh-Hans": " 位 AI 角色已就绪",
    "zh-Hant": " 位 AI 角色已就緒",
    "en": " AI avatars ready",
    "ja": "体のAIキャラクターが準備完了"
  },
  "先添加并载入「AI 来演」的角色": {
    "zh-Hans": "先添加并载入「AI 来演」的角色",
    "zh-Hant": "先新增並載入「AI 來演」的角色",
    "en": "Add and load an AI-controlled avatar first",
    "ja": "先に「AIで操作」のキャラクターを追加して読み込んでください"
  },
  "需要接上 AI 模型": {
    "zh-Hans": "需要接上 AI 模型",
    "zh-Hant": "需要接上 AI 模型",
    "en": "Connect an AI model",
    "ja": "AIモデルの接続が必要です"
  },
  "仅显示字幕": {
    "zh-Hans": "仅显示字幕",
    "zh-Hant": "僅顯示字幕",
    "en": "Captions only",
    "ja": "字幕のみ"
  },
  " 还没有声音": {
    "zh-Hans": " 还没有声音",
    "zh-Hant": " 還沒有聲音",
    "en": " has no voice yet",
    "ja": "の音声が未設定です"
  },
  "角色声音已设置": {
    "zh-Hans": "角色声音已设置",
    "zh-Hant": "角色聲音已設置",
    "en": "Avatar voices set",
    "ja": "キャラクター音声を設定済み"
  },
  "设置模型与声音": {
    "zh-Hans": "设置模型与声音",
    "zh-Hant": "設置模型與聲音",
    "en": "Set up models & voices",
    "ja": "モデルと音声を設定"
  },
  "本次会话": {
    "zh-Hans": "本次会话",
    "zh-Hant": "本次會話",
    "en": "This session",
    "ja": "今回のセッション"
  },
  "已生成": {
    "zh-Hans": "已生成",
    "zh-Hant": "已生成",
    "en": "Generated",
    "ja": "生成済み"
  },
  "次 · 剩余约": {
    "zh-Hans": "次 · 剩余约",
    "zh-Hant": "次 · 剩餘約",
    "en": "calls · about",
    "ja": "回 · 残り約"
  },
  "分钟": {
    "zh-Hans": "分钟",
    "zh-Hant": "分鐘",
    "en": "minutes left",
    "ja": "分"
  },
  "时长上限": {
    "zh-Hans": "时长上限",
    "zh-Hant": "時長上限",
    "en": "Time limit",
    "ja": "時間の上限"
  },
  "包含失败的生成；模型与声音按所选服务的用量计费": {
    "zh-Hans": "包含失败的生成；模型与声音按所选服务的用量计费",
    "zh-Hant": "包含失敗的生成；模型與聲音按所選服務的用量計費",
    "en": "Failed attempts count too; models and voices are billed by your provider",
    "ja": "失敗した生成も含みます。モデルと音声は接続先の利用量に応じて課金されます"
  },
  "生成次数上限": {
    "zh-Hans": "生成次数上限",
    "zh-Hant": "生成次數上限",
    "en": "Generation limit",
    "ja": "生成回数の上限"
  },
  "没有弹幕时": {
    "zh-Hans": "没有弹幕时",
    "zh-Hant": "沒有彈幕時",
    "en": "When chat is quiet",
    "ja": "コメントがないとき"
  },
  "安静等待": {
    "zh-Hans": "安静等待",
    "zh-Hant": "安靜等待",
    "en": "Wait quietly",
    "ja": "静かに待つ"
  },
  "每 30 秒聊一句": {
    "zh-Hans": "每 30 秒聊一句",
    "zh-Hant": "每 30 秒聊一句",
    "en": "One line every 30 seconds",
    "ja": "30秒ごとに話す"
  },
  "每分钟聊一句": {
    "zh-Hans": "每分钟聊一句",
    "zh-Hant": "每分鐘聊一句",
    "en": "One line every minute",
    "ja": "1分ごとに話す"
  },
  "每 2 分钟聊一句": {
    "zh-Hans": "每 2 分钟聊一句",
    "zh-Hant": "每 2 分鐘聊一句",
    "en": "One line every 2 minutes",
    "ja": "2分ごとに話す"
  },
  "仅字幕（不生成声音）": {
    "zh-Hans": "仅字幕（不生成声音）",
    "zh-Hant": "僅字幕（不生成聲音）",
    "en": "Captions only (no voice generation)",
    "ja": "字幕のみ（音声を生成しない）"
  },
  "停止 AI": {
    "zh-Hans": "停止 AI",
    "zh-Hant": "停止 AI",
    "en": "Stop AI",
    "ja": "AIを停止"
  },
  "开始 AI 直播": {
    "zh-Hans": "开始 AI 直播",
    "zh-Hant": "開始 AI 直播",
    "en": "Start AI live",
    "ja": "AI配信を開始"
  },
  "LivLiv Stage · 输出": {
    "zh-Hans": "LivLiv Stage · 输出",
    "zh-Hant": "LivLiv Stage · 輸出",
    "en": "LivLiv Stage · Output",
    "ja": "LivLiv Stage · 出力"
  },
  "正在连接舞台…": {
    "zh-Hans": "正在连接舞台…",
    "zh-Hant": "正在連接舞台…",
    "en": "Connecting to stage…",
    "ja": "舞台に接続中…"
  },
  "· 输出画面不含编辑工具": {
    "zh-Hans": "· 输出画面不含编辑工具",
    "zh-Hant": "· 輸出畫面不含編輯工具",
    "en": "· Editing tools are hidden from output",
    "ja": "· 出力に編集ツールは表示されません"
  },
  "透明背景": {
    "zh-Hans": "透明背景",
    "zh-Hant": "透明背景",
    "en": "Transparent background",
    "ja": "透明背景"
  },
  "打开输出窗口。": {
    "zh-Hans": "打开输出窗口。",
    "zh-Hant": "打開輸出視窗。",
    "en": "Open the output window.",
    "ja": "出力ウィンドウを開きます。"
  },
  "在 OBS 添加「窗口采集」，选择「LivLiv Stage · 输出」。": {
    "zh-Hans": "在 OBS 添加「窗口采集」，选择「LivLiv Stage · 输出」。",
    "zh-Hant": "在 OBS 新增「視窗採集」，選擇「LivLiv Stage · 輸出」。",
    "en": "In OBS, add Window Capture and select LivLiv Stage · Output.",
    "ja": "OBSで「ウィンドウキャプチャ」を追加し、「LivLiv Stage · 出力」を選びます。"
  },
  "声音与背景设置": {
    "zh-Hans": "声音与背景设置",
    "zh-Hant": "聲音與背景設置",
    "en": "Audio & background",
    "ja": "音声と背景"
  },
  "角色声音：采集 LivLiv Stage 的应用音频。你的声音：添加麦克风音频输入。": {
    "zh-Hans": "角色声音：采集 LivLiv Stage 的应用音频。你的声音：添加麦克风音频输入。",
    "zh-Hant": "角色聲音：採集 LivLiv Stage 的應用音訊。你的聲音：新增麥克風音訊輸入。",
    "en": "Capture LivLiv Stage’s app audio for avatars, and microphone input for yourself.",
    "ja": "キャラクターにはLivLiv Stageのアプリ音声、自分の声にはマイク入力を追加します。"
  },
  "透明采集出现黑底时，切换绿幕并在 OBS 添加色度键滤镜。": {
    "zh-Hans": "透明采集出现黑底时，切换绿幕并在 OBS 添加色度键滤镜。",
    "zh-Hant": "透明採集出現黑底時，切換綠幕並在 OBS 新增色度鍵濾鏡。",
    "en": "If transparency appears black, use a green screen and add Chroma Key in OBS.",
    "ja": "透明部分が黒くなる場合はグリーンバックに切り替え、OBSでクロマキーを追加してください。"
  },
  "关闭输出窗口": {
    "zh-Hans": "关闭输出窗口",
    "zh-Hant": "關閉輸出視窗",
    "en": "Close output window",
    "ja": "出力ウィンドウを閉じる"
  },
  "打开输出窗口": {
    "zh-Hans": "打开输出窗口",
    "zh-Hant": "打開輸出視窗",
    "en": "Open output window",
    "ja": "出力ウィンドウを開く"
  },
  "输出窗口已打开": {
    "zh-Hans": "输出窗口已打开",
    "zh-Hant": "輸出視窗已打開",
    "en": "Output window is open",
    "ja": "出力ウィンドウは開いています"
  },
  "9:16 裁切": {
    "zh-Hans": "9:16 裁切",
    "zh-Hant": "9:16 裁切",
    "en": "9:16 crop",
    "ja": "9:16の切り抜き"
  },
  "缩小": {
    "zh-Hans": "缩小",
    "zh-Hant": "縮小",
    "en": "Zoom out",
    "ja": "縮小"
  },
  "放大": {
    "zh-Hans": "放大",
    "zh-Hant": "放大",
    "en": "Zoom in",
    "ja": "拡大"
  },
  "适应窗口（⇧1）": {
    "zh-Hans": "适应窗口（⇧1）",
    "zh-Hant": "適應視窗（⇧1）",
    "en": "Fit to window (⇧1)",
    "ja": "画面に合わせる（⇧1）"
  },
  "适应": {
    "zh-Hans": "适应",
    "zh-Hant": "適應",
    "en": "Fit",
    "ja": "フィット"
  },
  "字幕 · {0}": {
    "zh-Hans": "字幕 · {0}",
    "zh-Hant": "字幕 · {0}",
    "en": "Captions · {0}",
    "ja": "字幕 · {0}"
  },
  "朋友控制": {
    "zh-Hans": "朋友控制",
    "zh-Hant": "朋友控制",
    "en": "Friend controls",
    "ja": "フレンドが操作"
  },
  "锁定（不能拖动）": {
    "zh-Hans": "锁定（不能拖动）",
    "zh-Hant": "鎖定（不能拖動）",
    "en": "Lock position",
    "ja": "位置をロック"
  },
  "轮到你了": {
    "zh-Hans": "轮到你了",
    "zh-Hant": "輪到你了",
    "en": "Your turn",
    "ja": "あなたの番"
  },
  "在想…": {
    "zh-Hans": "在想…",
    "zh-Hant": "在想…",
    "en": "Thinking…",
    "ja": "考え中…"
  },
  "在说": {
    "zh-Hans": "在说",
    "zh-Hant": "在說",
    "en": "Speaking",
    "ja": "発話中"
  },
  "标题安全区": {
    "zh-Hans": "标题安全区",
    "zh-Hant": "標題安全區",
    "en": "Title safe area",
    "ja": "タイトルセーフ"
  },
  "平台顶栏": {
    "zh-Hans": "平台顶栏",
    "zh-Hant": "平台頂欄",
    "en": "App header",
    "ja": "アプリのヘッダー"
  },
  "标题、简介和评论": {
    "zh-Hans": "标题、简介和评论",
    "zh-Hant": "標題、簡介和評論",
    "en": "Title, description & comments",
    "ja": "タイトル・説明・コメント"
  },
  "按钮": {
    "zh-Hans": "按钮",
    "zh-Hant": "按鈕",
    "en": "Buttons",
    "ja": "ボタン"
  },
  "载入中…": {
    "zh-Hans": "载入中…",
    "zh-Hant": "載入中…",
    "en": "Loading…",
    "ja": "読み込み中…"
  },
  "重新加载": {
    "zh-Hans": "重新加载",
    "zh-Hant": "重新加載",
    "en": "Reload",
    "ja": "再読み込み"
  },
  "字幕 · 所有人": {
    "zh-Hans": "字幕 · 所有人",
    "zh-Hant": "字幕 · 所有人",
    "en": "Captions · everyone",
    "ja": "字幕 · 全員"
  },
  "这个模型需要更新版本的 Stage": {
    "zh-Hans": "这个模型需要更新版本的 Stage",
    "zh-Hant": "這個模型需要更新版本的 Stage",
    "en": "This model needs a newer Stage version",
    "ja": "このモデルには新しいバージョンのStageが必要です"
  },
  "这台电脑无法启动 WebGL2": {
    "zh-Hans": "这台电脑无法启动 WebGL2",
    "zh-Hant": "這台電腦無法啓動 WebGL2",
    "en": "WebGL2 could not start on this device",
    "ja": "この端末でWebGL2を起動できません"
  },
  "图形设备已重置，请重新加载角色": {
    "zh-Hans": "图形设备已重置，请重新加载角色",
    "zh-Hant": "圖形設備已重置，請重新加載角色",
    "en": "Graphics context reset; reload the avatar",
    "ja": "描画がリセットされました。キャラクターを再読み込みしてください"
  },
  "角色太多，这个角色显示不出来": {
    "zh-Hans": "角色太多，这个角色显示不出来",
    "zh-Hant": "角色太多，這個角色顯示不出來",
    "en": "Too many avatars to show this one",
    "ja": "キャラクターが多すぎて表示できません"
  },
  "舞台上的角色太多，这个浏览器显示不过来。浏览器里大约 {0} 个能正常显示，桌面版可以更多。请隐藏或移除一些角色。": {
    "zh-Hans": "舞台上的角色太多，这个浏览器显示不过来。浏览器里大约 {0} 个能正常显示，桌面版可以更多。请隐藏或移除一些角色。",
    "zh-Hant": "舞台上的角色太多，這個瀏覽器顯示不過來。瀏覽器裡大約 {0} 個能正常顯示，桌面版可以更多。請隱藏或移除一些角色。",
    "en": "Too many avatars on stage for this browser. About {0} work well in a browser, more in the desktop app. Hide or remove some.",
    "ja": "ステージのキャラクターが多すぎて、このブラウザーでは表示しきれません。ブラウザーでは{0}体ほどまで、デスクトップ版ではもっと表示できます。いくつか非表示にするか削除してください。"
  },
  "舞台上的角色太多，显示不过来。桌面版大约 {0} 个能正常显示。请隐藏或移除一些角色。": {
    "zh-Hans": "舞台上的角色太多，显示不过来。桌面版大约 {0} 个能正常显示。请隐藏或移除一些角色。",
    "zh-Hant": "舞台上的角色太多，顯示不過來。桌面版大約 {0} 個能正常顯示。請隱藏或移除一些角色。",
    "en": "Too many avatars on stage. About {0} work well in the desktop app. Hide or remove some.",
    "ja": "ステージのキャラクターが多すぎて表示しきれません。デスクトップ版では{0}体ほどまで表示できます。いくつか非表示にするか削除してください。"
  },
  "这个模型超出了播放器的大小限制": {
    "zh-Hans": "这个模型超出了播放器的大小限制",
    "zh-Hant": "這個模型超出了播放器的大小限制",
    "en": "This model exceeds the player’s size limit",
    "ja": "モデルがプレイヤーのサイズ上限を超えています"
  },
  "模型读取失败，请检查文件或网络": {
    "zh-Hans": "模型读取失败，请检查文件或网络",
    "zh-Hant": "模型讀取失敗，請檢查檔案或網路",
    "en": "Could not load model; check the files or network",
    "ja": "モデルを読み込めません。ファイルまたは接続を確認してください"
  },
  "模型文件有问题：": {
    "zh-Hans": "模型文件有问题：",
    "zh-Hant": "模型檔案有問題：",
    "en": "Invalid model file: ",
    "ja": "モデルファイルに問題があります："
  },
  "演示声音读取失败（": {
    "zh-Hans": "演示声音读取失败（",
    "zh-Hant": "演示聲音讀取失敗（",
    "en": "Could not load demo audio (",
    "ja": "デモ音声を読み込めません（"
  },
  "声音文件无法播放": {
    "zh-Hans": "声音文件无法播放",
    "zh-Hant": "聲音檔案無法播放",
    "en": "This audio file cannot be played",
    "ja": "この音声ファイルを再生できません"
  },
  "声音播放失败，请检查声音设置": {
    "zh-Hans": "声音播放失败，请检查声音设置",
    "zh-Hant": "聲音播放失敗，請檢查聲音設置",
    "en": "Audio playback failed; check voice settings",
    "ja": "音声を再生できません。音声設定を確認してください"
  },
  "这台电脑上没有这个导入的角色，请重新导入": {
    "zh-Hans": "这台电脑上没有这个导入的角色，请重新导入",
    "zh-Hant": "這台電腦上沒有這個導入的角色，請重新導入",
    "en": "This imported avatar is missing on this device; import it again",
    "ja": "この端末にモデルがありません。再度インポートしてください"
  },
  "闭嘴": {
    "zh-Hans": "闭嘴",
    "zh-Hant": "閉嘴",
    "en": "Mouth closed",
    "ja": "口を閉じる"
  },
  "张嘴": {
    "zh-Hans": "张嘴",
    "zh-Hant": "張嘴",
    "en": "Mouth open",
    "ja": "口を開く"
  },
  "闭眼": {
    "zh-Hans": "闭眼",
    "zh-Hant": "閉眼",
    "en": "Eyes closed",
    "ja": "目を閉じる"
  },
  "闭眼张嘴": {
    "zh-Hans": "闭眼张嘴",
    "zh-Hant": "閉眼張嘴",
    "en": "Eyes closed, mouth open",
    "ja": "目を閉じて口を開く"
  },
  "通义千问": {
    "zh-Hans": "通义千问",
    "zh-Hant": "通義千問",
    "en": "Qwen",
    "ja": "Qwen"
  },
  "智谱": {
    "zh-Hans": "智谱",
    "zh-Hant": "智譜",
    "en": "Zhipu",
    "ja": "Zhipu"
  },
  "硅基流动": {
    "zh-Hans": "硅基流动",
    "zh-Hant": "硅基流動",
    "en": "SiliconFlow",
    "ja": "SiliconFlow"
  },
  "其他": {
    "zh-Hans": "其他",
    "zh-Hant": "其他",
    "en": "Other",
    "ja": "その他"
  },
  "连不上 {0}": {
    "zh-Hans": "连不上 {0}",
    "zh-Hant": "連不上 {0}",
    "en": "Could not connect to {0}",
    "ja": "{0}に接続できません"
  },
  "密钥不对": {
    "zh-Hans": "密钥不对",
    "zh-Hant": "金鑰不對",
    "en": "Invalid API key",
    "ja": "APIキーが正しくありません"
  },
  "这个密钥用不了这个模型": {
    "zh-Hans": "这个密钥用不了这个模型",
    "zh-Hant": "這個金鑰用不了這個模型",
    "en": "This key cannot access this model",
    "ja": "このキーではモデルを利用できません"
  },
  "没有这个模型，换一个试试": {
    "zh-Hans": "没有这个模型，换一个试试",
    "zh-Hant": "沒有這個模型，換一個試試",
    "en": "Model not found; choose another one",
    "ja": "モデルが見つかりません。別のモデルを選んでください"
  },
  "额度用完了，或者请求太快": {
    "zh-Hans": "额度用完了，或者请求太快",
    "zh-Hant": "額度用完了，或者請求太快",
    "en": "Quota exhausted or too many requests",
    "ja": "利用枠の上限、またはリクエスト数の制限に達しました"
  },
  "这家服务暂时出问题了，稍后再试": {
    "zh-Hans": "这家服务暂时出问题了，稍后再试",
    "zh-Hant": "這家服務暫時出問題了，稍後再試",
    "en": "Provider unavailable; try again later",
    "ja": "接続先で問題が発生しています。後でもう一度お試しください"
  },
  "这个模型不接受这次请求，换一个试试": {
    "zh-Hans": "这个模型不接受这次请求，换一个试试",
    "zh-Hant": "這個模型不接受這次請求，換一個試試",
    "en": "This model rejected the request; try another model",
    "ja": "モデルがリクエストを受け付けません。別のモデルをお試しください"
  },
  "演示是两段准备好的对话：放上「双人对谈」或「三人闲聊」模板再开始": {
    "zh-Hans": "演示是两段准备好的对话：放上「双人对谈」或「三人闲聊」模板再开始",
    "zh-Hant": "演示是兩段準備好的對話：放上「雙人對談」或「三人閒聊」模板再開始",
    "en": "For the demo, start with Two-avatar chat or Three-avatar chat",
    "ja": "デモは「2人で対話」または「3人で対話」のテンプレートで体験できます"
  },
  "角色文件读取失败（": {
    "zh-Hans": "角色文件读取失败（",
    "zh-Hant": "角色檔案讀取失敗（",
    "en": "Could not load avatar file (",
    "ja": "キャラクターのファイルを読み込めません（"
  },
  "联播角色不能超过 64 MB": {
    "zh-Hans": "联播角色不能超过 64 MB",
    "zh-Hant": "聯播角色不能超過 64 MB",
    "en": "Collab avatars must be under 64 MB",
    "ja": "コラボのモデルは64MB以下にしてください"
  },
  "这个角色的文件数量超出联播限制": {
    "zh-Hans": "这个角色的文件数量超出联播限制",
    "zh-Hant": "這個角色的檔案數量超出聯播限制",
    "en": "This avatar has too many files for collab",
    "ja": "コラボ用モデルのファイル数が上限を超えています"
  },
  "这个角色超出联播限制（64 MB、512 个文件）": {
    "zh-Hans": "这个角色超出联播限制（64 MB、512 个文件）",
    "zh-Hant": "這個角色超出聯播限制（64 MB、512 個檔案）",
    "en": "This avatar exceeds collab limits (64 MB, 512 files)",
    "ja": "コラボの上限（64MB・512ファイル）を超えています"
  },
  "联播连接已关闭": {
    "zh-Hans": "联播连接已关闭",
    "zh-Hant": "聯播連接已關閉",
    "en": "Collab connection closed",
    "ja": "コラボの接続が閉じられました"
  },
  "朋友已经分享了一个角色": {
    "zh-Hans": "朋友已经分享了一个角色",
    "zh-Hant": "朋友已經分享了一個角色",
    "en": "This friend has already shared a avatar",
    "ja": "このフレンドはすでにキャラクターを共有しています"
  },
  "收到的角色文件清单有问题": {
    "zh-Hans": "收到的角色文件清单有问题",
    "zh-Hant": "收到的角色檔案清單有問題",
    "en": "Invalid avatar file manifest",
    "ja": "モデルのファイル一覧が正しくありません"
  },
  "收到的角色数据有问题": {
    "zh-Hans": "收到的角色数据有问题",
    "zh-Hant": "收到的角色資料有問題",
    "en": "Invalid avatar data received",
    "ja": "受信したモデルデータが正しくありません"
  },
  "角色文件没有传完": {
    "zh-Hans": "角色文件没有传完",
    "zh-Hant": "角色檔案沒有傳完",
    "en": "Avatar transfer is incomplete",
    "ja": "モデルの転送が完了していません"
  },
  "这个角色包太大，没有载入（解压后最多 128 MB、2048 个文件）": {
    "zh-Hans": "这个角色包太大，没有载入（解压后最多 128 MB、2048 个文件）",
    "zh-Hant": "這個角色包太大，沒有載入（解壓後最多 128 MB、2048 個檔案）",
    "en": "This avatar is too large to load (128 MB and 2,048 files unpacked at most)",
    "ja": "モデルが大きすぎるため読み込みませんでした（展開後128MB・2048ファイルまで）"
  },
  "这个角色的图片太大，没有载入": {
    "zh-Hans": "这个角色的图片太大，没有载入",
    "zh-Hant": "這個角色的圖片太大，沒有載入",
    "en": "This avatar’s images are too large to load",
    "ja": "画像が大きすぎるため、モデルを読み込みませんでした"
  },
  "这个角色里有无法检查的文件，没有载入": {
    "zh-Hans": "这个角色里有无法检查的文件，没有载入",
    "zh-Hant": "這個角色裡有無法檢查的檔案，沒有載入",
    "en": "This avatar has files that can’t be checked, so it wasn’t loaded",
    "ja": "確認できないファイルがあるため、モデルを読み込みませんでした"
  },
  "麦克风未连接：": {
    "zh-Hans": "麦克风未连接：",
    "zh-Hant": "麥克風未連接：",
    "en": "Microphone unavailable: ",
    "ja": "マイクを接続できません："
  },
  "联播服务地址不对": {
    "zh-Hans": "联播服务地址不对",
    "zh-Hant": "聯播服務地址不對",
    "en": "Invalid collab server address",
    "ja": "コラボサーバーのアドレスが正しくありません"
  },
  "公网联播服务要用 wss:// 地址": {
    "zh-Hans": "公网联播服务要用 wss:// 地址",
    "zh-Hant": "公網聯播服務要用 wss:// 地址",
    "en": "Public collab servers need a wss:// address",
    "ja": "公開されたコラボサーバーには wss:// のアドレスが必要です"
  },
  "邀请码不完整，请重新复制": {
    "zh-Hans": "邀请码不完整，请重新复制",
    "zh-Hant": "邀請碼不完整，請重新複製",
    "en": "Invite code is incomplete; copy it again",
    "ja": "招待コードが不完全です。もう一度コピーしてください"
  },
  "角色文件缺少图层": {
    "zh-Hans": "角色文件缺少图层",
    "zh-Hant": "角色檔案缺少圖層",
    "en": "Avatar file has no layers",
    "ja": "モデルファイルにレイヤーがありません"
  },
  "角色图层有问题": {
    "zh-Hans": "角色图层有问题",
    "zh-Hant": "角色圖層有問題",
    "en": "Invalid avatar layers",
    "ja": "モデルのレイヤーが正しくありません"
  },
  "角色包含无效文件路径": {
    "zh-Hans": "角色包含无效文件路径",
    "zh-Hant": "角色包含無效檔案路徑",
    "en": "Avatar contains invalid file paths",
    "ja": "モデルに無効なファイルパスが含まれています"
  },
  "角色资源超出模型目录": {
    "zh-Hans": "角色资源超出模型目录",
    "zh-Hant": "角色資源超出模型目錄",
    "en": "Avatar resources must stay in the model folder",
    "ja": "モデルのリソースがモデルフォルダーの外を参照しています"
  },
  "联播成员信息有问题": {
    "zh-Hans": "联播成员信息有问题",
    "zh-Hant": "聯播成員資訊有問題",
    "en": "Invalid collab member data",
    "ja": "コラボ参加者の情報が正しくありません"
  },
  "联播成员重复": {
    "zh-Hans": "联播成员重复",
    "zh-Hant": "聯播成員重復",
    "en": "Duplicate collab members",
    "ja": "コラボ参加者が重複しています"
  },
  "联播服务未连接，请检查服务地址": {
    "zh-Hans": "联播服务未连接，请检查服务地址",
    "zh-Hant": "聯播服務未連接，請檢查服務地址",
    "en": "Could not connect to collab server; check its address",
    "ja": "コラボサーバーに接続できません。アドレスを確認してください"
  },
  "联播连接已断开": {
    "zh-Hans": "联播连接已断开",
    "zh-Hant": "聯播連接已斷開",
    "en": "Collab disconnected",
    "ja": "コラボの接続が切れました"
  },
  "请选择自己的角色": {
    "zh-Hans": "请选择自己的角色",
    "zh-Hant": "請選擇自己的角色",
    "en": "Choose your own avatar",
    "ja": "自分のキャラクターを選んでください"
  },
  "联播服务消息有问题": {
    "zh-Hans": "联播服务消息有问题",
    "zh-Hant": "聯播服務消息有問題",
    "en": "Invalid collab server message",
    "ja": "コラボサーバーのメッセージが正しくありません"
  },
  "联播已结束": {
    "zh-Hans": "联播已结束",
    "zh-Hant": "聯播已結束",
    "en": "Collab ended",
    "ja": "コラボは終了しました"
  },
  "联播服务版本不兼容": {
    "zh-Hans": "联播服务版本不兼容",
    "zh-Hant": "聯播服務版本不兼容",
    "en": "Incompatible collab server version",
    "ja": "コラボサーバーのバージョンが対応していません"
  },
  "联播身份有问题": {
    "zh-Hans": "联播身份有问题",
    "zh-Hant": "聯播身份有問題",
    "en": "Could not verify your collab identity",
    "ja": "コラボの参加者情報を確認できません"
  },
  "连接候选过多": {
    "zh-Hans": "连接候选过多",
    "zh-Hant": "連接候選過多",
    "en": "Too many connection candidates",
    "ja": "接続候補が多すぎます"
  },
  "连接没有建立：": {
    "zh-Hans": "连接没有建立：",
    "zh-Hant": "連接沒有建立：",
    "en": "Connection failed: ",
    "ja": "接続できませんでした："
  },
  "与这位朋友的连接失败": {
    "zh-Hans": "与这位朋友的连接失败",
    "zh-Hant": "與這位朋友的連接失敗",
    "en": "Could not connect to this friend",
    "ja": "このフレンドに接続できません"
  },
  "收到的角色动作有问题": {
    "zh-Hans": "收到的角色动作有问题",
    "zh-Hant": "收到的角色動作有問題",
    "en": "Invalid avatar pose received",
    "ja": "受信したキャラクターの動きが正しくありません"
  },
  "联播消息过大": {
    "zh-Hans": "联播消息过大",
    "zh-Hant": "聯播消息過大",
    "en": "Collab message is too large",
    "ja": "コラボのメッセージが大きすぎます"
  },
  "联播消息无效": {
    "zh-Hans": "联播消息无效",
    "zh-Hant": "聯播消息無效",
    "en": "Invalid collab message",
    "ja": "コラボのメッセージが正しくありません"
  },
  "角色同步已断开": {
    "zh-Hans": "角色同步已断开",
    "zh-Hant": "角色同步已斷開",
    "en": "Avatar sync disconnected",
    "ja": "キャラクターの同期が切れました"
  },
  "角色没有分享成功：": {
    "zh-Hans": "角色没有分享成功：",
    "zh-Hant": "角色沒有分享成功：",
    "en": "Could not share avatar: ",
    "ja": "キャラクターを共有できませんでした："
  },
  "共享角色已更换，联播已结束": {
    "zh-Hans": "共享角色已更换，联播已结束",
    "zh-Hant": "共享角色已更換，聯播已結束",
    "en": "Shared avatar changed; collab ended",
    "ja": "共有キャラクターが変更されたため、コラボを終了しました"
  },
  "请输入你的名字": {
    "zh-Hans": "请输入你的名字",
    "zh-Hant": "請輸入你的名字",
    "en": "Enter your name",
    "ja": "名前を入力してください"
  },
  "请先载入自己的角色": {
    "zh-Hans": "请先载入自己的角色",
    "zh-Hant": "請先載入自己的角色",
    "en": "Load your own avatar first",
    "ja": "先に自分のキャラクターを読み込んでください"
  },
  "我": {
    "zh-Hans": "我",
    "zh-Hant": "我",
    "en": "Me",
    "ja": "自分"
  },
  "角色还没有声音，请设置声音或选择仅字幕": {
    "zh-Hans": "角色还没有声音，请设置声音或选择仅字幕",
    "zh-Hant": "角色還沒有聲音，請設置聲音或選擇僅字幕",
    "en": "Set up a voice or choose captions only",
    "ja": "音声を設定するか「字幕のみ」を選んでください"
  },
  "弹幕 · {0}": {
    "zh-Hans": "弹幕 · {0}",
    "zh-Hant": "彈幕 · {0}",
    "en": "Chat · {0}",
    "ja": "コメント · {0}"
  },
  "舞台上还没有会说话的角色：给角色选「AI」或「我来说」": {
    "zh-Hans": "舞台上还没有会说话的角色：给角色选「AI」或「我来说」",
    "zh-Hant": "舞台上還沒有會說話的角色：給角色選「AI」或「我來說」",
    "en": "Choose AI or You control for a avatar first",
    "ja": "キャラクターに「AIで操作」または「自分で操作」を選んでください"
  },
  "AI 主播需要接上模型；离线演示可在「对谈」里体验": {
    "zh-Hans": "AI 主播需要接上模型；离线演示可在「对谈」里体验",
    "zh-Hant": "AI 主播需要接上模型；離線演示可在「對談」里體驗",
    "en": "AI live needs a model; try the offline demo in Chat",
    "ja": "AI配信にはモデルの接続が必要です。「対話」でオフラインデモを試せます"
  },
  "先添加一个「AI 来演」的角色": {
    "zh-Hans": "先添加一个「AI 来演」的角色",
    "zh-Hant": "先新增一個「AI 來演」的角色",
    "en": "Add an AI-controlled avatar first",
    "ja": "先に「AIで操作」のキャラクターを追加してください"
  },
  "AI 角色还没有声音，请在设置里接上声音，或选择「仅字幕」": {
    "zh-Hans": "AI 角色还没有声音，请在设置里接上声音，或选择「仅字幕」",
    "zh-Hant": "AI 角色還沒有聲音，請在設置里接上聲音，或選擇「僅字幕」",
    "en": "Set up AI voices or choose captions only",
    "ja": "AIの音声を設定するか「字幕のみ」を選んでください"
  },
  "已达到本次时长上限": {
    "zh-Hans": "已达到本次时长上限",
    "zh-Hant": "已達到本次時長上限",
    "en": "Session time limit reached",
    "ja": "今回の時間上限に達しました"
  },
  "有 AI 角色尚未载入，请检查角色列表": {
    "zh-Hans": "有 AI 角色尚未载入，请检查角色列表",
    "zh-Hant": "有 AI 角色尚未載入，請檢查角色列表",
    "en": "Some AI avatars are not loaded; check the cast",
    "ja": "未読み込みのAIキャラクターがあります。キャストを確認してください"
  },
  "舞台上没有已就绪的 AI 角色": {
    "zh-Hans": "舞台上没有已就绪的 AI 角色",
    "zh-Hant": "舞台上沒有已就緒的 AI 角色",
    "en": "No AI avatars are ready on stage",
    "ja": "準備のできたAIキャラクターがいません"
  },
  "已达到本次生成次数上限": {
    "zh-Hans": "已达到本次生成次数上限",
    "zh-Hant": "已達到本次生成次數上限",
    "en": "Session generation limit reached",
    "ja": "今回の生成回数の上限に達しました"
  },
  "会话因错误停止": {
    "zh-Hans": "会话因错误停止",
    "zh-Hant": "會話因錯誤停止",
    "en": "Session stopped after an error",
    "ja": "エラーでセッションを停止しました"
  },
  "已手动停止": {
    "zh-Hans": "已手动停止",
    "zh-Hant": "已手動停止",
    "en": "Stopped manually",
    "ja": "手動で停止しました"
  },
  "观众": {
    "zh-Hans": "观众",
    "zh-Hant": "觀眾",
    "en": "Viewer",
    "ja": "視聴者"
  },
  "连接中断，正在重试": {
    "zh-Hans": "连接中断，正在重试",
    "zh-Hant": "連接中斷，正在重試",
    "en": "Disconnected; retrying",
    "ja": "接続が切れました。再接続中です"
  },
  "连接中断，": {
    "zh-Hans": "连接中断，",
    "zh-Hant": "連接中斷，",
    "en": "Disconnected; retrying in ",
    "ja": "接続が切れました。"
  },
  " 秒后重试": {
    "zh-Hans": " 秒后重试",
    "zh-Hant": " 秒後重試",
    "en": " seconds",
    "ja": "秒後に再接続します"
  },
  "无法连接 Twitch，请检查网络后重新连接": {
    "zh-Hans": "无法连接 Twitch，请检查网络后重新连接",
    "zh-Hant": "無法連接 Twitch，請檢查網路後重新連接",
    "en": "Could not connect to Twitch; check the network and reconnect",
    "ja": "Twitchに接続できません。ネットワークを確認して再接続してください"
  },
  "频道名不对：请输入 twitch.tv/ 后面的频道名": {
    "zh-Hans": "频道名不对：请输入 twitch.tv/ 后面的频道名",
    "zh-Hant": "頻道名不對：請輸入 twitch.tv/ 後面的頻道名",
    "en": "Enter the channel name after twitch.tv/",
    "ja": "twitch.tv/ 以降のチャンネル名を入力してください"
  },
  "恢复表情": {
    "zh-Hans": "恢复表情",
    "zh-Hant": "恢復表情",
    "en": "Reset expression",
    "ja": "表情を戻す"
  },
  "静音所有角色声音": {
    "zh-Hans": "静音所有角色声音",
    "zh-Hant": "靜音所有角色聲音",
    "en": "Mute all avatar voices",
    "ja": "全キャラクターの音声をミュート"
  },
  "暂停 / 继续 AI": {
    "zh-Hans": "暂停 / 继续 AI",
    "zh-Hant": "暫停 / 繼續 AI",
    "en": "Pause / resume AI",
    "ja": "AIを一時停止 / 再開"
  },
  "开始 / 结束语音输入": {
    "zh-Hans": "开始 / 结束语音输入",
    "zh-Hant": "開始 / 結束語音輸入",
    "en": "Start / finish voice input",
    "ja": "音声入力を開始 / 終了"
  },
  "表情 ": {
    "zh-Hans": "表情 ",
    "zh-Hant": "表情 ",
    "en": "Expression ",
    "ja": "表情 "
  },
  "设备已切换，但无法保存；下次打开需要重新选择": {
    "zh-Hans": "设备已切换，但无法保存；下次打开需要重新选择",
    "zh-Hant": "設備已切換，但無法保存；下次打開需要重新選擇",
    "en": "Device changed, but could not save it; select it again next time",
    "ja": "デバイスを切り替えましたが保存できませんでした。次回もう一度選択してください"
  },
  "设备列表": {
    "zh-Hans": "设备列表",
    "zh-Hant": "設備列表",
    "en": "Device list",
    "ja": "デバイス一覧"
  },
  "找不到{0}，请选择其他设备": {
    "zh-Hans": "找不到{0}，请选择其他设备",
    "zh-Hant": "找不到{0}，請選擇其他設備",
    "en": "{0} not found; choose another device",
    "ja": "{0}が見つかりません。別のデバイスを選んでください"
  },
  "{0}权限未开放，请在系统或浏览器设置里允许": {
    "zh-Hans": "{0}权限未开放，请在系统或浏览器设置里允许",
    "zh-Hant": "{0}權限未開放，請在系統或瀏覽器設置里允許",
    "en": "Allow {0} access in your system or browser settings",
    "ja": "システムまたはブラウザーの設定で{0}を許可してください"
  },
  "{0}无法打开，请检查是否被其他程序占用": {
    "zh-Hans": "{0}无法打开，请检查是否被其他程序占用",
    "zh-Hant": "{0}無法打開，請檢查是否被其他程序佔用",
    "en": "Could not open {0}; check whether another app is using it",
    "ja": "{0}を開けません。他のアプリで使用していないか確認してください"
  },
  "{0}没有打开：{1}": {
    "zh-Hans": "{0}没有打开：{1}",
    "zh-Hant": "{0}沒有打開：{1}",
    "en": "Could not open {0}: {1}",
    "ja": "{0}を開けません：{1}"
  },
  "标签：{0}": {
    "zh-Hans": "标签：{0}",
    "zh-Hant": "標籤：{0}",
    "en": "Tags: {0}",
    "ja": "タグ：{0}"
  },
  "{0} · 精修": {
    "zh-Hans": "{0} · 精修",
    "zh-Hant": "{0} · 精修",
    "en": "{0} · Refined",
    "ja": "{0} · 精細版"
  },
  "没有 {0} 这个角色": {
    "zh-Hans": "没有 {0} 这个角色",
    "zh-Hant": "沒有 {0} 這個角色",
    "en": "Avatar {0} was not found",
    "ja": "キャラクター{0}が見つかりません"
  },
  "拿不到 {0}（{1}）": {
    "zh-Hans": "拿不到 {0}（{1}）",
    "zh-Hant": "拿不到 {0}（{1}）",
    "en": "Could not load {0} ({1})",
    "ja": "{0}を取得できません（{1}）"
  },
  "里面没有 model.json：选 LivLiv 导出的模型包（.livliv、zip 或文件夹）": {
    "zh-Hans": "里面没有 model.json：选 LivLiv 导出的模型包（.livliv、zip 或文件夹）",
    "zh-Hant": "裡面沒有 model.json：選 LivLiv 導出的模型包（.livliv、zip 或檔案夾）",
    "en": "No model.json found. Choose a LivLiv .livliv, ZIP or model folder.",
    "ja": "model.jsonがありません。LivLivの.livliv・ZIP・モデルフォルダーを選んでください。"
  },
  "LivLiv 返回 {0}": {
    "zh-Hans": "LivLiv 返回 {0}",
    "zh-Hant": "LivLiv 返回 {0}",
    "en": "livliv.ai returned {0}",
    "ja": "livliv.aiからの応答：{0}"
  },
  "登录过期了，重新登录一下": {
    "zh-Hans": "登录过期了，重新登录一下",
    "zh-Hant": "登錄過期了，重新登錄一下",
    "en": "Your session expired; sign in again",
    "ja": "ログインの期限が切れました。再度ログインしてください"
  },
  "连不上 LivLiv": {
    "zh-Hans": "连不上 LivLiv",
    "zh-Hant": "連不上 LivLiv",
    "en": "Could not connect to livliv.ai",
    "ja": "livliv.aiに接続できません"
  },
  "浏览器": {
    "zh-Hans": "浏览器",
    "zh-Hant": "瀏覽器",
    "en": "Browser",
    "ja": "ブラウザー"
  },
  "网页上选了不允许": {
    "zh-Hans": "网页上选了不允许",
    "zh-Hant": "網頁上選了不允許",
    "en": "Sign-in was declined in the browser",
    "ja": "ブラウザーでログインが許可されませんでした"
  },
  "连接码过期了": {
    "zh-Hans": "连接码过期了",
    "zh-Hant": "連接碼過期了",
    "en": "Sign-in code expired",
    "ja": "ログインコードの期限が切れました"
  },
  "现在登录不了，稍后再试": {
    "zh-Hans": "现在登录不了，稍后再试",
    "zh-Hant": "現在登錄不了，稍後再試",
    "en": "Could not sign in; try again later",
    "ja": "ログインできませんでした。後でもう一度お試しください"
  },
  "还没退出：连不上 LivLiv，稍后再试": {
    "zh-Hans": "还没退出：连不上 LivLiv，稍后再试",
    "zh-Hant": "還沒退出：連不上 LivLiv，稍後再試",
    "en": "Could not sign out; connect to livliv.ai and try again",
    "ja": "ログアウトできませんでした。livliv.aiへの接続後にもう一度お試しください"
  },
  "这句没有配出声音": {
    "zh-Hans": "这句没有配出声音",
    "zh-Hant": "這句沒有配出聲音",
    "en": "No audio was generated for this line",
    "ja": "この台詞の音声を生成できませんでした"
  },
  "在设置里接上语音识别后可用": {
    "zh-Hans": "在设置里接上语音识别后可用",
    "zh-Hant": "在設置里接上語音識別後可用",
    "en": "Connect speech recognition in Settings",
    "ja": "設定で音声認識を接続すると利用できます"
  },
  "麦克风没有打开：{0}": {
    "zh-Hans": "麦克风没有打开：{0}",
    "zh-Hant": "麥克風沒有打開：{0}",
    "en": "Could not open microphone: {0}",
    "ja": "マイクを開けません：{0}"
  },
  "录音太短，请再说一次": {
    "zh-Hans": "录音太短，请再说一次",
    "zh-Hant": "錄音太短，請再說一次",
    "en": "Recording too short; try again",
    "ja": "録音が短すぎます。もう一度話してください"
  },
  "没听清，请再说一次": {
    "zh-Hans": "没听清，请再说一次",
    "zh-Hant": "沒聽清，請再說一次",
    "en": "Could not hear clearly; try again",
    "ja": "聞き取れませんでした。もう一度話してください"
  },
  "视频没有做出来：{0}": {
    "zh-Hans": "视频没有做出来：{0}",
    "zh-Hant": "影片沒有做出來：{0}",
    "en": "Could not export video: {0}",
    "ja": "動画を書き出せませんでした：{0}"
  },
  "录制中的声音文件无法解码": {
    "zh-Hans": "录制中的声音文件无法解码",
    "zh-Hant": "錄制中的聲音檔案無法解碼",
    "en": "Could not decode recorded audio",
    "ja": "録音した音声をデコードできません"
  },
  "这个浏览器做不了视频（要能用 WebCodecs 编 H.264）": {
    "zh-Hans": "这个浏览器做不了视频（要能用 WebCodecs 编 H.264）",
    "zh-Hant": "這個瀏覽器做不了影片（要能用 WebCodecs 編 H.264）",
    "en": "This browser needs H.264 WebCodecs support to export video",
    "ja": "動画の書き出しにはH.264のWebCodecs対応が必要です"
  },
  "已取消": {
    "zh-Hans": "已取消",
    "zh-Hant": "已取消",
    "en": "Cancelled",
    "ja": "キャンセルしました"
  },
  "AI 生成：LivLiv Stage（livliv.ai）": {
    "zh-Hans": "AI 生成：LivLiv Stage（livliv.ai）",
    "zh-Hant": "AI 生成：LivLiv Stage（livliv.ai）",
    "en": "AI generated: LivLiv Stage (livliv.ai)",
    "ja": "AI生成：LivLiv Stage（livliv.ai）"
  },
  "自动": {
    "zh-Hans": "自动",
    "zh-Hant": "自動",
    "en": "Auto",
    "ja": "自動"
  },
  "自己呼吸、眨眼、看来看去，看着说话的人": {
    "zh-Hans": "自己呼吸、眨眼、看来看去，看着说话的人",
    "zh-Hant": "自己呼吸、眨眼、看來看去，看著說話的人",
    "en": "Breathes, blinks, looks around and follows the speaker",
    "ja": "呼吸やまばたきをし、話している人に視線を向けます"
  },
  "面捕": {
    "zh-Hans": "面捕",
    "zh-Hant": "面捕",
    "en": "Face tracking",
    "ja": "フェイストラッキング"
  },
  "摄像头里的你": {
    "zh-Hans": "摄像头里的你",
    "zh-Hant": "攝影機裡的你",
    "en": "Follow your camera",
    "ja": "カメラのあなたに追従"
  },
  "面捕回放": {
    "zh-Hans": "面捕回放",
    "zh-Hant": "面捕回放",
    "en": "Face replay",
    "ja": "フェイス再生"
  },
  "内置的一段面捕，没有摄像头时试用": {
    "zh-Hans": "内置的一段面捕，没有摄像头时试用",
    "zh-Hant": "內置的一段面捕，沒有攝影機時試用",
    "en": "Try a built-in face trace without a camera",
    "ja": "カメラなしでサンプルの顔の動きを再生"
  },
  "你说话时张嘴": {
    "zh-Hans": "你说话时张嘴",
    "zh-Hant": "你說話時張嘴",
    "en": "Your voice opens the mouth",
    "ja": "マイクの声に合わせて口を動かす"
  },
  "跟随鼠标": {
    "zh-Hans": "跟随鼠标",
    "zh-Hant": "跟隨滑鼠",
    "en": "Follow mouse",
    "ja": "マウスに追従"
  },
  "头和眼睛跟着鼠标看": {
    "zh-Hans": "头和眼睛跟着鼠标看",
    "zh-Hant": "頭和眼睛跟著滑鼠看",
    "en": "Head and eyes follow your mouse",
    "ja": "頭と視線をマウスに合わせる"
  },
  "AI 按人设想台词，自己接话": {
    "zh-Hans": "AI 按人设想台词，自己接话",
    "zh-Hant": "AI 按人設想台詞，自己接話",
    "en": "AI writes and speaks in avatar",
    "ja": "設定に合わせてAIが台詞を考えます"
  },
  "我来说": {
    "zh-Hans": "我来说",
    "zh-Hant": "我來說",
    "en": "Your lines",
    "ja": "自分で話す"
  },
  "你在底部控制台替它说话": {
    "zh-Hans": "你在底部控制台替它说话",
    "zh-Hant": "你在底部控制台替它說話",
    "en": "Speak for this avatar from the console",
    "ja": "下のコンソールからこのキャラクターとして話す"
  },
  "不说话": {
    "zh-Hans": "不说话",
    "zh-Hant": "不說話",
    "en": "Silent",
    "ja": "話さない"
  },
  "只在旁边听、做反应": {
    "zh-Hans": "只在旁边听、做反应",
    "zh-Hant": "只在旁邊聽、做反應",
    "en": "Listen and react without speaking",
    "ja": "話さずに聞いて反応する"
  },
  "安静": {
    "zh-Hans": "安静",
    "zh-Hant": "安靜",
    "en": "Calm",
    "ja": "穏やか"
  },
  "自然": {
    "zh-Hans": "自然",
    "zh-Hant": "自然",
    "en": "Natural",
    "ja": "自然"
  },
  "活泼": {
    "zh-Hans": "活泼",
    "zh-Hant": "活潑",
    "en": "Lively",
    "ja": "活発"
  },
  "看说话的人": {
    "zh-Hans": "看说话的人",
    "zh-Hant": "看說話的人",
    "en": "Look at speaker",
    "ja": "話す人を見る"
  },
  "看镜头": {
    "zh-Hans": "看镜头",
    "zh-Hant": "看鏡頭",
    "en": "Look at camera",
    "ja": "カメラを見る"
  },
  "随意": {
    "zh-Hans": "随意",
    "zh-Hant": "隨意",
    "en": "Look around",
    "ja": "自由に見る"
  },
  "话少": {
    "zh-Hans": "话少",
    "zh-Hant": "話少",
    "en": "Short",
    "ja": "短め"
  },
  "话多": {
    "zh-Hans": "话多",
    "zh-Hant": "話多",
    "en": "Long",
    "ja": "長め"
  },
  "气泡": {
    "zh-Hans": "气泡",
    "zh-Hant": "氣泡",
    "en": "Bubble",
    "ja": "吹き出し"
  },
  "字幕条": {
    "zh-Hans": "字幕条",
    "zh-Hant": "字幕條",
    "en": "Caption bar",
    "ja": "字幕バー"
  },
  "综艺": {
    "zh-Hans": "综艺",
    "zh-Hant": "綜藝",
    "en": "Pop",
    "ja": "ポップ"
  },
  "极简": {
    "zh-Hans": "极简",
    "zh-Hant": "極簡",
    "en": "Minimal",
    "ja": "シンプル"
  },
  "自由": {
    "zh-Hans": "自由",
    "zh-Hant": "自由",
    "en": "Free",
    "ja": "自由"
  },
  "被点名的人接话，否则看谁话多、谁沉默得久；你随时可以插话": {
    "zh-Hans": "被点名的人接话，否则看谁话多、谁沉默得久；你随时可以插话",
    "zh-Hant": "被點名的人接話，否則看誰話多、誰沈默得久；你隨時可以插話",
    "en": "Answer when called on, or take turns naturally; you can join anytime",
    "ja": "呼ばれた人が答え、ほかは自然に発言します。いつでも参加できます"
  },
  "轮流": {
    "zh-Hans": "轮流",
    "zh-Hant": "輪流",
    "en": "Round-robin",
    "ja": "順番"
  },
  "按舞台上从左到右轮流说；轮到你扮演的角色时等你": {
    "zh-Hans": "按舞台上从左到右轮流说；轮到你扮演的角色时等你",
    "zh-Hant": "按舞台上從左到右輪流說；輪到你扮演的角色時等你",
    "en": "Speak from left to right; wait for you on your turn",
    "ja": "舞台の左から順に話し、自分の番は入力を待ちます"
  },
  "主持": {
    "zh-Hans": "主持",
    "zh-Hant": "主持",
    "en": "Hosted",
    "ja": "司会あり"
  },
  "主持人和嘉宾一来一回，主持人决定问谁": {
    "zh-Hans": "主持人和嘉宾一来一回，主持人决定问谁",
    "zh-Hant": "主持人和嘉賓一來一回，主持人決定問誰",
    "en": "The host and guests alternate; the host chooses the next speaker",
    "ja": "司会とゲストが交互に話し、司会が次の人を選びます"
  },
  "未命名舞台": {
    "zh-Hans": "未命名舞台",
    "zh-Hant": "未命名舞台",
    "en": "Untitled stage",
    "ja": "無題の舞台"
  },
  "联播声音录制失败": {
    "zh-Hans": "联播声音录制失败",
    "zh-Hant": "聯播聲音錄制失敗",
    "en": "Could not record collab audio",
    "ja": "コラボ音声を録音できませんでした"
  },
  "面捕出镜": {
    "zh-Hans": "面捕出镜",
    "zh-Hant": "面捕出鏡",
    "en": "Face-tracked stream",
    "ja": "フェイストラッキング"
  },
  "用摄像头驱动角色，配合 OBS 开播": {
    "zh-Hans": "用摄像头驱动角色，配合 OBS 开播",
    "zh-Hant": "用攝影機驅動角色，配合 OBS 開播",
    "en": "Stream with a camera-driven avatar and OBS",
    "ja": "カメラでアバターを動かし、OBSで配信"
  },
  "AI 主播": {
    "zh-Hans": "AI 主播",
    "zh-Hant": "AI 主播",
    "en": "AI VTuber",
    "ja": "AI VTuber"
  },
  "一个 AI 角色，接入模型和声音后回应观众": {
    "zh-Hans": "一个 AI 角色，接入模型和声音后回应观众",
    "zh-Hant": "一個 AI 角色，接入模型和聲音後回應觀眾",
    "en": "One AI avatar replies to viewers with your model and voice",
    "ja": "モデルと音声を接続し、AIが視聴者に応答"
  },
  "双人对谈": {
    "zh-Hans": "双人对谈",
    "zh-Hant": "雙人對談",
    "en": "Two-avatar chat",
    "ja": "2人で対話"
  },
  "两个 AI 角色自由聊，各自的字幕气泡": {
    "zh-Hans": "两个 AI 角色自由聊，各自的字幕气泡",
    "zh-Hant": "兩個 AI 角色自由聊，各自的字幕氣泡",
    "en": "Two AI avatars chat with their own speech bubbles",
    "ja": "2体のAIが、それぞれの吹き出しで対話"
  },
  "你和 AI 搭档": {
    "zh-Hans": "你和 AI 搭档",
    "zh-Hant": "你和 AI 搭檔",
    "en": "You & an AI cohost",
    "ja": "自分とAIで配信"
  },
  "你面捕出镜，AI 搭档接话；同框一起播": {
    "zh-Hans": "你面捕出镜，AI 搭档接话；同框一起播",
    "zh-Hant": "你面捕出鏡，AI 搭檔接話；同框一起播",
    "en": "Use face tracking while your AI cohost talks alongside you",
    "ja": "フェイストラッキングで出演し、隣のAIが会話に参加"
  },
  "三人闲聊": {
    "zh-Hans": "三人闲聊",
    "zh-Hant": "三人閒聊",
    "en": "Three-avatar chat",
    "ja": "3人で対話"
  },
  "一个主持人带两个嘉宾": {
    "zh-Hans": "一个主持人带两个嘉宾",
    "zh-Hant": "一個主持人帶兩個嘉賓",
    "en": "One host and two guests",
    "ja": "司会1人とゲスト2人"
  },
  "空白舞台": {
    "zh-Hans": "空白舞台",
    "zh-Hant": "空白舞台",
    "en": "Blank stage",
    "ja": "空の舞台"
  },
  "什么都没有": {
    "zh-Hans": "什么都没有",
    "zh-Hant": "什麼都沒有",
    "en": "Start with an empty canvas",
    "ja": "何もない舞台から始める"
  },
  "精选角色不够 {0} 个": {
    "zh-Hans": "精选角色不够 {0} 个",
    "zh-Hant": "精選角色不夠 {0} 個",
    "en": "Need {0} featured avatars",
    "ja": "サンプルキャラクターが{0}体必要です"
  },
  "今天玩点什么": {
    "zh-Hans": "今天玩点什么",
    "zh-Hant": "今天玩點什麼",
    "en": "What shall we do today?",
    "ja": "今日は何をしよう？"
  },
  "周末去哪儿玩": {
    "zh-Hans": "周末去哪儿玩",
    "zh-Hant": "週末去哪兒玩",
    "en": "Weekend plans",
    "ja": "週末の予定"
  },
  "这个文件读不出来": {
    "zh-Hans": "这个文件读不出来",
    "zh-Hant": "這個檔案讀不出來",
    "en": "Could not read this file",
    "ja": "ファイルを読み取れません"
  },
  "这不是 LivLiv Stage 的场景文件": {
    "zh-Hans": "这不是 LivLiv Stage 的场景文件",
    "zh-Hant": "這不是 LivLiv Stage 的場景檔案",
    "en": "This is not a LivLiv Stage scene file",
    "ja": "LivLiv Stageのシーンファイルではありません"
  },
  "场景文件里没有内容": {
    "zh-Hans": "场景文件里没有内容",
    "zh-Hant": "場景檔案里沒有內容",
    "en": "The scene file is empty",
    "ja": "シーンファイルに内容がありません"
  },
  "语音接口没有返回声音": {
    "zh-Hans": "语音接口没有返回声音",
    "zh-Hant": "語音介面沒有返回聲音",
    "en": "Voice API returned no audio",
    "ja": "音声APIから音声が返されませんでした"
  },
  "语音接口返回了空文件": {
    "zh-Hans": "语音接口返回了空文件",
    "zh-Hant": "語音介面返回了空檔案",
    "en": "Voice API returned an empty file",
    "ja": "音声APIから空のファイルが返されました"
  },
  "声音传输中断，请检查网络或语音接口": {
    "zh-Hans": "声音传输中断，请检查网络或语音接口",
    "zh-Hant": "聲音傳輸中斷，請檢查網路或語音介面",
    "en": "Audio stream interrupted; check the network or voice API",
    "ja": "音声の受信が中断されました。接続または音声APIを確認してください"
  },
  "摄像头跟随你，使用你自己的声音": {
    "zh-Hans": "摄像头跟随你，使用你自己的声音",
    "zh-Hant": "攝影機跟隨你，使用你自己的聲音",
    "en": "Your camera moves the avatar; use your own voice",
    "ja": "カメラでキャラクターを動かし、自分の声で話す"
  },
  "AI 来演": {
    "zh-Hans": "AI 来演",
    "zh-Hant": "AI 來演",
    "en": "AI",
    "ja": "AI"
  },
  "按人设自动说话、回应观众": {
    "zh-Hans": "按人设自动说话、回应观众",
    "zh-Hant": "按人設自動說話、回應觀眾",
    "en": "Speaks in avatar and replies to viewers",
    "ja": "キャラクターとして話し、視聴者に応答"
  },
  "待机展示，不参与对话": {
    "zh-Hans": "待机展示，不参与对话",
    "zh-Hant": "待機展示，不參與對話",
    "en": "Idle display without joining the conversation",
    "ja": "対話に参加せず、待機モーションを表示"
  },
  "语言": {
    "zh-Hans": "语言",
    "zh-Hant": "語言",
    "en": "Language",
    "ja": "言語"
  },
  "界面语言": {
    "zh-Hans": "界面语言",
    "zh-Hant": "界面語言",
    "en": "Interface language",
    "ja": "表示言語"
  },
  "livliv.ai 帐号": {
    "zh-Hans": "livliv.ai 帐号",
    "zh-Hant": "livliv.ai 帳號",
    "en": "livliv.ai account",
    "ja": "livliv.ai アカウント"
  },
  "从 livliv.ai 增加": {
    "zh-Hans": "从 livliv.ai 增加",
    "zh-Hant": "從 livliv.ai 增加",
    "en": "Add from livliv.ai",
    "ja": "livliv.aiから追加"
  },
  "帐号登录暂未开放": {
    "zh-Hans": "帐号登录暂未开放",
    "zh-Hant": "帳號登錄暫未開放",
    "en": "Account sign-in is not available yet",
    "ja": "アカウントのログインは準備中です"
  },
  "登录 livliv.ai": {
    "zh-Hans": "登录 livliv.ai",
    "zh-Hant": "登錄 livliv.ai",
    "en": "Sign in to livliv.ai",
    "ja": "livliv.aiにログイン"
  },
  "你的角色，来 Stage 同台": {
    "zh-Hans": "你的角色，来 Stage 同台",
    "zh-Hant": "你的角色，來 Stage 同台",
    "en": "Your avatars, together on Stage",
    "ja": "あなたのキャラクターを、Stageへ"
  },
  "在 Stage 使用你的 livliv.ai 角色与声音。": {
    "zh-Hans": "在 Stage 使用你的 livliv.ai 角色与声音。",
    "zh-Hant": "在 Stage 使用你的 livliv.ai 角色與聲音。",
    "en": "Bring your livliv.ai avatars and voices to Stage.",
    "ja": "livliv.aiのキャラクターと声を、Stageで使えます。"
  },
  "登录后，把 livliv.ai 的角色与声音带到舞台。": {
    "zh-Hans": "登录后，把 livliv.ai 的角色与声音带到舞台。",
    "zh-Hant": "登錄後，把 livliv.ai 的角色與聲音帶到舞台。",
    "en": "Sign in to bring your livliv.ai avatars and voices to the stage.",
    "ja": "ログインして、livliv.aiのキャラクターと声を舞台へ。"
  },
  "带入云端角色": {
    "zh-Hans": "带入云端角色",
    "zh-Hant": "帶入雲端角色",
    "en": "Bring your avatars",
    "ja": "クラウドのキャラクターを追加"
  },
  "把你在 livliv.ai 的角色加入舞台。": {
    "zh-Hans": "把你在 livliv.ai 的角色加入舞台。",
    "zh-Hant": "把你在 livliv.ai 的角色加入舞台。",
    "en": "Add your livliv.ai avatars to the stage.",
    "ja": "livliv.aiのキャラクターを舞台に追加できます。"
  },
  "使用角色的声音": {
    "zh-Hans": "使用角色的声音",
    "zh-Hant": "使用角色的聲音",
    "en": "Use their own voices",
    "ja": "キャラクター自身の声を使う"
  },
  "让角色用自己在 livliv.ai 的声音开口。": {
    "zh-Hans": "让角色用自己在 livliv.ai 的声音开口。",
    "zh-Hant": "讓角色用自己在 livliv.ai 的聲音開口。",
    "en": "Let your avatars speak with their livliv.ai voices.",
    "ja": "livliv.aiで設定した声でキャラクターが話します。"
  },
  "语音输入": {
    "zh-Hans": "语音输入",
    "zh-Hant": "語音輸入",
    "en": "Voice input",
    "ja": "音声入力"
  },
  "用麦克风说话，让角色接着聊。": {
    "zh-Hans": "用麦克风说话，让角色接着聊。",
    "zh-Hant": "用麥克風說話，讓角色接著聊。",
    "en": "Speak into your microphone and let the conversation continue.",
    "ja": "マイクで話しかけて、会話を続けましょう。"
  },
  "已连接": {
    "zh-Hans": "已连接",
    "zh-Hant": "已連接",
    "en": "Connected",
    "ja": "接続済み"
  },
  "退出登录": {
    "zh-Hans": "退出登录",
    "zh-Hant": "退出登錄",
    "en": "Sign out",
    "ja": "ログアウト"
  },
  "在浏览器完成登录": {
    "zh-Hans": "在浏览器完成登录",
    "zh-Hant": "在瀏覽器完成登錄",
    "en": "Finish signing in in your browser",
    "ja": "ブラウザーでログインを完了"
  },
  "网页需要验证码时，输入这串代码": {
    "zh-Hans": "网页需要验证码时，输入这串代码",
    "zh-Hant": "網頁需要驗證碼時，輸入這串代碼",
    "en": "Enter this code if the website asks for it.",
    "ja": "コードが必要な場合は、ブラウザーで入力してください。"
  },
  "在设置里连上 livliv.ai 帐号后可用": {
    "zh-Hans": "在设置里连上 livliv.ai 帐号后可用",
    "zh-Hant": "在設置里連上 livliv.ai 帳號後可用",
    "en": "Sign in to livliv.ai in Settings to use this",
    "ja": "設定でlivliv.aiにログインすると利用できます"
  },
  "角色在 livliv.ai 上的声音": {
    "zh-Hans": "角色在 livliv.ai 上的声音",
    "zh-Hant": "角色在 livliv.ai 上的聲音",
    "en": "This avatar’s voice on livliv.ai",
    "ja": "livliv.aiで設定したキャラクターの声"
  },
  "设置：AI 用什么想台词、livliv.ai 帐号": {
    "zh-Hans": "设置：AI 用什么想台词、livliv.ai 帐号",
    "zh-Hant": "設置：AI 用什麼想台詞、livliv.ai 帳號",
    "en": "Settings: models, voices and livliv.ai account",
    "ja": "設定：モデル・音声・livliv.aiアカウント"
  },
  "角色语音音量": {
    "zh-Hans": "角色语音音量",
    "zh-Hant": "角色語音音量",
    "en": "Voice volume",
    "ja": "キャラクター音声の音量"
  },
  "随身体移动": {
    "zh-Hans": "随身体移动",
    "zh-Hant": "隨身體移動",
    "en": "Follow body movement",
    "ja": "体の移動に追従"
  },
  "面捕帧率": {
    "zh-Hans": "面捕帧率",
    "zh-Hant": "面捕幀率",
    "en": "Tracking frame rate",
    "ja": "トラッキングのフレームレート"
  },
  "待机动作": {
    "zh-Hans": "待机动作",
    "zh-Hant": "待機動作",
    "en": "Idle motion",
    "ja": "待機モーション"
  },
  "说话时轻跳": {
    "zh-Hans": "说话时轻跳",
    "zh-Hant": "說話時輕跳",
    "en": "Bounce while speaking",
    "ja": "話すときに軽く跳ねる"
  },
  "由 {0} 控制": {
    "zh-Hans": "由 {0} 控制",
    "zh-Hant": "由 {0} 控制",
    "en": "Controlled by {0}",
    "ja": "{0}が操作"
  },
  "房主已结束联播": {
    "zh-Hans": "房主已结束联播",
    "zh-Hant": "房主已結束聯播",
    "en": "The host ended the collab",
    "ja": "ホストがコラボを終了しました"
  },
  "房主已移除你的联播连接": {
    "zh-Hans": "房主已移除你的联播连接",
    "zh-Hant": "房主已移除你的聯播連接",
    "en": "The host removed you from the collab",
    "ja": "ホストによってコラボから退出しました"
  },
  "邀请码已失效": {
    "zh-Hans": "邀请码已失效",
    "zh-Hant": "邀請碼已失效",
    "en": "This invite is no longer valid",
    "ja": "この招待は無効になりました"
  },
  "联播人数已满": {
    "zh-Hans": "联播人数已满",
    "zh-Hant": "聯播人數已滿",
    "en": "The collab is full",
    "ja": "コラボの定員に達しました"
  },
  "暂时无法创建联播": {
    "zh-Hans": "暂时无法创建联播",
    "zh-Hant": "暫時無法創建聯播",
    "en": "Could not create a collab right now",
    "ja": "現在コラボを作成できません"
  },
  "让 {0} 接着说": {
    "zh-Hans": "让 {0} 接着说",
    "zh-Hant": "讓 {0} 接著說",
    "en": "Let {0} speak next",
    "ja": "{0}に次の発言を任せる"
  },
  "不认识这个指令": {
    "zh-Hans": "不认识这个指令",
    "zh-Hant": "不認識這個指令",
    "en": "Unknown command",
    "ja": "不明なコマンドです"
  },
  "没有开播窗口，或者热键已关闭": {
    "zh-Hans": "没有开播窗口，或者热键已关闭",
    "zh-Hant": "沒有開播視窗，或者熱鍵已關閉",
    "en": "No stage window, or hotkeys are off",
    "ja": "配信ウィンドウがないか、ホットキーがオフです"
  },
  "被别的程序占用了": {
    "zh-Hans": "被别的程序占用了",
    "zh-Hant": "被別的程序佔用了",
    "en": "Already in use by another app",
    "ja": "他のアプリで使用中です"
  },
  "cast.title": {
    "zh-Hans": "角色",
    "zh-Hant": "角色",
    "en": "Cast",
    "ja": "キャスト"
  },
  "连不上 livliv.ai": {
    "zh-Hans": "连不上 livliv.ai",
    "zh-Hant": "連不上 livliv.ai",
    "en": "Could not connect to livliv.ai",
    "ja": "livliv.aiに接続できません"
  },
  "livliv.ai 返回 {0}": {
    "zh-Hans": "livliv.ai 返回 {0}",
    "zh-Hant": "livliv.ai 返回 {0}",
    "en": "livliv.ai returned {0}",
    "ja": "livliv.aiからの応答：{0}"
  },
  "还没退出：连不上 livliv.ai，稍后再试": {
    "zh-Hans": "还没退出：连不上 livliv.ai，稍后再试",
    "zh-Hant": "還沒退出：連不上 livliv.ai，稍後再試",
    "en": "Could not sign out; connect to livliv.ai and try again",
    "ja": "ログアウトできません。livliv.aiへの接続後にもう一度お試しください"
  },
  "通用": {"zh-Hans": "通用", "zh-Hant": "通用", "en": "General", "ja": "一般"},
  "关于": {"zh-Hans": "关于", "zh-Hant": "關於", "en": "About", "ja": "概要"},
  "网页版": {"zh-Hans": "网页版", "zh-Hant": "網頁版", "en": "Web edition", "ja": "ウェブ版"},
  "面捕出镜、AI 互动和朋友同台。": {"zh-Hans": "面捕出镜、AI 互动和朋友同台。", "zh-Hant": "臉部追蹤、AI 互動和朋友同台。", "en": "Face tracking, AI conversations, and friends on one stage.", "ja": "フェイストラッキング、AIとの会話、友だちとの共演。"},
  "由 LivLiv Player 驱动": {"zh-Hans": "由 LivLiv Player 驱动", "zh-Hant": "由 LivLiv Player 驅動", "en": "Powered by LivLiv Player", "ja": "LivLiv Playerで動作"},
  "项目源码": {"zh-Hans": "项目源码", "zh-Hant": "原始碼", "en": "Source code", "ja": "ソースコード"},
  "代码采用 AGPL-3.0 许可，精选角色另有自己的许可。": {"zh-Hans": "代码采用 AGPL-3.0 许可，精选角色另有自己的许可。", "zh-Hant": "程式碼採用 AGPL-3.0 授權，精選角色另有自己的授權。", "en": "The code is under the AGPL-3.0 license. The featured avatars have their own license.", "ja": "コードは AGPL-3.0 ライセンスです。収録キャラクターには別のライセンスがあります。"},
  "角色许可": {"zh-Hans": "角色许可", "zh-Hant": "角色授權", "en": "Avatar license", "ja": "キャラクターのライセンス"},
  "左右转头": {"zh-Hans": "左右转头", "zh-Hant": "左右轉頭", "en": "Head turn", "ja": "顔の左右"},
  "上下点头": {"zh-Hans": "上下点头", "zh-Hant": "上下點頭", "en": "Head pitch", "ja": "顔の上下"},
  "左右歪头": {"zh-Hans": "左右歪头", "zh-Hant": "左右歪頭", "en": "Head tilt", "ja": "首の傾き"},
  "左眼开合": {"zh-Hans": "左眼开合", "zh-Hant": "左眼開合", "en": "Left eye", "ja": "左目の開閉"},
  "右眼开合": {"zh-Hans": "右眼开合", "zh-Hant": "右眼開合", "en": "Right eye", "ja": "右目の開閉"},
  "左右眼神": {"zh-Hans": "左右眼神", "zh-Hant": "左右眼神", "en": "Horizontal gaze", "ja": "視線の左右"},
  "上下眼神": {"zh-Hans": "上下眼神", "zh-Hant": "上下眼神", "en": "Vertical gaze", "ja": "視線の上下"},
  "左眉": {"zh-Hans": "左眉", "zh-Hant": "左眉", "en": "Left brow", "ja": "左眉"},
  "右眉": {"zh-Hans": "右眉", "zh-Hant": "右眉", "en": "Right brow", "ja": "右眉"},
  "微笑": {"zh-Hans": "微笑", "zh-Hant": "微笑", "en": "Smile", "ja": "笑顔"},
  "身体左右": {"zh-Hans": "身体左右", "zh-Hant": "身體左右", "en": "Body sway", "ja": "体の左右"},
  "预设列表无法读取": {"zh-Hans": "预设列表无法读取", "zh-Hant": "無法讀取預設清單", "en": "Could not read presets", "ja": "プリセットを読み込めません"},
  "输入范围需要从小到大": {"zh-Hans": "输入范围需要从小到大", "zh-Hant": "輸入範圍須由小到大", "en": "Input must run from low to high", "ja": "入力範囲は小さい値から指定してください"},
  "数值超出范围": {"zh-Hans": "数值超出范围", "zh-Hant": "數值超出範圍", "en": "Value is outside the range", "ja": "値が範囲外です"},
  "起点": {"zh-Hans": "起点", "zh-Hant": "起點", "en": "Start", "ja": "開始"},
  "终点": {"zh-Hans": "终点", "zh-Hant": "終點", "en": "End", "ja": "終了"},
  "面捕细调与预设": {"zh-Hans": "面捕细调与预设", "zh-Hant": "臉部追蹤細調與預設", "en": "Tracking adjustments & presets", "ja": "トラッキング調整とプリセット"},
  "预设": {"zh-Hans": "预设", "zh-Hant": "預設", "en": "Preset", "ja": "プリセット"},
  "选择预设": {"zh-Hans": "选择预设", "zh-Hant": "選擇預設", "en": "Choose a preset", "ja": "プリセットを選択"},
  "调节部位": {"zh-Hans": "调节部位", "zh-Hant": "調整部位", "en": "Parameter", "ja": "調整する部位"},
  "实时参数": {"zh-Hans": "实时参数", "zh-Hant": "即時參數", "en": "Live values", "ja": "現在の値"},
  "输入": {"zh-Hans": "输入", "zh-Hant": "輸入", "en": "Input", "ja": "入力"},
  "输入范围": {"zh-Hans": "输入范围", "zh-Hant": "輸入範圍", "en": "Input range", "ja": "入力範囲"},
  "输出范围": {"zh-Hans": "输出范围", "zh-Hant": "輸出範圍", "en": "Output range", "ja": "出力範囲"},
  "反向": {"zh-Hans": "反向", "zh-Hant": "反向", "en": "Reverse", "ja": "反転"},
  "单独平滑": {"zh-Hans": "单独平滑", "zh-Hant": "獨立平滑", "en": "Parameter smoothing", "ja": "個別のスムージング"},
  "响应曲线": {"zh-Hans": "响应曲线", "zh-Hant": "反應曲線", "en": "Response curve", "ja": "反応曲線"},
  "恢复这个部位": {"zh-Hans": "恢复这个部位", "zh-Hant": "重設這個部位", "en": "Reset this parameter", "ja": "この部位をリセット"},
  "预设名称": {"zh-Hans": "预设名称", "zh-Hant": "預設名稱", "en": "Preset name", "ja": "プリセット名"},
  "保存预设": {"zh-Hans": "保存预设", "zh-Hant": "儲存預設", "en": "Save preset", "ja": "プリセットを保存"},
  "删除预设": {"zh-Hans": "删除预设", "zh-Hant": "刪除預設", "en": "Delete preset", "ja": "プリセットを削除"},
  "这不是面捕预设文件": {"zh-Hans": "这不是面捕预设文件", "zh-Hant": "這不是臉部追蹤預設檔", "en": "This is not a tracking preset file", "ja": "トラッキングのプリセットファイルではありません"},
  "复制到角色": {"zh-Hans": "复制到角色", "zh-Hant": "複製到角色", "en": "Copy to avatar", "ja": "キャラクターにコピー"},
  "复制配置": {"zh-Hans": "复制配置", "zh-Hant": "複製設定", "en": "Copy settings", "ja": "設定をコピー"},
  "恢复面捕默认设置": {"zh-Hans": "恢复面捕默认设置", "zh-Hant": "重設臉部追蹤設定", "en": "Reset tracking settings", "ja": "トラッキング設定をリセット"},
  "更灵敏": {"zh-Hans": "更灵敏", "zh-Hant": "更靈敏", "en": "More responsive", "ja": "反応を速く"},
  "更稳定": {"zh-Hans": "更稳定", "zh-Hant": "更穩定", "en": "Steadier", "ja": "動きを安定"},
  "内部缩放": {"zh-Hans": "内部缩放", "zh-Hant": "內部縮放", "en": "Avatar zoom", "ja": "モデルのズーム"},
  "水平取景": {"zh-Hans": "水平取景", "zh-Hant": "水平取景", "en": "Horizontal framing", "ja": "表示位置・左右"},
  "垂直取景": {"zh-Hans": "垂直取景", "zh-Hant": "垂直取景", "en": "Vertical framing", "ja": "表示位置・上下"},
  "头像取景": {"zh-Hans": "头像取景", "zh-Hant": "頭像取景", "en": "Head framing", "ja": "顔を中心に表示"},
  "恢复取景": {"zh-Hans": "恢复取景", "zh-Hant": "重設取景", "en": "Reset framing", "ja": "表示位置をリセット"},
  "表情强度": {"zh-Hans": "表情强度", "zh-Hant": "表情強度", "en": "Expression strength", "ja": "表情の強さ"},
  "画面质量": {"zh-Hans": "画面质量", "zh-Hant": "畫面品質", "en": "Picture quality", "ja": "画質"},
  "省电": {"zh-Hans": "省电", "zh-Hant": "省電", "en": "Save power", "ja": "省電力"},
  "清晰": {"zh-Hans": "清晰", "zh-Hant": "清晰", "en": "Sharp", "ja": "高画質"},
  "预设文件不能超过 1 MB": {"zh-Hans": "预设文件不能超过 1 MB", "zh-Hant": "預設檔不能超過 1 MB", "en": "Preset files must be under 1 MB", "ja": "プリセットファイルは1 MB以下にしてください"},
  "外部控制 API": {"zh-Hans": "外部控制 API", "zh-Hant": "外部控制 API", "en": "External control API", "ja": "外部制御API"},
  "允许本机工具控制": {"zh-Hans": "允许本机工具控制", "zh-Hant": "允許本機工具控制", "en": "Allow tools on this computer", "ja": "このパソコンのツールから操作"},
  "读取设置…": {"zh-Hans": "读取设置…", "zh-Hant": "讀取設定…", "en": "Loading settings…", "ja": "設定を読み込み中…"},
  "连接地址": {"zh-Hans": "连接地址", "zh-Hant": "連線位址", "en": "Connection address", "ja": "接続先"},
  "复制地址": {"zh-Hans": "复制地址", "zh-Hant": "複製位址", "en": "Copy address", "ja": "接続先をコピー"},
  "连接令牌": {"zh-Hans": "连接令牌", "zh-Hant": "連線權杖", "en": "Connection token", "ja": "接続トークン"},
  "复制令牌": {"zh-Hans": "复制令牌", "zh-Hant": "複製權杖", "en": "Copy token", "ja": "トークンをコピー"},
  "复制查询示例": {"zh-Hans": "复制查询示例", "zh-Hant": "複製查詢範例", "en": "Copy query example", "ja": "状態取得の例をコピー"},
  "复制动作示例": {"zh-Hans": "复制动作示例", "zh-Hant": "複製動作範例", "en": "Copy action example", "ja": "動作実行の例をコピー"},
  "更换令牌": {"zh-Hans": "更换令牌", "zh-Hant": "更換權杖", "en": "Replace token", "ja": "トークンを変更"},
  "镜头": {"zh-Hans": "镜头", "zh-Hant": "鏡頭", "en": "Shots", "ja": "カット"},
  "镜头 {0}": {"zh-Hans": "镜头 {0}", "zh-Hant": "鏡頭 {0}", "en": "Shot {0}", "ja": "カット {0}"},
  "切换镜头": {"zh-Hans": "切换镜头", "zh-Hant": "切換鏡頭", "en": "Switch shot", "ja": "カットを切り替え"},
  "删除镜头": {"zh-Hans": "删除镜头", "zh-Hant": "刪除鏡頭", "en": "Delete shot", "ja": "カットを削除"},
  "复制当前镜头": {"zh-Hans": "复制当前镜头", "zh-Hant": "複製目前鏡頭", "en": "Duplicate shot", "ja": "カットを複製"},
  "空白镜头": {"zh-Hans": "空白镜头", "zh-Hant": "空白鏡頭", "en": "Blank shot", "ja": "空のカット"},
  "项目超过 512 MB 或文件数量过多": {"zh-Hans": "项目超过 512 MB 或文件数量过多", "zh-Hant": "專案超過 512 MB 或檔案數量過多", "en": "Project exceeds 512 MB or has too many files", "ja": "プロジェクトが512 MBまたはファイル数の上限を超えています"},
  "项目中的文件路径无效": {"zh-Hans": "项目中的文件路径无效", "zh-Hant": "專案中的檔案路徑無效", "en": "Invalid file path in project", "ja": "プロジェクト内のファイルパスが無効です"},
  "这个项目文件不完整": {"zh-Hans": "这个项目文件不完整", "zh-Hant": "這個專案檔案不完整", "en": "This project file is incomplete", "ja": "プロジェクトファイルが不完全です"},
  "找不到这张图片，请重新选择": {"zh-Hans": "找不到这张图片，请重新选择", "zh-Hant": "找不到這張圖片，請重新選擇", "en": "Image not found. Choose it again.", "ja": "画像が見つかりません。再度選択してください"},
  "图片过大，请选择小于 64 MB 的图片": {"zh-Hans": "图片过大，请选择小于 64 MB 的图片", "zh-Hant": "圖片過大，請選擇小於 64 MB 的圖片", "en": "Choose an image smaller than 64 MB", "ja": "64 MB未満の画像を選んでください"},
  "这张图片读不出来": {"zh-Hans": "这张图片读不出来", "zh-Hant": "這張圖片讀不出來", "en": "Could not read this image", "ja": "この画像を読み込めません"},
  "图片尺寸过大，请缩小后再导入": {"zh-Hans": "图片尺寸过大，请缩小后再导入", "zh-Hant": "圖片尺寸過大，請縮小後再匯入", "en": "Reduce the image dimensions before importing", "ja": "画像のサイズを小さくして再度読み込んでください"},
  "图片不可用": {"zh-Hans": "图片不可用", "zh-Hant": "圖片無法使用", "en": "Image unavailable", "ja": "画像を使用できません"},
  "项目内容无效或缺少素材": {"zh-Hans": "项目内容无效或缺少素材", "zh-Hant": "專案內容無效或缺少素材", "en": "Invalid project or missing assets", "ja": "プロジェクトが無効、または素材が不足しています"},
  "图片读取失败：{0}": {"zh-Hans": "图片读取失败：{0}", "zh-Hant": "圖片讀取失敗：{0}", "en": "Could not read image: {0}", "ja": "画像を読み込めません：{0}"},
  "这不是 LivLiv Stage 的项目文件": {"zh-Hans": "这不是 LivLiv Stage 的项目文件", "zh-Hant": "這不是 LivLiv Stage 的專案檔案", "en": "This is not a LivLiv Stage project", "ja": "LivLiv Stageのプロジェクトファイルではありません"},
  "正在打开项目…": {"zh-Hans": "正在打开项目…", "zh-Hant": "正在開啟專案…", "en": "Opening project…", "ja": "プロジェクトを開いています…"},
  "正在保存项目…": {"zh-Hans": "正在保存项目…", "zh-Hant": "正在儲存專案…", "en": "Saving project…", "ja": "プロジェクトを保存しています…"},
  "打开项目": {"zh-Hans": "打开项目", "zh-Hant": "開啟專案", "en": "Open project", "ja": "プロジェクトを開く"},
  "保存项目": {"zh-Hans": "保存项目", "zh-Hant": "儲存專案", "en": "Save project", "ja": "プロジェクトを保存"},
  "素材读取失败": {"zh-Hans": "素材读取失败", "zh-Hant": "素材讀取失敗", "en": "Could not read asset", "ja": "素材を読み込めません"},
  "项目文件已损坏": {"zh-Hans": "项目文件已损坏", "zh-Hant": "專案檔案已損壞", "en": "Project file is damaged", "ja": "プロジェクトファイルが破損しています"},
  "镜头已删除，请重新添加图片": {"zh-Hans": "镜头已删除，请重新添加图片", "zh-Hant": "鏡頭已刪除，請重新新增圖片", "en": "Shot was deleted. Add the image again.", "ja": "カットが削除されました。画像を再度追加してください"},
  "调音台": {"zh-Hans": "调音台", "zh-Hant": "調音台", "en": "Audio mixer", "ja": "オーディオミキサー"},
  "我的麦克风": {"zh-Hans": "我的麦克风", "zh-Hant": "我的麥克風", "en": "My microphone", "ja": "自分のマイク"},
  "朋友声音": {"zh-Hans": "朋友声音", "zh-Hant": "朋友聲音", "en": "Friends", "ja": "フレンドの音声"},
  "麦克风测试": {"zh-Hans": "麦克风测试", "zh-Hant": "麥克風測試", "en": "Microphone check", "ja": "マイクテスト"},
  "输入设备": {"zh-Hans": "输入设备", "zh-Hant": "輸入裝置", "en": "Input device", "ja": "入力デバイス"},
  "停止测试": {"zh-Hans": "停止测试", "zh-Hant": "停止測試", "en": "Stop check", "ja": "テストを停止"},
  "测试麦克风": {"zh-Hans": "测试麦克风", "zh-Hant": "測試麥克風", "en": "Test microphone", "ja": "マイクをテスト"},
  "校准麦克风": {"zh-Hans": "校准麦克风", "zh-Hant": "校準麥克風", "en": "Calibrate microphone", "ja": "マイクを調整"},
  "保持安静": {"zh-Hans": "保持安静", "zh-Hant": "保持安靜", "en": "Stay quiet", "ja": "静かにしてください"},
  "用平常的声音说一句话": {"zh-Hans": "用平常的声音说一句话", "zh-Hant": "用平常的聲音說一句話", "en": "Say a sentence in your normal voice", "ja": "普段の声で一言話してください"},
  "音量过高，请调低一些": {"zh-Hans": "音量过高，请调低一些", "zh-Hant": "音量過高，請調低一些", "en": "Level is too high. Turn it down.", "ja": "音量が大きすぎます。少し下げてください"},
  "对着麦克风说句话": {"zh-Hans": "对着麦克风说句话", "zh-Hant": "對著麥克風說句話", "en": "Say something into your microphone", "ja": "マイクに向かって話してください"},
  "耳机监听": {"zh-Hans": "耳机监听", "zh-Hant": "耳機監聽", "en": "Monitor in headphones", "ja": "ヘッドホンでモニター"},
  "录三秒": {"zh-Hans": "录三秒", "zh-Hant": "錄三秒", "en": "Record 3 seconds", "ja": "3秒録音"},
  "录音中 · {0}s": {"zh-Hans": "录音中 · {0}s", "zh-Hant": "錄音中 · {0}s", "en": "Recording · {0}s", "ja": "録音中 · {0}秒"},
  "回放": {"zh-Hans": "回放", "zh-Hant": "回放", "en": "Playback", "ja": "再生"},
  "分别调整角色": {"zh-Hans": "分别调整角色", "zh-Hant": "分別調整角色", "en": "Adjust each avatar", "ja": "キャラクター別に調整"},
  "分别调整朋友": {"zh-Hans": "分别调整朋友", "zh-Hant": "分別調整朋友", "en": "Adjust each friend", "ja": "フレンド別に調整"},
  "联播后在这里调整朋友的声音": {"zh-Hans": "联播后在这里调整朋友的声音", "zh-Hant": "聯播後在這裡調整朋友的聲音", "en": "Friends' audio appears here when connected", "ja": "コラボに参加すると音声を調整できます"},
  "设置角色声音": {"zh-Hans": "设置角色声音", "zh-Hant": "設定角色聲音", "en": "Voice settings", "ja": "音声設定"},
  "静音 {0}": {"zh-Hans": "静音 {0}", "zh-Hant": "靜音 {0}", "en": "Mute {0}", "ja": "{0}をミュート"},
  "取消静音 {0}": {"zh-Hans": "取消静音 {0}", "zh-Hant": "取消靜音 {0}", "en": "Unmute {0}", "ja": "{0}のミュートを解除"},
  "{0}音量": {"zh-Hans": "{0}音量", "zh-Hant": "{0}音量", "en": "{0} volume", "ja": "{0}の音量"},
  "{0}电平": {"zh-Hans": "{0}电平", "zh-Hant": "{0}電平", "en": "{0} level", "ja": "{0}のレベル"},
  "系统朗读 · 本机": {"zh-Hans": "系统朗读 · 本机", "zh-Hant": "系統朗讀 · 本機", "en": "System voice · this device", "ja": "システム音声 · この端末"},
  "未设置声音": {"zh-Hans": "未设置声音", "zh-Hant": "未設定聲音", "en": "Voice not set", "ja": "音声未設定"},
  "角色语音": {"zh-Hans": "角色语音", "zh-Hant": "角色語音", "en": "Avatar voice", "ja": "キャラクター音声"},
  "停止试听": {"zh-Hans": "停止试听", "zh-Hant": "停止試聽", "en": "Stop preview", "ja": "試聴を停止"},
  "试听 {0}": {"zh-Hans": "试听 {0}", "zh-Hant": "試聽 {0}", "en": "Preview {0}", "ja": "{0}を試聴"},
  "没有听清说话声，请靠近麦克风再试一次": {"zh-Hans": "没有听清说话声，请靠近麦克风再试一次", "zh-Hant": "沒有聽清說話聲，請靠近麥克風再試一次", "en": "Voice was too quiet. Move closer and try again.", "ja": "声が小さすぎます。マイクに近づいて再度お試しください"},
  "音量已调整，但无法保存设置": {"zh-Hans": "音量已调整，但无法保存设置", "zh-Hant": "音量已調整，但無法儲存設定", "en": "Volume changed, but settings could not be saved", "ja": "音量は変更されましたが、設定を保存できません"},
  "麦克风试听录制失败": {"zh-Hans": "麦克风试听录制失败", "zh-Hant": "麥克風試聽錄製失敗", "en": "Microphone sample recording failed", "ja": "マイクのテスト録音に失敗しました"},
  "检查录音声音": {"zh-Hans": "检查录音声音", "zh-Hant": "檢查錄音聲音", "en": "Check recording audio", "ja": "録音の音声を確認"},
  "系统朗读 · 下句生效": {"zh-Hans": "系统朗读 · 下句生效", "zh-Hant": "系統朗讀 · 下句生效", "en": "System voice · next line", "ja": "システム音声 · 次のセリフから"},
  "本机朗读": {"zh-Hans": "本机朗读", "zh-Hant": "本機朗讀", "en": "System speech", "ja": "この端末で読み上げ"},
  "接入直播声音": {"zh-Hans": "接入直播声音", "zh-Hant": "接入直播聲音", "en": "Connect a streaming voice", "ja": "配信用の音声を接続"},

  "弹幕动作": {"zh-Hans": "弹幕动作", "zh-Hant": "彈幕動作", "en": "Chat actions", "ja": "チャットアクション"},
  "启用弹幕动作": {"zh-Hans": "启用弹幕动作", "zh-Hant": "啟用彈幕動作", "en": "Enable chat actions", "ja": "チャットアクションを有効にする"},
  "添加角色后设置弹幕动作": {"zh-Hans": "添加角色后设置弹幕动作", "zh-Hant": "新增角色後設定彈幕動作", "en": "Add an avatar to set up chat actions", "ja": "キャラクターを追加すると設定できます"},
  "规则 {0}": {"zh-Hans": "规则 {0}", "zh-Hant": "規則 {0}", "en": "Rule {0}", "ja": "ルール {0}"},
  "启用规则 {0}": {"zh-Hans": "启用规则 {0}", "zh-Hant": "啟用規則 {0}", "en": "Enable rule {0}", "ja": "ルール{0}を有効にする"},
  "删除规则 {0}": {"zh-Hans": "删除规则 {0}", "zh-Hant": "刪除規則 {0}", "en": "Delete rule {0}", "ja": "ルール{0}を削除"},
  "收到弹幕": {"zh-Hans": "收到弹幕", "zh-Hant": "收到彈幕", "en": "When chat says", "ja": "チャットの内容"},
  "规则 {0} 关键词": {"zh-Hans": "规则 {0} 关键词", "zh-Hant": "規則 {0} 關鍵字", "en": "Rule {0} keyword", "ja": "ルール{0}のキーワード"},
  "匹配方式": {"zh-Hans": "匹配方式", "zh-Hant": "比對方式", "en": "Match", "ja": "一致条件"},
  "规则 {0} 匹配方式": {"zh-Hans": "规则 {0} 匹配方式", "zh-Hant": "規則 {0} 比對方式", "en": "Rule {0} match", "ja": "ルール{0}の一致条件"},
  "完全相同": {"zh-Hans": "完全相同", "zh-Hant": "完全相同", "en": "Exact message", "ja": "完全一致"},
  "包含关键词": {"zh-Hans": "包含关键词", "zh-Hant": "包含關鍵字", "en": "Contains keyword", "ja": "キーワードを含む"},
  "让角色": {"zh-Hans": "让角色", "zh-Hant": "讓角色", "en": "Avatar", "ja": "キャラクター"},
  "规则 {0} 角色": {"zh-Hans": "规则 {0} 角色", "zh-Hant": "規則 {0} 角色", "en": "Rule {0} avatar", "ja": "ルール{0}のキャラクター"},
  "做出反应": {"zh-Hans": "做出反应", "zh-Hant": "做出反應", "en": "Reaction", "ja": "リアクション"},
  "规则 {0} 反应": {"zh-Hans": "规则 {0} 反应", "zh-Hant": "規則 {0} 反應", "en": "Rule {0} reaction", "ja": "ルール{0}のリアクション"},
  "重新选择表情": {"zh-Hans": "重新选择表情", "zh-Hant": "重新選擇表情", "en": "Choose an expression again", "ja": "表情を選び直す"},
  "表情保持（秒）": {"zh-Hans": "表情保持（秒）", "zh-Hant": "表情保持（秒）", "en": "Hold expression (s)", "ja": "表情の保持（秒）"},
  "规则 {0} 保持时间": {"zh-Hans": "规则 {0} 保持时间", "zh-Hant": "規則 {0} 保持時間", "en": "Rule {0} duration", "ja": "ルール{0}の保持時間"},
  "冷却（秒）": {"zh-Hans": "冷却（秒）", "zh-Hant": "冷卻（秒）", "en": "Cooldown (s)", "ja": "クールダウン（秒）"},
  "规则 {0} 冷却": {"zh-Hans": "规则 {0} 冷却", "zh-Hant": "規則 {0} 冷卻", "en": "Rule {0} cooldown", "ja": "ルール{0}のクールダウン"},
  "测试动作": {"zh-Hans": "测试动作", "zh-Hant": "測試動作", "en": "Test reaction", "ja": "リアクションをテスト"},
  "添加弹幕动作": {"zh-Hans": "添加弹幕动作", "zh-Hant": "新增彈幕動作", "en": "Add chat action", "ja": "チャットアクションを追加"},
  "已触发": {"zh-Hans": "已触发", "zh-Hant": "已觸發", "en": "Triggered", "ja": "実行しました"},
  "角色或表情已不存在，请重新选择": {"zh-Hans": "角色或表情已不存在，请重新选择", "zh-Hant": "角色或表情已不存在，請重新選擇", "en": "Avatar or expression is missing. Choose again.", "ja": "キャラクターか表情が見つかりません。選び直してください"},
  "角色尚未就绪，请稍后再试": {"zh-Hans": "角色尚未就绪，请稍后再试", "zh-Hant": "角色尚未就緒，請稍後再試", "en": "Avatar is loading. Try again shortly.", "ja": "キャラクターの準備中です。少し待ってお試しください"},

  "图片与道具": {"zh-Hans": "图片与道具", "zh-Hant": "圖片與道具", "en": "Image & prop", "ja": "画像と小物"},
  "跟随角色": {"zh-Hans": "跟随角色", "zh-Hant": "跟隨角色", "en": "Follow avatar", "ja": "追従するキャラクター"},
  "不跟随": {"zh-Hans": "不跟随", "zh-Hant": "不跟隨", "en": "None", "ja": "追従しない"},
  "跟随部位": {"zh-Hans": "跟随部位", "zh-Hant": "跟隨部位", "en": "Attach to", "ja": "追従する部位"},
  "头部": {"zh-Hans": "头部", "zh-Hant": "頭部", "en": "Head", "ja": "頭"},
  "身体": {"zh-Hans": "身体", "zh-Hant": "身體", "en": "Body", "ja": "体"},
  "拖动图片，调整相对位置": {"zh-Hans": "拖动图片，调整相对位置", "zh-Hant": "拖動圖片，調整相對位置", "en": "Drag the image to adjust its position", "ja": "画像をドラッグして位置を調整"},
  "道具旋转": {"zh-Hans": "道具旋转", "zh-Hant": "道具旋轉", "en": "Prop rotation", "ja": "小物の回転"},
  "旋转": {"zh-Hans": "旋转", "zh-Hant": "旋轉", "en": "Rotation", "ja": "回転"},
  "像素风格": {"zh-Hans": "像素风格", "zh-Hant": "像素風格", "en": "Pixel art", "ja": "ピクセルアート"},

  "手柄": {"zh-Hans": "手柄", "zh-Hant": "手柄", "en": "Gamepad", "ja": "ゲームパッド"},
  "摇杆控制头部，按键触发表情和动作": {"zh-Hans": "摇杆控制头部，按键触发表情和动作", "zh-Hant": "搖桿控制頭部，按鍵觸發表情和動作", "en": "Sticks move the avatar; buttons trigger reactions", "ja": "スティックで動かし、ボタンでリアクション"},
  "这个浏览器无法读取手柄": {"zh-Hans": "这个浏览器无法读取手柄", "zh-Hant": "這個瀏覽器無法讀取手柄", "en": "Gamepads are unavailable in this browser", "ja": "このブラウザーではゲームパッドを使えません"},
  "输入手柄": {"zh-Hans": "输入手柄", "zh-Hant": "輸入手柄", "en": "Controller", "ja": "コントローラー"},
  "自动选择": {"zh-Hans": "自动选择", "zh-Hant": "自動選擇", "en": "Automatic", "ja": "自動選択"},
  "手柄 {0}": {"zh-Hans": "手柄 {0}", "zh-Hant": "手柄 {0}", "en": "Gamepad {0}", "ja": "ゲームパッド {0}"},
  "手柄已连接": {"zh-Hans": "手柄已连接", "zh-Hant": "手柄已連接", "en": "Gamepad connected", "ja": "ゲームパッドに接続しました"},
  "连接手柄后，按一下任意按钮": {"zh-Hans": "连接手柄后，按一下任意按钮", "zh-Hant": "連接手柄後，按一下任意按鈕", "en": "Connect a gamepad and press any button", "ja": "接続して、いずれかのボタンを押してください"},
  "摇杆输入": {"zh-Hans": "摇杆输入", "zh-Hant": "搖桿輸入", "en": "Stick input", "ja": "スティック入力"},
  "摇杆死区": {"zh-Hans": "摇杆死区", "zh-Hant": "搖桿死區", "en": "Stick deadzone", "ja": "スティックの遊び"},
  "手柄灵敏度": {"zh-Hans": "手柄灵敏度", "zh-Hant": "手柄靈敏度", "en": "Sensitivity", "ja": "感度"},
  "把摇杆现在的位置设为中心": {"zh-Hans": "把摇杆现在的位置设为中心", "zh-Hant": "將搖桿現在的位置設為中心", "en": "Set this position as center", "ja": "現在の位置を中心にする"},
  "摇杆与按键映射": {"zh-Hans": "摇杆与按键映射", "zh-Hant": "搖桿與按鍵映射", "en": "Sticks & button mapping", "ja": "スティックとボタンの割り当て"},
  "身体倾斜": {"zh-Hans": "身体倾斜", "zh-Hant": "身體傾斜", "en": "Body lean", "ja": "体の傾き"},
  "摇杆轴": {"zh-Hans": "摇杆轴", "zh-Hant": "搖桿軸", "en": "Axis", "ja": "軸"},
  "不绑定": {"zh-Hans": "不绑定", "zh-Hant": "不綁定", "en": "Unassigned", "ja": "割り当てなし"},
  "轴 {0}": {"zh-Hans": "轴 {0}", "zh-Hant": "軸 {0}", "en": "Axis {0}", "ja": "軸 {0}"},
  "按钮 {0}": {"zh-Hans": "按钮 {0}", "zh-Hant": "按鈕 {0}", "en": "Button {0}", "ja": "ボタン {0}"},
  "取消按钮 {0} 映射": {"zh-Hans": "取消按钮 {0} 映射", "zh-Hant": "取消按鈕 {0} 映射", "en": "Remove button {0} mapping", "ja": "ボタン{0}の割り当てを解除"},
  "添加按键映射": {"zh-Hans": "添加按键映射", "zh-Hant": "新增按鍵映射", "en": "Add button mapping", "ja": "ボタンの割り当てを追加"},
  "恢复手柄设置": {"zh-Hans": "恢复手柄设置", "zh-Hant": "恢復手柄設定", "en": "Reset gamepad settings", "ja": "ゲームパッド設定をリセット"},
  "追踪细调与预设": {"zh-Hans": "追踪细调与预设", "zh-Hant": "追蹤細調與預設", "en": "Tracking adjustments & presets", "ja": "トラッキング調整とプリセット"},
  "恢复追踪默认设置": {"zh-Hans": "恢复追踪默认设置", "zh-Hant": "恢復追蹤預設設定", "en": "Reset tracking settings", "ja": "トラッキング設定をリセット"},
  "先绑定一个摇杆轴": {"zh-Hans": "先绑定一个摇杆轴", "zh-Hant": "先綁定一個搖桿軸", "en": "Assign a stick axis first", "ja": "スティックの軸を割り当ててください"},

  "手机与网络追踪": {"zh-Hans": "手机与网络追踪", "zh-Hant": "手機與網路追蹤", "en": "Phone & network tracking", "ja": "スマホ・ネットワーク追跡"},
  "手机 / OSC": {"zh-Hans": "手机 / OSC", "zh-Hant": "手機 / OSC", "en": "Phone / OSC", "ja": "スマホ / OSC"},
  "接收手机或追踪软件的动作": {"zh-Hans": "接收手机或追踪软件的动作", "zh-Hant": "接收手機或追蹤軟體的動作", "en": "Receive motion from a phone or tracking app", "ja": "スマホやトラッキングアプリから動作を受信"},
  "此输入在桌面版连接": {"zh-Hans": "此输入在桌面版连接", "zh-Hant": "此輸入在桌面版連接", "en": "Connect this input in the desktop app", "ja": "この入力はデスクトップ版で接続できます"},
  "使用本机摄像头": {"zh-Hans": "使用本机摄像头", "zh-Hant": "使用本機攝影機", "en": "Use this device's camera", "ja": "この端末のカメラを使う"},
  "输入来源": {"zh-Hans": "输入来源", "zh-Hant": "輸入來源", "en": "Input source", "ja": "入力元"},
  "追踪来源": {"zh-Hans": "追踪来源", "zh-Hant": "追蹤來源", "en": "Tracking source", "ja": "トラッキング入力元"},
  "手机 IP 地址": {"zh-Hans": "手机 IP 地址", "zh-Hant": "手機 IP 位址", "en": "Phone IP address", "ja": "スマホのIPアドレス"},
  "请输入局域网中的 IP 地址": {"zh-Hans": "请输入局域网中的 IP 地址", "zh-Hant": "請輸入區域網路中的 IP 位址", "en": "Enter an IP on your local network", "ja": "ローカルネットワークのIPを入力してください"},
  "接收范围": {"zh-Hans": "接收范围", "zh-Hant": "接收範圍", "en": "Receive from", "ja": "受信範囲"},
  "仅本机": {"zh-Hans": "仅本机", "zh-Hant": "僅本機", "en": "This computer", "ja": "このパソコンのみ"},
  "本机与局域网": {"zh-Hans": "本机与局域网", "zh-Hant": "本機與區域網路", "en": "Computer & local network", "ja": "このパソコンとローカルネットワーク"},
  "接收端口": {"zh-Hans": "接收端口", "zh-Hant": "接收連接埠", "en": "Receive port", "ja": "受信ポート"},
  "端口范围：1024–65535": {"zh-Hans": "端口范围：1024–65535", "zh-Hant": "連接埠範圍：1024–65535", "en": "Port range: 1024–65535", "ja": "ポート範囲：1024–65535"},
  "停止接收": {"zh-Hans": "停止接收", "zh-Hant": "停止接收", "en": "Stop receiving", "ja": "受信を停止"},
  "连接手机": {"zh-Hans": "连接手机", "zh-Hant": "連接手機", "en": "Connect phone", "ja": "スマホに接続"},
  "开始接收": {"zh-Hans": "开始接收", "zh-Hant": "開始接收", "en": "Start receiving", "ja": "受信を開始"},
  "追踪已连接": {"zh-Hans": "追踪已连接", "zh-Hant": "追蹤已連接", "en": "Tracking connected", "ja": "トラッキング接続済み"},
  "等待手机数据": {"zh-Hans": "等待手机数据", "zh-Hant": "等待手機資料", "en": "Waiting for phone data", "ja": "スマホのデータを待っています"},
  "等待追踪数据": {"zh-Hans": "等待追踪数据", "zh-Hant": "等待追蹤資料", "en": "Waiting for tracking data", "ja": "トラッキングデータを待っています"},
  "尚未连接": {"zh-Hans": "尚未连接", "zh-Hant": "尚未連接", "en": "Disconnected", "ja": "未接続"},
  "在追踪软件中填写": {"zh-Hans": "在追踪软件中填写", "zh-Hant": "在追蹤軟體中填寫", "en": "Enter in your tracking app", "ja": "トラッキングアプリに入力"},
  "复制地址 {0}": {"zh-Hans": "复制地址 {0}", "zh-Hant": "複製位址 {0}", "en": "Copy address {0}", "ja": "アドレス{0}をコピー"},
  "连接设置": {"zh-Hans": "连接设置", "zh-Hant": "連接設定", "en": "Connection settings", "ja": "接続設定"},
  "只接收这个 IP（可选）": {"zh-Hans": "只接收这个 IP（可选）", "zh-Hant": "只接收這個 IP（選填）", "en": "Accept only this IP (optional)", "ja": "このIPのみ許可（任意）"},
  "追踪来源 IP": {"zh-Hans": "追踪来源 IP", "zh-Hant": "追蹤來源 IP", "en": "Tracking source IP", "ja": "トラッキング入力元のIP"},
  "打开手机上的 iFacialMocap，再连接。": {"zh-Hans": "打开手机上的 iFacialMocap，再连接。", "zh-Hant": "開啟手機上的 iFacialMocap，再連接。", "en": "Open iFacialMocap on your phone, then connect.", "ja": "スマホでiFacialMocapを開いてから接続してください。"},
  "连接方法": {"zh-Hans": "连接方法", "zh-Hant": "連接方法", "en": "Connection guide", "ja": "接続方法"},
  "刷新接收地址": {"zh-Hans": "刷新接收地址", "zh-Hant": "重新整理接收位址", "en": "Refresh addresses", "ja": "受信アドレスを更新"},
  "复制失败，请手动选择地址复制": {"zh-Hans": "复制失败，请手动选择地址复制", "zh-Hant": "複製失敗，請手動選取位址複製", "en": "Copy failed. Select the address and copy it.", "ja": "コピーできません。アドレスを選択してコピーしてください"},
  "这个端口已在使用，请换一个或关闭占用它的应用": {"zh-Hans": "这个端口已在使用，请换一个或关闭占用它的应用", "zh-Hant": "這個連接埠已在使用，請更換或關閉使用它的應用程式", "en": "Port is in use. Choose another or close the app using it.", "ja": "使用中のポートです。変更するか、使用中のアプリを閉じてください"},
  "系统未允许接收追踪数据": {"zh-Hans": "系统未允许接收追踪数据", "zh-Hant": "系統未允許接收追蹤資料", "en": "System permission to receive tracking data was denied", "ja": "トラッキングデータ受信のシステム権限がありません"},
  "无法连接手机，请检查 IP 和 Wi-Fi": {"zh-Hans": "无法连接手机，请检查 IP 和 Wi-Fi", "zh-Hant": "無法連接手機，請檢查 IP 和 Wi-Fi", "en": "Can't reach the phone. Check its IP and Wi-Fi.", "ja": "スマホに接続できません。IPとWi-Fiを確認してください"},
  "角色对谈演示": {"zh-Hans": "角色对谈演示", "zh-Hant": "角色對談示範", "en": "Character conversation demo", "ja": "キャラクターの会話デモ"},
  "无需密钥": {"zh-Hans": "无需密钥", "zh-Hant": "無需金鑰", "en": "No API key needed", "ja": "APIキー不要"},
  "打开演示舞台": {"zh-Hans": "打开演示舞台", "zh-Hant": "開啟示範舞台", "en": "Open demo stage", "ja": "デモステージを開く"},
  "范围映射": {"zh-Hans": "范围映射", "zh-Hant": "範圍映射", "en": "Range mapping", "ja": "範囲マッピング"},
  "展开左侧栏": {"zh-Hans": "展开左侧栏", "zh-Hant": "展開左側欄", "en": "Expand sidebar", "ja": "サイドバーを開く"},
  "收起左侧栏": {"zh-Hans": "收起左侧栏", "zh-Hant": "收合左側欄", "en": "Collapse sidebar", "ja": "サイドバーを閉じる"},
  "角色与工具": {"zh-Hans": "角色与工具", "zh-Hant": "角色與工具", "en": "Cast & tools", "ja": "キャラとツール"},
  "人设与风格": {"zh-Hans": "人设与风格", "zh-Hant": "人設與風格", "en": "Persona & style", "ja": "キャラ設定と話し方"},
  "动作细调与预设": {"zh-Hans": "动作细调与预设", "zh-Hant": "動作細調與預設", "en": "Motion tuning & presets", "ja": "動作の調整とプリセット"},
  "恢复动作默认设置": {"zh-Hans": "恢复动作默认设置", "zh-Hant": "恢復動作預設值", "en": "Reset motion settings", "ja": "動作設定をリセット"},
  "这不是动作预设文件": {"zh-Hans": "这不是动作预设文件", "zh-Hant": "這不是動作預設檔案", "en": "This is not a motion preset", "ja": "動作プリセットではありません"},
  "舞台内容": {"zh-Hans": "舞台内容", "zh-Hant": "舞台內容", "en": "Stage content", "ja": "ステージ内容"},
  "角色设置": {"zh-Hans": "角色设置", "zh-Hant": "角色設定", "en": "Avatar settings", "ja": "キャラ設定"},
  "舞台设置": {"zh-Hans": "舞台设置", "zh-Hant": "舞台設定", "en": "Stage settings", "ja": "ステージ設定"},
  "字幕设置": {"zh-Hans": "字幕设置", "zh-Hant": "字幕設定", "en": "Caption settings", "ja": "字幕設定"},
  "文字设置": {"zh-Hans": "文字设置", "zh-Hant": "文字設定", "en": "Text settings", "ja": "テキスト設定"},
  "图片设置": {"zh-Hans": "图片设置", "zh-Hant": "圖片設定", "en": "Image settings", "ja": "画像設定"},
  "展开{0}": {"zh-Hans": "展开{0}", "zh-Hant": "展開{0}", "en": "Expand {0}", "ja": "{0}を開く"},
  "收起{0}": {"zh-Hans": "收起{0}", "zh-Hant": "收合{0}", "en": "Collapse {0}", "ja": "{0}を閉じる"},
  "阿里云百炼": {"zh-Hans": "阿里云百炼", "zh-Hant": "阿里雲百煉", "en": "Alibaba Model Studio", "ja": "Alibaba Model Studio"},
  "按角色自动分配": {"zh-Hans": "按角色自动分配", "zh-Hant": "按角色自動分配", "en": "Assign per character", "ja": "キャラごとに自動設定"},
  "声音文件读取失败（{0}）": {"zh-Hans": "声音文件读取失败（{0}）", "zh-Hant": "聲音檔案讀取失敗（{0}）", "en": "Could not load audio ({0})", "ja": "音声を読み込めません（{0}）"},
  "让角色第一次开口": {"zh-Hans": "让角色第一次开口", "zh-Hant": "讓角色第一次開口", "en": "Meet your first characters", "ja": "キャラクターに会ってみよう"},
  "先看一段对谈，或选择你的上场方式。": {"zh-Hans": "先看一段对谈，或选择你的上场方式。", "zh-Hant": "先看一段對談，或選擇你的上場方式。", "en": "Watch a conversation or choose how to perform.", "ja": "会話デモを見るか、出演方法を選んでください。"},
  "Sena 与 Kai 的对谈": {"zh-Hans": "Sena 与 Kai 的对谈", "zh-Hant": "Sena 與 Kai 的對談", "en": "A chat with Sena & Kai", "ja": "SenaとKaiの会話"},
  "角色声音、动作与字幕": {"zh-Hans": "角色声音、动作与字幕", "zh-Hant": "角色聲音、動作與字幕", "en": "Voices, motion and captions", "ja": "声・動き・字幕を体験"},
  "中文演示": {"zh-Hans": "中文演示", "zh-Hant": "中文示範", "en": "Chinese demo", "ja": "中国語デモ"},
  "用自己的表情和声音直播": {"zh-Hans": "用自己的表情和声音直播", "zh-Hant": "用自己的表情和聲音直播", "en": "Stream with your own face and voice", "ja": "自分の表情と声で配信"},
  "让角色说话、回应观众": {"zh-Hans": "让角色说话、回应观众", "zh-Hant": "讓角色說話、回應觀眾", "en": "Let your character talk to viewers", "ja": "キャラが話して視聴者に応答"},
  "自己出镜，让 AI 接着聊": {"zh-Hans": "自己出镜，让 AI 接着聊", "zh-Hant": "自己出鏡，讓 AI 接著聊", "en": "Perform alongside an AI cohost", "ja": "AIと一緒に出演"},
  "Sena 已为你准备好": {"zh-Hans": "Sena 已为你准备好", "zh-Hant": "Sena 已為你準備好", "en": "Your character is ready", "ja": "キャラを用意しました"},
  "连接模型与声音": {"zh-Hans": "连接模型与声音", "zh-Hant": "連接模型與聲音", "en": "Connect AI & voice", "ja": "AIと音声を接続"},
  "先听听角色的声音": {"zh-Hans": "先听听角色的声音", "zh-Hant": "先聽聽角色的聲音", "en": "Try your character’s voice", "ja": "キャラの声を試す"},
  "填一份密钥，开始真实对话": {"zh-Hans": "填一份密钥，开始真实对话", "zh-Hant": "填一份金鑰，開始真實對話", "en": "Add your key to start chatting", "ja": "キーを設定して会話を開始"},
  "开始对话": {"zh-Hans": "开始对话", "zh-Hant": "開始對話", "en": "Start a conversation", "ja": "会話を開始"},
  "让角色先聊几句": {"zh-Hans": "让角色先聊几句", "zh-Hant": "讓角色先聊幾句", "en": "Let the characters chat", "ja": "まずは少し話してみよう"},
  "看向镜头，保持自然表情": {"zh-Hans": "看向镜头，保持自然表情", "zh-Hant": "看向鏡頭，保持自然表情", "en": "Face the camera naturally", "ja": "自然な表情でカメラを見てください"},
  "把准备好的画面送去直播": {"zh-Hans": "把准备好的画面送去直播", "zh-Hant": "把準備好的畫面送去直播", "en": "Send your stage to your stream", "ja": "準備した画面を配信へ"},
  "准备好了": {"zh-Hans": "准备好了", "zh-Hant": "準備好了", "en": "Ready to go", "ja": "準備完了"},
  "查看上手步骤": {"zh-Hans": "查看上手步骤", "zh-Hant": "查看上手步驟", "en": "Show getting started steps", "ja": "はじめ方を表示"},
  "关闭上手引导": {"zh-Hans": "关闭上手引导", "zh-Hant": "關閉上手引導", "en": "Dismiss getting started", "ja": "ガイドを閉じる"},
  "演示声音": {"zh-Hans": "演示声音", "zh-Hant": "示範聲音", "en": "Demo voice", "ja": "デモ音声"},
  "点选角色，查看它的设置": {"zh-Hans": "点选角色，查看它的设置", "zh-Hant": "點選角色，查看它的設定", "en": "Select a character to see its settings", "ja": "キャラを選んで設定を表示"},
  "输出": {"zh-Hans":"输出","zh-Hant":"輸出","en":"Output","ja":"出力"},
  "无需配置 API": {"zh-Hans": "无需配置 API", "zh-Hant": "無需設定 API", "en": "No API setup", "ja": "API設定いらず"},
  "角色语音直接使用 livliv.ai 积分。": {"zh-Hans": "角色语音直接使用 livliv.ai 积分。", "zh-Hant": "角色語音直接使用 livliv.ai 積分。", "en": "Use livliv.ai points for character voices.", "ja": "キャラクターの音声にはlivliv.aiのポイントを利用。"},
  "语音识别接口没有返回文字": {"zh-Hans": "语音识别接口没有返回文字", "zh-Hant": "語音辨識介面沒有傳回文字", "en": "The speech recognition API returned no text", "ja": "音声認識APIからテキストが返されませんでした"},
  "Nana、Sena 与 Kai 的三人对谈": {"zh-Hans": "Nana、Sena 与 Kai 的三人对谈", "zh-Hant": "Nana、Sena 與 Kai 的三人對談", "en": "A chat with Nana, Sena & Kai", "ja": "Nana・Sena・Kaiの3人トーク"},
  "三人对谈演示": {"zh-Hans": "三人对谈演示", "zh-Hant": "三人對談示範", "en": "Three-character demo", "ja": "3人の会話デモ"},
  "再看一次": {"zh-Hans":"再看一次","zh-Hant":"再看一次","en":"Replay demo","ja":"もう一度見る"},
  "出错了，{0} 秒后重试": {"zh-Hans": "出错了，{0} 秒后重试", "zh-Hant": "出錯了，{0} 秒後重試", "en": "Something went wrong. Retrying in {0}s", "ja": "エラーが発生しました。{0}秒後に再試行します"},
  "连续出错 {0} 次，已停止": {"zh-Hans": "连续出错 {0} 次，已停止", "zh-Hant": "連續出錯 {0} 次，已停止", "en": "Stopped after {0} errors in a row", "ja": "{0}回続けてエラーが起きたため停止しました"},
  "{0} 张图片的地址不受支持，已跳过": {"zh-Hans": "{0} 张图片的地址不受支持，已跳过", "zh-Hant": "{0} 張圖片的位址不受支援，已略過", "en": "Skipped {0} images with unsupported addresses", "ja": "対応していないアドレスの画像を{0}枚スキップしました"},
  "缺了 {0} 段声音": {"zh-Hans": "缺了 {0} 段声音", "zh-Hant": "缺了 {0} 段聲音", "en": "Missing sounds: {0}", "ja": "入らなかった音声：{0}件"},
  "缺了 {0} 张图片": {"zh-Hans": "缺了 {0} 张图片", "zh-Hant": "缺了 {0} 張圖片", "en": "Missing pictures: {0}", "ja": "入らなかった画像：{0}枚"},
  "重新做视频": {"zh-Hans": "重新做视频", "zh-Hant": "重新製作影片", "en": "Make video again", "ja": "動画を作り直す"},
  "启用全局热键": {"zh-Hans": "启用全局热键", "zh-Hant": "啟用全域熱鍵", "en": "Turn on global hotkeys", "ja": "グローバルホットキーを有効にする"},
  "在 livliv.ai 管理": {"zh-Hans": "在 livliv.ai 管理", "zh-Hant": "在 livliv.ai 管理", "en": "Manage on livliv.ai", "ja": "livliv.aiで管理"},
  "网页版只列出能在浏览器里直接调用的服务。本机的 Ollama 和其他接口，请用桌面版。": {"zh-Hans": "网页版只列出能在浏览器里直接调用的服务。本机的 Ollama 和其他接口，请用桌面版。", "zh-Hant": "網頁版只列出能在瀏覽器裡直接呼叫的服務。本機的 Ollama 和其他介面，請用桌面版。", "en": "The web version lists only services a browser can call directly. For Ollama on your computer or other APIs, use the desktop app.", "ja": "Web版にはブラウザから直接呼び出せるサービスだけを表示しています。ローカルのOllamaやその他のAPIはデスクトップ版で使えます。"},
  "{0} 已经在舞台上": {"zh-Hans": "{0} 已经在舞台上", "zh-Hant": "{0} 已經在舞台上", "en": "{0} is already on the stage", "ja": "{0}はもうステージにいます"},
  "{0} 上台了": {"zh-Hans": "{0} 上台了", "zh-Hant": "{0} 上台了", "en": "{0} is on the stage", "ja": "{0}がステージに上がりました"},
  "最长 {0} 秒": {"zh-Hans": "最长 {0} 秒", "zh-Hant": "最長 {0} 秒", "en": "Up to {0} s", "ja": "最長{0}秒"},
  "最长 {0} 分钟": {"zh-Hans": "最长 {0} 分钟", "zh-Hant": "最長 {0} 分鐘", "en": "Up to {0} min", "ja": "最長{0}分"},
  "LivLiv 标记": {"zh-Hans": "LivLiv 标记", "zh-Hant": "LivLiv 標記", "en": "LivLiv mark", "ja": "LivLivマーク"},
  "会员录 5 分钟，没有标记": {"zh-Hans": "会员录 5 分钟，没有标记", "zh-Hant": "會員錄 5 分鐘，沒有標記", "en": "Members record 5 minutes, no mark", "ja": "メンバーは5分まで、マークなしで録画"},
  "52 秒，角色自己的声音、动作和字幕": {"zh-Hans": "52 秒，角色自己的声音、动作和字幕", "zh-Hant": "52 秒，角色自己的聲音、動作和字幕", "en": "52 seconds, with their own voices, moves and subtitles", "ja": "52秒・キャラクター自身の声、動き、字幕"},
  "用摄像头试": {"zh-Hans": "用摄像头试", "zh-Hant": "用攝影機試", "en": "Try your camera", "ja": "カメラで試す"},
  "你的表情带动角色，不用账号": {"zh-Hans": "你的表情带动角色，不用账号", "zh-Hant": "你的表情帶動角色，不用帳號", "en": "Your face moves the character, no account needed", "ja": "表情でキャラクターが動きます。アカウント不要"},
  "接自己的模型": {"zh-Hans": "接自己的模型", "zh-Hant": "接自己的模型", "en": "Use your own model", "ja": "自分のモデルをつなぐ"},
  "填上你的密钥，让角色们自己聊": {"zh-Hans": "填上你的密钥，让角色们自己聊", "zh-Hant": "填上你的金鑰，讓角色們自己聊", "en": "Add your key and let the characters talk", "ja": "キーを入れて、キャラクター同士で会話"},
  "放自己的角色": {"zh-Hans": "放自己的角色", "zh-Hant": "放自己的角色", "en": "Bring your own character", "ja": "自分のキャラクターを置く"},
  "livliv.ai 的角色、VRM 或 PNG 立绘": {"zh-Hans": "livliv.ai 的角色、VRM 或 PNG 立绘", "zh-Hant": "livliv.ai 的角色、VRM 或 PNG 立繪", "en": "From livliv.ai, a VRM, or PNG art", "ja": "livliv.aiのキャラクター、VRM、PNG立ち絵"},
  "欢迎来到 LivLiv Stage": {"zh-Hans": "欢迎来到 LivLiv Stage", "zh-Hant": "歡迎來到 LivLiv Stage", "en": "Welcome to LivLiv Stage", "ja": "LivLiv Stageへようこそ"},
  "多个角色，同一个舞台": {"zh-Hans": "多个角色，同一个舞台", "zh-Hant": "多個角色，同一個舞台", "en": "Many characters. One stage.", "ja": "たくさんのキャラクター、ひとつのステージ"},
  "面捕、角色对谈、录制和 OBS 输出，在浏览器里就能用。": {"zh-Hans": "面捕、角色对谈、录制和 OBS 输出，在浏览器里就能用。", "zh-Hant": "面捕、角色對談、錄製和 OBS 輸出，在瀏覽器裡就能用。", "en": "Face tracking, conversations between characters, recording and OBS output, right in your browser.", "ja": "フェイストラッキング、キャラクター同士の会話、録画、OBS出力をブラウザで。"},
  "多个角色同台：面捕、角色对谈、录制和 OBS 输出。": {"zh-Hans": "多个角色同台：面捕、角色对谈、录制和 OBS 输出。", "zh-Hant": "多個角色同台：面捕、角色對談、錄製和 OBS 輸出。", "en": "Many characters on one stage: face tracking, conversations, recording and OBS output.", "ja": "複数のキャラクターが同じステージに：フェイストラッキング、会話、録画、OBS出力。"},
  "编辑、摄像头和接模型，请在电脑上打开这个页面。": {"zh-Hans": "编辑、摄像头和接模型，请在电脑上打开这个页面。", "zh-Hant": "編輯、攝影機和接模型，請在電腦上打開這個頁面。", "en": "To edit, use your camera or connect a model, open this page on a computer.", "ja": "編集、カメラ、モデル接続はパソコンでこのページを開いてください。"},
  "复制链接": {"zh-Hans": "复制链接", "zh-Hant": "複製連結", "en": "Copy link", "ja": "リンクをコピー"},
  "Stage 已在另一个标签页打开": {"zh-Hans": "Stage 已在另一个标签页打开", "zh-Hant": "Stage 已在另一個分頁打開", "en": "Stage is open in another tab", "ja": "Stageは別のタブで開いています"},
  "同一个浏览器一次只在一个标签页里编辑，免得两边互相覆盖。": {"zh-Hans": "同一个浏览器一次只在一个标签页里编辑，免得两边互相覆盖。", "zh-Hant": "同一個瀏覽器一次只在一個分頁裡編輯，免得兩邊互相覆蓋。", "en": "One browser edits in one tab at a time, so two tabs don’t save over each other.", "ja": "同じブラウザで編集できるのは一度にひとつのタブです。互いに上書きしないためです。"},
  "那边正在{0}：移到这里会停下来。": {"zh-Hans": "那边正在{0}：移到这里会停下来。", "zh-Hant": "那邊正在{0}：移到這裡會停下來。", "en": "That tab is busy with {0}: moving here stops it.", "ja": "向こうのタブで{0}中です。こちらに移すと止まります。"},
  "OBS 输出": {"zh-Hans": "OBS 输出", "zh-Hant": "OBS 輸出", "en": "OBS output", "ja": "OBS出力"},
  "、": {"zh-Hans": "、", "zh-Hant": "、", "en": ", ", "ja": "、"},
  "在这里继续": {"zh-Hans": "在这里继续", "zh-Hant": "在這裡繼續", "en": "Continue here", "ja": "ここで続ける"},
  "拿不到你的角色（{0}）": {"zh-Hans": "拿不到你的角色（{0}）", "zh-Hant": "拿不到你的角色（{0}）", "en": "Couldn’t load your characters ({0})", "ja": "キャラクターを読み込めませんでした（{0}）"},
  "你在 livliv.ai 的角色": {"zh-Hans": "你在 livliv.ai 的角色", "zh-Hant": "你在 livliv.ai 的角色", "en": "Your characters on livliv.ai", "ja": "livliv.aiのあなたのキャラクター"},
  "找不到 {0}。如果是你自己的角色，登录后再打开": {"zh-Hans": "找不到 {0}。如果是你自己的角色，登录后再打开", "zh-Hant": "找不到 {0}。如果是你自己的角色，登入後再打開", "en": "Can’t find {0}. If it’s your own character, sign in and open it again", "ja": "{0}が見つかりません。自分のキャラクターなら、ログインしてから開いてください"},
  "{0} 只有作者能在 Stage 里用": {"zh-Hans": "{0} 只有作者能在 Stage 里用", "zh-Hant": "{0} 只有作者能在 Stage 裡用", "en": "Only the author of {0} can use it in Stage", "ja": "{0}をStageで使えるのは作者だけです"},
  "给它加「色度键」滤镜，去掉绿色。": {"zh-Hans": "给它加「色度键」滤镜，去掉绿色。", "zh-Hant": "給它加「色度鍵」濾鏡，去掉綠色。", "en": "Add a “Chroma Key” filter to remove the green.", "ja": "「クロマキー」フィルターを追加して緑を消します。"},
  "开播 · {0}": {"zh-Hans": "开播 · {0}", "zh-Hant": "開播 · {0}", "en": "Live · {0}", "ja": "配信 · {0}"},
  "开播": {"zh-Hans": "开播", "zh-Hant": "開播", "en": "Go live", "ja": "配信"},
  "允许使用摄像头": {"zh-Hans": "允许使用摄像头", "zh-Hant": "允許使用攝影機", "en": "Allow the camera", "ja": "カメラを許可"},
  "看向镜头，按空格": {"zh-Hans": "看向镜头，按空格", "zh-Hant": "看向鏡頭，按空格", "en": "Look into the camera and press Space", "ja": "カメラを見てスペースキー"},
  "1–9 表情 · 0 恢复 · Q–T 动作 · B 暂离": {"zh-Hans": "1–9 表情 · 0 恢复 · Q–T 动作 · B 暂离", "zh-Hant": "1–9 表情 · 0 恢復 · Q–T 動作 · B 暫離", "en": "1–9 expressions · 0 reset · Q–T moves · B away", "ja": "1–9 表情 · 0 戻す · Q–T 動き · B 離席"},
  "AI 生成": {"zh-Hans": "AI 生成", "zh-Hant": "AI 生成", "en": "AI-generated", "ja": "AI生成"},
  "暂离中，按 B 回来": {"zh-Hans": "暂离中，按 B 回来", "zh-Hant": "暫離中，按 B 回來", "en": "Away. Press B to come back", "ja": "離席中。Bで戻ります"},
  "暂离": {"zh-Hans": "暂离", "zh-Hant": "暫離", "en": "Away", "ja": "離席"},
  "开始 / 暂停 AI；没有 AI 角色时校准正面": {"zh-Hans": "开始 / 暂停 AI；没有 AI 角色时校准正面", "zh-Hant": "開始 / 暫停 AI；沒有 AI 角色時校準正面", "en": "Start / pause AI; with no AI character, calibrate the neutral pose", "ja": "AIの開始 / 一時停止。AIキャラクターがいないときは正面を調整"},
  "表情 / 恢复": {"zh-Hans": "表情 / 恢复", "zh-Hant": "表情 / 恢復", "en": "Expressions / reset", "ja": "表情 / 戻す"},
  "点头、摇头、歪头、跳一下、害羞": {"zh-Hans": "点头、摇头、歪头、跳一下、害羞", "zh-Hant": "點頭、搖頭、歪頭、跳一下、害羞", "en": "Nod, shake head, tilt head, hop, shy", "ja": "うなずく、首を振る、首をかしげる、ジャンプ、照れる"},
  "暂离 / 回来": {"zh-Hans": "暂离 / 回来", "zh-Hant": "暫離 / 回來", "en": "Away / back", "ja": "離席 / 戻る"},
  "数字键的触发方式": {"zh-Hans": "数字键的触发方式", "zh-Hant": "數字鍵的觸發方式", "en": "How the number keys work", "ja": "数字キーの動き方"},
  "{0} 的触发方式": {"zh-Hans": "{0} 的触发方式", "zh-Hant": "{0} 的觸發方式", "en": "How the key for {0} works", "ja": "{0}のキーの動き方"},
  "按一下开关": {"zh-Hans": "按一下开关", "zh-Hant": "按一下開關", "en": "Press to turn on / off", "ja": "押すたびにオン / オフ"},
  "按住时显示": {"zh-Hans": "按住时显示", "zh-Hant": "按住時顯示", "en": "While held", "ja": "押している間だけ"},
  "显示 {0} 秒": {"zh-Hans": "显示 {0} 秒", "zh-Hant": "顯示 {0} 秒", "en": "For {0} s", "ja": "{0}秒間"},
  "麦克风对口型": {"zh-Hans": "麦克风对口型", "zh-Hant": "麥克風對口型", "en": "Mouth follows the mic", "ja": "マイクで口を動かす"},
  "说话时嘴跟着声音动，和摄像头一起用": {"zh-Hans": "说话时嘴跟着声音动，和摄像头一起用", "zh-Hant": "說話時嘴跟著聲音動，和攝影機一起用", "en": "Your voice moves the mouth too, along with the camera", "ja": "話すと声に合わせて口が動きます（カメラと一緒に）"},
  "离开后自动暂离": {"zh-Hans": "离开后自动暂离", "zh-Hant": "離開後自動暫離", "en": "Away when you step out", "ja": "離れたら自動で離席"},
  "摄像头 {0} 秒看不到你，角色就闭眼打瞌睡，回来就醒": {"zh-Hans": "摄像头 {0} 秒看不到你，角色就闭眼打瞌睡，回来就醒", "zh-Hant": "攝影機 {0} 秒看不到你，角色就閉眼打瞌睡，回來就醒", "en": "After {0} s without you in the camera, the character dozes off; it wakes when you’re back", "ja": "カメラに{0}秒映らないとキャラクターが居眠りし、戻ると起きます"},
  "别让其他窗口完全盖住输出窗口，否则画面会停住。": {"zh-Hans": "别让其他窗口完全盖住输出窗口，否则画面会停住。", "zh-Hant": "別讓其他視窗完全蓋住輸出視窗，否則畫面會停住。", "en": "Don’t let another window cover the output window completely, or its picture stops.", "ja": "ほかのウィンドウで出力ウィンドウを完全に隠すと、映像が止まります。"},
  "LivLiv 积分": {"zh-Hans": "LivLiv 积分", "zh-Hant": "LivLiv 積分", "en": "LivLiv points", "ja": "LivLiv ポイント"},
  "LivLiv 积分只能让 LivLiv 的角色说话：给「{0}」接上你自己的模型": {"zh-Hans": "LivLiv 积分只能让 LivLiv 的角色说话：给「{0}」接上你自己的模型", "zh-Hant": "LivLiv 積分只能讓 LivLiv 的角色說話：給「{0}」接上你自己的模型", "en": "LivLiv points work for LivLiv characters only: connect your own model for “{0}”", "ja": "LivLiv ポイントで話せるのは LivLiv のキャラクターだけです。「{0}」には自分のモデルをつないでください"},
  "未满 18 岁不能用 AI 让角色说话": {"zh-Hans": "未满 18 岁不能用 AI 让角色说话", "zh-Hant": "未滿 18 歲不能用 AI 讓角色說話", "en": "You need to be 18 or over to let AI speak for characters", "ja": "18 歳未満は AI でキャラクターを話させることはできません"},
  "积分用完了，或者今天、这个月的次数到了上限": {"zh-Hans": "积分用完了，或者今天、这个月的次数到了上限", "zh-Hant": "積分用完了，或者今天、這個月的次數到了上限", "en": "Out of points, or today’s or this month’s limit is reached", "ja": "ポイントが足りないか、今日または今月の上限に達しました"},
  "只有作者能在 Stage 里用这个角色": {"zh-Hans": "只有作者能在 Stage 里用这个角色", "zh-Hant": "只有作者能在 Stage 裡用這個角色", "en": "Only its author can use this character in Stage", "ja": "このキャラクターを Stage で使えるのは作者だけです"},
  "说得太快了，歇一下再继续": {"zh-Hans": "说得太快了，歇一下再继续", "zh-Hant": "說得太快了，歇一下再繼續", "en": "Too fast. Take a moment, then continue", "ja": "速すぎます。少し待ってから続けてください"},
  "角色暂时没有回应，稍后再试": {"zh-Hans": "角色暂时没有回应，稍后再试", "zh-Hant": "角色暫時沒有回應，稍後再試", "en": "The character isn’t answering right now. Try again later", "ja": "キャラクターが応答していません。しばらくしてからもう一度お試しください"},
  "不用密钥：用 livliv.ai 的积分让角色说话，每句约 0.8 积分，含角色自己的声音。只能用于 LivLiv 的角色。": {"zh-Hans": "不用密钥：用 livliv.ai 的积分让角色说话，每句约 0.8 积分，含角色自己的声音。只能用于 LivLiv 的角色。", "zh-Hant": "不用金鑰：用 livliv.ai 的積分讓角色說話，每句約 0.8 積分，含角色自己的聲音。只能用於 LivLiv 的角色。", "en": "No key needed: characters speak with your livliv.ai points, about 0.8 points a line including their own voice. LivLiv characters only.", "ja": "キー不要：livliv.ai のポイントでキャラクターが話します。1 行あたり約 0.8 ポイント（キャラクター自身の声を含む）。LivLiv のキャラクターのみ。"},
  "确认年龄": {"zh-Hans": "确认年龄", "zh-Hant": "確認年齡", "en": "Confirm your age", "ja": "年齢の確認"},
  "用 AI 让角色说话前，请确认你已年满 18 岁。": {"zh-Hans": "用 AI 让角色说话前，请确认你已年满 18 岁。", "zh-Hant": "用 AI 讓角色說話前，請確認你已年滿 18 歲。", "en": "Before AI speaks for characters, please confirm you are 18 or over.", "ja": "AI でキャラクターを話させる前に、18 歳以上であることを確認してください。"},
  "未满 18 岁": {"zh-Hans": "未满 18 岁", "zh-Hant": "未滿 18 歲", "en": "Under 18", "ja": "18 歳未満"},
  "已满 18 岁": {"zh-Hans": "已满 18 岁", "zh-Hant": "已滿 18 歲", "en": "18 or over", "ja": "18 歳以上"},
}
