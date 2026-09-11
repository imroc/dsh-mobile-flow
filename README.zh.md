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

## 验证

手机上（或桌面 DevTools 缩到 ≤720px 窄窗）打开一个会话：

- 往上滑几屏——输入框和确认卡片应随消息滚出屏幕。
- 输入区应是原生 textarea（页面里存在 `[data-mobile-input]`）。用输入法打字/语音输入，文字不应被自动清除。
- 发送：点发按钮或按回车（回车等同官方发送手势）。
- 拉宽窗口即恢复官方行为。

## 已知限制

- 原生接管期间，输入区内联的 chip/装饰（如 `@` 引用装饰）不显示；进入命令 claim 阶段会自动切回官方编辑器。
- 移动端「粘贴图片」通过转发给官方附件入口实现，浏览器若不允许构造粘贴事件则退化为用回形针按钮选择文件。
- 输入法自身的候选词栏/联想行为由系统输入法决定，插件无法控制。

## 开发与自测

```sh
npm install --no-save jsdom react@18 react-dom@18
node test/takeover.test.mjs     # 在 jsdom 里跑真实 client bundle
```

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
