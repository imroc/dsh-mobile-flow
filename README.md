# dsh-mobile-flow

DeepSeek Harness (dsh) Web UI 手机端插件：窄屏（≤720px）时输入框与 AI 确认选择框
从「吸在屏幕底部」改为「随页面文档流滚动」，上滑阅读消息时底栏滚出视口，
消息可全屏展示；短会话（内容不足一屏）时输入框仍贴视口底，两种场景都正确。

纯客户端 CSS overlay，不改产品源码，卸载即完全还原。

## 解决的问题

官方布局里 composer 座位是 `position: sticky; bottom: 0`（见
`packages/client/ui-conversation/src/client/skeleton/ConversationRoot.module.css`），
输入框、ask_user_question 确认框、approval 权限框、plan review 全部渲染在同一个
座位里，永远吸在视口底——手机上持续遮挡，可用阅读空间小。

## 工作原理

注入一个 `<style>` 标签（`@media (max-width: 720px)`，断点对齐官方
QuestionComposer），三条规则：

1. 座位 `sticky → static`（排除 trajectory 等视图的 overlay absolute 座位）；
2. active 阶段消息区 `flex-grow`：短会话时座位仍贴视口底，长会话规则自然失效；
3. `--dsh-composer-height` 归零：回到底部按钮等浮动控件不再为吸底座位预留高度。

选择器全部用官方稳定 `data-*` 属性（`data-composer-seat` / `data-conversation-scroll`
/ `data-phase` / `data-slot`），不依赖 CSS Modules hash 类名；`:has` 不可用时规则
整体失效，安全退回官方行为。已在 0.1.2-rc.1 装机产物上验证全部钩子存在。

## 安装（本机 web profile）

```sh
cd ~/.dsh/profiles/web
pnpm add file:/root/dev/dsh-mobile-flow
# package.json 的 dsh.profile.bundles 数组追加 "dsh-mobile-flow"
# 重启 dsh-web 生效
```

## 验证

手机（或桌面 DevTools 窄窗口 ≤720px）打开会话：往下滑几屏，输入框/确认框应随
消息滚出屏幕；确认框弹出时位于消息流末尾而非屏幕底部。宽视口（桌面）行为不变。

## 卸载

`package.json` 移除依赖与 bundles 项，重启 dsh-web。

## License

MIT
