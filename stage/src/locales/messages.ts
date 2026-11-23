// UI messages. Values such as model names and user dialogue are not translated.
export const messages: Record<string, Record<'zh-Hans' | 'zh-Hant' | 'en' | 'ja', string>> = {
  "直播": {"zh-Hans":"直播","zh-Hant":"直播","en":"Live","ja":"配信"},
  "游戏直播与观众弹幕": {"zh-Hans":"游戏直播与观众弹幕","zh-Hant":"遊戲直播與觀眾彈幕","en":"Game streaming and audience chat","ja":"ゲーム配信と視聴者コメント"},
  "和 {0} 聊天": {"zh-Hans":"和 {0} 聊天","zh-Hant":"和 {0} 聊天","en":"Chat with {0}","ja":"{0} と会話する"},
  "由 {0} 回应": {"zh-Hans":"由 {0} 回应","zh-Hant":"由 {0} 回應","en":"Replies from {0}","ja":"応答するキャラクター：{0}"},
  "由 Project AIRI 驱动": {"zh-Hans":"由 Project AIRI 驱动","zh-Hant":"由 Project AIRI 驅動","en":"Powered by Project AIRI","ja":"Project AIRI で動作中"},
  "不是 OpenAI 兼容模型": {"zh-Hans":"不是 OpenAI 兼容模型","zh-Hant":"不是 OpenAI 相容模型","en":"not an OpenAI-compatible model","ja":"OpenAI 互換モデルではない"},
  "没有 AI 角色": {"zh-Hans":"没有 AI 角色","zh-Hant":"沒有 AI 角色","en":"no AI character","ja":"AI キャラクターがいない"},
  "{0} 个 AI 角色": {"zh-Hans":"{0} 个 AI 角色","zh-Hant":"{0} 個 AI 角色","en":"{0} AI characters","ja":"AI キャラクター {0} 人"},
  "好友联播的角色": {"zh-Hans":"好友联播的角色","zh-Hant":"好友聯播的角色","en":"a friend's character","ja":"フレンドのキャラクター"},
  "AIRI 已关闭": {"zh-Hans":"AIRI 已关闭","zh-Hant":"AIRI 已關閉","en":"AIRI is off","ja":"AIRI はオフ"},
  "选中的不是这位角色": {"zh-Hans":"选中的不是这位角色","zh-Hant":"選中的不是這位角色","en":"another character was chosen","ja":"別のキャラクターが選ばれている"},
  "AI 搭档的声音": {"zh-Hans":"AI 搭档的声音","zh-Hant":"AI 搭檔的聲音","en":"AI partner's voice","ja":"AI パートナーの声"},
  "AI 搭档的文字模型": {"zh-Hans":"AI 搭档的文字模型","zh-Hant":"AI 搭檔的文字模型","en":"AI partner's text model","ja":"AI パートナーのテキストモデル"},
  "AI 来开播": {"zh-Hans":"AI 来开播","zh-Hant":"AI 來開播","en":"AI goes live","ja":"AI が配信"},
  "AI 角色自己开播，回应直播间": {"zh-Hans":"AI 角色自己开播，回应直播间","zh-Hant":"AI 角色自己開播，回應直播間","en":"Your AI character streams on its own and answers the audience","ja":"AI キャラクターが自分で配信し、視聴者に応える"},
  "Neuro 游戏": {"zh-Hans":"Neuro 游戏","zh-Hant":"Neuro 遊戲","en":"Neuro games","ja":"Neuro ゲーム"},
  "Twitch 频道": {"zh-Hans":"Twitch 频道","zh-Hant":"Twitch 頻道","en":"Twitch channel","ja":"Twitch チャンネル"},
  "{0} 分钟": {"zh-Hans":"{0} 分钟","zh-Hant":"{0} 分鐘","en":"{0} min","ja":"{0} 分"},
  "{0} 秒后回复": {"zh-Hans":"{0} 秒后回复","zh-Hant":"{0} 秒後回覆","en":"Replied in {0} s","ja":"{0} 秒で返答"},
  "{0} 说完了": {"zh-Hans":"{0} 说完了","zh-Hant":"{0} 說完了","en":"{0} finished speaking","ja":"{0} が話し終わりました"},
  "一个密钥用于全部": {"zh-Hans":"一个密钥用于全部","zh-Hant":"一個金鑰用於全部","en":"One key for everything","ja":"ひとつのキーで全部"},
  "上限": {"zh-Hans":"上限","zh-Hant":"上限","en":"Limits","ja":"上限"},
  "不参与": {"zh-Hans":"不参与","zh-Hant":"不參與","en":"I don't join","ja":"参加しない"},
  "不对外：私聊时只有你看得到": {"zh-Hans":"不对外：私聊时只有你看得到","zh-Hant":"不對外：私聊時只有你看得到","en":"Not shown to anyone: in private chat only you see it","ja":"公開しない：プライベート会話は自分だけが見られる"},
  "不接弹幕": {"zh-Hans":"不接弹幕","zh-Hant":"不接彈幕","en":"no chat","ja":"コメントなし"},
  "不接弹幕也能开播": {"zh-Hans":"不接弹幕也能开播","zh-Hant":"不接彈幕也能開播","en":"You can go live without chat","ja":"コメントなしでも配信できます"},
  "「AI 来演」时才有人设": {"zh-Hans":"「AI 来演」时才有人设","zh-Hant":"「AI 來演」時才有人設","en":"Personas apply when AI performs","ja":"人物設定は「AI が演じる」ときだけ"},
  "今天做什么": {"zh-Hans":"今天做什么","zh-Hant":"今天做什麼","en":"What are we making today?","ja":"今日は何をする？"},
  "你参与吗": {"zh-Hans":"你参与吗","zh-Hant":"你參與嗎","en":"Do you join?","ja":"あなたは参加する？"},
  "你的角色跟着摄像头动，你说话": {"zh-Hans":"你的角色跟着摄像头动，你说话","zh-Hant":"你的角色跟著攝影機動，你說話","en":"Your character follows your camera, and you speak","ja":"あなたのキャラがカメラに合わせて動き、あなたが話す"},
  "做一段视频": {"zh-Hans":"做一段视频","zh-Hant":"做一段影片","en":"Make a video","ja":"動画を作る"},
  "先在「设置 → 连接」填好文字模型": {"zh-Hans":"先在「设置 → 连接」填好文字模型","zh-Hant":"先在「設定 → 連接」填好文字模型","en":"Set up a text model in Settings → Connections first","ja":"先に「設定 → 接続」でテキストモデルを設定してください"},
  "先放一个 AI 角色": {"zh-Hans":"先放一个 AI 角色","zh-Hant":"先放一個 AI 角色","en":"Add an AI character first","ja":"先に AI キャラクターを追加してください"},
  "先放一个「我来演」的角色": {"zh-Hans":"先放一个「我来演」的角色","zh-Hant":"先放一個「我來演」的角色","en":"Add a character you perform first","ja":"先に自分で演じるキャラクターを追加してください"},
  "先看一段演示": {"zh-Hans":"先看一段演示","zh-Hant":"先看一段演示","en":"Watch a demo first","ja":"まずデモを見る"},
  "其他模板": {"zh-Hans":"其他模板","zh-Hant":"其他範本","en":"Other templates","ja":"ほかのテンプレート"},
  "准备 {0}/{1}": {"zh-Hans":"准备 {0}/{1}","zh-Hant":"準備 {0}/{1}","en":"Ready {0}/{1}","ja":"準備 {0}/{1}"},
  "准备好后点上方的「输出到 OBS」": {"zh-Hans":"准备好后点上方的「输出到 OBS」","zh-Hant":"準備好後點上方的「輸出到 OBS」","en":"When ready, use OBS output at the top","ja":"準備ができたら上の「OBS出力」へ"},
  "准备清单": {"zh-Hans":"准备清单","zh-Hant":"準備清單","en":"Checklist","ja":"準備リスト"},
  "加一个 AI 搭档": {"zh-Hans":"加一个 AI 搭档","zh-Hant":"加一個 AI 搭檔","en":"Add an AI partner","ja":"AI パートナーを追加"},
  "去设置": {"zh-Hans":"去设置","zh-Hant":"去設定","en":"Open setting","ja":"設定を開く"},
  "可选：需要 OpenAI 或百炼密钥": {"zh-Hans":"可选：需要 OpenAI 或百炼密钥","zh-Hant":"可選：需要 OpenAI 或百鍊金鑰","en":"Optional: needs an OpenAI or Bailian key","ja":"任意：OpenAI または百錬のキーが必要"},
  "只有字幕": {"zh-Hans":"只有字幕","zh-Hant":"只有字幕","en":"Subtitles only","ja":"字幕のみ"},
  "只有我": {"zh-Hans":"只有我","zh-Hant":"只有我","en":"Just me","ja":"自分だけ"},
  "只读弹幕，不需要登录": {"zh-Hans":"只读弹幕，不需要登录","zh-Hant":"只讀彈幕，不需要登入","en":"Reads chat only, no sign-in needed","ja":"コメントを読むだけ、ログイン不要"},
  "可以按住说和免按键": {"zh-Hans":"可以按住说和免按键","zh-Hant":"可以按住說和免按鍵","en":"Push to talk and hands-free work","ja":"押して話す・ハンズフリーが使えます"},
  "可录的声音": {"zh-Hans":"可录的声音","zh-Hant":"可錄的聲音","en":"A voice that records","ja":"録画できる声"},
  "可选：Minecraft 或 Factorio": {"zh-Hans":"可选：Minecraft 或 Factorio","zh-Hant":"可選：Minecraft 或 Factorio","en":"Optional: Minecraft or Factorio","ja":"任意：Minecraft または Factorio"},
  "可选：口型跟着你的声音": {"zh-Hans":"可选：口型跟着你的声音","zh-Hant":"可選：口型跟著你的聲音","en":"Optional: the mouth follows your voice","ja":"任意：口の動きがあなたの声に合わせる"},
  "可选：说话代替打字": {"zh-Hans":"可选：说话代替打字","zh-Hant":"可選：說話代替打字","en":"Optional: speak instead of typing","ja":"任意：入力のかわりに話す"},
  "和 AI 搭档": {"zh-Hans":"和 AI 搭档","zh-Hant":"和 AI 搭檔","en":"with an AI partner","ja":"AI パートナーと"},
  "和角色聊天": {"zh-Hans":"和角色聊天","zh-Hant":"和角色聊天","en":"Chat with a character","ja":"キャラと話す"},
  "回应观众": {"zh-Hans":"回应观众","zh-Hant":"回應觀眾","en":"Answers an audience","ja":"視聴者に応える"},
  "在 livliv.ai 创建角色": {"zh-Hans":"在 livliv.ai 创建角色","zh-Hant":"在 livliv.ai 建立角色","en":"Create a character on livliv.ai","ja":"livliv.ai でキャラを作る"},
  "在控制台打字": {"zh-Hans":"在控制台打字","zh-Hant":"在控制台打字","en":"Type in the console","ja":"コンソールに入力"},
  "声音与语音识别": {"zh-Hans":"声音与语音识别","zh-Hant":"聲音與語音辨識","en":"Voices and speech recognition","ja":"声と音声認識"},
  "实时通话": {"zh-Hans":"实时通话","zh-Hant":"即時通話","en":"Realtime call","ja":"リアルタイム通話"},
  "已打开": {"zh-Hans":"已打开","zh-Hant":"已開啟","en":"On","ja":"オン"},
  "已把现在的姿势设为正面": {"zh-Hans":"已把现在的姿势设为正面","zh-Hant":"已把現在的姿勢設為正面","en":"Your current pose is now the neutral pose","ja":"今の姿勢を正面にしました"},
  "已连接 {0}": {"zh-Hans":"已连接 {0}","zh-Hant":"已連接 {0}","en":"Connected to {0}","ja":"{0} に接続済み"},
  "开始聊天": {"zh-Hans":"开始聊天","zh-Hant":"開始聊天","en":"Start chat","ja":"話し始める"},
  "开始选项": {"zh-Hans":"开始选项","zh-Hant":"開始選項","en":"Start options","ja":"開始オプション"},
  "开始页": {"zh-Hans":"开始页","zh-Hant":"開始頁","en":"Start page","ja":"スタートページ"},
  "开录": {"zh-Hans":"开录","zh-Hant":"開錄","en":"Record","ja":"録画開始"},
  "引擎": {"zh-Hans":"引擎","zh-Hant":"引擎","en":"Engine","ja":"エンジン"},
  "恢复默认设置": {"zh-Hans":"恢复默认设置","zh-Hant":"恢復預設設定","en":"Reset to defaults","ja":"既定に戻す"},
  "我也上镜": {"zh-Hans":"我也上镜","zh-Hant":"我也上鏡","en":"Me on camera too","ja":"自分も出演"},
  "我也上镜需要一个「我来演」的角色": {"zh-Hans":"我也上镜需要一个「我来演」的角色","zh-Hant":"我也上鏡需要一個「我來演」的角色","en":"Being on camera needs a character you perform","ja":"自分も出演するには、自分で演じるキャラクターが必要です"},
  "手机或 VMC 面捕": {"zh-Hans":"手机或 VMC 面捕","zh-Hant":"手機或 VMC 面捕","en":"Phone or VMC tracking","ja":"スマホ・VMC トラッキング"},
  "打字": {"zh-Hans":"打字","zh-Hant":"打字","en":"Type","ja":"入力"},
  "打字或说话，和角色聊": {"zh-Hans":"打字或说话，和角色聊","zh-Hant":"打字或說話，和角色聊","en":"Type or speak, and chat with a character","ja":"入力か声で、キャラと話す"},
  "打开摄像头": {"zh-Hans":"打开摄像头","zh-Hant":"開啟攝影機","en":"Turn on the camera","ja":"カメラをオンにする"},
  "按住按钮或 ` 键说话": {"zh-Hans":"按住按钮或 ` 键说话","zh-Hant":"按住按鈕或 ` 鍵說話","en":"Hold the button or the ` key to speak","ja":"ボタンか ` キーを押している間に話す"},
  "按住说": {"zh-Hans":"按住说","zh-Hant":"按住說","en":"Push to talk","ja":"押して話す"},
  "按住说和免按键需要语音识别": {"zh-Hans":"按住说和免按键需要语音识别","zh-Hant":"按住說和免按鍵需要語音辨識","en":"Push to talk and hands-free need speech recognition","ja":"押して話す・ハンズフリーには音声認識が必要です"},
  "需要语音识别": {"zh-Hans":"需要语音识别","zh-Hant":"需要語音辨識","en":"Needs speech recognition","ja":"音声認識が必要です"},
  "控制接口": {"zh-Hans":"控制接口","zh-Hant":"控制介面","en":"Control API","ja":"コントロール API"},
  "搜索设置": {"zh-Hans":"搜索设置","zh-Hant":"搜尋設定","en":"Search settings","ja":"設定を検索"},
  "收起": {"zh-Hans":"收起","zh-Hant":"收起","en":"Close","ja":"閉じる"},
  "文字模型": {"zh-Hans":"文字模型","zh-Hant":"文字模型","en":"Text model","ja":"テキストモデル"},
  "时长": {"zh-Hans":"时长","zh-Hant":"時長","en":"Duration","ja":"時間"},
  "更多：语言、节奏、谁先说": {"zh-Hans":"更多：语言、节奏、谁先说","zh-Hant":"更多：語言、節奏、誰先說","en":"More: language, pace, who speaks first","ja":"その他：言語・テンポ・話す順番"},
  "最多几句": {"zh-Hans":"最多几句","zh-Hant":"最多幾句","en":"Lines at most","ja":"最大の台詞数"},
  "标准": {"zh-Hans":"标准","zh-Hant":"標準","en":"Standard","ja":"標準"},
  "标准（{0}）": {"zh-Hans":"标准（{0}）","zh-Hant":"標準（{0}）","en":"Standard ({0})","ja":"標準（{0}）"},
  "桌面版": {"zh-Hans":"桌面版","zh-Hant":"桌面版","en":"Desktop","ja":"デスクトップ版"},
  "Minecraft 或 Factorio": {"zh-Hans":"Minecraft 或 Factorio","zh-Hant":"Minecraft 或 Factorio","en":"Minecraft or Factorio","ja":"Minecraft または Factorio"},
  "没有找到": {"zh-Hans":"没有找到","zh-Hant":"沒有找到","en":"Nothing found","ja":"見つかりません"},
  "没有看到脸": {"zh-Hans":"没有看到脸","zh-Hant":"沒有看到臉","en":"No face seen","ja":"顔が見えません"},
  "游戏": {"zh-Hans":"游戏","zh-Hant":"遊戲","en":"Game","ja":"ゲーム"},
  "状态": {"zh-Hans":"状态","zh-Hant":"狀態","en":"Status","ja":"状態"},
  "现在只有字幕": {"zh-Hans":"现在只有字幕","zh-Hant":"現在只有字幕","en":"Subtitles only for now","ja":"今は字幕のみ"},
  "用你的脸和声音演角色": {"zh-Hans":"用你的脸和声音演角色","zh-Hant":"用你的臉和聲音演角色","en":"Play a character with your face and voice","ja":"顔と声でキャラを演じる"},
  "直接说，停顿后自动发送": {"zh-Hans":"直接说，停顿后自动发送","zh-Hant":"直接說，停頓後自動送出","en":"Just speak; it sends when you pause","ja":"そのまま話す。間を置くと送信"},
  "直播间": {"zh-Hans":"直播间","zh-Hant":"直播間","en":"Live audience","ja":"配信の視聴者"},
  "直播间弹幕": {"zh-Hans":"直播间弹幕","zh-Hant":"直播間彈幕","en":"Audience chat","ja":"配信のコメント"},
  "直播间需要接上模型": {"zh-Hans":"直播间需要接上模型","zh-Hant":"直播間需要接上模型","en":"A live audience needs a model","ja":"配信にはモデルが必要です"},
  "看向镜头，校准正面": {"zh-Hans":"看向镜头，校准正面","zh-Hant":"看向鏡頭，校準正面","en":"Look at the camera to calibrate","ja":"カメラを見て正面を合わせる"},
  "系统朗读录不进视频": {"zh-Hans":"系统朗读录不进视频","zh-Hant":"系統朗讀錄不進影片","en":"The system voice is not recorded","ja":"システムの読み上げは録画に入りません"},
  "结束": {"zh-Hans":"结束","zh-Hant":"結束","en":"End","ja":"終了"},
  "舞台上还没有 AI 角色": {"zh-Hans":"舞台上还没有 AI 角色","zh-Hant":"舞台上還沒有 AI 角色","en":"No AI character on the stage yet","ja":"ステージにまだ AI キャラクターがいません"},
  "舞台上还没有角色": {"zh-Hans":"舞台上还没有角色","zh-Hant":"舞台上還沒有角色","en":"No character on the stage yet","ja":"ステージにまだキャラクターがいません"},
  "角色之间聊": {"zh-Hans":"角色之间聊","zh-Hant":"角色之間聊","en":"The characters talk among themselves","ja":"キャラ同士で話す"},
  "角色卡": {"zh-Hans":"角色卡","zh-Hant":"角色卡","en":"Character card","ja":"キャラカード"},
  "让几个角色聊一段，录下来": {"zh-Hans":"让几个角色聊一段，录下来","zh-Hant":"讓幾個角色聊一段，錄下來","en":"Let a few characters talk, and record it","ja":"何人かのキャラに話させて録画する"},
  "语音识别": {"zh-Hans":"语音识别","zh-Hant":"語音辨識","en":"Speech recognition","ja":"音声認識"},
  "说点什么…": {"zh-Hans":"说点什么…","zh-Hant":"說點什麼…","en":"Say something…","ja":"何か話す…"},
  "请朋友上台": {"zh-Hans":"请朋友上台","zh-Hant":"請朋友上台","en":"Invite a friend on stage","ja":"友だちをステージに招く"},
  "谁上场": {"zh-Hans":"谁上场","zh-Hant":"誰上場","en":"Who takes part","ja":"誰が出る"},
  "谁在看": {"zh-Hans":"谁在看","zh-Hant":"誰在看","en":"Who watches","ja":"誰が見る"},
  "跳过这句": {"zh-Hans":"跳过这句","zh-Hant":"跳過這句","en":"Skip this line","ja":"この台詞を飛ばす"},
  "输出开着，只用公开记忆": {"zh-Hans":"输出开着，只用公开记忆","zh-Hant":"輸出開著，只用公開記憶","en":"An output is on: public memory only","ja":"出力中：公開の記憶だけを使います"},
  "还没有": {"zh-Hans":"还没有","zh-Hant":"還沒有","en":"nobody yet","ja":"まだいない"},
  "这个角色不出声": {"zh-Hans":"这个角色不出声","zh-Hant":"這個角色不出聲","en":"This character makes no sound","ja":"このキャラは声を出しません"},
  "连接失败": {"zh-Hans":"连接失败","zh-Hant":"連接失敗","en":"Connection failed","ja":"接続に失敗"},
  "需要设置": {"zh-Hans":"需要设置","zh-Hant":"需要設定","en":"needs setup","ja":"設定が必要"},
  "谁来演": {"zh-Hans":"谁来演","zh-Hant":"誰來演","en":"Who performs","ja":"誰が演じる"},
  "人设和声音": {"zh-Hans":"人设和声音","zh-Hant":"人設和聲音","en":"Persona and voice","ja":"人物設定と声"},

  "角色会一个人说下去": {"zh-Hans":"角色会一个人说下去","zh-Hant":"角色會一個人說下去","en":"The character talks on its own","ja":"キャラクターがひとりで話し続けます"},
  "角色回应直播间": {"zh-Hans":"角色回应直播间","zh-Hant":"角色回應直播間","en":"The characters answer the audience","ja":"キャラクターが視聴者に応える"},
  "录视频时只用公开记忆": {"zh-Hans":"录视频时只用公开记忆","zh-Hant":"錄影片時只用公開記憶","en":"A video uses only the public memory","ja":"動画の録画中は公開の記憶だけを使います"},
  "对直播间时只用公开记忆": {"zh-Hans":"对直播间时只用公开记忆","zh-Hant":"對直播間時只用公開記憶","en":"With a live audience, only the public memory is used","ja":"視聴者がいるときは公開の記憶だけを使います"},
  "这次不说": {"zh-Hans":"这次不说","zh-Hant":"這次不說","en":"Skip my turn","ja":"今回は話さない"},
  "Twitch 频道（可选）": {"zh-Hans":"Twitch 频道（可选）","zh-Hant":"Twitch 頻道（可選）","en":"Twitch channel (optional)","ja":"Twitch チャンネル（任意）"},
  "你插话时": {"zh-Hans":"你插话时","zh-Hant":"你插話時","en":"When you cut in","ja":"あなたが割り込むとき"},
  "角色之间聊时回应弹幕": {"zh-Hans":"角色之间聊时回应弹幕","zh-Hant":"角色之間聊時回應彈幕","en":"Answer chat while the characters talk","ja":"キャラ同士の会話中にコメントへ応える"},
  "实时通话中": {"zh-Hans":"实时通话中","zh-Hant":"即時通話中","en":"In a realtime call","ja":"リアルタイム通話中"},
  "游戏需要内置 AIRI：{0}": {"zh-Hans":"游戏需要内置 AIRI：{0}","zh-Hant":"遊戲需要內建 AIRI：{0}","en":"A game needs the built-in AIRI: {0}","ja":"ゲームには内蔵 AIRI が必要です：{0}"},
  "Nana、Sena、Kai 三人聊天 · 免设置": {"zh-Hans":"Nana、Sena、Kai 三人聊天 · 免设置","zh-Hant":"Nana、Sena、Kai 三人聊天 · 免設定","en":"Nana, Sena and Kai talk · no setup","ja":"Nana・Sena・Kai の三人トーク · 設定不要"},
  "连接好友联播服务超时，请确认服务地址、网络和防火墙设置。": {"zh-Hans":"连接好友联播服务超时，请确认服务地址、网络和防火墙设置。","zh-Hant":"連線至好友聯播服務逾時，請確認服務位址、網路和防火牆設定。","en":"The connection timed out. Check the server address, network and firewall settings.","ja":"接続がタイムアウトしました。サーバーのアドレス、ネットワーク、ファイアウォールを確認してください。"},
  "好友联播连接方式": {"zh-Hans":"好友联播连接方式","zh-Hant":"好友聯播連線方式","en":"Friend collab connection","ja":"フレンドコラボの接続方法"},
  "本机好友联播服务": {"zh-Hans":"本机好友联播服务","zh-Hant":"本機好友聯播服務","en":"Local friend collab server","ja":"ローカル配信サーバー"},
  "停止服务会结束该服务上的所有好友联播。": {"zh-Hans":"停止服务会结束该服务上的所有好友联播。","zh-Hant":"停止服務會結束此服務上的所有好友聯播。","en":"Stopping the server ends all rooms hosted on it.","ja":"サーバーを停止すると、すべてのルームが終了します。"},
  "好友联播端口已被占用，请更换端口或设为 0 自动选择。": {"zh-Hans":"好友联播端口已被占用，请更换端口或设为 0 自动选择。","zh-Hant":"好友聯播連接埠已被占用，請更換或設為 0 自動選擇。","en":"The port is in use. Choose another port or set 0 for automatic selection.","ja":"ポートが使用中です。変更するか、0で自動選択してください。"},
  "本机好友联播服务启动失败，请重试。": {"zh-Hans":"本机好友联播服务启动失败，请重试。","zh-Hant":"本機好友聯播服務啟動失敗，請重試。","en":"The local friend collab server could not start. Try again.","ja":"ローカル配信サーバーを起動できませんでした。再試行してください。"},
  "无法读取本机服务状态，请重新打开好友联播。": {"zh-Hans":"无法读取本机服务状态，请重新打开好友联播。","zh-Hant":"無法讀取本機服務狀態，請重新開啟好友聯播。","en":"Could not read the local server status. Reopen friend collab.","ja":"サーバーの状態を取得できません。フレンドコラボを開き直してください。"},
  "先开始聊天，再开启免按键语音": {"zh-Hans":"先开始聊天，再开启免按键语音","zh-Hant":"先開始聊天，再開啟免按鍵語音","en":"Start a chat before turning on hands-free voice","ja":"チャットを始めてからハンズフリー音声をオンにしてください"},
  "好友联播": {"zh-Hans":"好友联播","zh-Hant":"好友聯播","en":"Friend collab","ja":"フレンドコラボ"},
  "聊天": {"zh-Hans":"聊天","zh-Hant":"聊天","en":"a chat","ja":"会話"},
  "加入好友联播": {"zh-Hans":"加入好友联播","zh-Hant":"加入好友聯播","en":"Join a collab","ja":"コラボに参加"},
  "将连接好友联播服务 {0}": {"zh-Hans":"将连接好友联播服务 {0}","zh-Hant":"將連接好友聯播服務 {0}","en":"Will connect to collab server {0}","ja":"コラボサーバー {0} に接続します"},
  "好友联播服务": {"zh-Hans":"好友联播服务","zh-Hant":"好友聯播服務","en":"Collab server","ja":"コラボサーバー"},
  "分享并创建好友联播": {"zh-Hans":"分享并创建好友联播","zh-Hant":"分享並創建好友聯播","en":"Share & create collab","ja":"共有してコラボを作成"},
  "好友联播成员": {"zh-Hans":"好友联播成员","zh-Hant":"好友聯播成員","en":"Collab members","ja":"コラボ参加者"},
  "正在连接好友联播": {"zh-Hans":"正在连接好友联播","zh-Hant":"正在連接好友聯播","en":"Connecting to collab","ja":"コラボに接続中"},
  "结束好友联播": {"zh-Hans":"结束好友联播","zh-Hant":"結束好友聯播","en":"End collab","ja":"コラボを終了"},
  "离开好友联播": {"zh-Hans":"离开好友联播","zh-Hant":"離開好友聯播","en":"Leave collab","ja":"コラボから退出"},
  "好友联播角色": {"zh-Hans":"好友联播角色","zh-Hant":"好友聯播角色","en":"Friend’s avatar","ja":"コラボキャラクター"},
  "演示要用「双人聊天」或「三人闲聊」模板": {"zh-Hans":"演示要用「双人聊天」或「三人闲聊」模板","zh-Hant":"演示要用「雙人聊天」或「三人閒聊」範本","en":"The demo needs the Two-avatar chat or Three-avatar chat template","ja":"デモは「2人で会話」か「3人で対話」のテンプレートで見られます"},
  "好友联播角色不能超过 64 MB": {"zh-Hans":"好友联播角色不能超过 64 MB","zh-Hant":"好友聯播角色不能超過 64 MB","en":"Collab avatars must be under 64 MB","ja":"コラボのモデルは64MB以下にしてください"},
  "这个角色的文件数量超出好友联播限制": {"zh-Hans":"这个角色的文件数量超出好友联播限制","zh-Hant":"這個角色的檔案數量超出好友聯播限制","en":"This avatar has too many files for collab","ja":"コラボ用モデルのファイル数が上限を超えています"},
  "这个角色超出好友联播限制（64 MB、512 个文件）": {"zh-Hans":"这个角色超出好友联播限制（64 MB、512 个文件）","zh-Hant":"這個角色超出好友聯播限制（64 MB、512 個檔案）","en":"This avatar exceeds collab limits (64 MB, 512 files)","ja":"コラボの上限（64MB・512ファイル）を超えています"},
  "好友联播连接已关闭": {"zh-Hans":"好友联播连接已关闭","zh-Hant":"好友聯播連接已關閉","en":"Collab connection closed","ja":"コラボの接続が閉じられました"},
  "好友联播服务地址不对": {"zh-Hans":"好友联播服务地址不对","zh-Hant":"好友聯播服務地址不對","en":"Invalid collab server address","ja":"コラボサーバーのアドレスが正しくありません"},
  "公网好友联播服务要用 wss:// 地址": {"zh-Hans":"公网好友联播服务要用 wss:// 地址","zh-Hant":"公網好友聯播服務要用 wss:// 地址","en":"Public collab servers need a wss:// address","ja":"公開されたコラボサーバーには wss:// のアドレスが必要です"},
  "好友联播成员信息有问题": {"zh-Hans":"好友联播成员信息有问题","zh-Hant":"好友聯播成員資訊有問題","en":"Invalid collab member data","ja":"コラボ参加者の情報が正しくありません"},
  "好友联播成员重复": {"zh-Hans":"好友联播成员重复","zh-Hant":"好友聯播成員重復","en":"Duplicate collab members","ja":"コラボ参加者が重複しています"},
  "好友联播服务未连接，请检查服务地址": {"zh-Hans":"好友联播服务未连接，请检查服务地址","zh-Hant":"好友聯播服務未連接，請檢查服務地址","en":"Could not connect to collab server; check its address","ja":"コラボサーバーに接続できません。アドレスを確認してください"},
  "好友联播连接已断开": {"zh-Hans":"好友联播连接已断开","zh-Hant":"好友聯播連接已斷開","en":"Collab disconnected","ja":"コラボの接続が切れました"},
  "好友联播服务消息有问题": {"zh-Hans":"好友联播服务消息有问题","zh-Hant":"好友聯播服務消息有問題","en":"Invalid collab server message","ja":"コラボサーバーのメッセージが正しくありません"},
  "好友联播已结束": {"zh-Hans":"好友联播已结束","zh-Hant":"好友聯播已結束","en":"Collab ended","ja":"コラボは終了しました"},
  "好友联播服务版本不兼容": {"zh-Hans":"好友联播服务版本不兼容","zh-Hant":"好友聯播服務版本不兼容","en":"Incompatible collab server version","ja":"コラボサーバーのバージョンが対応していません"},
  "好友联播身份有问题": {"zh-Hans":"好友联播身份有问题","zh-Hant":"好友聯播身份有問題","en":"Could not verify your collab identity","ja":"コラボの参加者情報を確認できません"},
  "好友联播消息过大": {"zh-Hans":"好友联播消息过大","zh-Hant":"好友聯播消息過大","en":"Collab message is too large","ja":"コラボのメッセージが大きすぎます"},
  "好友联播消息无效": {"zh-Hans":"好友联播消息无效","zh-Hant":"好友聯播消息無效","en":"Invalid collab message","ja":"コラボのメッセージが正しくありません"},
  "共享角色已更换，好友联播已结束": {"zh-Hans":"共享角色已更换，好友联播已结束","zh-Hant":"共享角色已更換，好友聯播已結束","en":"Shared avatar changed; collab ended","ja":"共有キャラクターが変更されたため、コラボを終了しました"},
  "好友联播声音录制失败": {"zh-Hans":"好友联播声音录制失败","zh-Hant":"好友聯播聲音錄制失敗","en":"Could not record collab audio","ja":"コラボ音声を録音できませんでした"},
  "双人聊天": {"zh-Hans":"双人聊天","zh-Hant":"雙人聊天","en":"Two-avatar chat","ja":"2人で会話"},
  "房主已结束好友联播": {"zh-Hans":"房主已结束好友联播","zh-Hant":"房主已結束好友聯播","en":"The host ended the collab","ja":"ホストがコラボを終了しました"},
  "房主已移除你的好友联播连接": {"zh-Hans":"房主已移除你的好友联播连接","zh-Hant":"房主已移除你的好友聯播連接","en":"The host removed you from the collab","ja":"ホストによってコラボから退出しました"},
  "好友联播人数已满": {"zh-Hans":"好友联播人数已满","zh-Hant":"好友聯播人數已滿","en":"The collab is full","ja":"コラボの定員に達しました"},
  "暂时无法创建好友联播": {"zh-Hans":"暂时无法创建好友联播","zh-Hant":"暫時無法創建好友聯播","en":"Could not create a collab right now","ja":"現在コラボを作成できません"},
  "还没有朋友上台": {"zh-Hans":"还没有朋友上台","zh-Hant":"還沒有朋友上台","en":"No friends on stage yet","ja":"まだ友だちはステージにいません"},
  "Nana、Sena 与 Kai 三人聊天": {"zh-Hans":"Nana、Sena 与 Kai 三人聊天","zh-Hant":"Nana、Sena 與 Kai 三人聊天","en":"A chat with Nana, Sena & Kai","ja":"Nana・Sena・Kaiの3人トーク"},
  "三人聊天演示": {"zh-Hans":"三人聊天演示","zh-Hant":"三人聊天演示","en":"Three-character demo","ja":"3人の会話デモ"},
  "和角色聊天需要接上 AI 模型": {"zh-Hans":"和角色聊天需要接上 AI 模型","zh-Hant":"和角色聊天需要接上 AI 模型","en":"Connect an AI model to chat with a character","ja":"キャラと話すには AI モデルを設定してください"},
  "Stream Deck 等本机工具可以控制角色": {"zh-Hans":"Stream Deck 等本机工具可以控制角色","zh-Hant":"Stream Deck 等本機工具可以控制角色","en":"Tools on this computer such as Stream Deck can control the characters","ja":"Stream Deck などのローカルツールでキャラクターを操作できます"},
  "先设好实时通话": {"zh-Hans":"先设好实时通话","zh-Hant":"先設好即時通話","en":"Set up the realtime call first","ja":"先にリアルタイム通話を設定してください"},
  "实时通话服务": {"zh-Hans":"实时通话服务","zh-Hant":"即時通話服務","en":"Realtime call service","ja":"音声サービス"},
  "开始实时通话": {"zh-Hans":"开始实时通话","zh-Hant":"開始即時通話","en":"Start realtime call","ja":"リアルタイム通話を開始"},
  "正在连接实时通话…": {"zh-Hans":"正在连接实时通话…","zh-Hant":"正在連接即時通話…","en":"Connecting the call…","ja":"音声に接続中…"},
  "请配置实时通话的接口地址、模型和密钥": {"zh-Hans":"请配置实时通话的接口地址、模型和密钥","zh-Hant":"請設定即時通話的介面位址、模型和金鑰","en":"Configure the realtime endpoint, model and API key","ja":"リアルタイム用の接続先、モデル、API キーを設定してください"},
  "实时通话接口地址无效": {"zh-Hans":"实时通话接口地址无效","zh-Hant":"即時通話介面位址無效","en":"Invalid realtime endpoint","ja":"リアルタイム用の接続先が無効です"},
  "实时通话连接已断开，请重新开始": {"zh-Hans":"实时通话连接已断开，请重新开始","zh-Hant":"即時通話連線已中斷，請重新開始","en":"Voice connection lost. Start a new call.","ja":"音声接続が切れました。通話を開始し直してください"},
  "实时通话连接超时，请检查接口地址和网络": {"zh-Hans":"实时通话连接超时，请检查接口地址和网络","zh-Hant":"即時通話連線逾時，請檢查介面位址和網路","en":"Voice connection timed out. Check the endpoint and network.","ja":"音声接続がタイムアウトしました。接続先とネットワークを確認してください"},
  "实时通话接口没有返回有效连接信息": {"zh-Hans":"实时通话接口没有返回有效连接信息","zh-Hant":"即時通話介面未傳回有效連線資訊","en":"The voice endpoint returned invalid connection data","ja":"音声サービスから有効な接続情報が返されませんでした"},
  "实时通话服务拒绝了请求，请检查模型、音色和权限": {"zh-Hans":"实时通话服务拒绝了请求，请检查模型、音色和权限","zh-Hant":"即時通話服務拒絕了請求，請檢查模型、音色和權限","en":"The voice service rejected the request. Check the model, voice and permissions.","ja":"音声サービスがリクエストを拒否しました。モデル、声、権限を確認してください"},
  "实时通话服务暂时出错，请稍后重新开始": {"zh-Hans":"实时通话服务暂时出错，请稍后重新开始","zh-Hant":"即時通話服務暫時出錯，請稍後重新開始","en":"The voice service encountered a temporary error. Please start again later.","ja":"音声サービスで一時的なエラーが発生しました。しばらくしてから再開してください"},
  "实时通话识别失败，请重新开始": {"zh-Hans":"实时通话识别失败，请重新开始","zh-Hant":"即時通話辨識失敗，請重新開始","en":"Voice transcription failed. Start a new call.","ja":"音声認識に失敗しました。通話を開始し直してください"},
  "实时通话回应失败，请检查模型和额度": {"zh-Hans":"实时通话回应失败，请检查模型和额度","zh-Hant":"即時通話回應失敗，請檢查模型和額度","en":"Voice response failed. Check the model and quota.","ja":"音声応答に失敗しました。モデルと利用可能量を確認してください"},
  "实时通话角色已离开": {"zh-Hans":"实时通话角色已离开","zh-Hant":"即時通話角色已離開","en":"The call’s character is no longer available","ja":"通話中のキャラクターが利用できなくなりました"},
  "麦克风已更改，请重新开始实时通话": {"zh-Hans":"麦克风已更改，请重新开始实时通话","zh-Hant":"麥克風已變更，請重新開始即時通話","en":"Microphone changed. Start a new realtime call.","ja":"マイクが変更されました。リアルタイム通話を開始し直してください"},
  "实时通话连接失败（{0}）": {"zh-Hans":"实时通话连接失败（{0}）","zh-Hant":"即時通話連線失敗（{0}）","en":"Voice connection failed ({0})","ja":"音声接続に失敗しました（{0}）"},
  "实时通话事件无效": {"zh-Hans":"实时通话事件无效","zh-Hant":"即時通話事件無效","en":"Invalid voice service event","ja":"音声サービスのイベントが無効です"},
  "去「设置 → 连接」": {"zh-Hans":"去「设置 → 连接」","zh-Hant":"去「設定 → 連接」","en":"Open Settings → Connections","ja":"「設定 → 接続」を開く"},
  "对话记录已删除，请重新开始实时通话": {"zh-Hans":"对话记录已删除，请重新开始实时通话","zh-Hant":"對話記錄已刪除，請重新開始即時通話","en":"The conversation was deleted. Start a new realtime call.","ja":"会話記録が削除されました。通話を開始し直してください。"},
  "记忆已更新，请重新开始实时通话": {"zh-Hans":"记忆已更新，请重新开始实时通话","zh-Hant":"記憶已更新，請重新開始即時通話","en":"Memory changed. Start a new realtime call.","ja":"記憶が更新されました。通話を開始し直してください。"},
  "可选：弹幕触发表情和动作": {"zh-Hans":"可选：弹幕触发表情和动作","zh-Hant":"可選：彈幕觸發表情和動作","en":"Optional: chat triggers expressions and moves","ja":"任意：コメントで表情や動きを出す"},
  "角色还没有声音，在角色卡里选一个": {"zh-Hans":"角色还没有声音，在角色卡里选一个","zh-Hant":"角色還沒有聲音，在角色卡裡選一個","en":"This character has no voice yet. Pick one on its card.","ja":"このキャラクターにはまだ声がありません。カードで選んでください"},
  "AI 角色还没有声音，在角色卡里选一个": {"zh-Hans":"AI 角色还没有声音，在角色卡里选一个","zh-Hant":"AI 角色還沒有聲音，在角色卡裡選一個","en":"An AI character has no voice yet. Pick one on its card.","ja":"AI キャラクターにまだ声がありません。カードで選んでください"},
  "更多": {"zh-Hans":"更多","zh-Hant":"更多","en":"More","ja":"その他"},
  "撤销": {"zh-Hans":"撤销","zh-Hant":"復原","en":"Undo","ja":"元に戻す"},
  "重做": {"zh-Hans":"重做","zh-Hant":"重做","en":"Redo","ja":"やり直す"},
  "等你接纳": {"zh-Hans":"等你接纳","zh-Hant":"等你接納","en":"Waiting for you to accept","ja":"あなたの承認待ち"},
  "用积分识别语音时，请点按钮开始": {"zh-Hans":"用积分识别语音时，请点按钮开始","zh-Hant":"用積分辨識語音時，請點按鈕開始","en":"Speech recognition paid with points starts only from the button","ja":"ポイントで音声認識するときは、ボタンから開始してください"},
  "单角色会话优先使用 AIRI": {"zh-Hans":"单角色会话优先使用 AIRI","zh-Hant":"單角色對話優先使用 AIRI","en":"Prefer AIRI for single-character sessions","ja":"1人のキャラクターとの会話では AIRI を優先する"},
  "可以聊天，连接游戏或发送画面需要流式输出。": {"zh-Hans":"可以聊天，连接游戏或发送画面需要流式输出。","zh-Hant":"可以聊天，連線遊戲或傳送畫面需要串流輸出。","en":"Chat is available. Connecting a game or sending frames requires streaming.","ja":"会話は利用できます。ゲーム接続や画面送信にはストリーミングが必要です。"},
  "游戏连接": {"zh-Hans":"游戏连接","zh-Hant":"遊戲連線","en":"Game connection","ja":"ゲーム接続"},
  "不连接游戏": {"zh-Hans":"不连接游戏","zh-Hant":"不連線遊戲","en":"No game connection","ja":"ゲームに接続しない"},
  "先启动 Airicraft 并进入 Minecraft 世界。": {"zh-Hans":"先启动 Airicraft 并进入 Minecraft 世界。","zh-Hant":"先啟動 Airicraft 並進入 Minecraft 世界。","en":"Start Airicraft and enter a Minecraft world.","ja":"Airicraft を起動して Minecraft のワールドに入ってください。"},
  "发送 Minecraft 画面给模型": {"zh-Hans":"发送 Minecraft 画面给模型","zh-Hant":"傳送 Minecraft 畫面給模型","en":"Send the Minecraft view to the model","ja":"Minecraft の画面をモデルに送信"},
  "选择 Airicraft 连接文件": {"zh-Hans":"选择 Airicraft 连接文件","zh-Hant":"選擇 Airicraft 連線檔案","en":"Choose an Airicraft connection file","ja":"Airicraft 接続ファイルを選択"},
  "两个端口应连接同一个运行 Autorio 的存档。": {"zh-Hans":"两个端口应连接同一个运行 Autorio 的存档。","zh-Hant":"兩個連接埠應連到同一個執行 Autorio 的存檔。","en":"Both ports must connect to the same save running Autorio.","ja":"両方のポートを Autorio が動作する同一のセーブデータに接続してください。"},
  "日志端口": {"zh-Hans":"日志端口","zh-Hant":"日誌連接埠","en":"Log port","ja":"ログポート"},
  "RCON API 端口": {"zh-Hans":"RCON API 端口","zh-Hant":"RCON API 連接埠","en":"RCON API port","ja":"RCON API ポート"},
  "游戏指令": {"zh-Hans":"游戏指令","zh-Hant":"遊戲指令","en":"Game instruction","ja":"ゲームへの指示"},
  "给角色一个游戏任务": {"zh-Hans":"给角色一个游戏任务","zh-Hant":"給角色一個遊戲任務","en":"Give the character a game task","ja":"キャラクターにゲームのタスクを指示"},
  "执行": {"zh-Hans":"执行","zh-Hant":"執行","en":"Run","ja":"実行"},
  "正在连接游戏": {"zh-Hans":"正在连接游戏","zh-Hant":"正在連線遊戲","en":"Connecting to the game","ja":"ゲームに接続中"},
  "游戏已连接": {"zh-Hans":"游戏已连接","zh-Hant":"遊戲已連線","en":"Game connected","ja":"ゲームに接続済み"},
  "AIRI 正在选择游戏动作": {"zh-Hans":"AIRI 正在选择游戏动作","zh-Hant":"AIRI 正在選擇遊戲動作","en":"AIRI is choosing a game action","ja":"AIRI がゲーム操作を選択中"},
  "游戏正在执行任务": {"zh-Hans":"游戏正在执行任务","zh-Hant":"遊戲正在執行任務","en":"The game is running the task","ja":"ゲームでタスクを実行中"},
  "停止游戏任务": {"zh-Hans":"停止游戏任务","zh-Hant":"停止遊戲任務","en":"Stop the game task","ja":"ゲームのタスクを停止"},
  "游戏连接已断开": {"zh-Hans":"游戏连接已断开","zh-Hant":"遊戲連線已中斷","en":"Game disconnected","ja":"ゲームとの接続が切断されました"},
  "游戏接口返回了无效数据": {"zh-Hans":"游戏接口返回了无效数据","zh-Hant":"遊戲介面傳回無效資料","en":"The game API returned invalid data.","ja":"ゲーム API から無効なデータが返されました。"},
  "找不到 Airicraft 的 bridge-state.json，请先启动 Fabric 客户端": {"zh-Hans":"找不到 Airicraft 的 bridge-state.json，请先启动 Fabric 客户端","zh-Hant":"找不到 Airicraft 的 bridge-state.json，請先啟動 Fabric 用戶端","en":"Airicraft bridge-state.json is missing. Start the Fabric client first.","ja":"Airicraft の bridge-state.json が見つかりません。先に Fabric クライアントを起動してください。"},
  "Airicraft 连接文件格式无效": {"zh-Hans":"Airicraft 连接文件格式无效","zh-Hant":"Airicraft 連線檔案格式無效","en":"The Airicraft connection file is invalid.","ja":"Airicraft 接続ファイルの形式が無効です。"},
  "游戏接口没有返回数据": {"zh-Hans":"游戏接口没有返回数据","zh-Hant":"遊戲介面沒有傳回資料","en":"The game API returned no data.","ja":"ゲーム API からデータが返されませんでした。"},
  "游戏接口返回的数据过大": {"zh-Hans":"游戏接口返回的数据过大","zh-Hant":"遊戲介面傳回的資料過大","en":"The game API returned too much data.","ja":"ゲーム API の応答が大きすぎます。"},
  "游戏接口响应错误": {"zh-Hans":"游戏接口响应错误","zh-Hant":"遊戲介面回應錯誤","en":"The game API returned an error.","ja":"ゲーム API がエラーを返しました。"},
  "连不上 Factorio Wrapper 的日志端口": {"zh-Hans":"连不上 Factorio Wrapper 的日志端口","zh-Hant":"無法連線到 Factorio Wrapper 的日誌連接埠","en":"Could not connect to the Factorio Wrapper log port.","ja":"Factorio Wrapper のログポートに接続できません。"},
  "Airicraft 未返回有效画面": {"zh-Hans":"Airicraft 未返回有效画面","zh-Hant":"Airicraft 未傳回有效畫面","en":"Airicraft returned no usable image.","ja":"Airicraft から有効な画像が返されませんでした。"},
  "Autorio 队列已清空，日志未提供单项结果": {"zh-Hans":"Autorio 队列已清空，日志未提供单项结果","zh-Hant":"Autorio 佇列已清空，日誌未提供個別結果","en":"The Autorio queue is empty. The log provides no individual task results.","ja":"Autorio のキューが空になりました。ログに個別の結果はありません。"},
  "请先断开当前游戏": {"zh-Hans":"请先断开当前游戏","zh-Hant":"請先中斷目前遊戲連線","en":"Disconnect the current game first.","ja":"先に現在のゲームとの接続を切ってください。"},
  "请先在 Minecraft 进入游戏世界": {"zh-Hans":"请先在 Minecraft 进入游戏世界","zh-Hant":"請先在 Minecraft 進入遊戲世界","en":"Enter a Minecraft world first.","ja":"先に Minecraft でワールドに入ってください。"},
  "Factorio Wrapper 已断开": {"zh-Hans":"Factorio Wrapper 已断开","zh-Hant":"Factorio Wrapper 已中斷連線","en":"Factorio Wrapper disconnected.","ja":"Factorio Wrapper の接続が切断されました。"},
  "游戏连接已关闭": {"zh-Hans":"游戏连接已关闭","zh-Hant":"遊戲連線已關閉","en":"The game connection closed.","ja":"ゲームとの接続が切断されました。"},
  "Minecraft 已退出游戏世界": {"zh-Hans":"Minecraft 已退出游戏世界","zh-Hant":"Minecraft 已離開遊戲世界","en":"Minecraft has left the world.","ja":"Minecraft がワールドから退出しました。"},
  "Minecraft 任务状态未知，请先在游戏内确认": {"zh-Hans":"Minecraft 任务状态未知，请先在游戏内确认","zh-Hant":"Minecraft 任務狀態未知，請先在遊戲內確認","en":"The Minecraft task status is unknown. Check in the game first.","ja":"Minecraft のタスク状態が不明です。先にゲーム内で確認してください。"},
  "游戏正在执行一项任务": {"zh-Hans":"游戏正在执行一项任务","zh-Hant":"遊戲正在執行一項任務","en":"The game is already running a task.","ja":"ゲームですでにタスクを実行中です。"},
  "Minecraft 任务数量应为 1 到 32": {"zh-Hans":"Minecraft 任务数量应为 1 到 32","zh-Hant":"Minecraft 任務數量應為 1 到 32","en":"Enter a Minecraft task quantity from 1 to 32.","ja":"Minecraft のタスク数量は 1〜32 を指定してください。"},
  "Minecraft 动作或参数不受支持": {"zh-Hans":"Minecraft 动作或参数不受支持","zh-Hant":"Minecraft 動作或參數不受支援","en":"The Minecraft action or parameters are unsupported.","ja":"Minecraft の操作またはパラメーターに対応していません。"},
  "Airicraft 需要连接 Minecraft 服务器或进入已开放的局域网存档才能执行任务": {"zh-Hans":"Airicraft 需要连接 Minecraft 服务器或进入已开放的局域网存档才能执行任务","zh-Hant":"Airicraft 需要連線至 Minecraft 伺服器或進入已開放的區域網路存檔才能執行任務","en":"Airicraft needs a Minecraft server or a world open to LAN to run tasks.","ja":"Airicraft がタスクを実行するには Minecraft サーバーか LAN に公開したワールドが必要です。"},
  "请先让 Minecraft 玩家复活，再执行任务": {"zh-Hans":"请先让 Minecraft 玩家复活，再执行任务","zh-Hant":"請先讓 Minecraft 玩家復活，再執行任務","en":"Respawn the Minecraft player before running a task.","ja":"Minecraft のプレイヤーがリスポーンしてからタスクを実行してください。"},
  "Minecraft 未确认任务是否已提交，请先在游戏内检查": {"zh-Hans":"Minecraft 未确认任务是否已提交，请先在游戏内检查","zh-Hant":"Minecraft 未確認任務是否已提交，請先在遊戲內檢查","en":"Minecraft did not confirm task submission. Check in the game first.","ja":"Minecraft がタスクの送信を確認できませんでした。先にゲーム内で確認してください。"},
  "Airicraft 未接受该任务": {"zh-Hans":"Airicraft 未接受该任务","zh-Hant":"Airicraft 未接受該任務","en":"Airicraft did not accept the task.","ja":"Airicraft はそのタスクを受け付けませんでした。"},
  "Airicraft 已接受任务 {0}": {"zh-Hans":"Airicraft 已接受任务 {0}","zh-Hant":"Airicraft 已接受任務 {0}","en":"Airicraft accepted {0}","ja":"Airicraft がタスクを受け付けました（{0}）"},
  "Factorio 动作或参数不受支持": {"zh-Hans":"Factorio 动作或参数不受支持","zh-Hant":"Factorio 動作或參數不受支援","en":"The Factorio action or parameters are unsupported.","ja":"Factorio の操作またはパラメーターに対応していません。"},
  "Autorio 需要恰好一名在线玩家": {"zh-Hans":"Autorio 需要恰好一名在线玩家","zh-Hant":"Autorio 需要剛好一名線上玩家","en":"Autorio requires exactly one connected player.","ja":"Autorio の利用時は接続プレイヤーが1人である必要があります。"},
  "Autorio 未确认任务": {"zh-Hans":"Autorio 未确认任务","zh-Hant":"Autorio 未確認任務","en":"Autorio did not confirm the task.","ja":"Autorio はタスクを確認できませんでした。"},
  "Autorio 已接收任务 {0}": {"zh-Hans":"Autorio 已接收任务 {0}","zh-Hant":"Autorio 已接收任務 {0}","en":"Autorio queued {0}","ja":"Autorio がタスクをキューに追加しました（{0}）"},
  "Airicraft 未确认任务已结束": {"zh-Hans":"Airicraft 未确认任务已结束","zh-Hant":"Airicraft 未確認任務已結束","en":"Airicraft did not confirm that the task ended.","ja":"Airicraft がタスクの終了を確認できませんでした。"},
  "无法确认 Airicraft 任务结果 {0}": {"zh-Hans":"无法确认 Airicraft 任务结果 {0}","zh-Hant":"無法確認 Airicraft 任務結果 {0}","en":"Could not confirm the Airicraft result for {0}","ja":"Airicraft のタスク結果を確認できませんでした（{0}）"},
  "Airicraft 已完成任务 {0}": {"zh-Hans":"Airicraft 已完成任务 {0}","zh-Hant":"Airicraft 已完成任務 {0}","en":"Airicraft completed {0}","ja":"Airicraft がタスクを完了しました（{0}）"},
  "Airicraft 任务结束 {0}": {"zh-Hans":"Airicraft 任务结束 {0}","zh-Hant":"Airicraft 任務結束 {0}","en":"Airicraft task ended for {0}","ja":"Airicraft のタスクが終了しました（{0}）"},
  "Airicraft 已完成当前任务": {"zh-Hans":"Airicraft 已完成当前任务","zh-Hant":"Airicraft 已完成目前任務","en":"Airicraft completed the current task.","ja":"Airicraft が現在のタスクを完了しました。"},
  "Airicraft 已停止当前任务": {"zh-Hans":"Airicraft 已停止当前任务","zh-Hant":"Airicraft 已停止目前任務","en":"Airicraft stopped the current task.","ja":"Airicraft が現在のタスクを停止しました。"},
  "Airicraft 当前任务已结束": {"zh-Hans":"Airicraft 当前任务已结束","zh-Hant":"Airicraft 目前任務已結束","en":"The current Airicraft task has ended.","ja":"Airicraft の現在のタスクは終了済みです。"},
  "当前桌面版本不支持 AIRI 游戏": {"zh-Hans":"当前桌面版本不支持 AIRI 游戏","zh-Hant":"目前桌面版本不支援 AIRI 遊戲","en":"This desktop version does not support AIRI games.","ja":"このデスクトップ版は AIRI のゲーム連携に対応していません。"},
  "请先在 AIRI 开启游戏直播": {"zh-Hans":"请先在 AIRI 开启游戏直播","zh-Hant":"請先在 AIRI 開啟遊戲直播","en":"Start a game stream with AIRI first.","ja":"先に AIRI のゲーム配信を開始してください。"},
  "游戏连接已关闭或会话已暂停": {"zh-Hans":"游戏连接已关闭或会话已暂停","zh-Hant":"遊戲連線已關閉或對話已暫停","en":"The game connection closed or the session is paused.","ja":"ゲームとの接続が切断されたか、会話が一時停止中です。"},
  "AIRI 没有选出适合的游戏动作": {"zh-Hans":"AIRI 没有选出适合的游戏动作","zh-Hant":"AIRI 沒有選出適合的遊戲動作","en":"AIRI did not choose a game action.","ja":"AIRI はゲーム操作を選択できませんでした。"},
  "刷新窗口列表": {"zh-Hans":"刷新窗口列表","zh-Hant":"重新整理視窗清單","en":"Refresh windows","ja":"ウィンドウ一覧を更新"},
  "选择游戏窗口": {"zh-Hans":"选择游戏窗口","zh-Hant":"選擇遊戲視窗","en":"Choose game window","ja":"ゲームウィンドウを選ぶ"},
  "游戏画面": {"zh-Hans":"游戏画面","zh-Hant":"遊戲畫面","en":"Game view","ja":"ゲーム画面"},
  "关闭画面输入": {"zh-Hans":"关闭画面输入","zh-Hant":"關閉畫面輸入","en":"No window","ja":"画面入力なし"},
  "回应时会把所选窗口的一帧画面发给当前模型。": {"zh-Hans":"回应时会把所选窗口的一帧画面发给当前模型。","zh-Hant":"回應時會將所選視窗的一幀畫面傳給目前的模型。","en":"Each reply sends one frame of the selected window to the model.","ja":"応答する際、選んだウィンドウの画像を1枚モデルに送ります。"},
  "没有可用窗口，请打开游戏并检查屏幕录制权限": {"zh-Hans":"没有可用窗口，请打开游戏并检查屏幕录制权限","zh-Hant":"沒有可用視窗，請開啟遊戲並檢查螢幕錄製權限","en":"No windows available. Open a game and check screen recording access.","ja":"利用できるウィンドウがありません。ゲームを開き、画面収録の権限を確認してください。"},
  "无法读取窗口，请检查屏幕录制权限": {"zh-Hans":"无法读取窗口，请检查屏幕录制权限","zh-Hant":"無法讀取視窗，請檢查螢幕錄製權限","en":"Check screen recording access to list windows.","ja":"ウィンドウが見つかりません。画面収録の権限を確認してください。"},
  "游戏窗口已关闭或屏幕录制权限不可用": {"zh-Hans":"游戏窗口已关闭或屏幕录制权限不可用","zh-Hant":"遊戲視窗已關閉，或螢幕錄製權限無法使用","en":"The game window closed or screen recording access is unavailable.","ja":"ゲーム画面が閉じているか、画面収録が許可されていません。"},
  "内置 AIRI 需要一个本地 AI 角色和流式模型接口": {"zh-Hans":"内置 AIRI 需要一个本地 AI 角色和流式模型接口","zh-Hant":"內建 AIRI 需要一個本機 AI 角色和串流模型介面","en":"Built-in AIRI needs one local AI character and a streaming model API.","ja":"内蔵 AIRI にはローカル AI キャラクター1人とストリーミング対応モデルが必要です。"},
  "角色已切换，本次 AIRI 会话已停止": {"zh-Hans":"角色已切换，本次 AIRI 会话已停止","zh-Hant":"角色已切換，本次 AIRI 對話已停止","en":"AIRI stopped because the cast changed.","ja":"出演キャラクターが変わったため、AIRI を停止しました。"},
  "会话正在准备，请稍后再发": {"zh-Hans":"会话正在准备，请稍后再发","zh-Hant":"對話正在準備，請稍後再送出","en":"The session is starting. Try again in a moment.","ja":"セッションを準備しています。少し待ってから送信してください。"},
  "AIRI 需要支持流式回复的模型接口": {"zh-Hans":"AIRI 需要支持流式回复的模型接口","zh-Hant":"AIRI 需要支援串流回覆的模型介面","en":"AIRI needs a model API that streams replies.","ja":"AIRI にはストリーミング対応のモデル API が必要です。"},
  "AIRI 的单轮模型调用已达上限": {"zh-Hans":"AIRI 的单轮模型调用已达上限","zh-Hant":"AIRI 的單輪模型呼叫已達上限","en":"AIRI reached the model request limit for this turn.","ja":"AIRI の1ターンあたりのモデル呼び出し上限に達しました。"},
  "模型没有返回可播放的回复": {"zh-Hans":"模型没有返回可播放的回复","zh-Hant":"模型未傳回可播放的回覆","en":"The model returned no playable reply.","ja":"再生できる応答が返りませんでした。"},
  "恢复应用偏好": {"zh-Hans":"恢复应用偏好","zh-Hant":"恢復應用程式偏好","en":"Reset app preferences","ja":"アプリ設定をリセット"},
  "保留模型配置、密钥、登录状态、场景、聊天记录和记忆。": {"zh-Hans":"保留模型配置、密钥、登录状态、场景、聊天记录和记忆。","zh-Hant":"保留模型設定、金鑰、登入狀態、場景、聊天記錄和記憶。","en":"Keeps model settings, API keys, sign-in, scenes, chat history and memories.","ja":"モデル設定、API キー、ログイン状態、シーン、会話履歴、記憶は保持されます。"},
  "已恢复默认偏好": {"zh-Hans":"已恢复默认偏好","zh-Hant":"已恢復預設偏好","en":"Default preferences restored","ja":"設定を初期値に戻しました"},
  "恢复默认偏好？": {"zh-Hans":"恢复默认偏好？","zh-Hant":"恢復預設偏好？","en":"Reset app preferences?","ja":"設定を初期値に戻しますか？"},
  "将重置界面语言、画面质量、设备选择、音量和面板布局。": {"zh-Hans":"将重置界面语言、画面质量、设备选择、音量和面板布局。","zh-Hant":"將重設介面語言、畫面品質、裝置選擇、音量和面板配置。","en":"Resets language, graphics quality, device selection, audio levels and panel layout.","ja":"表示言語、画質、使用デバイス、音量、パネル配置を初期値に戻します。"},
  "全局热键将恢复默认并关闭。": {"zh-Hans":"全局热键将恢复默认并关闭。","zh-Hant":"全域快捷鍵將恢復預設並關閉。","en":"Global hotkeys return to their defaults and are turned off.","ja":"グローバルホットキーも初期値に戻り、無効になります。"},
  "部分偏好未恢复，请重试：{0}": {"zh-Hans":"部分偏好未恢复，请重试：{0}","zh-Hant":"部分偏好未恢復，請重試：{0}","en":"Some preferences could not be reset. Try again: {0}","ja":"一部の設定をリセットできませんでした。再試行してください：{0}"},
  "正在恢复…": {"zh-Hans":"正在恢复…","zh-Hant":"正在恢復…","en":"Resetting…","ja":"リセット中…"},
  "确认恢复": {"zh-Hans":"确认恢复","zh-Hant":"確認恢復","en":"Reset preferences","ja":"リセットする"},
  "本机托管": {"zh-Hans":"本机托管","zh-Hant":"本機託管","en":"Host on this computer","ja":"このパソコンでホスト"},
  "其他服务": {"zh-Hans":"其他服务","zh-Hant":"其他服務","en":"Another server","ja":"別のサーバー"},
  "本机服务运行中": {"zh-Hans":"本机服务运行中","zh-Hant":"本機服務執行中","en":"Local server running","ja":"ローカルサーバー稼働中"},
  "创建时自动启动本机服务": {"zh-Hans":"创建时自动启动本机服务","zh-Hant":"建立時自動啟動本機服務","en":"Starts when you create a room","ja":"ルーム作成時に自動起動"},
  "启动服务": {"zh-Hans":"启动服务","zh-Hant":"啟動服務","en":"Start server","ja":"サーバーを起動"},
  "停止服务": {"zh-Hans":"停止服务","zh-Hant":"停止服務","en":"Stop server","ja":"サーバーを停止"},
  "关闭应用或重载编辑器会停止服务。": {"zh-Hans":"关闭应用或重载编辑器会停止服务。","zh-Hant":"關閉應用程式或重新載入編輯器會停止服務。","en":"Closing the app or reloading the editor stops the server.","ja":"アプリを閉じるか編集画面を再読み込みすると停止します。"},
  "朋友连接的地址": {"zh-Hans":"朋友连接的地址","zh-Hant":"朋友連線的位址","en":"Address for friends","ja":"友だちの接続先"},
  "朋友需连接同一网络": {"zh-Hans":"朋友需连接同一网络","zh-Hant":"朋友需連接同一網路","en":"Friends must be on the same network","ja":"友だちは同じネットワークに接続してください"},
  "仅本机测试，邀请码不能用于其他电脑。": {"zh-Hans":"仅本机测试，邀请码不能用于其他电脑。","zh-Hant":"僅供本機測試，邀請碼無法用於其他電腦。","en":"This computer only. The invitation will not work on another computer.","ja":"このパソコンでのテスト専用です。他のパソコンでは招待を使えません。"},
  "服务设置": {"zh-Hans":"服务设置","zh-Hant":"服務設定","en":"Server settings","ja":"サーバー設定"},
  "允许同一网络的朋友加入": {"zh-Hans":"允许同一网络的朋友加入","zh-Hant":"允許同一網路的朋友加入","en":"Allow friends on the same network","ja":"同じネットワークの友だちを許可"},
  "连接已有的自托管服务。": {"zh-Hans":"连接已有的自托管服务。","zh-Hant":"連線至現有的自託管服務。","en":"Connect to an existing self-hosted server.","ja":"既存のセルフホストサーバーに接続します。"},
  "网页无法启动本机服务，请使用桌面版或填写已有服务地址。": {"zh-Hans":"网页无法启动本机服务，请使用桌面版或填写已有服务地址。","zh-Hant":"網頁無法啟動本機服務，請使用桌面版或填寫現有服務位址。","en":"A web page cannot start a local server. Use the desktop app or enter an existing server address.","ja":"ブラウザーではローカルサーバーを起動できません。デスクトップ版を使うか接続先を入力してください。"},
  "系统不允许监听此端口，请更换端口。": {"zh-Hans":"系统不允许监听此端口，请更换端口。","zh-Hant":"系統不允許監聽此連接埠，請更換連接埠。","en":"The system does not allow this port. Choose another port.","ja":"このポートは許可されていません。別のポートを選んでください。"},
  "未找到局域网地址，请连接网络，或停止服务后选择仅本机测试。": {"zh-Hans":"未找到局域网地址，请连接网络，或停止服务后选择仅本机测试。","zh-Hant":"找不到區域網路位址，請連接網路，或停止服務後選擇僅供本機測試。","en":"No local network address found. Connect to a network, or stop the server and disable network sharing for a local test.","ja":"LANのアドレスが見つかりません。ネットワークに接続するか、サーバーを停止して本機のみのテストに切り替えてください。"},
  "停止服务失败，请重试。": {"zh-Hans":"停止服务失败，请重试。","zh-Hant":"停止服務失敗，請重試。","en":"Could not stop the server. Try again.","ja":"サーバーを停止できませんでした。再試行してください。"},
  "游戏动作决策需要使用自己的模型接口": {"zh-Hans":"游戏动作决策需要使用自己的模型接口","zh-Hant":"遊戲動作決策需要使用自己的模型介面","en":"Use your own model API for game action decisions","ja":"ゲームのアクション選択には独自のモデルAPIを設定してください"},
  "聆听时回应": {"zh-Hans": "聆听时回应", "zh-Hant": "聆聽時回應", "en": "React while listening", "ja": "聞いているときの反応"},
  "小动作幅度": {"zh-Hans": "小动作幅度", "zh-Hant": "小動作幅度", "en": "Gesture strength", "ja": "しぐさの大きさ"},
  "肩膀与身体摆动": {"zh-Hans": "肩膀与身体摆动", "zh-Hant": "肩膀與身體擺動", "en": "Shoulder & body sway", "ja": "肩・体の揺れ"},
  "三种声音、表情与动作 · 约 20 秒": {"zh-Hans":"三种声音、表情与动作 · 约 20 秒","zh-Hant":"三種聲音、表情與動作 · 約 20 秒","en":"3 voices, expressions & motion · About 20 sec","ja":"3人の声・表情と動き・約20秒"},
  "模型用途": {"zh-Hans":"模型用途","zh-Hant":"模型用途","en":"Model purpose","ja":"モデルの用途"},
  "文字对话": {"zh-Hans":"文字对话","zh-Hant":"文字對話","en":"Text chat","ja":"テキスト会話"},
  "配音与识别": {"zh-Hans":"配音与识别","zh-Hant":"配音與辨識","en":"Speech & input","ja":"読み上げ・認識"},
  "用于角色朗读、按住说话和免按键聊天。": {"zh-Hans":"用于角色朗读、按住说话和免按键聊天。","zh-Hant":"用於角色朗讀、按住說話和免按鍵聊天。","en":"For character speech, push-to-talk and hands-free chat.","ja":"キャラクターの読み上げ、プッシュトゥトーク、ハンズフリー会話に使用します。"},
  "用于直接听说、自然接话和插话。": {"zh-Hans":"用于直接听说、自然接话和插话。","zh-Hant":"用於直接聽說、自然接話和插話。","en":"For live voice conversations with turn-taking and interruptions.","ja":"自然な受け答えや割り込みに対応する音声会話に使用します。"},
  "更改将在下次通话生效。": {"zh-Hans":"更改将在下次通话生效。","zh-Hant":"變更將於下次通話生效。","en":"Changes apply to the next call.","ja":"変更は次の通話から適用されます。"},
  "设置未保存：{0}": {"zh-Hans":"设置未保存：{0}","zh-Hant":"設定未儲存：{0}","en":"Settings were not saved: {0}","ja":"設定を保存できませんでした：{0}"},
  "已保存": {"zh-Hans":"已保存","zh-Hant":"已儲存","en":"Saved","ja":"保存しました"},
  "LivLiv 帐号已变更，请重新开始聊天。": {"zh-Hans": "LivLiv 帐号已变更，请重新开始聊天。", "zh-Hant": "LivLiv 帳號已變更，請重新開始聊天。", "en": "Your LivLiv account changed. Start the chat again.", "ja": "LivLivアカウントが変更されました。会話を開始し直してください。"},
  "连不上 LivLiv 官方模型服务": {"zh-Hans": "连不上 LivLiv 官方模型服务", "zh-Hant": "連不上 LivLiv 官方模型服務", "en": "Cannot reach the LivLiv model service", "ja": "LivLivのモデルサービスに接続できません"},
  "LivLiv 官方文字模型暂未开放，请选择其他模型服务。": {"zh-Hans": "LivLiv 官方文字模型暂未开放，请选择其他模型服务。", "zh-Hant": "LivLiv 官方文字模型暫未開放，請選擇其他模型服務。", "en": "LivLiv text models are not available yet. Choose another provider.", "ja": "LivLivのテキストモデルはまだ利用できません。別のサービスを選んでください。"},
  "LivLiv 模型列表格式不正确": {"zh-Hans": "LivLiv 模型列表格式不正确", "zh-Hant": "LivLiv 模型清單格式不正確", "en": "LivLiv returned an invalid model list", "ja": "LivLivのモデル一覧の形式が正しくありません"},
  "LivLiv 未返回有效的模型回复": {"zh-Hans": "LivLiv 未返回有效的模型回复", "zh-Hant": "LivLiv 未傳回有效的模型回覆", "en": "LivLiv returned an invalid model reply", "ja": "LivLivから有効なモデル応答が返されませんでした"},
  "LivLiv 官方模型": {"zh-Hans": "LivLiv 官方模型", "zh-Hant": "LivLiv 官方模型", "en": "LivLiv models", "ja": "LivLiv公式モデル"},
  "使用 LivLiv 帐号与积分，无需填写 API 密钥。": {"zh-Hans": "使用 LivLiv 帐号与积分，无需填写 API 密钥。", "zh-Hant": "使用 LivLiv 帳號與點數，無需填寫 API 金鑰。", "en": "Use your LivLiv account and points. No API key needed.", "ja": "LivLivアカウントとポイントを使用します。APIキーは不要です。"},
  "当前帐号暂无可用官方模型": {"zh-Hans": "当前帐号暂无可用官方模型", "zh-Hant": "目前帳號暫無可用官方模型", "en": "No LivLiv models are available for this account", "ja": "このアカウントで利用できる公式モデルはありません"},
  "管理 LivLiv 帐号": {"zh-Hans": "管理 LivLiv 帐号", "zh-Hant": "管理 LivLiv 帳號", "en": "Manage LivLiv account", "ja": "LivLivアカウントを管理"},
  "刷新模型": {"zh-Hans": "刷新模型", "zh-Hant": "重新整理模型", "en": "Refresh models", "ja": "モデルを更新"},
  "识别暂时跟不上，请稍后重新开启免按键语音": {"zh-Hans": "识别暂时跟不上，请稍后重新开启免按键语音", "zh-Hant": "辨識暫時跟不上，請稍後重新開啟免按鍵語音", "en": "Speech recognition is falling behind. Restart hands-free voice shortly.", "ja": "音声認識が追いついていません。少し待ってハンズフリー音声を再開してください"},
  "免按键语音": {"zh-Hans": "免按键语音", "zh-Hant": "免按鍵語音", "en": "Hands-free voice", "ja": "ハンズフリー音声"},
  "免按键": {"zh-Hans": "免按键", "zh-Hant": "免按鍵", "en": "Hands-free", "ja": "ハンズフリー"},
  "关闭免按键": {"zh-Hans": "关闭免按键", "zh-Hant": "關閉免按鍵", "en": "Stop listening", "ja": "音声入力を停止"},
  "建议戴耳机": {"zh-Hans": "建议戴耳机", "zh-Hant": "建議戴耳機", "en": "Headphones recommended", "ja": "ヘッドホン推奨"},
  "正在听，停顿后自动发送": {"zh-Hans": "正在听，停顿后自动发送", "zh-Hant": "正在聽，停頓後自動傳送", "en": "Listening. Pause to send.", "ja": "聞いています。間を置くと送信します"},
  "免按键已开启，直接说话": {"zh-Hans": "免按键已开启，直接说话", "zh-Hant": "免按鍵已開啟，直接說話", "en": "Hands-free is on. Start speaking.", "ja": "ハンズフリー入力中。そのまま話しかけてください"},
  "已暂停收音": {"zh-Hans": "已暂停收音", "zh-Hant": "已暫停收音", "en": "Listening paused", "ja": "音声入力を一時停止中"},
  "免按键 · Esc 关闭": {"zh-Hans": "免按键 · Esc 关闭", "zh-Hant": "免按鍵 · Esc 關閉", "en": "Hands-free · Esc to stop", "ja": "ハンズフリー · Escで停止"},
  "麦克风已断开，请重新选择设备": {"zh-Hans": "麦克风已断开，请重新选择设备", "zh-Hant": "麥克風已斷開，請重新選擇裝置", "en": "Microphone disconnected. Choose a device again.", "ja": "マイクが切断されました。デバイスを選び直してください"},
  "录音失败：{0}": {"zh-Hans": "录音失败：{0}", "zh-Hant": "錄音失敗：{0}", "en": "Recording failed: {0}", "ja": "録音に失敗しました：{0}"},
  "请先取消麦克风静音，再开启免按键语音": {"zh-Hans": "请先取消麦克风静音，再开启免按键语音", "zh-Hant": "請先取消麥克風靜音，再開啟免按鍵語音", "en": "Unmute your microphone before enabling hands-free voice.", "ja": "マイクのミュートを解除してからハンズフリー音声を有効にしてください"},
  "麦克风已静音，免按键语音已关闭": {"zh-Hans": "麦克风已静音，免按键语音已关闭", "zh-Hant": "麥克風已靜音，免按鍵語音已關閉", "en": "Microphone muted. Hands-free voice is off.", "ja": "マイクがミュートされたため、ハンズフリー音声を停止しました"},
  "需选实时模型支持的音色": {"zh-Hans": "需选实时模型支持的音色", "zh-Hant": "需選即時模型支援的音色", "en": "Choose a voice the realtime model supports", "ja": "リアルタイムモデル対応の声を選んでください"},
  "麦克风已静音": {"zh-Hans": "麦克风已静音", "zh-Hant": "麥克風已靜音", "en": "Microphone muted", "ja": "マイクをミュート中"},
  "结束通话后可删除这句记录": {"zh-Hans": "结束通话后可删除这句记录", "zh-Hant": "結束通話後可刪除這句記錄", "en": "End the call before removing this message", "ja": "この記録は通話終了後に削除できます"},
  "持续语音通话，结束后关闭麦克风": {"zh-Hans": "持续语音通话，结束后关闭麦克风", "zh-Hant": "持續語音通話，結束後關閉麥克風", "en": "An ongoing voice call; ending it releases your microphone", "ja": "続けて話せる音声通話。終了するとマイクを停止します"},
  "通话角色": {"zh-Hans": "通话角色", "zh-Hant": "通話角色", "en": "Character", "ja": "通話するキャラクター"},
  "千问 3.8 实时模型需要百炼工作空间的专属域名。": {"zh-Hans": "千问 3.8 实时模型需要百炼工作空间的专属域名。", "zh-Hant": "千問 3.8 即時模型需要百煉工作空間的專屬網域。", "en": "Qwen 3.8 requires your Model Studio workspace endpoint.", "ja": "Qwen 3.8 には Model Studio のワークスペース専用ドメインが必要です。"},
  "复用已配置的密钥": {"zh-Hans": "复用已配置的密钥", "zh-Hant": "沿用已設定的金鑰", "en": "Use the configured API key", "ja": "設定済みの API キーを使用"},
  "填写该服务的 API 密钥": {"zh-Hans": "填写该服务的 API 密钥", "zh-Hant": "填寫該服務的 API 金鑰", "en": "Enter this service’s API key", "ja": "このサービスの API キーを入力"},
  "实时音色": {"zh-Hans": "实时音色", "zh-Hant": "即時音色", "en": "Realtime voice", "ja": "リアルタイム用の声"},
  "接话方式": {"zh-Hans": "接话方式", "zh-Hant": "接話方式", "en": "When to respond", "ja": "応答のタイミング"},
  "理解说完后接话": {"zh-Hans": "理解说完后接话", "zh-Hant": "理解說完後接話", "en": "Wait until the thought is complete", "ja": "話し終わりを理解して応答"},
  "停顿后快速接话": {"zh-Hans": "停顿后快速接话", "zh-Hant": "停頓後快速接話", "en": "Respond after a short pause", "ja": "短い間の後に応答"},
  "停顿时间": {"zh-Hans": "停顿时间", "zh-Hant": "停頓時間", "en": "Pause length", "ja": "間の長さ"},
  "先选择一个已载入的 AI 角色": {"zh-Hans": "先选择一个已载入的 AI 角色", "zh-Hant": "先選擇一個已載入的 AI 角色", "en": "Select a loaded AI character first", "ja": "読み込み済みの AI キャラクターを選んでください"},
  "服务商按实时模型的用量计费，到达时长上限自动结束。": {"zh-Hans": "服务商按实时模型的用量计费，到达时长上限自动结束。", "zh-Hant": "服務商依即時模型的用量計費，達到時長上限會自動結束。", "en": "Your provider charges for realtime usage. The call ends automatically at its time limit.", "ja": "リアルタイムモデルの使用量に応じて料金が発生します。制限時間になると自動終了します。"},
  "结束通话": {"zh-Hans": "结束通话", "zh-Hant": "結束通話", "en": "End call", "ja": "通話を終了"},
  "角色正在说话": {"zh-Hans": "角色正在说话", "zh-Hant": "角色正在說話", "en": "Speaking", "ja": "キャラクターが発話中です"},
  "正在回应…": {"zh-Hans": "正在回应…", "zh-Hant": "正在回應…", "en": "Responding…", "ja": "応答中…"},
  "已暂停收音和回应": {"zh-Hans": "已暂停收音和回应", "zh-Hant": "已暫停收音和回應", "en": "Microphone and responses paused", "ja": "マイクと応答を一時停止中"},
  "语音通话中": {"zh-Hans": "语音通话中", "zh-Hant": "語音通話中", "en": "Voice call active", "ja": "音声通話中"},
  "通话已结束": {"zh-Hans": "通话已结束", "zh-Hant": "通話已結束", "en": "Call ended", "ja": "通話終了"},
  "麦克风已断开，请重新开始": {"zh-Hans": "麦克风已断开，请重新开始", "zh-Hant": "麥克風已中斷，請重新開始", "en": "Microphone disconnected. Start a new call.", "ja": "マイクが切断されました。通話を開始し直してください"},
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
  "{0} 个角色要重新导入": {
    "zh-Hans": "{0} 个角色要重新导入",
    "zh-Hant": "{0} 個角色要重新導入",
    "en": "{0} characters need importing again",
    "ja": "{0}体のキャラクターを再インポートしてください"
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
  ".livliv、zip、VRM 或 .mavatar 文件": {
    "zh-Hans": ".livliv、zip、VRM 或 .mavatar 文件",
    "zh-Hant": ".livliv、zip、VRM 或 .mavatar 檔案",
    "en": ".livliv, ZIP, VRM or .mavatar file",
    "ja": ".livliv・ZIP・VRM・.mavatar ファイル"
  },
  "Mesh Avatar 角色多了，舞台可能会卡": {"zh-Hans": "Mesh Avatar 角色多了，舞台可能会卡", "zh-Hant": "Mesh Avatar 角色多了，舞台可能會卡", "en": "Several Mesh Avatar characters can slow the stage", "ja": "Mesh Avatar のキャラクターが多いと、ステージが重くなることがあります"},
  "这不是 .mavatar 文件": {"zh-Hans": "这不是 .mavatar 文件", "zh-Hant": "這不是 .mavatar 檔案", "en": "This is not a .mavatar file", "ja": ".mavatar ファイルではありません"},
  ".mavatar 文件已损坏或不完整：请在 Mesh Avatar Studio 里重新导出": {"zh-Hans": ".mavatar 文件已损坏或不完整：请在 Mesh Avatar Studio 里重新导出", "zh-Hant": ".mavatar 檔案已損壞或不完整：請在 Mesh Avatar Studio 裡重新匯出", "en": "The .mavatar file is damaged or incomplete: export it again in Mesh Avatar Studio", "ja": ".mavatar ファイルが壊れているか不完全です。Mesh Avatar Studio でもう一度書き出してください"},
  "这是 Mesh Avatar Studio 的项目文件夹：请在 Studio 里导出 .mavatar，再导入那个文件": {"zh-Hans": "这是 Mesh Avatar Studio 的项目文件夹：请在 Studio 里导出 .mavatar，再导入那个文件", "zh-Hant": "這是 Mesh Avatar Studio 的專案資料夾：請在 Studio 裡匯出 .mavatar，再匯入那個檔案", "en": "This is a Mesh Avatar Studio project folder: export a .mavatar in the Studio and import that file", "ja": "これは Mesh Avatar Studio のプロジェクトフォルダーです。Studio で .mavatar を書き出して、そのファイルを読み込んでください"},
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
  "从本机删除（用到它的角色要重新导入）": {
    "zh-Hans": "从本机删除（用到它的角色要重新导入）",
    "zh-Hant": "從本機刪除（用到它的角色要重新導入）",
    "en": "Remove from this computer (characters using it need importing again)",
    "ja": "この端末から削除（使っているキャラクターは再インポートが必要）"
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
  "还没有角色": {
    "zh-Hans": "还没有角色",
    "zh-Hant": "還沒有角色",
    "en": "No characters yet",
    "ja": "キャラクターはまだいません"
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
  "我来演": {"zh-Hans":"我来演","zh-Hant":"我來演","en":"I perform","ja":"自分で演じる"},
  "只展示": {"zh-Hans":"只展示","zh-Hant":"只展示","en":"Display only","ja":"表示のみ"},
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
  "也可以按住 ` 键": {
    "zh-Hans": "也可以按住 ` 键",
    "zh-Hant": "也可以按住 ` 鍵",
    "en": "Or hold `",
    "ja": "`キーでも話せます"
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
  "透明背景会录成绿幕": {
    "zh-Hans": "透明背景会录成绿幕",
    "zh-Hant": "透明背景會錄成綠幕",
    "en": "Transparent backgrounds record as green screen",
    "ja": "透明背景はグリーンバックで録画されます"
  },
  "绿幕": {
    "zh-Hans": "绿幕",
    "zh-Hant": "綠幕",
    "en": "Green screen",
    "ja": "グリーンバック"
  },
  "没有声音": {
    "zh-Hans": "没有声音",
    "zh-Hant": "沒有聲音",
    "en": "No voice",
    "ja": "声なし"
  },
  "同时开始对话": {
    "zh-Hans": "同时开始对话",
    "zh-Hant": "同時開始對話",
    "en": "Start chat with recording",
    "ja": "録画と同時に対話を開始"
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
  "跟模型一样": {
    "zh-Hans": "跟模型一样",
    "zh-Hant": "跟模型一樣",
    "en": "Same as model",
    "ja": "モデルと共通"
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
  "粘贴邀请码": {
    "zh-Hans": "粘贴邀请码",
    "zh-Hant": "粘貼邀請碼",
    "en": "Paste invite code",
    "ja": "招待コードを貼り付け"
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
  "{0} / 4 人": {
    "zh-Hans": "{0} / 4 人",
    "zh-Hant": "{0} / 4 人",
    "en": "{0} / 4 people",
    "ja": "{0} / 4人"
  },
  "正在打开设备…": {
    "zh-Hans": "正在打开设备…",
    "zh-Hant": "正在打開設備…",
    "en": "Opening device…",
    "ja": "デバイスを接続中…"
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
  "没有在用摄像头或麦克风": {
    "zh-Hans": "没有在用摄像头或麦克风",
    "zh-Hant": "沒有在用攝影機或麥克風",
    "en": "No camera or microphone in use",
    "ja": "カメラもマイクも使っていません"
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
  "切到游戏窗口也能控制角色": {
    "zh-Hans": "切到游戏窗口也能控制角色",
    "zh-Hant": "切到遊戲視窗也能控制角色",
    "en": "Control characters even from a game window",
    "ja": "ゲーム画面に切り替えても操作できます"
  },
  "作用于选中的角色，没选时是「我来演」的角色": {
    "zh-Hans": "作用于选中的角色，没选时是「我来演」的角色",
    "zh-Hant": "作用於選中的角色，沒選時是「我來演」的角色",
    "en": "Applies to the selected character, or to the one you perform when none is selected",
    "ja": "選択中のキャラクターに適用。未選択時は「自分で演じる」キャラクター"
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
  "关掉时，打的字只当字幕": {
    "zh-Hans": "关掉时，打的字只当字幕",
    "zh-Hant": "關掉時，打的字只當字幕",
    "en": "Off: typed lines are captions only",
    "ja": "オフ：入力した文字は字幕だけになります"
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
  "说完后停留": {
    "zh-Hans": "说完后停留",
    "zh-Hant": "說完後停留",
    "en": "Keep after speaking",
    "ja": "発言後の表示時間"
  },
  "内容": {
    "zh-Hans": "内容",
    "zh-Hant": "內容",
    "en": "Text",
    "ja": "テキスト"
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
  "标题安全区（90%）和动作安全区（93%）": {
    "zh-Hans": "标题安全区（90%）和动作安全区（93%）",
    "zh-Hant": "標題安全區（90%）和動作安全區（93%）",
    "en": "Title safe (90%) and action safe (93%)",
    "ja": "タイトルセーフ（90%）とアクションセーフ（93%）"
  },
  "抖音 / TikTok 界面遮罩": {
    "zh-Hans": "抖音 / TikTok 界面遮罩",
    "zh-Hant": "抖音 / TikTok 界面遮罩",
    "en": "Douyin / TikTok overlay",
    "ja": "抖音・TikTokのUIガイド"
  },
  "顶栏、评论区和右侧按钮会盖住的地方": {
    "zh-Hans": "顶栏、评论区和右侧按钮会盖住的地方",
    "zh-Hant": "頂欄、評論區和右側按鈕會蓋住的地方",
    "en": "Areas covered by app headers, comments and buttons",
    "ja": "アプリの見出し、コメント、ボタンに隠れる範囲"
  },
  "9:16 裁切框": {
    "zh-Hans": "9:16 裁切框",
    "zh-Hant": "9:16 裁切框",
    "en": "9:16 crop guide",
    "ja": "9:16の切り抜きガイド"
  },
  "剪竖屏时留下的部分": {
    "zh-Hans": "剪竖屏时留下的部分",
    "zh-Hant": "剪竪屏時留下的部分",
    "en": "What remains when cropped to portrait",
    "ja": "縦動画に切り抜くと残る範囲"
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
  "角色太多，浏览器最多显示约 {0} 个，请隐藏一些": {
    "zh-Hans": "角色太多，浏览器最多显示约 {0} 个，请隐藏一些",
    "zh-Hant": "角色太多，瀏覽器最多顯示約 {0} 個，請隱藏一些",
    "en": "Too many characters: a browser shows about {0}. Hide some.",
    "ja": "キャラクターが多すぎます。ブラウザーでは約{0}体まで。いくつか非表示にしてください"
  },
  "角色太多，最多显示约 {0} 个，请隐藏一些": {
    "zh-Hans": "角色太多，最多显示约 {0} 个，请隐藏一些",
    "zh-Hant": "角色太多，最多顯示約 {0} 個，請隱藏一些",
    "en": "Too many characters: about {0} can show. Hide some.",
    "ja": "キャラクターが多すぎます。表示できるのは約{0}体まで。いくつか非表示にしてください"
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
  "这不是 LivLiv 模型包：请选 LivLiv 导出的 .livliv、zip 或文件夹": {
    "zh-Hans": "这不是 LivLiv 模型包：请选 LivLiv 导出的 .livliv、zip 或文件夹",
    "zh-Hant": "這不是 LivLiv 模型包：請選 LivLiv 匯出的 .livliv、zip 或資料夾",
    "en": "This is not a LivLiv model package: choose a .livliv, zip or folder exported from LivLiv",
    "ja": "LivLiv のモデルパッケージではありません。LivLiv から書き出した .livliv、zip、フォルダーを選んでください"
  },
  "模型文件已损坏：请重新从 LivLiv 导出": {
    "zh-Hans": "模型文件已损坏：请重新从 LivLiv 导出",
    "zh-Hant": "模型檔案已損壞：請重新從 LivLiv 匯出",
    "en": "The model file is damaged: export it from LivLiv again",
    "ja": "モデルファイルが壊れています。LivLiv からもう一度書き出してください"
  },
  "模型包缺少文件：请重新从 LivLiv 导出": {
    "zh-Hans": "模型包缺少文件：请重新从 LivLiv 导出",
    "zh-Hant": "模型包缺少檔案：請重新從 LivLiv 匯出",
    "en": "The model package is missing files: export it from LivLiv again",
    "ja": "モデルパッケージにファイルが足りません。LivLiv からもう一度書き出してください"
  },
  "VRM 文件已损坏，读不出来：请重新导出": {
    "zh-Hans": "VRM 文件已损坏，读不出来：请重新导出",
    "zh-Hant": "VRM 檔案已損壞，讀不出來：請重新匯出",
    "en": "The VRM file is damaged and can't be read: export it again",
    "ja": "VRM ファイルが壊れていて読み込めません。もう一度書き出してください"
  },
  "立绘缺少图片：至少要闭嘴和张嘴两张": {
    "zh-Hans": "立绘缺少图片：至少要闭嘴和张嘴两张",
    "zh-Hant": "立繪缺少圖片：至少要閉嘴和張嘴兩張",
    "en": "The picture set is missing images: it needs at least mouth closed and mouth open",
    "ja": "立ち絵の画像が足りません。口を閉じた絵と開いた絵の 2 枚が必要です"
  },
  "立绘图片读不出来：请换成 PNG、WebP 或 GIF": {
    "zh-Hans": "立绘图片读不出来：请换成 PNG、WebP 或 GIF",
    "zh-Hant": "立繪圖片讀不出來：請換成 PNG、WebP 或 GIF",
    "en": "The pictures can't be read: use PNG, WebP or GIF",
    "ja": "立ち絵の画像を読み込めません。PNG、WebP、GIF にしてください"
  },
  "这不是 VRM 文件": {
    "zh-Hans": "这不是 VRM 文件",
    "zh-Hant": "這不是 VRM 檔案",
    "en": "This is not a VRM file",
    "ja": "VRM ファイルではありません"
  },
  "{0} 不是 PNG、WebP 或 GIF 图片": {
    "zh-Hans": "{0} 不是 PNG、WebP 或 GIF 图片",
    "zh-Hant": "{0} 不是 PNG、WebP 或 GIF 圖片",
    "en": "{0} is not a PNG, WebP or GIF picture",
    "ja": "{0} は PNG、WebP、GIF の画像ではありません"
  },
  "清除": {
    "zh-Hans": "清除",
    "zh-Hant": "清除",
    "en": "Clear",
    "ja": "消去"
  },
  "从这台电脑上删掉保存的密钥": {
    "zh-Hans": "从这台电脑上删掉保存的密钥",
    "zh-Hant": "從這台電腦上刪掉保存的密鑰",
    "en": "Remove the saved key from this computer",
    "ja": "このコンピューターに保存したキーを削除します"
  },
  "连不上 {0}，请检查网络后再试": {
    "zh-Hans": "连不上 {0}，请检查网络后再试",
    "zh-Hant": "連不上 {0}，請檢查網路後再試",
    "en": "Could not connect to {0}. Check your network and try again",
    "ja": "{0}に接続できません。ネットワークを確認してもう一度お試しください"
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
  "角色文件读取失败（": {
    "zh-Hans": "角色文件读取失败（",
    "zh-Hant": "角色檔案讀取失敗（",
    "en": "Could not load avatar file (",
    "ja": "キャラクターのファイルを読み込めません（"
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
  "请选择自己的角色": {
    "zh-Hans": "请选择自己的角色",
    "zh-Hant": "請選擇自己的角色",
    "en": "Choose your own avatar",
    "ja": "自分のキャラクターを選んでください"
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
  "弹幕 · {0}": {
    "zh-Hans": "弹幕 · {0}",
    "zh-Hant": "彈幕 · {0}",
    "en": "Chat · {0}",
    "ja": "コメント · {0}"
  },
  "舞台上还没有会说话的角色": {
    "zh-Hans": "舞台上还没有会说话的角色",
    "zh-Hant": "舞台上還沒有會說話的角色",
    "en": "No character on stage can speak yet",
    "ja": "まだ話せるキャラクターがいません"
  },
  "先添加一个「AI 来演」的角色": {
    "zh-Hans": "先添加一个「AI 来演」的角色",
    "zh-Hant": "先新增一個「AI 來演」的角色",
    "en": "Add an AI-controlled avatar first",
    "ja": "先に「AIで操作」のキャラクターを追加してください"
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
  "被点名的人接话，你随时可以插话": {
    "zh-Hans": "被点名的人接话，你随时可以插话",
    "zh-Hant": "被點名的人接話，你隨時可以插話",
    "en": "Whoever is named answers; you can join anytime",
    "ja": "呼ばれた人が答えます。いつでも参加できます"
  },
  "轮流": {
    "zh-Hans": "轮流",
    "zh-Hant": "輪流",
    "en": "Round-robin",
    "ja": "順番"
  },
  "从左到右轮流说": {
    "zh-Hans": "从左到右轮流说",
    "zh-Hant": "從左到右輪流說",
    "en": "Take turns from left to right",
    "ja": "左から順に話します"
  },
  "主持": {
    "zh-Hans": "主持",
    "zh-Hant": "主持",
    "en": "Hosted",
    "ja": "司会あり"
  },
  "主持人决定问谁": {
    "zh-Hans": "主持人决定问谁",
    "zh-Hant": "主持人決定問誰",
    "en": "The host picks who speaks next",
    "ja": "司会が次の人を選びます"
  },
  "未命名舞台": {
    "zh-Hans": "未命名舞台",
    "zh-Hant": "未命名舞台",
    "en": "Untitled stage",
    "ja": "無題の舞台"
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
  "一个 AI 角色，接入模型和声音后回应观众": {
    "zh-Hans": "一个 AI 角色，接入模型和声音后回应观众",
    "zh-Hant": "一個 AI 角色，接入模型和聲音後回應觀眾",
    "en": "One AI avatar replies to viewers with your model and voice",
    "ja": "モデルと音声を接続し、AIが視聴者に応答"
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
  "AI 来演": {"zh-Hans":"AI 来演","zh-Hant":"AI 來演","en":"AI performs","ja":"AI が演じる"},
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
  "邀请码已失效": {
    "zh-Hans": "邀请码已失效",
    "zh-Hant": "邀請碼已失效",
    "en": "This invite is no longer valid",
    "ja": "この招待は無効になりました"
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
  "代码采用 Apache 2.0 许可，精选角色另有自己的许可。": {"zh-Hans": "代码采用 Apache 2.0 许可，精选角色另有自己的许可。", "zh-Hant": "程式碼採用 Apache 2.0 授權，精選角色另有自己的授權。", "en": "The code is under the Apache 2.0 license. The featured avatars have their own license.", "ja": "コードは Apache 2.0 ライセンスです。収録キャラクターには別のライセンスがあります。"},
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
  "全身取景": {"zh-Hans": "全身取景", "zh-Hant": "全身取景", "en": "Full-body shot", "ja": "全身の表示範囲"},
  "头和上身": {"zh-Hans": "头和上身", "zh-Hant": "頭和上身", "en": "Head and chest", "ja": "頭と胸まで"},
  "到膝盖": {"zh-Hans": "到膝盖", "zh-Hant": "到膝蓋", "en": "Down to the knees", "ja": "膝まで"},
  "整个人": {"zh-Hans": "整个人", "zh-Hant": "整個人", "en": "Whole figure", "ja": "全身"},
  "表情": {"zh-Hans": "表情", "zh-Hant": "表情", "en": "Expression", "ja": "表情"},
  "已校准": {"zh-Hans": "已校准", "zh-Hant": "已校準", "en": "Calibrated", "ja": "調整済み"},
  "导出": {"zh-Hans": "导出", "zh-Hant": "匯出", "en": "Export", "ja": "エクスポート"},
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
  "无需密钥": {"zh-Hans": "无需密钥", "zh-Hant": "無需金鑰", "en": "No API key", "ja": "APIキー不要"},
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
  "让角色第一次开口": {"zh-Hans": "让角色第一次开口", "zh-Hant": "讓角色第一次開口", "en": "Meet your first characters", "ja": "キャラクターに会ってみよう"},
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
  "再看一次": {"zh-Hans":"再看一次","zh-Hant":"再看一次","en":"Replay demo","ja":"もう一度見る"},
  "出错了，{0} 秒后重试": {"zh-Hans": "出错了，{0} 秒后重试", "zh-Hant": "出錯了，{0} 秒後重試", "en": "Something went wrong. Retrying in {0}s", "ja": "エラーが発生しました。{0}秒後に再試行します"},
  "连续出错 {0} 次，已停止": {"zh-Hans": "连续出错 {0} 次，已停止", "zh-Hant": "連續出錯 {0} 次，已停止", "en": "Stopped after {0} errors in a row", "ja": "{0}回続けてエラーが起きたため停止しました"},
  "{0} 张图片的地址不受支持，已跳过": {"zh-Hans": "{0} 张图片的地址不受支持，已跳过", "zh-Hant": "{0} 張圖片的位址不受支援，已略過", "en": "Skipped {0} images with unsupported addresses", "ja": "対応していないアドレスの画像を{0}枚スキップしました"},
  "缺了 {0} 段声音": {"zh-Hans": "缺了 {0} 段声音", "zh-Hant": "缺了 {0} 段聲音", "en": "Missing sounds: {0}", "ja": "入らなかった音声：{0}件"},
  "缺了 {0} 张图片": {"zh-Hans": "缺了 {0} 张图片", "zh-Hant": "缺了 {0} 張圖片", "en": "Missing pictures: {0}", "ja": "入らなかった画像：{0}枚"},
  "重新做视频": {"zh-Hans": "重新做视频", "zh-Hant": "重新製作影片", "en": "Make video again", "ja": "動画を作り直す"},
  "启用全局热键": {"zh-Hans": "启用全局热键", "zh-Hant": "啟用全域熱鍵", "en": "Turn on global hotkeys", "ja": "グローバルホットキーを有効にする"},
  "在 livliv.ai 管理": {"zh-Hans": "在 livliv.ai 管理", "zh-Hant": "在 livliv.ai 管理", "en": "Manage on livliv.ai", "ja": "livliv.aiで管理"},
  "{0} 已经在舞台上": {"zh-Hans": "{0} 已经在舞台上", "zh-Hant": "{0} 已經在舞台上", "en": "{0} is already on the stage", "ja": "{0}はもうステージにいます"},
  "{0} 上台了": {"zh-Hans": "{0} 上台了", "zh-Hant": "{0} 上台了", "en": "{0} is on the stage", "ja": "{0}がステージに上がりました"},
  "最长 {0} 秒": {"zh-Hans": "最长 {0} 秒", "zh-Hant": "最長 {0} 秒", "en": "Up to {0} s", "ja": "最長{0}秒"},
  "最长 {0} 分钟": {"zh-Hans": "最长 {0} 分钟", "zh-Hant": "最長 {0} 分鐘", "en": "Up to {0} min", "ja": "最長{0}分"},
  "LivLiv 标记": {"zh-Hans": "LivLiv 标记", "zh-Hant": "LivLiv 標記", "en": "LivLiv mark", "ja": "LivLivマーク"},
  "会员录 5 分钟，没有标记": {"zh-Hans": "会员录 5 分钟，没有标记", "zh-Hant": "會員錄 5 分鐘，沒有標記", "en": "Members record 5 minutes, no mark", "ja": "メンバーは5分まで、マークなしで録画"},
  "约 20 秒，角色自己的声音、动作和字幕": {"zh-Hans": "约 20 秒，角色自己的声音、动作和字幕", "zh-Hant": "約 20 秒，角色自己的聲音、動作和字幕", "en": "About 20 seconds, with their own voices, moves and subtitles", "ja": "約20秒・キャラクター自身の声、動き、字幕"},
  "用摄像头试": {"zh-Hans": "用摄像头试", "zh-Hant": "用攝影機試", "en": "Try your camera", "ja": "カメラで試す"},
  "你的表情带动角色，不用账号": {"zh-Hans": "你的表情带动角色，不用账号", "zh-Hant": "你的表情帶動角色，不用帳號", "en": "Your face moves the character, no account needed", "ja": "表情でキャラクターが動きます。アカウント不要"},
  "接自己的模型": {"zh-Hans": "接自己的模型", "zh-Hant": "接自己的模型", "en": "Use your own model", "ja": "自分のモデルをつなぐ"},
  "填上你的密钥，让角色们自己聊": {"zh-Hans": "填上你的密钥，让角色们自己聊", "zh-Hant": "填上你的金鑰，讓角色們自己聊", "en": "Add your key and let the characters talk", "ja": "キーを入れて、キャラクター同士で会話"},
  "放自己的角色": {"zh-Hans": "放自己的角色", "zh-Hant": "放自己的角色", "en": "Bring your own character", "ja": "自分のキャラクターを置く"},
  "livliv.ai 的角色、VRM、.mavatar 或 PNG 立绘": {"zh-Hans": "livliv.ai 的角色、VRM、.mavatar 或 PNG 立绘", "zh-Hant": "livliv.ai 的角色、VRM、.mavatar 或 PNG 立繪", "en": "From livliv.ai, a VRM, a .mavatar, or PNG art", "ja": "livliv.aiのキャラクター、VRM、.mavatar、PNG立ち絵"},
  "欢迎来到 LivLiv Stage": {"zh-Hans": "欢迎来到 LivLiv Stage", "zh-Hant": "歡迎來到 LivLiv Stage", "en": "Welcome to LivLiv Stage", "ja": "LivLiv Stageへようこそ"},
  "你的 AI 虚拟主播工作室": {"zh-Hans": "你的 AI 虚拟主播工作室", "zh-Hant": "你的 AI 虛擬主播工作室", "en": "Your AI VTuber Studio", "ja": "あなたの AI VTuber スタジオ"},
  "给角色设定好性格，几分钟它就能和你聊天，或者直接开播。也可以自己来演。": {"zh-Hans": "给角色设定好性格，几分钟它就能和你聊天，或者直接开播。也可以自己来演。", "zh-Hant": "給角色設定好性格，幾分鐘它就能和你聊天，或者直接開播。也可以自己來演。", "en": "Give a character a personality, and in minutes it's chatting with you or streaming live. Or play it yourself.", "ja": "キャラクターに性格を設定すれば、数分であなたとおしゃべりしたり、そのまま配信したり。自分で演じることもできます。"},
  "你的 AI 虚拟主播工作室：会聊天、会记住你，还能直接开播。": {"zh-Hans": "你的 AI 虚拟主播工作室：会聊天、会记住你，还能直接开播。", "zh-Hant": "你的 AI 虛擬主播工作室：會聊天、會記住你，還能直接開播。", "en": "Your AI VTuber studio: characters that chat, remember you and go live.", "ja": "あなたの AI VTuber スタジオ：おしゃべりして、あなたを覚えて、そのまま配信。"},
  "编辑、摄像头和接模型，请在电脑上打开这个页面。": {"zh-Hans": "编辑、摄像头和接模型，请在电脑上打开这个页面。", "zh-Hant": "編輯、攝影機和接模型，請在電腦上打開這個頁面。", "en": "To edit, use your camera or connect a model, open this page on a computer.", "ja": "編集、カメラ、モデル接続はパソコンでこのページを開いてください。"},
  "复制链接": {"zh-Hans": "复制链接", "zh-Hant": "複製連結", "en": "Copy link", "ja": "リンクをコピー"},
  "Stage 已在另一个标签页打开": {"zh-Hans": "Stage 已在另一个标签页打开", "zh-Hant": "Stage 已在另一個分頁打開", "en": "Stage is open in another tab", "ja": "Stageは別のタブで開いています"},
  "一次只能在一个标签页里编辑": {"zh-Hans": "一次只能在一个标签页里编辑", "zh-Hant": "一次只能在一個分頁裡編輯", "en": "You can edit in one tab at a time", "ja": "編集できるのは一度にひとつのタブです"},
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
  "开播": {"zh-Hans":"开播","zh-Hant":"開播","en":"Go live","ja":"配信開始"},
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
  "离开后自动暂离": {"zh-Hans": "离开后自动暂离", "zh-Hant": "離開後自動暫離", "en": "Away when you step out", "ja": "離れたら自動で離席"},
  "摄像头 {0} 秒看不到你就暂离": {"zh-Hans": "摄像头 {0} 秒看不到你就暂离", "zh-Hant": "攝影機 {0} 秒看不到你就暫離", "en": "Away after {0} s out of the camera", "ja": "カメラに{0}秒映らないと離席"},
  "别让其他窗口完全盖住输出窗口，否则画面会停住。": {"zh-Hans": "别让其他窗口完全盖住输出窗口，否则画面会停住。", "zh-Hant": "別讓其他視窗完全蓋住輸出視窗，否則畫面會停住。", "en": "Don’t let another window cover the output window completely, or its picture stops.", "ja": "ほかのウィンドウで出力ウィンドウを完全に隠すと、映像が止まります。"},
  "未满 18 岁不能用 AI 让角色说话": {"zh-Hans": "未满 18 岁不能用 AI 让角色说话", "zh-Hant": "未滿 18 歲不能用 AI 讓角色說話", "en": "You need to be 18 or over to let AI speak for characters", "ja": "18 歳未満は AI でキャラクターを話させることはできません"},
  "说得太快了，歇一下再继续": {"zh-Hans": "说得太快了，歇一下再继续", "zh-Hant": "說得太快了，歇一下再繼續", "en": "Too fast. Take a moment, then continue", "ja": "速すぎます。少し待ってから続けてください"},
  "角色暂时没有回应，稍后再试": {"zh-Hans": "角色暂时没有回应，稍后再试", "zh-Hant": "角色暫時沒有回應，稍後再試", "en": "The character isn’t answering right now. Try again later", "ja": "キャラクターが応答していません。しばらくしてからもう一度お試しください"},
  "确认年龄": {"zh-Hans": "确认年龄", "zh-Hant": "確認年齡", "en": "Confirm your age", "ja": "年齢の確認"},
  "AI 对话需年满 18 岁": {"zh-Hans": "AI 对话需年满 18 岁", "zh-Hant": "AI 對話需年滿 18 歲", "en": "AI chat is for ages 18 and over", "ja": "AI との会話は 18 歳以上が対象です"},
  "未满 18 岁": {"zh-Hans": "未满 18 岁", "zh-Hant": "未滿 18 歲", "en": "Under 18", "ja": "18 歳未満"},
  "已满 18 岁": {"zh-Hans": "已满 18 岁", "zh-Hant": "已滿 18 歲", "en": "18 or over", "ja": "18 歳以上"},
  "登录 livliv.ai 后可用": {"zh-Hans": "登录 livliv.ai 后可用", "zh-Hant": "登入 livliv.ai 後可用", "en": "Available after you sign in to livliv.ai", "ja": "livliv.ai にログインすると使えます"},
  "用积分的台词，请点按钮开始": {"zh-Hans": "用积分的台词，请点按钮开始", "zh-Hant": "用積分的台詞，請點按鈕開始", "en": "Lines paid with points start from a button, not from Space", "ja": "ポイントを使うセリフはボタンから始めてください"},
  "记忆": {"zh-Hans": "记忆", "zh-Hant": "記憶", "en": "Memory", "ja": "記憶"},
  "已记住": {"zh-Hans": "已记住", "zh-Hant": "已記住", "en": "Remembered", "ja": "記憶しました"},
  "来源对话已删除": {"zh-Hans": "来源对话已删除", "zh-Hant": "來源對話已刪除", "en": "The source conversation was deleted", "ja": "元の会話は削除されました"},
  "角色 {0}": {"zh-Hans": "角色 {0}", "zh-Hant": "角色 {0}", "en": "Character {0}", "ja": "キャラクター {0}"},
  "在对话中使用长期记忆": {"zh-Hans": "在对话中使用长期记忆", "zh-Hant": "在對話中使用長期記憶", "en": "Use long-term memory in conversations", "ja": "会話で長期記憶を使う"},
  "这里只显示可在直播中使用的记忆。": {"zh-Hans": "这里只显示可在直播中使用的记忆。", "zh-Hant": "這裡只顯示可在直播中使用的記憶。", "en": "Only memories available for live sessions appear here.", "ja": "ここには配信で使える記憶だけを表示します。"},
  "私聊记忆只用于私聊": {"zh-Hans": "私聊记忆只用于私聊", "zh-Hant": "私聊記憶只用於私聊", "en": "Private memories stay in private chats", "ja": "非公開の記憶は個別の会話だけで使います"},
  "长期记忆已关闭": {"zh-Hans": "长期记忆已关闭", "zh-Hant": "長期記憶已關閉", "en": "Long-term memory is off", "ja": "長期記憶はオフです"},
  "正在读取记忆…": {"zh-Hans": "正在读取记忆…", "zh-Hant": "正在讀取記憶…", "en": "Loading memories…", "ja": "記憶を読み込み中…"},
  "还没有长期记忆": {"zh-Hans": "还没有长期记忆", "zh-Hant": "還沒有長期記憶", "en": "No long-term memories yet", "ja": "長期記憶はまだありません"},
  "公开": {"zh-Hans": "公开", "zh-Hant": "公開", "en": "Public", "ja": "公開"},
  "仅私聊": {"zh-Hans": "仅私聊", "zh-Hant": "僅私聊", "en": "Private only", "ja": "個別の会話のみ"},
  "记忆内容": {"zh-Hans": "记忆内容", "zh-Hant": "記憶內容", "en": "Memory content", "ja": "記憶の内容"},
  "可在直播中使用": {"zh-Hans": "可在直播中使用", "zh-Hant": "可在直播中使用", "en": "Available in live sessions", "ja": "配信でも使う"},
  "记忆已更新": {"zh-Hans": "记忆已更新", "zh-Hant": "記憶已更新", "en": "Memory updated", "ja": "記憶を更新しました"},
  "查看来源": {"zh-Hans": "查看来源", "zh-Hant": "查看來源", "en": "View source", "ja": "出典を見る"},
  "记忆已删除": {"zh-Hans": "记忆已删除", "zh-Hant": "記憶已刪除", "en": "Memory deleted", "ja": "記憶を削除しました"},
  "来源对话": {"zh-Hans": "来源对话", "zh-Hant": "來源對話", "en": "Source conversation", "ja": "元の会話"},
  "让角色记住": {"zh-Hans": "让角色记住", "zh-Hant": "讓角色記住", "en": "Have a character remember", "ja": "キャラクターに覚えてもらう"},
  "记忆所属角色": {"zh-Hans": "记忆所属角色", "zh-Hant": "記憶所屬角色", "en": "Character for this memory", "ja": "記憶するキャラクター"},
  "写下希望角色长期记住的事实或共同经历": {"zh-Hans": "写下希望角色长期记住的事实或共同经历", "zh-Hant": "寫下希望角色長期記住的事實或共同經歷", "en": "Write a fact or shared experience for the character to remember", "ja": "覚えてほしい事実や一緒に経験したことを書いてください"},
  "记住": {"zh-Hans": "记住", "zh-Hant": "記住", "en": "Remember", "ja": "覚える"},
  "先添加一个 AI 角色": {"zh-Hans": "先添加一个 AI 角色", "zh-Hant": "先新增一個 AI 角色", "en": "Add an AI character first", "ja": "先に AI キャラクターを追加してください"},
  "记忆操作失败：{0}": {"zh-Hans": "记忆操作失败：{0}", "zh-Hant": "記憶操作失敗：{0}", "en": "Memory operation failed: {0}", "ja": "記憶の操作に失敗しました：{0}"},
  "Saved conversation or memory data is invalid": {"zh-Hans": "保存的对话或记忆数据无效", "zh-Hant": "儲存的對話或記憶資料無效", "en": "Saved conversation or memory data is invalid", "ja": "保存された会話または記憶のデータが無効です"},
  "This memory no longer exists": {"zh-Hans": "这条记忆已不存在", "zh-Hant": "這條記憶已不存在", "en": "This memory no longer exists", "ja": "この記憶は存在しません"},
  "Conversation storage is unavailable in this browser": {"zh-Hans": "当前浏览器无法保存对话", "zh-Hant": "此瀏覽器無法儲存對話", "en": "Conversation storage is unavailable in this browser", "ja": "このブラウザーでは会話を保存できません"},
  "Close other Stage windows to update conversation storage": {"zh-Hans": "请关闭其他 Stage 窗口以更新对话存储", "zh-Hant": "請關閉其他 Stage 視窗以更新對話儲存空間", "en": "Close other Stage windows to update conversation storage", "ja": "会話の保存領域を更新するには、他の Stage ウィンドウを閉じてください"},
  "Conversation storage transaction was aborted": {"zh-Hans": "对话保存操作已中止", "zh-Hant": "對話儲存作業已中止", "en": "Conversation storage transaction was aborted", "ja": "会話の保存処理が中止されました"},
  "聊天原文仍保留，可在对话记录中单独删除。": {"zh-Hans": "聊天原文仍保留，可在对话记录中单独删除。", "zh-Hant": "聊天原文仍保留，可在對話記錄中單獨刪除。", "en": "The original chat stays in the transcript. You can delete it there.", "ja": "元の会話は履歴に残ります。履歴から個別に削除できます。"},
  "用你的模型重来一遍": {"zh-Hans": "用你的模型重来一遍", "zh-Hant": "用你的模型重來一遍", "en": "Run it with your own model", "ja": "自分のモデルでもう一度"},
  "公开记忆": {"zh-Hans": "公开记忆", "zh-Hant": "公開記憶", "en": "Public memory", "ja": "公開の記憶"},
  "切换私聊 / 公开记忆": {"zh-Hans": "切换私聊 / 公开记忆", "zh-Hant": "切換私聊 / 公開記憶", "en": "Switch between private chat and public memory", "ja": "プライベート会話 / 公開の記憶を切り替え"},
  "输出已打开，还没说出的私聊输入已丢弃": {"zh-Hans": "输出已打开，还没说出的私聊输入已丢弃", "zh-Hant": "輸出已開啟，還沒說出的私聊輸入已丟棄", "en": "An output came on, so private input not yet said was dropped", "ja": "出力が始まったため、まだ話していないプライベートの入力を破棄しました"},
  "输出已打开，私聊通话已结束": {"zh-Hans": "输出已打开，私聊通话已结束", "zh-Hant": "輸出已開啟，私聊通話已結束", "en": "An output came on, so the private call ended", "ja": "出力が始まったため、プライベート通話を終了しました"},
  "私聊": {"zh-Hans": "私聊", "zh-Hant": "私聊", "en": "Private chat", "ja": "プライベート会話"},
  "等你说话": {"zh-Hans": "等你说话", "zh-Hant": "等你說話", "en": "Listening", "ja": "話しかけてください"},
  "对话范围": {"zh-Hans": "对话范围", "zh-Hant": "對話範圍", "en": "Conversation visibility", "ja": "会話の公開範囲"},
  "已保存的对话": {"zh-Hans": "已保存的对话", "zh-Hant": "已儲存的對話", "en": "Saved conversations", "ja": "保存した会話"},
  "新对话": {"zh-Hans": "新对话", "zh-Hant": "新對話", "en": "New conversation", "ja": "新しい会話"},
  "（未完整说出）": {"zh-Hans": "（未完整说出）", "zh-Hant": "（未完整說出）", "en": "(interrupted)", "ja": "（途中で中断）"},
  "记住这件事": {"zh-Hans": "记住这件事", "zh-Hant": "記住這件事", "en": "Remember this", "ja": "このことを覚える"},
  "删除这条聊天记录": {"zh-Hans": "删除这条聊天记录", "zh-Hant": "刪除這條聊天記錄", "en": "Delete this message", "ja": "この発言を削除"},
  "AI 反应": {"zh-Hans": "AI 反应", "zh-Hant": "AI 反應", "en": "AI reactions", "ja": "AIのリアクション"},
  "自动反应": {"zh-Hans": "自动反应", "zh-Hant": "自動反應", "en": "Automatic reactions", "ja": "自動リアクション"},
  "反应强度": {"zh-Hans": "反应强度", "zh-Hant": "反應強度", "en": "Reaction strength", "ja": "反応の強さ"},
  "表情映射与节奏": {"zh-Hans": "表情映射与节奏", "zh-Hant": "表情對應與節奏", "en": "Expressions and timing", "ja": "表情の割り当てと間隔"},
  "默认保持时间": {"zh-Hans": "默认保持时间", "zh-Hant": "預設保持時間", "en": "Default hold time", "ja": "標準の継続時間"},
  "反应间隔": {"zh-Hans": "反应间隔", "zh-Hant": "反應間隔", "en": "Reaction interval", "ja": "反応の間隔"},
  "{0}时的表情": {"zh-Hans": "{0}时的表情", "zh-Hant": "{0}時的表情", "en": "Expression when {0}", "ja": "{0}ときの表情"},
  "好奇": {"zh-Hans": "好奇", "zh-Hant": "好奇", "en": "Curious", "ja": "興味がある"},
  "疑惑": {"zh-Hans": "疑惑", "zh-Hant": "疑惑", "en": "Confused", "ja": "戸惑った"},
  "好笑": {"zh-Hans": "好笑", "zh-Hant": "好笑", "en": "Amused", "ja": "おかしい"},
  "得意": {"zh-Hans": "得意", "zh-Hant": "得意", "en": "Proud", "ja": "得意な"},
  "思考": {"zh-Hans": "思考", "zh-Hant": "思考", "en": "Thoughtful", "ja": "考えている"},
  "开心": {"zh-Hans": "开心", "zh-Hant": "開心", "en": "Happy", "ja": "うれしい"},
  "生气": {"zh-Hans": "生气", "zh-Hant": "生氣", "en": "Angry", "ja": "怒っている"},
  "难过": {"zh-Hans": "难过", "zh-Hant": "難過", "en": "Sad", "ja": "悲しい"},
  "惊讶": {"zh-Hans": "惊讶", "zh-Hant": "驚訝", "en": "Surprised", "ja": "驚いた"},
  "关系设定": {"zh-Hans": "关系设定", "zh-Hant": "關係設定", "en": "Relationship", "ja": "関係の設定"},
  "与操作者和观众是什么关系": {"zh-Hans": "与操作者和观众是什么关系", "zh-Hant": "與操作者和觀眾是什麼關係", "en": "Relationship with you and the audience", "ja": "あなたや視聴者との関係"},
  "立场与兴趣": {"zh-Hans": "立场与兴趣", "zh-Hant": "立場與興趣", "en": "Views and interests", "ja": "考え方と興味"},
  "角色坚持的观点、感兴趣的事": {"zh-Hans": "角色坚持的观点、感兴趣的事", "zh-Hant": "角色堅持的觀點、感興趣的事", "en": "What the character believes and cares about", "ja": "キャラクターの考えや関心ごと"},
  "讨论深度": {"zh-Hans": "讨论深度", "zh-Hant": "討論深度", "en": "Conversation depth", "ja": "会話の深さ"},
  "日常陪聊": {"zh-Hans": "日常陪聊", "zh-Hant": "日常陪聊", "en": "Casual chat", "ja": "日常会話"},
  "深入讨论": {"zh-Hans": "深入讨论", "zh-Hant": "深入討論", "en": "Discussion", "ja": "じっくり話す"},
  "主动续聊": {"zh-Hans": "主动续聊", "zh-Hant": "主動續聊", "en": "Proactive conversation", "ja": "自分から話しかける"},
  "等我说话": {"zh-Hans": "等我说话", "zh-Hant": "等我說話", "en": "Wait for me", "ja": "私が話すまで待つ"},
  "安静 {0} 秒后接话": {"zh-Hans": "安静 {0} 秒后接话", "zh-Hant": "安靜 {0} 秒後接話", "en": "Speak after {0} quiet seconds", "ja": "{0}秒間静かなら話す"},
  "对话未保存：{0}": {"zh-Hans": "对话未保存：{0}", "zh-Hant": "對話未儲存：{0}", "en": "Conversation not saved: {0}", "ja": "会話を保存できませんでした：{0}"},
  "记忆已更新，请重新发送这一句": {"zh-Hans": "记忆已更新，请重新发送这一句", "zh-Hant": "記憶已更新，請重新傳送這一句", "en": "Memory changed. Please send your message again.", "ja": "記憶が更新されました。もう一度送信してください。"},
  "请先停止当前会话": {"zh-Hans": "请先停止当前会话", "zh-Hant": "請先停止目前會話", "en": "Stop the current conversation first", "ja": "現在の会話を停止してください"},
  "请先接上 AI 模型": {"zh-Hans": "请先接上 AI 模型", "zh-Hant": "請先接上 AI 模型", "en": "Connect an AI model first", "ja": "AIモデルを設定してください"},
  "模型没有返回有效的动作选择": {"zh-Hans": "模型没有返回有效的动作选择", "zh-Hant": "模型沒有回傳有效的動作選擇", "en": "The model returned an invalid action selection", "ja": "モデルのアクション選択が無効です"},
  "模型选择了不可用的动作": {"zh-Hans": "模型选择了不可用的动作", "zh-Hant": "模型選擇了不可用的動作", "en": "The model chose an unavailable action", "ja": "モデルが使用できないアクションを選びました"},
  "请先开启公开的游戏互动会话": {"zh-Hans": "请先开启公开的游戏互动会话", "zh-Hant": "請先開啟公開的遊戲互動會話", "en": "Start a public game interaction first", "ja": "公開のゲーム会話を開始してください"},
  "先选择一个 AI 角色": {"zh-Hans": "先选择一个 AI 角色", "zh-Hant": "先選擇一個 AI 角色", "en": "Select an AI character first", "ja": "AIキャラクターを選んでください"},
  "会话已暂停或达到生成上限": {"zh-Hans": "会话已暂停或达到生成上限", "zh-Hant": "會話已暫停或達到生成上限", "en": "The conversation is paused or has reached its generation limit", "ja": "会話が一時停止中か、生成上限に達しています"},
  "游戏互动（Neuro 协议）": {"zh-Hans": "游戏互动（Neuro 协议）", "zh-Hant": "遊戲互動（Neuro 協定）", "en": "Game interaction (Neuro protocol)", "ja": "ゲーム連携（Neuroプロトコル）"},
  "让游戏通过 Neuro SDK 与你的角色互动。开始后使用公开会话。": {"zh-Hans": "让游戏通过 Neuro SDK 与你的角色互动。开始后使用公开会话。", "zh-Hant": "讓遊戲透過 Neuro SDK 與你的角色互動。開始後使用公開會話。", "en": "Let games interact with your character through Neuro SDK. Uses a public conversation.", "ja": "Neuro SDKでゲームとキャラクターを連携します。公開会話を使用します。"},
  "参与角色": {"zh-Hans": "参与角色", "zh-Hant": "參與角色", "en": "Character", "ja": "参加キャラクター"},
  "本机端口（0 为自动）": {"zh-Hans": "本机端口（0 为自动）", "zh-Hant": "本機連接埠（0 為自動）", "en": "Local port (0 for automatic)", "ja": "ローカルポート（0は自動）"},
  "关闭游戏接口": {"zh-Hans": "关闭游戏接口", "zh-Hant": "關閉遊戲介面", "en": "Stop game connection", "ja": "ゲーム接続を停止"},
  "开始游戏互动": {"zh-Hans": "开始游戏互动", "zh-Hant": "開始遊戲互動", "en": "Start game interaction", "ja": "ゲーム連携を開始"},
  "可用动作": {"zh-Hans": "可用动作", "zh-Hant": "可用動作", "en": "Available actions", "ja": "使用可能なアクション"},
  "等待游戏连接。": {"zh-Hans": "等待游戏连接。", "zh-Hant": "等待遊戲連線。", "en": "Waiting for a game to connect.", "ja": "ゲームの接続を待っています。"},
  "The conversation was deleted or changed; start a new conversation": {"zh-Hans": "The conversation was deleted or changed; start a new conversation", "zh-Hant": "對話已刪除或切換，請開始新對話", "en": "The conversation was deleted or changed; start a new conversation", "ja": "会話が削除または変更されました。新しい会話を開始してください"},
  "参与角色已改变，请重新开始会话": {"zh-Hans": "参与角色已改变，请重新开始会话", "zh-Hant": "參與角色已改變，請重新開始會話", "en": "The cast changed. Start the conversation again.", "ja": "参加キャラクターが変わりました。会話を開始し直してください。"},
  "等待游戏连接": {"zh-Hans": "等待游戏连接", "zh-Hant": "等待遊戲連線", "en": "Waiting for a game", "ja": "ゲームの接続を待っています"},
  "台词": {"zh-Hans": "台词", "zh-Hant": "台詞", "en": "Dialogue", "ja": "セリフ"},
  "更换音色": {"zh-Hans":"更换音色","zh-Hant":"更換音色","en":"Change voice","ja":"声を変更"},
  "选择角色音色": {"zh-Hans":"选择角色音色","zh-Hant":"選擇角色音色","en":"Choose a character voice","ja":"キャラクターの声を選択"},
  "默认声音": {"zh-Hans":"默认声音","zh-Hant":"預設聲音","en":"Default voice","ja":"標準の声"},
  "角色原声": {"zh-Hans":"角色原声","zh-Hant":"角色原聲","en":"Character’s own voice","ja":"キャラクター本来の声"},
  "跟随角色设置": {"zh-Hans":"跟随角色设置","zh-Hant":"跟隨角色設定","en":"Follow character settings","ja":"キャラクター設定に従う"},
  "跟随角色设置 · {0}": {"zh-Hans":"跟随角色设置 · {0}","zh-Hant":"跟隨角色設定 · {0}","en":"Character default · {0}","ja":"キャラクターの標準 · {0}"},
  "跟随角色的默认设置": {"zh-Hans":"跟随角色的默认设置","zh-Hant":"跟隨角色的預設設定","en":"Follow the character’s default","ja":"キャラクターの標準設定を使う"},
  "这个角色自己的声音": {"zh-Hans":"这个角色自己的声音","zh-Hant":"這個角色自己的聲音","en":"The voice made for this character","ja":"このキャラクター専用の声"},
  "已保存的音色": {"zh-Hans":"已保存的音色","zh-Hant":"已儲存的音色","en":"Saved voice","ja":"保存済みの声"},
  "搜索音色": {"zh-Hans":"搜索音色","zh-Hant":"搜尋音色","en":"Search voices","ja":"声を検索"},
  "搜名字或声音特点，如温柔、低沉": {"zh-Hans":"搜名字或声音特点，如温柔、低沉","zh-Hant":"搜尋名字或聲音特點，如溫柔、低沉","en":"Search by name or description","ja":"名前や声の特徴で検索"},
  "音色分类": {"zh-Hans":"音色分类","zh-Hant":"音色分類","en":"Voice categories","ja":"声のカテゴリ"},
  "全部": {"zh-Hans":"全部","zh-Hant":"全部","en":"All","ja":"すべて"},
  "最近使用": {"zh-Hans":"最近使用","zh-Hant":"最近使用","en":"Recent","ja":"最近使用"},
  "少女": {"zh-Hans":"少女","zh-Hant":"少女","en":"Young feminine","ja":"少女"},
  "姐姐": {"zh-Hans":"姐姐","zh-Hant":"姐姐","en":"Mature feminine","ja":"大人の女性"},
  "男声": {"zh-Hans":"男声","zh-Hant":"男聲","en":"Masculine","ja":"男性"},
  "特色": {"zh-Hans":"特色","zh-Hant":"特色","en":"Distinctive","ja":"個性的"},
  "{0} 个音色": {"zh-Hans":"{0} 个音色","zh-Hant":"{0} 個音色","en":"{0} voices","ja":"{0}種類の声"},
  "正在读取音色…": {"zh-Hans":"正在读取音色…","zh-Hant":"正在讀取音色…","en":"Loading voices…","ja":"声を読み込み中…"},
  "音色读取失败：{0}": {"zh-Hans":"音色读取失败：{0}","zh-Hant":"音色讀取失敗：{0}","en":"Could not load voices: {0}","ja":"声を読み込めませんでした：{0}"},
  "重试": {"zh-Hans":"重试","zh-Hant":"重試","en":"Retry","ja":"再試行"},
  "还没有最近使用的音色": {"zh-Hans":"还没有最近使用的音色","zh-Hant":"還沒有最近使用的音色","en":"No recent voices yet","ja":"最近使った声はありません"},
  "没有找到匹配的音色": {"zh-Hans":"没有找到匹配的音色","zh-Hant":"沒有找到符合的音色","en":"No matching voices","ja":"一致する声はありません"},
  "查看全部音色": {"zh-Hans":"查看全部音色","zh-Hant":"查看全部音色","en":"Show all voices","ja":"すべての声を見る"},
  "使用中": {"zh-Hans":"使用中","zh-Hant":"使用中","en":"In use","ja":"使用中"},
  "停止试听 {0}": {"zh-Hans":"停止试听 {0}","zh-Hant":"停止試聽 {0}","en":"Stop previewing {0}","ja":"{0}の試聴を停止"},
  "试听失败：{0}": {"zh-Hans":"试听失败：{0}","zh-Hant":"試聽失敗：{0}","en":"Preview failed: {0}","ja":"試聴できませんでした：{0}"},
  "请选择音色": {"zh-Hans":"请选择音色","zh-Hant":"請選擇音色","en":"Choose a voice","ja":"声を選んでください"},
  "应用音色": {"zh-Hans":"应用音色","zh-Hant":"套用音色","en":"Apply voice","ja":"この声を使う"},
  "角色暂时无法试听": {"zh-Hans":"角色暂时无法试听","zh-Hant":"角色暫時無法試聽","en":"The character cannot preview audio right now","ja":"現在このキャラクターの声を試聴できません"},
  "反应风格": {"zh-Hans":"反应风格","zh-Hant":"反應風格","en":"Reaction style","ja":"反応のスタイル"},
  "轻微": {"zh-Hans":"轻微","zh-Hant":"輕微","en":"Subtle","ja":"控えめ"},
  "调整表情与节奏": {"zh-Hans":"调整表情与节奏","zh-Hant":"調整表情與節奏","en":"Expressions and timing","ja":"表情とタイミングの調整"},
  "预览反应": {"zh-Hans":"预览反应","zh-Hant":"預覽反應","en":"Preview reaction","ja":"反応をプレビュー"},
  "正在预览反应": {"zh-Hans":"正在预览反应","zh-Hant":"正在預覽反應","en":"Previewing reaction","ja":"反応をプレビュー中"},
  "请先恢复手动表情，或稍后再试。": {"zh-Hans":"请先恢复手动表情，或稍后再试。","zh-Hant":"請先恢復手動表情，或稍後再試。","en":"Clear the manual expression, or try again shortly.","ja":"手動の表情を解除するか、少し待ってお試しください。"},
  "面捕等输入控制中，不自动反应": {"zh-Hans":"面捕等输入控制中，不自动反应","zh-Hant":"面捕等輸入控制中，不自動反應","en":"Face tracking or another input is in control: no automatic reactions","ja":"フェイストラッキングなどで操作中：自動リアクションなし"},
  "聊天方式": {"zh-Hans":"聊天方式","zh-Hant":"聊天方式","en":"Chat style","ja":"会話のスタイル"},
  "主动接话": {"zh-Hans":"主动接话","zh-Hant":"主動接話","en":"Start a follow-up","ja":"自分から話しかける"},
  "使用上限 · {0} 分钟 / {1} 次": {"zh-Hans":"使用上限 · {0} 分钟 / {1} 次","zh-Hant":"使用上限 · {0} 分鐘 / {1} 次","en":"Limits · {0} minutes / {1} generations","ja":"利用上限 · {0}分 / {1}回"},
  "记录与记忆": {"zh-Hans":"记录与记忆","zh-Hant":"記錄與記憶","en":"History and memory","ja":"履歴と記憶"},
  "未开始": {"zh-Hans":"未开始","zh-Hant":"尚未開始","en":"Not started","ja":"開始前"},
  "已生成 {0} / {1} 次": {"zh-Hans":"已生成 {0} / {1} 次","zh-Hant":"已生成 {0} / {1} 次","en":"Generated {0} / {1} times","ja":"生成済み {0} / {1}回"},
  "已保存 {0} 条记忆": {"zh-Hans":"已保存 {0} 条记忆","zh-Hant":"已儲存 {0} 條記憶","en":"{0} saved memories","ja":"保存済みの記憶：{0}件"},
  "添加记忆": {"zh-Hans":"添加记忆","zh-Hant":"新增記憶","en":"Add memory","ja":"記憶を追加"},
  "搜索记忆": {"zh-Hans":"搜索记忆","zh-Hant":"搜尋記憶","en":"Search memories","ja":"記憶を検索"},
  "聊天时说“记住：……”就能保存": {"zh-Hans":"聊天时说“记住：……”就能保存","zh-Hant":"聊天時說「記住：……」就能儲存","en":"Say “remember …” in a chat to save one","ja":"会話で「remember …」と伝えると保存されます"},
  "没有找到匹配的记忆": {"zh-Hans":"没有找到匹配的记忆","zh-Hant":"沒有找到符合的記憶","en":"No matching memories","ja":"一致する記憶はありません"},
  "游戏互动": {"zh-Hans":"游戏互动","zh-Hant":"遊戲互動","en":"Game interaction","ja":"ゲーム連携"},
  "未开启": {"zh-Hans":"未开启","zh-Hant":"尚未開啟","en":"Off","ja":"オフ"},
  "已连接游戏": {"zh-Hans":"已连接游戏","zh-Hant":"已連接遊戲","en":"Game connected","ja":"ゲーム接続済み"},
  "连接支持 Neuro SDK 的游戏": {"zh-Hans":"连接支持 Neuro SDK 的游戏","zh-Hant":"連接支援 Neuro SDK 的遊戲","en":"Connect a game that supports Neuro SDK","ja":"Neuro SDK対応のゲームに接続"},
  "开始后使用公开会话，私聊记忆不会传入。": {"zh-Hans":"开始后使用公开会话，私聊记忆不会传入。","zh-Hant":"開始後使用公開對話，私聊記憶不會傳入。","en":"Uses a public conversation. Private memories stay excluded.","ja":"公開の会話を使用します。非公開の記憶は含まれません。"},
  "端口需为 0 到 65535 的整数。": {"zh-Hans":"端口需为 0 到 65535 的整数。","zh-Hant":"連接埠需為 0 到 65535 的整數。","en":"Use a whole-number port from 0 to 65535.","ja":"ポートは0から65535までの整数にしてください。"},
  "请稍候…": {"zh-Hans":"请稍候…","zh-Hant":"請稍候…","en":"Please wait…","ja":"お待ちください…"},
  "聊天进行中，结束聊天后可试听。": {"zh-Hans":"聊天进行中，结束聊天后可试听。","zh-Hant":"聊天進行中，結束聊天後可試聽。","en":"End the conversation to preview voices.","ja":"会話を終了すると声を試聴できます。"},
  "角色载入后可试听。": {"zh-Hans":"角色载入后可试听。","zh-Hant":"角色載入後可試聽。","en":"Previews are available once the character has loaded.","ja":"キャラクターの読み込みが完了すると試聴できます。"},
  "更多方式": {"zh-Hans": "更多方式", "zh-Hant": "更多方式", "en": "More ways to interact", "ja": "その他の方法"},
  "回应直播间的观众弹幕": {"zh-Hans": "回应直播间的观众弹幕", "zh-Hant": "回應直播間的觀眾彈幕", "en": "Respond to live chat", "ja": "配信のコメントに応答"},
  "让多位角色轮流聊起来": {"zh-Hans": "让多位角色轮流聊起来", "zh-Hant": "讓多位角色輪流聊起來", "en": "Have characters take turns talking", "ja": "複数のキャラクターが交代で話す"},
  "Voicebox 只能在 LivLiv Stage 桌面版里用": {"zh-Hans": "Voicebox 只能在 LivLiv Stage 桌面版里用", "zh-Hant": "Voicebox 只能在 LivLiv Stage 桌面版裡使用", "en": "Voicebox works only in the LivLiv Stage desktop app", "ja": "Voicebox は LivLiv Stage デスクトップ版でのみ使えます"},
  "Voicebox 没有在运行": {"zh-Hans": "Voicebox 没有在运行", "zh-Hant": "Voicebox 沒有在執行", "en": "Voicebox isn't running", "ja": "Voicebox が起動していません"},
  "Voicebox 没有说出这句：{0}": {"zh-Hans": "Voicebox 没有说出这句：{0}", "zh-Hant": "Voicebox 沒有說出這句：{0}", "en": "Voicebox couldn't say this line: {0}", "ja": "Voicebox はこのセリフを読み上げられませんでした：{0}"},
  "Voicebox 的声音": {"zh-Hans": "Voicebox 的声音", "zh-Hant": "Voicebox 的聲音", "en": "Voicebox voice", "ja": "Voicebox の声"},
  "Voicebox 还在下载模型": {"zh-Hans": "Voicebox 还在下载模型", "zh-Hant": "Voicebox 還在下載模型", "en": "Voicebox is still downloading a model", "ja": "Voicebox はまだモデルをダウンロード中です"},
  "Voicebox 里还没有声音": {"zh-Hans": "Voicebox 里还没有声音", "zh-Hant": "Voicebox 裡還沒有聲音", "en": "Voicebox has no voice yet", "ja": "Voicebox にまだ声がありません"},
  "下载 Voicebox": {"zh-Hans": "下载 Voicebox", "zh-Hant": "下載 Voicebox", "en": "Get Voicebox", "ja": "Voicebox を入手"},
  "克隆": {"zh-Hans": "克隆", "zh-Hant": "複製", "en": "Cloned", "ja": "クローン"},
  "按角色分配": {"zh-Hans": "按角色分配", "zh-Hant": "依角色分配", "en": "One per character", "ja": "キャラクターごとに割り当て"},
  "未知原因": {"zh-Hans": "未知原因", "zh-Hant": "未知原因", "en": "unknown reason", "ja": "原因不明"},
  "正在查找本机的 Voicebox…": {"zh-Hans": "正在查找本机的 Voicebox…", "zh-Hant": "正在尋找本機的 Voicebox…", "en": "Looking for Voicebox on this computer…", "ja": "このコンピューターの Voicebox を探しています…"},
  "设计": {"zh-Hans": "设计", "zh-Hant": "設計", "en": "Designed", "ja": "デザイン"},
  "还没有声音": {"zh-Hans": "还没有声音", "zh-Hant": "還沒有聲音", "en": "no voice yet", "ja": "まだ声がありません"},
  "用 Voicebox（免费，在本机运行）": {"zh-Hans": "用 Voicebox（免费，在本机运行）", "zh-Hant": "用 Voicebox（免費，在本機執行）", "en": "Use Voicebox (free, runs on this computer)", "ja": "Voicebox を使う（無料、このコンピューターで動作）"},
  "全局热键（恢复默认并关闭）": {"zh-Hans": "全局热键（恢复默认并关闭）", "zh-Hant": "全域快速鍵（恢復預設並關閉）", "en": "Global hotkeys (back to default, and off)", "ja": "グローバルホットキー（初期設定に戻してオフ）"},
  "选择要恢复默认的项：": {"zh-Hans": "选择要恢复默认的项：", "zh-Hant": "選擇要恢復預設的項目：", "en": "Choose what to reset:", "ja": "初期設定に戻す項目を選んでください："},
  "设备选择": {"zh-Hans": "设备选择", "zh-Hant": "裝置選擇", "en": "Devices", "ja": "デバイスの選択"},
  "音量": {"zh-Hans": "音量", "zh-Hant": "音量", "en": "Volumes", "ja": "音量"},
  "面板布局": {"zh-Hans": "面板布局", "zh-Hant": "面板佈局", "en": "Panel layout", "ja": "パネルのレイアウト"},
  "导入角色卡": {"zh-Hans": "导入角色卡", "zh-Hant": "匯入角色卡", "en": "Import character card", "ja": "キャラクターカードを読み込む"},
  "SillyTavern、AIRI 角色卡，只导入人设": {"zh-Hans": "SillyTavern、AIRI 角色卡，只导入人设", "zh-Hant": "SillyTavern、AIRI 角色卡，只匯入人設", "en": "SillyTavern or AIRI cards: only the persona is imported", "ja": "SillyTavern・AIRI のキャラクターカード。人物設定だけを読み込みます"},
  "已导入「{0}」：{1}": {"zh-Hans": "已导入「{0}」：{1}", "zh-Hant": "已匯入「{0}」：{1}", "en": "Imported {0}: {1}", "ja": "「{0}」を読み込みました：{1}"},
  "开场白": {"zh-Hans": "开场白", "zh-Hant": "開場白", "en": "Greeting", "ja": "最初のひとこと"},
  "示例对话 {0} 句": {"zh-Hans": "示例对话 {0} 句", "zh-Hant": "範例對話 {0} 句", "en": "{0} example lines", "ja": "会話例 {0} 件"},
  "没有导入：{0}": {"zh-Hans": "没有导入：{0}", "zh-Hant": "沒有匯入：{0}", "en": "Not imported: {0}", "ja": "読み込まなかったもの：{0}"},
  "有些内容太长，已截短。": {"zh-Hans": "有些内容太长，已截短。", "zh-Hant": "有些內容太長，已截短。", "en": " Some parts were too long and were shortened.", "ja": "長すぎる部分は短くしました。"},
  "撤销导入": {"zh-Hans": "撤销导入", "zh-Hant": "撤銷匯入", "en": "Undo import", "ja": "読み込みを取り消す"},
  "没人说话时，它开口的第一句": {"zh-Hans": "没人说话时，它开口的第一句", "zh-Hant": "沒人說話時，它開口的第一句", "en": "The first thing it says when no one has spoken yet", "ja": "まだ誰も話していないときの最初のひとこと"},
  "文件太大，角色卡最多 16 MB": {"zh-Hans": "文件太大，角色卡最多 16 MB", "zh-Hant": "檔案太大，角色卡最多 16 MB", "en": "The file is too large: a card can be up to 16 MB", "ja": "ファイルが大きすぎます（キャラクターカードは 16 MB まで）"},
  "这个文件不是角色卡": {"zh-Hans": "这个文件不是角色卡", "zh-Hant": "這個檔案不是角色卡", "en": "This file isn't a character card", "ja": "このファイルはキャラクターカードではありません"},
  "角色卡里没有名字": {"zh-Hans": "角色卡里没有名字", "zh-Hant": "角色卡裡沒有名字", "en": "The card has no name", "ja": "カードに名前がありません"},
  "读不出这张角色卡，文件可能已损坏": {"zh-Hans": "读不出这张角色卡，文件可能已损坏", "zh-Hant": "讀不出這張角色卡，檔案可能已損壞", "en": "Couldn't read this card; the file may be damaged", "ja": "このカードを読み込めません。ファイルが壊れている可能性があります"},
  "暂不支持 .charx，请在原来的应用里导出为 PNG 或 JSON": {"zh-Hans": "暂不支持 .charx，请在原来的应用里导出为 PNG 或 JSON", "zh-Hant": "暫不支援 .charx，請在原來的應用程式裡匯出為 PNG 或 JSON", "en": ".charx isn't supported yet: export the card as PNG or JSON from its app", "ja": ".charx にはまだ対応していません。元のアプリで PNG か JSON として書き出してください"},
  "形象模型": {"zh-Hans": "形象模型", "zh-Hant": "形象模型", "en": "Avatar model", "ja": "アバターモデル"},
  "AIRI 的其他模块设置": {"zh-Hans": "AIRI 的其他模块设置", "zh-Hant": "AIRI 的其他模組設定", "en": "AIRI's other module settings", "ja": "AIRI のほかのモジュール設定"},
  "场景": {"zh-Hans": "场景", "zh-Hant": "場景", "en": "Scenario", "ja": "シナリオ"},
  "世界书": {"zh-Hans": "世界书", "zh-Hant": "世界書", "en": "Lorebook", "ja": "ロアブック"},
  "其他开场白": {"zh-Hans": "其他开场白", "zh-Hant": "其他開場白", "en": "Alternate greetings", "ja": "ほかの最初のひとこと"},
  "系统提示": {"zh-Hans": "系统提示", "zh-Hant": "系統提示", "en": "System prompt", "ja": "システムプロンプト"},
  "图片素材": {"zh-Hans": "图片素材", "zh-Hant": "圖片素材", "en": "Pictures", "ja": "画像素材"},
  "模型未下载": {"zh-Hans": "模型未下载", "zh-Hant": "模型未下載", "en": "model not downloaded", "ja": "モデル未ダウンロード"},
  "这台电脑上保存的密钥读不出来了，请重新填写": {"zh-Hans": "这台电脑上保存的密钥读不出来了，请重新填写", "zh-Hant": "這台電腦上保存的密鑰讀不出來了，請重新填寫", "en": "The key saved on this computer can no longer be read. Please enter it again.", "ja": "このコンピューターに保存したキーが読み取れなくなりました。もう一度入力してください。"},
  "这台电脑上保存的登录读不出来了，请重新登录": {"zh-Hans": "这台电脑上保存的登录读不出来了，请重新登录", "zh-Hant": "這台電腦上保存的登入讀不出來了，請重新登入", "en": "The sign-in saved on this computer can no longer be read. Please sign in again.", "ja": "このコンピューターに保存したログインが読み取れなくなりました。もう一度ログインしてください。"},
  "语音识别停了，已停止听你说话": {"zh-Hans": "语音识别停了，已停止听你说话", "zh-Hant": "語音辨識停了，已停止聽你說話", "en": "Speech recognition stopped: no longer listening", "ja": "音声認識が止まったため、聞き取りを止めました"},
  "Voicebox 还没下载这个声音的模型": {"zh-Hans": "Voicebox 还没下载这个声音的模型", "zh-Hant": "Voicebox 還沒下載這個聲音的模型", "en": "Voicebox hasn't downloaded this voice's model yet", "ja": "Voicebox にこの声のモデルがまだありません"},
  "工具调用出错（{0}），请再说一次": {"zh-Hans": "工具调用出错（{0}），请再说一次", "zh-Hant": "工具呼叫出錯（{0}），請再說一次", "en": "A tool call failed ({0}). Please say it again.", "ja": "ツール呼び出しに失敗しました（{0}）。もう一度話してください"},
  "密钥无效（{0}）": {"zh-Hans": "密钥无效（{0}）", "zh-Hant": "金鑰無效（{0}）", "en": "Invalid key ({0})", "ja": "キーが無効です（{0}）"},
  "找不到这个模型（404）": {"zh-Hans": "找不到这个模型（404）", "zh-Hant": "找不到這個模型（404）", "en": "Model not found (404)", "ja": "モデルが見つかりません（404）"},
  "模型服务太忙或额度用完了（429），稍后再试": {"zh-Hans": "模型服务太忙或额度用完了（429），稍后再试", "zh-Hant": "模型服務太忙或額度用完了（429），稍後再試", "en": "The model service is busy or out of quota (429). Try again later.", "ja": "モデルサービスが混雑しているか上限に達しました（429）。しばらくしてから試してください"},
  "模型服务暂时出错（{0}），稍后再试": {"zh-Hans": "模型服务暂时出错（{0}），稍后再试", "zh-Hant": "模型服務暫時出錯（{0}），稍後再試", "en": "The model service had a temporary error ({0}). Try again later.", "ja": "モデルサービスで一時的なエラーが起きました（{0}）。しばらくしてから試してください"},
  "模型服务拒绝了这次请求（{0}）：{1}": {"zh-Hans": "模型服务拒绝了这次请求（{0}）：{1}", "zh-Hant": "模型服務拒絕了這次請求（{0}）：{1}", "en": "The model service refused this request ({0}): {1}", "ja": "モデルサービスがこのリクエストを拒否しました（{0}）：{1}"},
  "网页版需填百炼工作空间地址（….maas.aliyuncs.com）": {"zh-Hans": "网页版需填百炼工作空间地址（….maas.aliyuncs.com）", "zh-Hant": "網頁版需填百煉工作空間位址（….maas.aliyuncs.com）", "en": "On the web, enter your Bailian workspace address (….maas.aliyuncs.com)", "ja": "Web 版では百炼のワークスペースのアドレス（….maas.aliyuncs.com）が必要です"},
  "实时通话密钥无效（{0}）": {"zh-Hans": "实时通话密钥无效（{0}）", "zh-Hant": "即時通話金鑰無效（{0}）", "en": "Invalid realtime call key ({0})", "ja": "リアルタイム通話のキーが無効です（{0}）"},
  "百炼找不到这个实时模型或地址": {"zh-Hans": "百炼找不到这个实时模型或地址", "zh-Hant": "百煉找不到這個即時模型或位址", "en": "Bailian can't find this realtime model or address", "ja": "百炼がこのリアルタイムモデルかアドレスを見つけられません"},
  "找不到这个实时模型（404）": {"zh-Hans": "找不到这个实时模型（404）", "zh-Hant": "找不到這個即時模型（404）", "en": "Realtime model not found (404)", "ja": "リアルタイムモデルが見つかりません（404）"},
  "实时通话太忙或额度用完了（429），稍后再试": {"zh-Hans": "实时通话太忙或额度用完了（429），稍后再试", "zh-Hant": "即時通話太忙或額度用完了（429），稍後再試", "en": "The realtime service is busy or out of quota (429). Try again later.", "ja": "リアルタイム通話が混雑しているか上限に達しました（429）。しばらくしてから試してください"},
  "实时通话连接失败，请检查网络后重新开始": {"zh-Hans": "实时通话连接失败，请检查网络后重新开始", "zh-Hant": "即時通話連接失敗，請檢查網路後重新開始", "en": "The realtime call couldn't connect. Check the network and start again.", "ja": "リアルタイム通話に接続できませんでした。ネットワークを確認してからもう一度始めてください"},
  "实时通话连接超时，请检查网络": {"zh-Hans": "实时通话连接超时，请检查网络", "zh-Hant": "即時通話連接逾時，請檢查網路", "en": "The realtime call timed out connecting. Check the network.", "ja": "リアルタイム通話の接続がタイムアウトしました。ネットワークを確認してください"},
  "自己的服务": {"zh-Hans": "自己的服务", "zh-Hant": "自己的服務", "en": "Your own", "ja": "自分のサービス"},
  "livliv.ai 音色": {"zh-Hans": "livliv.ai 音色", "zh-Hant": "livliv.ai 音色", "en": "livliv.ai voices", "ja": "livliv.ai の声"},
  "试听按积分": {"zh-Hans": "试听按积分", "zh-Hant": "試聽按積分", "en": "Previews use credits", "ja": "試聴はポイントを使います"},
  "这次会话开始时它没用 livliv.ai 的声音：这句只出字幕": {"zh-Hans": "这次会话开始时它没用 livliv.ai 的声音：这句只出字幕", "zh-Hant": "這次會話開始時它沒用 livliv.ai 的聲音：這句只出字幕", "en": "It wasn't on a livliv.ai voice when this session started: subtitles only", "ja": "このセッションの開始時は livliv.ai の声ではありませんでした：字幕のみ"},
  "积分用完了，或者这个月的额度到了上限": {"zh-Hans": "积分用完了，或者这个月的额度到了上限", "zh-Hant": "積分用完了，或者這個月的額度到了上限", "en": "Out of credits, or this month's limit is reached", "ja": "ポイントが足りないか、今月の上限に達しました"},
  "Ollama 等本机服务请用桌面版": {"zh-Hans": "Ollama 等本机服务请用桌面版", "zh-Hant": "Ollama 等本機服務請用桌面版", "en": "For Ollama and other local services, use the desktop app", "ja": "Ollama などローカルのサービスはデスクトップ版で"},
  "用文字模型的密钥": {"zh-Hans": "用文字模型的密钥", "zh-Hant": "用文字模型的金鑰", "en": "Uses the text model's key", "ja": "テキストモデルのキーを使う"},
  "只出字幕": {"zh-Hans": "只出字幕", "zh-Hant": "只出字幕", "en": "Subtitles only", "ja": "字幕のみ"},
  "Voicebox 在运行：{0} 个声音": {"zh-Hans": "Voicebox 在运行：{0} 个声音", "zh-Hant": "Voicebox 執行中：{0} 個聲音", "en": "Voicebox is running: {0} voices", "ja": "Voicebox 実行中：声 {0} 個"},
  "也用它听你说话": {"zh-Hans": "也用它听你说话", "zh-Hant": "也用它聽你說話", "en": "Also use it to hear you", "ja": "聞き取りにも使う"},
  "需要 OpenAI 或阿里云百炼密钥": {"zh-Hans": "需要 OpenAI 或阿里云百炼密钥", "zh-Hant": "需要 OpenAI 或阿里雲百煉金鑰", "en": "Needs an OpenAI or Alibaba Cloud Bailian key", "ja": "OpenAI または Alibaba Cloud 百煉のキーが必要"},
  "由 livliv.ai 提供": {"zh-Hans": "由 livliv.ai 提供", "zh-Hant": "由 livliv.ai 提供", "en": "From livliv.ai", "ja": "livliv.ai が提供"},
  "用 livliv.ai": {"zh-Hans": "用 livliv.ai", "zh-Hant": "用 livliv.ai", "en": "Use livliv.ai", "ja": "livliv.ai を使う"},
  "按积分": {"zh-Hans": "按积分", "zh-Hant": "按積分", "en": "Uses credits", "ja": "ポイント制"},
  "{0} 积分": {"zh-Hans": "{0} 积分", "zh-Hant": "{0} 積分", "en": "{0} credits", "ja": "{0} ポイント"},
  "可以在角色卡里单独设置": {"zh-Hans": "可以在角色卡里单独设置", "zh-Hant": "可以在角色卡裡單獨設定", "en": "Can be set per character", "ja": "キャラクターごとに設定できます"},
  "音色在角色卡里选": {"zh-Hans": "音色在角色卡里选", "zh-Hant": "音色在角色卡裡選", "en": "Pick voices on each character", "ja": "声はキャラクターごとに選びます"},
  "这次对话太长了": {"zh-Hans": "这次对话太长了", "zh-Hant": "這次對話太長了", "en": "This conversation is too long", "ja": "会話が長すぎます"},
  "所有角色共用": {"zh-Hans": "所有角色共用", "zh-Hant": "所有角色共用", "en": "Shared by all characters", "ja": "全キャラクター共通"},
  "在 Voicebox 里添加声音": {"zh-Hans": "在 Voicebox 里添加声音", "zh-Hant": "在 Voicebox 裡新增聲音", "en": "Add voices in Voicebox", "ja": "声は Voicebox で追加"},
  "它的声音接口停了，这句只出字幕": {"zh-Hans": "它的声音接口停了，这句只出字幕", "zh-Hant": "它的聲音介面停了，這句只出字幕", "en": "Its voice service stopped: subtitles only", "ja": "音声サービスが止まりました：字幕のみ"},
  "livliv.ai 的文字已关闭，本次会话已停止": {"zh-Hans": "livliv.ai 的文字已关闭，本次会话已停止", "zh-Hant": "livliv.ai 的文字已關閉，本次會話已停止", "en": "livliv.ai text is off: this session stopped", "ja": "livliv.ai のテキストがオフになったため、このセッションを止めました"},
  "{0} 积分/句": {"zh-Hans": "{0} 积分/句", "zh-Hant": "{0} 積分/句", "en": "{0} credits/line", "ja": "{0} ポイント/行"},
  "免费，在本机": {"zh-Hans": "免费，在本机", "zh-Hant": "免費，在本機", "en": "Free, on this computer", "ja": "無料、このコンピューターで"},
  "Whisper，免费，在本机": {"zh-Hans": "Whisper，免费，在本机", "zh-Hant": "Whisper，免費，在本機", "en": "Whisper, free, on this computer", "ja": "Whisper、無料、このコンピューターで"},
  "你好，很高兴见到你。": {"zh-Hans": "你好，很高兴见到你。", "zh-Hant": "你好，很高興見到你。", "en": "Hi, nice to meet you.", "ja": "こんにちは、会えてうれしいです。"},
}
