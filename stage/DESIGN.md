# LivLiv Stage 早期设计依据

当前布局与功能以 [仓库 README](../README.md) 和代码为准。本记录保留早期原型的设计过程。

早期改版前做的同类产品调研（读的都是一手页面，出处在文末），加上一轮界面规范检查。
这份记录「为什么这样做」；具体做到哪见 README。

## 调研的结论

**布局**
- **面板**：Figma UI3 试过浮动面板，又改回贴边，原因是挤占小屏、内容从缝里露出来、拖慢操作 [1]。我们保留卡片外观，但按贴边来排：开关面板、选中东西都不能改变舞台的大小和位置。
  - 原来打开图层会把舞台从窗口的 44% 缩到 26%，还会横向跳，现在图层改放在右侧面板的「舞台」页。
  - ⌘\ 收起两边面板，对应 Figma 的 Minimize UI [2]。
- **缩放**：Canva 在底部放「适应 / 缩放」[6]，我们放在舞台正下方，显示尺寸和缩放比例；⇧1 适应窗口，⇧0 是 100%（100% 时字幕就是输出的真实大小）。
- **安全区**：标题安全区 90%，动作安全区 93%（SMPTE ST 2046-1）[18]。
- **竖屏**：9:16 可以叠抖音 / TikTok 的界面遮罩（1080×1920 上：顶 240、底 660、两侧 120、右侧按钮列从 y=840 起）[16][17]。16:9 可以显示 9:16 裁切框，这是 OBS 用户常要的功能 [14]。

**选中与编辑**
- **选中层**：选中框、手柄、工具条画在舞台上方单独一层，不被舞台边缘裁掉。原来角色脚伸出舞台时，下面的手柄会被裁掉。
- **手柄**：看得见的部分 10px，可点的范围 20px（tldraw 8px、Konva 10px）[24][29]。物体在屏幕上小于 40px 时不显示手柄。
- **选中颜色**：所有类型都用同一种蓝色；角色的专属色只用来表示「这个角色」。
- **吸附线**：实线洋红；虚线只留给安全区。
- **小工具条**：选中物体上方放最常改的几项。Pitch 把右侧面板换成了贴着元素的编辑器 [9]，我们两者都保留。
- **右侧面板**：什么都没选时显示舞台设置和图层，和 Descript 一致 [11]。

**颜色**（每种颜色只表示一件事）
- **中性色**：背景 #ECEAE5，卡片白，悬停 #F5F3EF，线 #E4E0D9 / #D6D1C8。
- **文字**：#1F1D1A，次要 #6B665E（对比度 5.7:1），第三级 #7A746B（4.6:1）。原来第三级是 #A19B92，只有 2.8:1。
- **强调色**：蓝 #3B7BF0，用于选中、焦点、打开的开关和链接。主要按钮保持近黑色。
- **状态色**：
  - 角色在说话：用该角色的专属色，加一圈描边。
  - 轮到你：琥珀 #F2A93B，替换掉原来的黑框加跳动。
  - 正常工作：绿 #2F9E6B。
  - 错误：#C4402F，配文字说明，不用整块红底。
  - 直播中：红 #E5484D，留给以后「正在直播」专用。
- **角色专属色**：8 个，和选中蓝、直播红都拉得开，按顺序分配。参考了 Descript 用户对说话人颜色重复、对比度低的抱怨 [27]。

**字号**
- 收成 5 档：12 提示、13 标签、14 正文和输入框、16 面板标题、20 空舞台。原来有 11 / 12 / 12.5 / 13 / 13.5 五种碎字号。
- Ant Design 把基准字号从 12 提到 14 [25]，中文不用 11px。

**直播 / 演出**
- **演员条**：控制台上方一排角色小卡，按出场顺序排，显示状态（在想 / 在说 / 轮到你）。点一下让它下一个说，右键下场或上场。参考了 StreamYard 的后台候场 [19] 和 OBS 的导播思路 [12]。
- **控制台**：分成三段，话题 / 播放控制（多一个「下一句」）/ 你说的话。
- **输出与编辑分开**：OBS、Warudo、VTube Studio 都让编辑界面不进入输出画面 [12][20][21]。我们的「演出」模式现在就是这样；下一步做独立的输出窗口（固定 1920×1080 或 1080×1920，没有任何界面）给 OBS 采集。

**规范检查**
- **补上的**：键盘焦点环、统一的层级刻度、「减少动态效果」时关掉循环动画、撤销优先于确认框（换模板不再弹系统确认框，改成提示 ⌘Z）。
- **自动生成的整套配色方案**：它面向落地页（暗色、视频首屏），不适合编辑器，只取了「中性画布 + 一个创意强调色」的思路。

## 还没做的（按调研的优先级）

1. 给 OBS 的干净输出窗口；直播中的红色「直播中 00:12:34」标记和舞台红框。
2. 从左边工具条拖到舞台上指定位置放置（现在是点一下放到空位）。
3. 吸附时显示距离数字；选中物体伸出舞台的部分半透明显示。
4. 右侧面板可以拖宽（264–400px）。
5. 竖屏的智能重排：现在切换比例只是整体缩放，16:9 的三人布局缩进 9:16 后人物很小。
6. 演员条里显示说话音量。

## 出处

1. https://www.figma.com/blog/our-approach-to-designing-ui3/
2. https://help.figma.com/hc/en-us/articles/41414918021271-Hide-or-minimize-the-UI
6. https://www.canva.com/help/page-view-settings/
9. https://pitch.com/blog/pitch-product-redesign-collaboration-features
11. https://help.descript.com/hc/en-us/articles/38602033925517-Properties-Panel
12. https://obsproject.com/kb/sources-guide 、https://obsproject.com/kb/obs-studio-overview
14. https://obsproject.com/forum/threads/is-it-possible-to-display-9-16-safe-areas-in-the-16-9-preview.168748
16. https://www.cloudspress.com/how-to-set-up-and-use-tiktok-live-studio/（第三方）
17. https://www.socialync.io/tools/safe-zones/tiktok
18. https://pub.smpte.org/doc/st2046-1/
19. https://support.streamyard.com/hc/articles/360043291612
20. https://docs.warudo.app/docs/tutorials/getting-started
21. https://github.com/DenchiSoft/VTubeStudio/wiki/Recording-Streaming-with-OBS
24. https://bjango.com/articles/designtoolcanvashandles/
25. https://ant.design/docs/spec/font
27. https://feedback.descript.com/feature-requests/p/speaker-colorcodes
29. https://konvajs.org/api/konva.transformer

状态色的具体色值是调研提出的建议，不是取自哪个产品。tldraw 的 8px 手柄来自搜索结果引用的源码，没有打开原页面核实。
