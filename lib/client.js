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
      "  /* 4) Slim edges: the stock content-layer paddings (16-32px per side)",
      "     waste too much of a narrow screen, while full-bleed zero feels",
      "     cramped — keep a slim 4px side inset (8px top) instead. The page",
      "     shell itself never adds whitespace; only these paddings matter. */",
      "  /* a) Shared side-clearance variable -> 4px: the input card root and",
      "     the question-card frame reference it via calc(). */",
      "  [data-phase] {",
      "    --dsh-composer-side-clearance: 4px !important;",
      "  }",
      "  /* b) Transcript scroller (CSS-Modules _scroll class): 32px sides and",
      "     16px top -> 4px sides / 8px top (the variable above only removes",
      "     part of the side value; the fixed rest needs a direct hit). */",
      "  [data-conversation-scroll] [class*='_scroll'] {",
      "    padding: 8px 4px !important;",
      "  }",
      "  /* c) Session header (the _header element inside the session.header",
      "     slot container): 12px top + 28/20px sides -> 8px top / 6px sides. */",
      "  [data-slot='conversation.session.header'] > [class*='_header'] {",
      "    padding: 8px 6px 0 !important;",
      "  }",
      "  /* d) Question/approval card frame (_frame): stock side calc",
      "     (clearance + 16px) -> 4px; vertical rhythm kept as stock. */",
      "  [data-composer-seat] [class*='_frame'] {",
      "    padding: 6px 4px 10px !important;",
      "  }",
      "  /* 5) Workspace row actions always visible: the stock trailing buttons",
      "     (the ellipsis menu with rename/delete and the plus for a new",
      "     session in that workspace) surface on row hover only, and touch",
      "     has no hover. In narrow viewports show them whenever the list is",
      "     rendered — the collapsed rail never mounts the rows, so the media",
      "     query alone is the right gate. The session row's trailing",
      "     timestamp hides to make room, mirroring the stock hover trade-off. */",
      "  [class*='_rowActions'] {",
      "    display: inline-flex !important;",
      "  }",
      "  [class*='_sessionRow'] [class*='_time'] {",
      "    display: none !important;",
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

      ctx.effect(function () {
        return installNoAutoFocus();
      });
    }

    /* 5) No auto-focus on session switch (narrow viewports): InputBar's
       unlock effect focuses the contenteditable on every mount / session
       switch (packages/client/ui-conversation/.../InputBar.tsx, deps
       [locked, sessionId, editor]) — a desktop convenience that pops the
       IME over half the screen on phones. Swallow programmatic focus() on
       the composer's editable unless the user just tapped it (or is
       keyboard-navigating); taps reach the box via the normal focus path.
       Question-card textareas (autoFocus on purpose) are not contenteditable
       and stay untouched. */
    function installNoAutoFocus() {
      if (typeof window.matchMedia !== "function") return function () {};
      var narrow = window.matchMedia("(max-width: 720px)");
      var lastPointer = { target: null, time: 0 };
      var lastKey = 0;
      var onPointerDown = function (e) {
        lastPointer.target = e.target;
        lastPointer.time = Date.now();
      };
      var onKeyDown = function () { lastKey = Date.now(); };
      document.addEventListener("pointerdown", onPointerDown, true);
      document.addEventListener("keydown", onKeyDown, true);

      function userInitiated(el) {
        var now = Date.now();
        if (now - lastKey < 500) return true;
        if (now - lastPointer.time > 600) return false;
        var t = lastPointer.target;
        return t !== null && (t === el || (typeof t.contains === "function" && t.contains(el)));
      }

      var nativeFocus = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function (opts) {
        if (
          narrow.matches &&
          this.isContentEditable === true &&
          typeof this.closest === "function" &&
          this.closest("[data-composer-seat]") !== null &&
          !userInitiated(this)
        ) {
          return; /* swallow programmatic focus on the composer */
        }
        return nativeFocus.call(this, opts);
      };
      return function () {
        HTMLElement.prototype.focus = nativeFocus;
        document.removeEventListener("pointerdown", onPointerDown, true);
        document.removeEventListener("keydown", onKeyDown, true);
      };
    }

    exports.apply = apply;
    return module.exports;
  }
});
