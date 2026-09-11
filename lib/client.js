window.__ModuleLoader__.load({
  id: "dsh-mobile-flow",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    var React = require("react");
    var h = React.createElement;

    /* Mobile in-flow composer: on narrow viewports the composer seat (input
       bar + AI confirmation takeovers) joins the document flow, so swiping
       up scrolls it out of view and the transcript gets the full screen.

       The 720px breakpoint matches the official ui-user-questions
       QuestionComposer narrow-screen breakpoint. On engines without :has()
       the rules fail closed and the stock sticky behavior stays.

       Selectors target the product's stable data-* attributes
       (data-composer-seat / data-conversation-scroll / data-phase /
       data-slot / data-composer-card / data-input-scroll), never
       CSS-Modules-hashed class names; all hooks verified against the
       0.1.2-rc.1 shipped bundles (re-verified against 0.1.5-rc.1). */
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

    /* Native-input takeover styles. These ride OUTSIDE the media query on
       purpose: the JS half decides when the takeover is live (narrow viewport
       by default, or an explicit override) and marks the card with
       data-mobile-input-active, so a forced takeover also works on a desktop
       viewport. Every rule below is inert until that marker is present. */
    var INPUT_CSS = [
      "/* ── dsh-mobile-flow: native textarea takeover ── */",
      "/* The stock draft surface keeps its box (it is what sizes the card) but",
      "   stops painting: the native textarea draws the draft instead. */",
      "[data-composer-card][data-mobile-input-active] [data-input-scroll] > div > * {",
      "  visibility: hidden !important;",
      "}",
      "/* Our seat: geometry published by the takeover (left/top/width/height",
      "   copied from the stock scrollport), never by this sheet. It is also",
      "   mounted while the stock surface owns the input (claimed phases), so",
      "   it must never swallow taps. */",
      "[data-mobile-input-wrap] {",
      "  position: absolute;",
      "  pointer-events: none;",
      "}",
      "/* Mirrors .input's metrics exactly (same paddings; font and line-height",
      "   inherited from the card) so the takeover is visually the stock bar. */",
      "[data-mobile-input] {",
      "  display: block;",
      "  box-sizing: border-box;",
      "  width: 100%;",
      "  height: 100%;",
      "  margin: 0;",
      "  padding: 4px 8px 0 14px;",
      "  font-family: inherit;",
      "  font-size: inherit;",
      "  line-height: inherit;",
      "  color: var(--dsw-alias-label-primary);",
      "  caret-color: var(--dsw-alias-state-business-primary);",
      "  background: transparent;",
      "  border: 0;",
      "  outline: none;",
      "  resize: none;",
      "  overflow-y: auto;",
      "  white-space: pre-wrap;",
      "  overflow-wrap: anywhere;",
      "  word-break: break-word;",
      "  pointer-events: auto;",
      "}",
      "[data-mobile-input]::placeholder {",
      "  color: var(--dsw-alias-label-caption);",
      "  opacity: 1;",
      "}",
      "[data-mobile-input][readonly] {",
      "  color: var(--dsw-alias-label-tertiary);",
      "  cursor: not-allowed;",
      "}",
    ].join("\n");

    function apply(ctx) {
      var tag = document.createElement("style");
      tag.dataset.plugin = "dsh-mobile-flow";
      tag.textContent = CSS + "\n" + INPUT_CSS;
      document.head.append(tag);

      ctx.effect(function () {
        return function () {
          tag.remove();
        };
      });

      ctx.effect(function () {
        return installNoAutoFocus();
      });

      /* The native-input takeover occupies the `conversation.input.overlay`
         seat: a session-scope list slot rendered inside the resident composer
         card, whose standard kit carries `useInput` and `inputActions`. That is
         exactly what the takeover needs — the official input machine, never
         the Lexical DOM. Resolved defensively: a shell without the seat (or
         without the slot service) keeps the stock composer. */
      var slots = typeof ctx.get === "function" ? ctx.get("slots") : undefined;
      if (slots === undefined) slots = ctx.slots;
      if (slots === undefined || typeof slots.inject !== "function") return;
      slots.inject("conversation.input.overlay", () => slots.register({
        name: "conversation.input.overlay",
        id: "native-input",
        order: 40,
      }, MobileInput));
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

    /* ─────────────────── native input takeover ───────────────────

       Why: the stock composer's text surface is a Lexical contenteditable.
       Android IMEs — voice keyboards above all — drive composition through
       Chrome's InputConnection -> beforeinput("insertCompositionText")
       recomposition flow. A framework editor answers those events by
       reconciling the DOM from its own state, so the composing text (and on
       recomposition already-committed text) gets wiped. A native <textarea>
       is edited by the platform itself and never enters that fight — which is
       why the same IME behaves in ordinary textarea comment boxes.

       What: while the machine is plain, the draft surface becomes a native
       textarea laid over the stock scrollport. Every keystroke is mirrored
       into the official input machine through the public session input face,
       so the send button, slash adjudication, attachments, busy-Enter policy
       and draft persistence all keep working unchanged. The Lexical editor
       keeps its layout box (hidden, never removed) because that box is what
       sizes the card for the mirrored draft.

       Scope: the takeover owns the surface ONLY while the machine is plain.
       A claim (a `/` command picked from the menu, adjudicating, submitting)
       hands the surface back to the stock editor, whose token/chip/decoration
       state a plain-text mirror cannot reproduce. */

    /** Override key: "on" | "force" | "off" in localStorage (persistent) or
        the `dsh-mobile-input` query parameter for one page load. */
    var OVERRIDE_KEY = "dsh-mobile-flow:input";
    var NARROW_QUERY = "(max-width: 720px)";

    function readOverride() {
      try {
        var stored = window.localStorage.getItem(OVERRIDE_KEY);
        if (stored === "on" || stored === "force" || stored === "off") return stored;
      } catch (error) { /* storage unavailable: fall through to the query */ }
      try {
        var param = new window.URLSearchParams(window.location.search).get("dsh-mobile-input");
        if (param === "1" || param === "on" || param === "force") return "force";
        if (param === "0" || param === "off") return "off";
      } catch (error) { /* no URLSearchParams: the media query decides */ }
      return null;
    }

    /** Whether the takeover should own the surface on this viewport. */
    function takeoverLive(media) {
      var override = readOverride();
      if (override === "on" || override === "force") return true;
      if (override === "off") return false;
      return media !== null && media.matches === true;
    }

    /** Narrow-viewport flag, live across rotation, resize and override edits. */
    function useTakeoverViewport() {
      var media = React.useMemo(function () {
        try {
          return window.matchMedia(NARROW_QUERY);
        } catch (error) {
          return null;
        }
      }, []);
      var state = React.useState(function () { return takeoverLive(media); });
      var live = state[0];
      var setLive = state[1];
      React.useEffect(function () {
        if (media === null) return undefined;
        var update = function () { setLive(takeoverLive(media)); };
        update();
        if (typeof media.addEventListener === "function") media.addEventListener("change", update);
        else if (typeof media.addListener === "function") media.addListener(update);
        return function () {
          if (typeof media.removeEventListener === "function") media.removeEventListener("change", update);
          else if (typeof media.removeListener === "function") media.removeListener(update);
        };
      }, [media]);
      return live;
    }

    /**
     * Resolve the session's public input face — the same machine the composer
     * bar drives. Its `state` store is what lets the mirror read the LIVE
     * draft (a render-time value could be stale and clobber fast typing).
     * `sessions.scope(id).get('conversation')` is the documented third-party
     * route (dsh-genui inserts composer templates through it).
     */
    function resolveInputFace(ctx, sessionId) {
      if (sessionId === undefined || sessionId === null) return undefined;
      var sessions = ctx.sessions;
      if (sessions === undefined || sessions === null || typeof sessions.scope !== "function") return undefined;
      try {
        var scoped = sessions.scope(sessionId);
        if (scoped === undefined || scoped === null) return undefined;
        var conversation = scoped.get("conversation");
        if (conversation === undefined || conversation === null) return undefined;
        var resolver = conversation.input;
        if (resolver === undefined || typeof resolver.for !== "function") return undefined;
        var face = resolver.for(scoped);
        return face === undefined || face === null ? undefined : face;
      } catch (error) {
        return undefined;
      }
    }

    function MobileInput(props) {
      var live = useTakeoverViewport();
      var useInput = props.useInput;
      var input = typeof useInput === "function" ? useInput(function (s) { return s; }) : undefined;
      var sessionId = props.sessionId;
      var actions = props.inputActions;
      var phase = input === undefined ? "plain" : input.phase;
      /* Ownership is surface-level only: claims fall back to the stock editor
         (see the section comment). */
      var active = live && phase === "plain" && sessionId !== undefined;

      var wrapRef = React.useRef(null);
      var areaRef = React.useRef(null);
      var composingRef = React.useRef(false);
      var draftRef = React.useRef("");
      var faceRef = React.useRef(undefined);

      draftRef.current = input === undefined ? "" : input.draft;

      var face = React.useMemo(
        function () { return resolveInputFace(ctx, sessionId); },
        [sessionId],
      );
      faceRef.current = face;

      var cardOf = function () {
        var wrap = wrapRef.current;
        return wrap === null ? null : wrap.closest("[data-composer-card]");
      };

      /** Publish the stock scrollport's box onto our seat. */
      var measure = function () {
        var wrap = wrapRef.current;
        if (wrap === null) return;
        var card = cardOf();
        var scroll = card === null ? null : card.querySelector("[data-input-scroll]");
        if (card === null || scroll === null) return;
        var cardRect = card.getBoundingClientRect();
        var scrollRect = scroll.getBoundingClientRect();
        wrap.style.left = scrollRect.left - cardRect.left - card.clientLeft + "px";
        wrap.style.top = scrollRect.top - cardRect.top - card.clientTop + "px";
        wrap.style.width = scroll.clientWidth + "px";
        wrap.style.height = scroll.clientHeight + "px";
        /* The stock scrollport would only ever scroll to chase its (never
           focused) caret; the textarea owns scrolling now, so pin it back. */
        if (scroll.scrollTop !== 0) scroll.scrollTop = 0;
      };

      /** Mirror the stock surface's chrome: placeholder text + editability. */
      var refreshChrome = function () {
        var area = areaRef.current;
        if (area === null) return;
        var card = cardOf();
        var editor = card === null ? null : card.querySelector("[data-composer-input]");
        if (editor === null) return;
        var placeholder = editor.getAttribute("data-placeholder");
        if (placeholder !== null && area.placeholder !== placeholder) area.placeholder = placeholder;
        /* The product's own gate (locked / inert / takeover states) rides this
           attribute; mirror it instead of re-deriving the policy. */
        var editable = editor.getAttribute("contenteditable") !== "false";
        if (area.readOnly === editable) area.readOnly = !editable;
      };

      /* Mark the card while the takeover owns the surface: the CSS that hides
         the stock draft surface keys off this attribute. */
      React.useLayoutEffect(function () {
        var card = cardOf();
        if (card === null) return undefined;
        if (active) card.setAttribute("data-mobile-input-active", "");
        else card.removeAttribute("data-mobile-input-active");
        return function () { card.removeAttribute("data-mobile-input-active"); };
      }, [active]);

      /* Geometry tracking: the stock box moves whenever the card relayouts
         (taller draft, attachment rail, rotation), so follow it. */
      React.useLayoutEffect(function () {
        if (!active) return undefined;
        var card = cardOf();
        var scroll = card === null ? null : card.querySelector("[data-input-scroll]");
        var frame = 0;
        var run = function () {
          frame = 0;
          measure();
          refreshChrome();
        };
        var schedule = function () {
          if (frame !== 0) return;
          frame = window.requestAnimationFrame(run);
        };
        run();
        var observer = typeof window.ResizeObserver === "function" ? new window.ResizeObserver(schedule) : null;
        if (observer !== null) {
          if (card !== null) observer.observe(card);
          if (scroll !== null) observer.observe(scroll);
        }
        /* Chrome (placeholder / editability) changes ride attributes only. */
        var mutations = typeof window.MutationObserver === "function" && card !== null
          ? new window.MutationObserver(schedule)
          : null;
        if (mutations !== null) {
          mutations.observe(card, {
            attributes: true,
            attributeFilter: ["data-placeholder", "contenteditable"],
            subtree: true,
          });
        }
        window.addEventListener("resize", schedule);
        window.addEventListener("orientationchange", schedule);
        var fonts = document.fonts;
        if (fonts !== undefined && typeof fonts.ready === "object" && typeof fonts.ready.then === "function") {
          fonts.ready.then(schedule, schedule);
        }
        return function () {
          if (frame !== 0) window.cancelAnimationFrame(frame);
          if (observer !== null) observer.disconnect();
          if (mutations !== null) mutations.disconnect();
          window.removeEventListener("resize", schedule);
          window.removeEventListener("orientationchange", schedule);
        };
      }, [active]);

      /* Machine -> textarea. The live store subscription (not a render-time
         value) makes the echo of our own mirror a no-op while an external
         change — send committed, failed-send restore, another plugin's
         insert — still lands, with no stale-render race to clobber typing. */
      React.useEffect(function () {
        if (!active) return undefined;
        var area = areaRef.current;
        if (area === null) return undefined;
        var sync = function () {
          if (composingRef.current) return; /* never fight the IME */
          var next = face === undefined ? draftRef.current : face.state.getSnapshot().draft;
          if (area.value !== next) area.value = next;
          if (face === undefined) measure();
          refreshChrome();
        };
        sync();
        if (face === undefined) return undefined; /* no live store: render-driven */
        var off = face.state.subscribe(sync);
        return function () { off(); };
      }, [active, face]);

      /* Fallback mirror when the live store could not be resolved (a scope
         that is not queryable yet): best effort off the rendered draft. */
      React.useEffect(function () {
        if (!active || face !== undefined) return;
        var area = areaRef.current;
        if (area === null || composingRef.current) return;
        if (area.value !== draftRef.current) area.value = draftRef.current;
      }, [active, face, input]);

      /* Textarea -> machine. Mirrored on every input event: the send button,
         the placeholder and the `/` trigger pipeline all read the machine, so
         a debounce would let the user send a draft the machine never saw. */
      var push = function (value) {
        if (actions !== undefined && typeof actions.setDraft === "function") {
          actions.setDraft(value);
          return true;
        }
        var face = faceRef.current;
        if (face !== undefined && typeof face.setDraft === "function") {
          face.setDraft(value);
          return true;
        }
        return false;
      };

      /** Enter = the stock send gesture, replayed on the hidden editor so the
          product's own keymap decides (menu arbitration, busy-Enter policy). */
      var sendGesture = function () {
        var card = cardOf();
        var editor = card === null ? null : card.querySelector("[data-composer-input]");
        if (editor !== null && typeof window.KeyboardEvent === "function") {
          var replay = new window.KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            bubbles: true,
            cancelable: true,
            composed: true,
          });
          editor.dispatchEvent(replay);
          if (replay.defaultPrevented === true) return true; /* stock handler ran */
        }
        if (actions !== undefined && typeof actions.submit === "function") {
          actions.submit();
          return true;
        }
        var face = faceRef.current;
        if (face !== undefined && typeof face.submit === "function") {
          face.submit();
          return true;
        }
        return false;
      };

      var onInput = function (event) {
        push(event.currentTarget.value);
      };
      var onCompositionStart = function () { composingRef.current = true; };
      var onCompositionEnd = function (event) {
        composingRef.current = false;
        push(event.currentTarget.value);
      };
      var onKeyDown = function (event) {
        if (event.key !== "Enter" || event.shiftKey === true) return;
        if (event.nativeEvent !== undefined && event.nativeEvent.isComposing === true) return;
        if (composingRef.current) return;
        /* An empty draft is only sendable when it carries attachments (the
           machine's attachment-only send); otherwise keep the newline. */
        var attachments = input !== undefined && Array.isArray(input.attachmentIds)
          ? input.attachmentIds.length
          : 0;
        if (event.currentTarget.value.trim() === "" && attachments === 0) return;
        push(event.currentTarget.value);
        if (sendGesture()) event.preventDefault();
      };
      /* Attachments pasted into a textarea have nowhere to land, so forward a
         file-bearing paste to the stock surface, whose keymap owns intake. */
      var onPaste = function (event) {
        var data = event.clipboardData;
        if (data === undefined || data === null || data.files === undefined || data.files.length === 0) return;
        var card = cardOf();
        var editor = card === null ? null : card.querySelector("[data-composer-input]");
        if (editor === null) return;
        try {
          var forwarded = new window.ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data });
          editor.dispatchEvent(forwarded);
          event.preventDefault();
        } catch (error) { /* no ClipboardEvent constructor: the picker still works */ }
      };

      /* The seat stays mounted even while the stock editor owns the surface:
         it is how this component finds its card, and it keeps the takeover
         from remounting the subtree on every phase flip. */
      return h(
        "div",
        { ref: wrapRef, "data-mobile-input-wrap": "" },
        active
          ? h("textarea", {
            ref: areaRef,
            "data-mobile-input": "",
            rows: 1,
            autoComplete: "off",
            enterKeyHint: "send",
            onInput: onInput,
            onKeyDown: onKeyDown,
            onPaste: onPaste,
            onCompositionStart: onCompositionStart,
            onCompositionEnd: onCompositionEnd,
          })
          : null,
      );
    }

    exports.apply = apply;
    /* The takeover registers slot entries, so the plugin waits for the slot
       service (Cordis re-applies it once the service appears) — the same
       declaration shipped composer-contributing plugins use. Everything else
       (the session face, the seat) is resolved defensively at runtime, so a
       shell missing them keeps the stock composer instead of failing the
       plugin. */
    exports.inject = ["slots"];
    return module.exports;
  }
});
