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
      "  /* 4) Edge-to-edge: the page shell itself carries no whitespace",
      "     (html/body margin 0, viewport-fit correct, AppFrame is a full-width",
      "     grid) — the side gaps come from content-layer paddings, cleared",
      "     here so narrow screens use every pixel. */",
      "  /* a) Shared side-clearance variable -> 0: the input card root and the",
      "     question-card frame reference it via calc(); zeroing collapses",
      "     their side insets and the composer width axis in one place. */",
      "  [data-phase] {",
      "    --dsh-composer-side-clearance: 0px !important;",
      "  }",
      "  /* b) Transcript scroller (CSS-Modules _scroll class): fixed 16px",
      "     side pads and 16px top pad -> 0 (the variable above only removes",
      "     half of the side value; the fixed rest needs a direct hit). */",
      "  [data-conversation-scroll] [class*='_scroll'] {",
      "    padding: 0 !important;",
      "  }",
      "  /* c) Session header (the _header element inside the session.header",
      "     slot container): 12px top + 28/20px sides -> 0, title and tabs go",
      "     flush with the screen edges. */",
      "  [data-slot='conversation.session.header'] > [class*='_header'] {",
      "    padding: 0 !important;",
      "  }",
      "  /* d) Input-bar root (_root): bottom 8px -> 0 (sides already zeroed",
      "     via the variable; the hero container sharing the _root suffix has",
      "     zero vertical padding already, so this is a no-op there). */",
      "  [data-composer-seat] [class*='_root'] {",
      "    padding-bottom: 0 !important;",
      "  }",
      "  /* e) Question/approval card frame (_frame): 6px top / 10px bottom",
      "     plus the side calc -> 0, confirmation cards sit flush too. */",
      "  [data-composer-seat] [class*='_frame'] {",
      "    padding: 0 !important;",
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
