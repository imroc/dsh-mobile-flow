# dsh-mobile-flow

[English](README.md) | **简体中文**

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）Web UI 的移动端插件，两件事：

1. **in-flow composer**：窄屏（≤720px）时输入框与 AI 确认选择框随页面滚动，而不是钉死在屏幕底部——上滑阅读时消息区拿回全屏空间。
2. **原生输入框接管**：窄屏时输入区换成原生 `<textarea>`，绕开 Lexical contenteditable 在 Android 输入法（尤其是语音输入）下吞字/清空已输入文字的问题。

纯客户端实现（CSS overlay + 一个 slot 组件），不修改产品源码；卸载插件即完全还原官方行为。

## 解决的问题

### 1. 输入框吸在屏幕底部

官方 Web UI 用 `position: sticky; bottom: 0` 把 composer 座位钉在视口底。这个座位承载的不只是输入框，还有 AI 会话中途弹出的交互卡片——`ask_user_question` 选项卡、approval 权限确认框、plan review。手机上它们全部粘在屏幕底部，往回翻阅回复时永久遮挡一块视口。

### 2. 手机输入法输入后文字被清空

官方 composer 的文本面是 **Lexical contenteditable**（`packages/client/ui-conversation` 里 `createEditor` + `registerPlainText`）。Android 输入法（语音输入尤其明显）走 Chrome 的 `InputConnection → beforeinput("insertCompositionText")` 重组流程，框架编辑器会用自身 state 回写 DOM 来应答这些事件——正在拼写的文字、乃至重组时已提交的文字就被抹掉。原生 `<textarea>` 由平台自己编辑，不参与这场 DOM 与 state 的拉锯，所以同一个输入法在普通 textarea 评论框里一切正常（例如博客评论区的输入框）。

## 实际效果

≤720px 视口（与官方问题卡片的断点一致）下：

1. **composer 座位回归文档流** —— 输入框和确认卡片位于消息流末尾。上滑时随内容滚出视口，消息全屏可读。
2. **短会话仍然贴底** —— 消息不足一屏时消息区自动拉伸，输入框保持贴视口底，视觉与官方行为完全一致；长会话则享受全屏阅读。
3. **浮动控件重新锚定** —— 回到底部按钮、轮次导航不再为吸底座位预留高度，回到贴近视口底的位置。
4. **纤细边距** —— 消息区、会话头部、输入卡、确认卡片与屏幕边缘之间的内容层 padding（每边 16–32px）收窄为左右 4px、顶部 8px 的纤细边距，收复大部分被浪费的宽度，又不像完全贴边那样局促。页面外壳本身不产生空白，间隙完全来自这些 padding。
5. **切会话不自动聚焦** —— 官方在每次挂载/切换会话时把焦点还给输入框（桌面便利设计），手机上会弹出输入法占掉半屏。窄屏时拦截这类程序化聚焦；你主动点输入框时照常聚焦。
6. **workspace 行操作按钮常显** —— 分组行与会话行尾部的按钮（⋯ 菜单含重命名/删除、＋ 在该 workspace 新建会话）官方仅在悬停时显示；触屏没有悬停，窄屏下侧边栏列表渲染时常显这两个按钮。
7. **原生输入框接管** —— 输入区绘制成原生 textarea，外观、内边距、字号行高与官方完全一致（几何按官方输入区实时测量对齐）。回车仍是官方发送手势（含 `/` 菜单仲裁、busy-Enter 策略），粘贴图片转发给官方附件入口，锁定态跟随官方可编辑性开关。

桌面端（宽视口）完全不受影响。

## 工作原理

插件带浏览器半（`exports["./client"]`，经 `dsh.client.platform: "web"` 声明），由 client-modules 扫描器发现并从 boot manifest 装载到每个页面。

- **布局部分**：注入一个 `<style>` 标签（`@media (max-width: 720px)` 覆盖），卸载时移除标签——完全可逆。所有选择器都瞄准产品的稳定 `data-*` 属性（`data-composer-seat`、`data-conversation-scroll`、`data-phase`、`data-slot`），绝不依赖 CSS Modules 哈希类名。sticky→static 切换用 `:not(:has([data-conversation-composer-overlay]))` 排除了自带 composer overlay 的视图（如 trajectory）。不支持 `:has()` 的引擎上规则安全退回官方 sticky 行为。
- **输入框部分**：注册进官方的 `conversation.input.overlay` slot（composer 卡片内的会话级插槽），拿到官方标准 props（`useInput` / `inputActions`）。textarea 的每次输入都通过官方输入机（`conversation.input.for(ctx)` 的 `setDraft`）写回，读侧订阅同一个 store 的实时快照——因此发按钮、占位符、`/` 触发管线、附件、草稿持久化全部照常工作，且不会出现「回显旧值把刚输入的字冲掉」的竞态。官方 Lexical 编辑器保留布局盒（隐藏、不删除），卡片高度继续由草稿内容驱动。
- **范围**：仅在输入机处于 `plain` 阶段接管。一旦进入 claim（从 `/` 菜单选中命令、adjudicating、submitting），立即把输入面交还官方编辑器——命令 token/chip/装饰是纯文本镜像无法复现的状态。

## 环境要求

- DeepSeek Harness Web profile（`dsh web`），任意较新的 0.1.x 版本
- 选择器与 slot 契约已在 0.1.2-rc.1 与 0.1.5-rc.1 上验证；它们瞄准产品 slot 契约，同一版本线内稳定，产品大改版后可能需要小幅更新

## 安装

### npm

```sh
dsh plugin --profile web add dsh-mobile-flow
```

### GitHub

```sh
dsh plugin --profile web add github:imroc/dsh-mobile-flow
```

重启 `dsh web`，然后刷新浏览器页面。

## 开关（可选）

原生输入框接管默认**只在窄屏（≤720px）启用**。需要临时覆盖时（例如在桌面浏览器上验证）：

```js
// 浏览器控制台，同源页面均生效，持久化
localStorage.setItem("dsh-mobile-flow:input", "off");    // 永远用官方输入框
localStorage.setItem("dsh-mobile-flow:input", "on");     // 窄屏才接管
localStorage.setItem("dsh-mobile-flow:input", "force");  // 任何视口都接管
localStorage.removeItem("dsh-mobile-flow:input");        // 恢复默认
```

一次性覆盖也可用 URL 参数：`?dsh-mobile-input=1`（强制）/`=0`（关闭）。

诊断开关同理（持久化，点工具行「诊断」按钮即可，无需手打 URL）：

```js
localStorage.setItem("dsh-mobile-flow:diagnostics", "bench");  // 真机测试台
localStorage.setItem("dsh-mobile-flow:diagnostics", "debug");  // 事件面板
localStorage.removeItem("dsh-mobile-flow:diagnostics");        // 关闭
```

增高策略（默认 `commit`：只在提交点增高）：

```js
localStorage.setItem("dsh-mobile-flow:growth", "live");  // 逐键增高（v0.5.2 行为，A/B 用）
localStorage.setItem("dsh-mobile-flow:growth", "none");  // 永远固定高度
localStorage.removeItem("dsh-mobile-flow:growth");       // 恢复默认
```

## 验证

手机上（或桌面 DevTools 缩到 ≤720px 窄窗）打开一个会话：

- 往上滑几屏——输入框和确认卡片应随消息滚出屏幕。
- 输入区应是原生 textarea（页面里存在 `[data-mobile-input]`）。用输入法打字/语音输入，文字不应被自动清除。
- 发送：点发按钮或按回车（回车等同官方发送手势）。
- 工具行应有**两个小按钮**：「输入法✓」（逃生通道）与「诊断」（开测试台）。
- 关键回归点（v0.6.0）：**打字期间不要有任何布局跳动**——字段高度在聚焦期间不变，失焦后才按内容长高。
- 拉宽窗口即恢复官方行为。

## 更新纪律（本插件的约定）

1. **必须支持热更新**：改完即重启 dsh-web 重算 bundle rev（客户端插件产物带 `immutable` 缓存，换 rev 才能保证手机刷新拿到新码），不要让用户自己清缓存。
2. **必须预留逃生通道**：凡是接管官方 UI 行为的功能，都要能在页面上一条操作回退（见下文「输入法✓/✗」按钮），改坏了不影响正常使用。

## 兼容性加固（v0.5.1 / v0.5.2 / v0.6.0，HarmonyOS / ArkWeb 实测反馈）

首版在**鸿蒙 7 自带浏览器（ArkWeb）**上暴露两个问题，已针对性加固：

1. **点击输入区弹不出输入法**（只有少数位置能点中）——根因是**绘制/命中层级**：官方输入行所在的 `.grow` 是 `position: relative` 且 DOM 顺序在我们的 overlay seat 之后，同级堆叠下它盖在我们上面。实测（Chromium 探针 `document.elementFromPoint`）输入框 5 个采样点里 3 个命中的是官方容器而不是 textarea。
   修复：seat 加 `z-index: 5` + 不透明背景；官方输入行额外 `pointer-events: none`；并在卡片捕获阶段接管 `pointerdown`（点在输入框范围内就聚焦 textarea），几何漂移也不会再点不中。
2. **只能输入一个字符 / 输入法中断**——两条防御：
   - **失焦前字段自持文本**：DSH 侧的非空草稿不再回写进正在聚焦的 textarea（IME 组合期间的回写会重置输入会话），只有「发送成功清空」这种外部清空才写回；
   - **官方编辑器移出焦点/输入法候选**：接管期间给它加 `inert` + `aria-hidden`；若引擎不支持 `inert`，则用 `focusin` 守卫把被抢走的焦点抢回 textarea；几何写入改为幂等（无变化不写样式），避免无谓重排干扰 IME；textarea 显式 `user-select: text` / `touch-action: manipulation`（WebKit 系有继承 `user-select:none` 导致"键盘弹出但输不进去"的历史 bug）。

**v0.5.2（鸿蒙反馈第二轮）**：开启原生输入框后"每输入一个字符输入法就自动收起"。原因是**每次按键都镜像草稿** → 触发 composer 卡片重渲染 + Lexical 改写隐藏编辑器 DOM → ArkWeb 在编辑面churn 时收起键盘。改为：

- **打字期间零 DOM 变动**：字段自持文本，不再逐键回写机器；只在**提交点**同步——回车、失焦、点击输入框以外的任意位置（工具行/发送）、页面隐藏、组件卸载，以及输入 `/` `@` 触发字符时立即同步（菜单需要）；
- **字段自己长高**：textarea 自动增高（上限沿用官方 14 行 token，下限读官方 min-height：停靠 36px / 新会话 hero 52px），并给官方输入行盒子加等高的 `min-height` 兜底（绝对定位的 seat 无法撑高卡片），发送清空后自动缩回；
- **发送按钮桥接**：机器草稿为空时官方发送按钮是禁用的，点击输入框以外区域时先提交草稿，若这次提交把按钮"点亮"了，就把这记点击补发给它（一次点击即可发送）；
- 官方编辑器除 `inert` + `aria-hidden` 外，再强制 `contenteditable="false"`（把 IME 的可编辑候选集只留 textarea）；
- 打字聚焦期间不改 seat 的 left/top、不动隐藏滚动容器（避免编辑面下的布局位移触发收键盘），几何像素取整避免亚像素抖动反复写样式。

**v0.6.0（鸿蒙反馈第三轮，当前）**：把镜像挪出打字路径仍然不够——**逐键的几何写入**才是收键盘的触发点：`autosize` 每按一次键就把字段 `style.height` 置 `0px`、读 `scrollHeight`、再写回（聚焦中的可编辑面在每个按键上塌陷一次），seat 还会随卡片盒子重新对齐。现在这是一条硬约束：**字段有焦点时插件零 DOM 写入**。

- **打字期间尺寸固定**：高度锁在产品自身的下限（停靠 36px / 新会话 hero 52px），超出内容在字段内滚动；
- **只有提交点才动 DOM**：失焦、回车、页面隐藏、组件卸载、阶段切换时才做测量 / 重对齐 / chrome 同步（placeholder、只读态）；几何测量改为非破坏式（不再有 `height: 0px` 探针）；失焦后按内容长高并同步官方输入行的 `min-height`，发送清空后缩回（发送清空由用户显式动作触发，是唯一在聚焦状态下写入的场景）；
- **未提交的文字不会被空草稿冲掉**：打字期间机器草稿本来就是旧的，空发布不再被当成"用户清空了输入框"；
- **诊断面板不再自我扰动**：日志先进内存缓冲，只在失焦 / 手动刷新 / 键盘开合时渲染——旧面板每事件写一次 DOM，本身就是收键盘的嫌疑；
- **键盘开合进入日志**：记录 window / visualViewport 高度变化（ArkWeb 用它上报软键盘），"键盘在某次按键后收起"于是变成有时间戳的事实。

**v0.6.1（鸿蒙反馈第四轮，斜杠场景）**：真机实测只剩一种情况还会收键盘——**以 `/` 开头的草稿**（手动触发技能的常见写法）；普通文字已完全正常。原因是插件里唯一的逐键例外：`TRIGGER.test(整个字段值)` 判断的是「文本里有 `/`」，于是**只要草稿含斜杠，之后每敲一个字符都立刻回写机器草稿** → composer 卡片重渲染 + 命令菜单刷新 + 隐藏编辑器改写 DOM，每键一次 churn，正是 ArkWeb 收键盘的触发条件。改为：

- **只同步「触发字符本身」**：按 `/` 或 `@`（以及删掉它们）的那一次立即回写（菜单需要），**之后的字符只留在字段里**，等提交点（失焦/回车/点输入框以外/页面隐藏/卸载）才一次性写入；
- **输入法组合期间一律不同步**（用组合开始时的触发符计数判断），避免在组合中churn；
- **诊断面板新增「触发符:仅触发 / 逐键 / 关」开关**，可在真机上直接 A/B：切「逐键」即可复现旧行为（同时也验证了"逐键回写 = 收键盘"这条因果）；
- **工具行新增「复制日志」按钮**（只要开着诊断就显示），不用点开面板就能复制日志；
- **日志新增 `CHURN while focused` 行**：聚焦期间应用侧（菜单/Lexical）自己发生的 DOM 变更也会被登记，用于区分"我们的写入"和"应用自己的重渲染"。

**已知取舍**：斜杠菜单会照常弹出，但列表可能不会随输入实时过滤（过滤读的是机器草稿，而草稿在提交点前是旧的）。要实时过滤就切「触发符:逐键」，代价是那台机器上每字符收键盘。

**v0.7.0（鸿蒙反馈第五轮，斜杠那一下；✅ 鸿蒙 7 ArkWeb 真机确认有效：刷新后普通打字、`/` 技能命令、连续输入均正常）**：真机实测只剩 `/` 触发那一刻的**单次**收键盘（之后继续输入正常）。真机日志 + 官方输入框对照实验（官方输入框打 `/` 不收键盘）把机制收窄到一点：**回写草稿会让应用异步重写隐藏的官方编辑器 DOM**（`EDITOR childList +1`，在我们手势之外发生），ArkWeb 对这种"输入法之外的可编辑面变化"会收键盘；而官方路径里那次变化**就是用户自己的编辑**（同一个手势内），所以没事。

处理：**触发字符的回写改成「放手 → 落盘 → 拿回来」**，整段发生在同一个按键手势内——先 `blur()`（输入法先下去），再用 `react-dom` 的 `flushSync` 让这次回写引起的重渲染**同步完成**（编辑器改写 + 菜单挂载都发生在没有焦点的时候），最后 `focus()` 把输入法拉回来（仍在手势内，引擎允许）。

- 面板新开关 **「触发:重聚焦（默认）/ 仅触发（v0.6.1 行为）/ 逐键 / 关」**，可一键比较；若「重聚焦」在你的机器上无效，切「仅触发」就是上一版行为（菜单能用、斜杠那一下要再点一次）。
- 顺带修掉一个斜杠流程的隐藏缺陷：**从菜单里选中命令现在能真正落进输入框了**（此前"字段有焦点就不接受外部写入"的守卫会把它挡掉，现已收敛为"只挡未提交文字"）。

**逃生开关**：输入框工具行新增小按钮 **「输入法✓ / 输入法✗」**（仅窄屏显示）——一键在原生输入框与官方输入框之间切换并记住选择；任何设备上都不会被卡死。

**诊断（工具行「诊断」按钮，或 URL `?dsh-mobile-input=bench` / `,debug`）**：

- ⚠️ **带 token 的 URL 会被 shell 重写掉 query**（插件 apply 之前 query 已被清空），所以手机上请用工具行的「诊断」按钮——它把请求写进 localStorage，刷新即生效；不带 token 的浏览器地址栏访问也可直接用 URL 参数。
- **面板只占屏幕顶部**（变体默认收起，点「展开变体 A-E」打开），**下方真实输入框可直接打字**——先测真实输入框；要定位再展开变体，每格各输 3-4 个字：
  - **A** 裸 textarea（普通流，零 JS 写入）——基线；
  - **B** 零高容器内的 textarea（复刻 seat 结构，零 JS 写入）——测结构；
  - **C** 同 B + 每次按键都写高度——复刻 v0.5.2 的逐键 autosize（对照组）；
  - **D** 同 B + 只记录、不写任何 DOM——v0.6 的行为；
  - **E** iframe 隔离文档里的裸 textarea——测页面级因素。
- 判读：日志里哪一格后面跟着 `KEYBOARD ...px`，哪一格就是元凶（A/B/D 正常、C 收键盘 → 逐键写样式；连 A 都收 → 与插件无关）。
- 另有「生产:提交点增高 / 逐键增高 / 固定高度」三个切换，可在真机上直接 A/B 生产字段的增高策略（默认提交点增高）。
- **事件面板**（debug，与 bench 同时开启时只留 bench 的日志面板）记录 composer 的 tap 坐标/命中目标、focus 变化、input/composition、几何写入；两种面板都能一键复制日志。日志在**打字期间不刷新**（面板自己写 DOM 会污染取证），失焦、手动点「刷新」或键盘开合时才更新。

**真机自测记录**：见 [knowledge 条目](https://gitee.com/imroc/dsh-agent) 与 `test/probe-live.mjs`（CDP 驱动真实页面，断言"打字期间页面零 DOM 变更"）。

## 已知限制

- 原生接管期间，输入区内联的 chip/装饰（如 `@` 引用装饰）不显示；进入命令 claim 阶段会自动切回官方编辑器。
- 移动端「粘贴图片」通过转发给官方附件入口实现，浏览器若不允许构造粘贴事件则退化为用回形针按钮选择文件。
- 输入法自身的候选词栏/联想行为由系统输入法决定，插件无法控制。

## 开发与自测

```sh
npm install --no-save jsdom react@18 react-dom@18
node test/takeover.test.mjs                          # jsdom：渲染 + 打字路径（含"打字期零 DOM 写入"断言）
node test/facts-probe.mjs <token>                    # 真实页面：DOM/CSS 结构与引擎能力
node test/probe-live.mjs <token>                     # 真实页面：接管契约 + 诊断开关（CDP，390x844 移动视口）
```

token 取自 `journalctl --user -u dsh-web | grep -o 'token=[A-Za-z0-9_-]*' | tail -1`（每次重启换新；单次有效，探针只用一次）。

测试会加载真实的 `lib/client.js`，用 React 把 slot 组件渲染进一个 composer 卡片形状的 DOM，断言渲染路径、
草稿镜像（打字 / 输入法组合 / 机器侧写入）、回车手势、以及"claim 阶段把输入面交还官方编辑器"的开关。
存在的理由：slot 组件渲染出错时页面看不出异常，只有控制台报错。

## 回退

- Bundle 安装：`dsh plugin --profile web remove dsh-mobile-flow`
- 手动：移除依赖与 `dsh.profile.bundles` 条目，重启 `dsh web`
- 临时：`localStorage.setItem("dsh-mobile-flow:input", "off")` 后刷新页面（只关原生输入框，布局修复保留）

不修改产品源码；升级不会覆盖。

## 许可证

MIT
