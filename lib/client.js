window.__ModuleLoader__.load({
  id: "dsh-mobile-flow",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    /* Mobile in-flow composer: on narrow viewports the composer seat (input
       bar + AI confirmation takeovers) joins the document flow, so swiping
       up scrolls it out of view and the transcript gets the full screen.

       The 720px breakpoint matches the official ui-user-questions
       QuestionComposer narrow-screen breakpoint. On engines without :has()
       the rules fail closed and the stock sticky behavior stays.

       Selectors target the product's stable data-* attributes
       (data-composer-seat / data-conversation-scroll / data-phase /
       data-slot), never CSS-Modules-hashed class names; all hooks verified
       against the 0.1.2-rc.1 shipped bundles. */
    var CSS = [
      "/* ── dsh-mobile-flow: in-flow composer (≤720px) ── */",
      "@media (max-width: 720px) {",
      "  /* 1) Composer seat sticky -> static: the seat hosts the input bar",
      "     fallback AND confirmation takeovers (ask_user_question /",
      "     approval / plan review); one rule frees them all together.",
      "     Overlay mode is excluded: views like trajectory keep the",
      "     official absolute seat positioning. */",
      "  [data-conversation-scroll]:not(:has([data-conversation-composer-overlay])) > [data-composer-seat] {",
      "    position: static !important;",
      "    z-index: auto !important;",
      "  }",
      "  /* 2) Active-phase transcript stretch (flex-grow): with a short",
      "     transcript the seat still lands flush with the viewport floor",
      "     (visually identical to the stock docked bar); once the content",
      "     exceeds one screen there is no free space left to distribute,",
      "     the rule stops contributing, and the seat stays in the flow.",
      "     hero/settling phases are unaffected. */",
      "  [data-phase='active'] [data-conversation-scroll] > [data-slot='conversation.session'] {",
      "    flex: 1 0 auto;",
      "  }",
      "  /* 3) Floating controls stop reserving height for the sticky seat:",
      "     zeroing the variable drops the back-to-bottom button and the",
      "     turn navigator back to the viewport floor (overrides the seat",
      "     ResizeObserver's inline publication). Overlay mode excluded so",
      "     trajectory's bottom-clearance is untouched. */",
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
