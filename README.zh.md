# dsh-mobile-flow

[English](README.md) | **简体中文**

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）Web UI 的手机端 in-flow composer 插件：窄屏（≤720px）时输入框与 AI 确认选择框随页面滚动，而不是钉死在屏幕底部——上滑阅读时消息区拿回全屏空间。

纯客户端 CSS overlay，不修改产品源码；卸载插件即完全还原官方行为。

## 解决的问题

官方 Web UI 用 `position: sticky; bottom: 0` 把 composer 座位钉在视口底。这个座位承载的不只是输入框，还有 AI 会话中途弹出的交互卡片——`ask_user_question` 选项卡、approval 权限确认框、plan review。手机上它们全部粘在屏幕底部，往回翻阅回复时永久遮挡一块视口。

## 实际效果

≤720px 视口（与官方问题卡片的断点一致）下：

1. **composer 座位回归文档流** —— 输入框和确认卡片位于消息流末尾。上滑时随内容滚出视口，消息全屏可读。
2. **短会话仍然贴底** —— 消息不足一屏时消息区自动拉伸，输入框保持贴视口底，视觉与官方行为完全一致；长会话则享受全屏阅读。
3. **浮动控件重新锚定** —— 回到底部按钮、轮次导航不再为吸底座位预留高度，回到贴近视口底的位置。
4. **纤细边距** —— 消息区、会话头部、输入卡、确认卡片与屏幕边缘之间的内容层 padding（每边 16–32px）收窄为左右 4px、顶部 8px 的纤细边距，收复大部分被浪费的宽度，又不像完全贴边那样局促。页面外壳本身不产生空白，间隙完全来自这些 padding。
5. **切会话不自动聚焦** —— 官方在每次挂载/切换会话时把焦点还给输入框（桌面便利设计），手机上会弹出输入法占掉半屏。窄屏时拦截这类程序化聚焦；你主动点输入框时照常聚焦。
6. **workspace 行操作按钮常显** —— 分组行与会话行尾部的按钮（⋯ 菜单含重命名/删除、＋ 在该 workspace 新建会话）官方仅在悬停时显示；触屏没有悬停，窄屏下侧边栏列表渲染时常显这两个按钮。

桌面端（宽视口）完全不受影响。

## 工作原理

插件带浏览器半（`exports["./client"]`，经 `dsh.client.platform: "web"` 声明），由 client-modules 扫描器发现并从 boot manifest 装载到每个页面。注入一个 `<style>` 标签（`@media (max-width: 720px)` 覆盖），卸载时移除标签——完全可逆。

所有选择器都瞄准产品的稳定 `data-*` 属性（`data-composer-seat`、`data-conversation-scroll`、`data-phase`、`data-slot`），绝不依赖 CSS Modules 哈希类名。sticky→static 切换用 `:not(:has([data-conversation-composer-overlay]))` 排除了自带 composer overlay 的视图（如 trajectory），保持官方 absolute 定位。不支持 `:has()` 的引擎上规则安全退回官方 sticky 行为。

## 环境要求

- DeepSeek Harness Web profile（`dsh web`），任意较新的 0.1.x 版本
- 选择器已在 0.1.2-rc.1 上验证；它们瞄准产品 slot 契约，同一版本线内稳定，产品大改版后可能需要小幅更新

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

## 验证

手机上（或桌面 DevTools 缩到 ≤720px 窄窗）打开一个会话：往上滑几屏——输入框和确认卡片应随消息滚出屏幕。触发一个会提问的工具（或直接看长会话里的输入框）：卡片位于消息流末尾而非屏幕底部。拉宽窗口即恢复官方行为。

## 回退

- Bundle 安装：`dsh plugin --profile web remove dsh-mobile-flow`
- 手动：移除依赖与 `dsh.profile.bundles` 条目，重启 `dsh web`

不修改产品源码；升级不会覆盖。

## 许可证

MIT
