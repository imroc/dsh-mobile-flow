window.__ModuleLoader__.load({
  id: "dsh-mobile-flow",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    /* 手机端 in-flow composer：输入框与确认选择框回归文档流，
       上滑阅读时随内容滚出视口，消息可全屏展示。
       断点 720px 对齐官方 ui-user-questions QuestionComposer 的窄屏断点；
       :has 不可用的老引擎规则整体失效，安全退回官方 sticky 行为。
       选择器全部挂在官方刻意暴露的稳定 data-* 属性上（data-composer-seat /
       data-conversation-scroll / data-phase / data-slot），CSS Modules hash
       类名不可依赖；已对 0.1.2-rc.1 装机产物逐一验证存在。 */
    var CSS = [
      "/* ── dsh-mobile-flow: in-flow composer (≤720px) ── */",
      "@media (max-width: 720px) {",
      "  /* 1) composer 座位 sticky -> static：座位承载输入框 fallback 与",
      "     确认框 takeover（ask_user_question / approval / plan review），",
      "     一条规则同时放开两者。排除 overlay 模式：trajectory 等视图的",
      "     absolute 座位保持官方定位不受影响。 */",
      "  [data-conversation-scroll]:not(:has([data-conversation-composer-overlay])) > [data-composer-seat] {",
      "    position: static !important;",
      "    z-index: auto !important;",
      "  }",
      "  /* 2) active 阶段消息区拉伸（flex-grow）：短会话时座位仍被推到",
      "     视口底（视觉等同官方吸底）；消息超一屏时无剩余空间可分，",
      "     规则自然失效，座位留在文档流末尾。hero/settling 阶段不受影响。 */",
      "  [data-phase='active'] [data-conversation-scroll] > [data-slot='conversation.session'] {",
      "    flex: 1 0 auto;",
      "  }",
      "  /* 3) 浮动控件不再为吸底 composer 预留高度：变量归零让回到底部",
      "     按钮与轮次导航自动贴视口底（覆盖座位 ResizeObserver 的内联发布）。",
      "     同样排除 overlay 模式，trajectory 的 bottom-clearance 不受影响。 */",
      "  [data-conversation-scroll]:not(:has([data-conversation-composer-overlay])) {",
      "    --dsh-composer-height: 0px !important;",
      "  }",
      "}",
    ].join("\n");

    function apply(ctx) {
      var tag = document.createElement("style");
      tag.dataset.plugin = "dsh-mobile-flow";
      tag.textContent = CSS;
      document.head.append(tag);

      ctx.effect(function () {
        return function () {
          tag.remove();
        };
      });
    }

    exports.apply = apply;
    return module.exports;
  }
});
