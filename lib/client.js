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
      "  pointer-events: none !important;",
      "}",
      "/* Our seat: geometry published by the takeover (left/top/width/height",
      "   copied from the stock scrollport), never by this sheet.",
      "   z-index is load-bearing: the stock row lives in .grow, which is",
      "   position:relative and comes LATER in DOM order, so at equal stacking",
      "   level it paints — and hit-tests — above this seat; taps in the middle",
      "   of the input box then never reach the textarea (measured 2026-09-11).",
      "   The opaque background keeps the (hidden) stock surface from bleeding",
      "   through on engines that treat visibility:hidden differently. */",
      "[data-mobile-input-wrap] {",
      "  position: absolute;",
      "  z-index: 5;",
      "  pointer-events: auto;",
      "  border-radius: 22px;",
      "  background: var(--dsw-specific-input-major);",
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
      "  /* ArkWeb/WebKit-class engines have shipped keyboard-opens-but-no-input",
      "     bugs when an inherited user-select:none lands on the field. */",
      "  -webkit-user-select: text;",
      "  user-select: text;",
      "  touch-action: manipulation;",
      "  -webkit-touch-callout: default;",
      "}",
      "[data-mobile-input]::placeholder {",
      "  color: var(--dsw-alias-label-caption);",
      "  opacity: 1;",
      "}",
      "[data-mobile-input][readonly] {",
      "  color: var(--dsw-alias-label-tertiary);",
      "  cursor: not-allowed;",
      "}",
      "/* Escape hatch in the composer tool row (narrow viewports only): one tap",
      "   returns the stock input box when the native one misbehaves on a device",
      "   we cannot test on. */",
      "[data-mobile-input-toggle] {",
      "  display: inline-flex;",
      "  align-items: center;",
      "  gap: 4px;",
      "  height: 24px;",
      "  padding: 0 8px;",
      "  border: 1px solid var(--dsw-alias-border-l2);",
      "  border-radius: 999px;",
      "  background: transparent;",
      "  color: var(--dsw-alias-label-secondary);",
      "  font-size: 11px;",
      "  line-height: 1;",
      "  white-space: nowrap;",
      "}",
      "[data-mobile-input-toggle][data-state='on'] {",
      "  border-color: var(--dsw-alias-state-business-primary);",
      "  color: var(--dsw-alias-state-business-primary);",
      "}",
      "/* Debug panel (?dsh-mobile-input=debug): the only way to read a phone's",
      "   input events without a console. */",
      "[data-mobile-input-debug] {",
      "  position: fixed;",
      "  top: 0;",
      "  left: 0;",
      "  right: 0;",
      "  z-index: 2147483000;",
      "  max-height: 40vh;",
      "  overflow: auto;",
      "  margin: 0;",
      "  padding: 6px 8px;",
      "  font: 11px/1.4 ui-monospace, monospace;",
      "  white-space: pre-wrap;",
      "  color: #0f0;",
      "  background: rgba(0, 0, 0, 0.82);",
      "  pointer-events: none;",
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
      }, createNativeInput(ctx)));

      /* Escape hatch: a compact toggle in the composer tool row (narrow
         viewports only) that returns the stock input box for one device
         without touching a console. */
      slots.inject("conversation.input.left", () => slots.register({
        name: "conversation.input.left",
        id: "native-input-toggle",
        order: 60,
      }, createNativeInputToggle()));
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

       ArkWeb lesson (HarmonyOS 7, 2026-09-11): mirroring on EVERY keystroke
       made the on-screen keyboard close after each character. Each mirror
       republished the machine draft, which re-rendered the composer card and
       made Lexical rewrite the (hidden) stock editor's DOM; a strict engine
       drops the IME when the editing surface churns under its feet. So the
       field now owns its text while the user types: the machine is updated at
       COMMIT POINTS only (Enter, blur, any toolbar tap, page hide, unmount,
       and immediately when a `/` or `@` trigger character is typed, because
       the trigger menu needs the machine). The field grows itself (autosize +
       a min-height floor on the stock row's box) instead of relying on the
       machine mirror to size the card, and the stock editor is forced out of
       the editable set (contenteditable=false + inert) so the IME can only
       ever target the textarea.

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

    /** Raised on the window when the persisted preference changes. */
    var PREFERENCE_EVENT = "dsh-mobile-flow:preference";

    /** Persist the takeover preference; every mounted part re-reads it. */
    function writePreference(value) {
      try {
        if (value === null) window.localStorage.removeItem(OVERRIDE_KEY);
        else window.localStorage.setItem(OVERRIDE_KEY, value);
      } catch (error) { /* storage unavailable: the in-memory event still applies */ }
      try {
        window.dispatchEvent(new window.Event(PREFERENCE_EVENT));
      } catch (error) { /* no Event constructor: the next mount re-reads anyway */ }
    }

    /** Whether the debug panel is requested (URL `?dsh-mobile-input=debug`). */
    function debugRequested() {
      try {
        return new window.URLSearchParams(window.location.search).get("dsh-mobile-input") === "debug";
      } catch (error) {
        return false;
      }
    }

    /** Whether the takeover should own the surface on this viewport. */
    function takeoverLive(media) {
      var override = readOverride();
      if (override === "on" || override === "force") return true;
      if (override === "off") return false;
      return media !== null && media.matches === true;
    }

    /** Narrow viewport only (no preference): the toggle's own visibility gate. */
    function useNarrowViewport() {
      var media = React.useMemo(function () {
        try {
          return window.matchMedia(NARROW_QUERY);
        } catch (error) {
          return null;
        }
      }, []);
      var state = React.useState(function () { return media !== null && media.matches === true; });
      var narrow = state[0];
      var setNarrow = state[1];
      React.useEffect(function () {
        if (media === null) return undefined;
        var update = function () { setNarrow(media.matches === true); };
        update();
        if (typeof media.addEventListener === "function") media.addEventListener("change", update);
        else if (typeof media.addListener === "function") media.addListener(update);
        return function () {
          if (typeof media.removeEventListener === "function") media.removeEventListener("change", update);
          else if (typeof media.removeListener === "function") media.removeListener(update);
        };
      }, [media]);
      return narrow;
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
        var onStorage = function () { update(); };
        window.addEventListener(PREFERENCE_EVENT, onStorage);
        window.addEventListener("storage", onStorage);
        return function () {
          if (typeof media.removeEventListener === "function") media.removeEventListener("change", update);
          else if (typeof media.removeListener === "function") media.removeListener(update);
          window.removeEventListener(PREFERENCE_EVENT, onStorage);
          window.removeEventListener("storage", onStorage);
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
      try {
        /* ctx.get, never ctx.sessions: a Cordis context throws on an
           undeclared service property, and this plugin only injects `slots`. */
        var sessions = typeof ctx.get === "function" ? ctx.get("sessions") : undefined;
        if (sessions === undefined || sessions === null || typeof sessions.scope !== "function") return undefined;
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

    /**
     * Bind the takeover component to the client context. The component runs in
     * the browser plugin's fiber, so the session input face is resolved through
     * the context captured here (a module-level component has no `ctx`).
     * @param ctx - the client root context that applied this plugin.
     * @returns the slot entry component.
     */
    function createNativeInput(ctx) {
      return function NativeInput(props) {
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
      /* The last value this component itself pushed into the machine: an
         incoming draft equal to it is our own echo, never an external write. */
      var pushedRef = React.useRef(null);
      /* Latest field value not yet mirrored into the machine (see the section
         comment: the mirror is deferred to commit points). */
      var pendingRef = React.useRef(null);
      /* Whether the takeover currently owns the surface (read by handlers that
         outlive a render). */
      var activeRef = React.useRef(false);
      /* The stock editor's own editability, captured before the takeover forces
         contenteditable="false" (the field mirrors THIS, not our own override). */
      var stockEditableRef = React.useRef(true);
      /* Last geometry applied: style writes are skipped when nothing moved, so
         a strict engine's IME is not disturbed by pointless relayouts. */
      var geometryRef = React.useRef("");
      var debugRef = React.useRef(null);

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

      var debug = function (line) {
        var area = debugRef.current;
        if (area === null || area === undefined) return;
        area.textContent = (line + "\n" + area.textContent).split("\n").slice(0, 9).join("\n");
      };

      /** Publish the stock scrollport's box onto our seat (idempotent). */
      var measure = function () {
        var wrap = wrapRef.current;
        if (wrap === null) return;
        var card = cardOf();
        var scroll = card === null ? null : card.querySelector("[data-input-scroll]");
        if (card === null || scroll === null) return;
        var cardRect = card.getBoundingClientRect();
        var scrollRect = scroll.getBoundingClientRect();
        /* Whole pixels: sub-pixel jitter would otherwise re-write styles (and
           invalidate layout) on every measurement. */
        var left = Math.round(scrollRect.left - cardRect.left - card.clientLeft);
        var top = Math.round(scrollRect.top - cardRect.top - card.clientTop);
        var width = Math.round(scroll.clientWidth);
        var height = Math.round(scroll.clientHeight);
        var next = [left, top, width, height].join(":");
        if (next === geometryRef.current) return;
        geometryRef.current = next;
        /* While the user is typing, only size changes are applied: moving the
           seat would shift layout under the focused field, and strict engines
           answer that by closing the keyboard. */
        var typing = document.activeElement === areaRef.current;
        if (!typing) {
          wrap.style.left = left + "px";
          wrap.style.top = top + "px";
        }
        wrap.style.width = width + "px";
        wrap.style.height = height + "px";
        if (!typing && scroll.scrollTop !== 0) scroll.scrollTop = 0;
        debug("measure " + next + (typing ? " (typing)" : ""));
      };

      /** Grow the field to its own content and keep the card tall enough. */
      var autosize = function () {
        var area = areaRef.current;
        if (area === null) return;
        var card = cardOf();
        var scroll = card === null ? null : card.querySelector("[data-input-scroll]");
        var grow = scroll === null ? null : scroll.firstElementChild;
        var cap = 0;
        if (scroll !== null) {
          var raw = window.getComputedStyle(scroll).maxHeight;
          var parsed = parseFloat(raw);
          if (isFinite(parsed) && parsed > 0) cap = parsed;
        }
        /* The product's own floor for this surface (36px docked, 52px in the
           blank-session hero) — read it off the stock editor rather than
           guessing. */
        var floor = 36;
        var stock = scroll === null ? null : card.querySelector("[data-composer-input]");
        if (stock !== null) {
          var rawFloor = parseFloat(window.getComputedStyle(stock).minHeight);
          if (isFinite(rawFloor) && rawFloor > 0) floor = rawFloor;
        }
        var previous = area.style.height;
        area.style.height = "0px";
        var needed = area.scrollHeight;
        area.style.height = previous;
        if (needed < floor) needed = floor;
        if (cap > 0 && needed > cap) needed = cap;
        var box = Math.round(needed) + "px";
        if (area.style.height !== box) area.style.height = box;
        /* Floor on the stock row's box: the absolutely positioned seat cannot
           make the card grow by itself. */
        if (grow !== null && grow.style.minHeight !== box) grow.style.minHeight = box;
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
        var editable = activeRef.current
          ? stockEditableRef.current
          : editor.getAttribute("contenteditable") !== "false";
        /* Keep the stock editor out of the browser's editable set for as long
           as the takeover owns the surface (React re-applies its own value only
           when the prop changes, so ours sticks until then). */
        if (activeRef.current && editor.getAttribute("contenteditable") !== "false") {
          editor.setAttribute("contenteditable", "false");
          debug("re-forced contenteditable=false");
        }
        if (area.readOnly === editable) area.readOnly = !editable;
      };

      /* Mark the card while the takeover owns the surface (the CSS that hides
         the stock draft surface keys off this attribute), take the stock editor
         out of the focus/IME tree, and keep our empty seat out of hit-testing
         when the stock editor owns the surface (claims). */
      React.useLayoutEffect(function () {
        var card = cardOf();
        if (card === null) return undefined;
        var wrap = wrapRef.current;
        var editor = card.querySelector("[data-composer-input]");
        var restore = null;
        activeRef.current = active;
        if (active) {
          card.setAttribute("data-mobile-input-active", "");
          if (wrap !== null) wrap.style.display = "";
          if (editor !== null) {
            /* On Chromium-class engines an inert editable is out of both the
               focus tree and the IME's editable candidates: nothing but the
               textarea can own the input connection. */
            var hadInert = editor.hasAttribute("inert");
            var hadAria = editor.getAttribute("aria-hidden");
            var hadEditable = editor.getAttribute("contenteditable");
            stockEditableRef.current = hadEditable !== "false";
            if (typeof editor.inert === "boolean") editor.inert = true;
            else editor.setAttribute("inert", "");
            editor.setAttribute("aria-hidden", "true");
            editor.setAttribute("contenteditable", "false");
            restore = function () {
              if (!hadInert) {
                if (typeof editor.inert === "boolean") editor.inert = false;
                editor.removeAttribute("inert");
              }
              if (hadAria === null) editor.removeAttribute("aria-hidden");
              else editor.setAttribute("aria-hidden", hadAria);
              if (hadEditable === null) editor.removeAttribute("contenteditable");
              else editor.setAttribute("contenteditable", hadEditable);
            };
          }
        } else {
          card.removeAttribute("data-mobile-input-active");
          if (wrap !== null) wrap.style.display = "none";
          debugRef.current = null;
        }
        return function () {
          card.removeAttribute("data-mobile-input-active");
          var grow = card.querySelector("[data-input-scroll]");
          if (grow !== null && grow.firstElementChild !== null) grow.firstElementChild.style.minHeight = "";
          if (restore !== null) restore();
        };
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
        autosize();
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
          var next = face === undefined ? draftRef.current : face.state.getSnapshot().draft;
          var focused = document.activeElement === area;
          /* While the field has focus IT is the source of truth: a write here
             (mid-composition on engines whose composition events differ, or
             between two fast keystrokes) resets an IME session — the classic
             "keyboard up, one character in, nothing after" failure. The one
             exception is a clear, which is a committed send, never local
             typing. */
          if (composingRef.current && next !== "") return;
          /* Text the user typed but has not committed yet outranks anything the
             machine publishes meanwhile. */
          if (pendingRef.current !== null && next !== "") {
            debug("keep " + pendingRef.current.length + " uncommitted chars");
            return;
          }
          if (focused && next !== "" && next !== pushedRef.current) {
            debug("skip external write while focused: " + next.length + " chars");
            return;
          }
          if (area.value !== next) {
            area.value = next;
            debug("write " + next.length + " chars (focused=" + focused + ")");
            autosize();
          }
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
        if (area === null) return;
        if (composingRef.current && draftRef.current !== "") return;
        if (document.activeElement === area && draftRef.current !== "") return;
        if (area.value !== draftRef.current) area.value = draftRef.current;
      }, [active, face, input]);

      /* Textarea -> machine. Mirrored on every input event: the send button,
         the placeholder and the `/` trigger pipeline all read the machine, so
         a debounce would let the user send a draft the machine never saw. */
      var push = function (value) {
        pushedRef.current = value;
        try {
          if (actions !== undefined && typeof actions.setDraft === "function") {
            actions.setDraft(value);
            return true;
          }
          var face = faceRef.current;
          if (face !== undefined && typeof face.setDraft === "function") {
            face.setDraft(value);
            return true;
          }
        } catch (error) {
          /* A refused machine write must never break typing: the field keeps
             its own text and the next publish re-syncs. */
          debug("push failed: " + String(error && error.message));
        }
        return false;
      };

      /** Defer a field value until the next commit point (per-keystroke DOM
          churn is what drops the IME on strict engines). */
      var queueMirror = function (value, urgent) {
        pendingRef.current = value;
        if (urgent === true) return mirrorNow();
        return false;
      };

      /** Flush the pending field value into the machine, now. */
      var mirrorNow = function () {
        var value = pendingRef.current;
        if (value === null) return false;
        pendingRef.current = null;
        debug("commit " + value.length + " chars");
        return push(value);
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

      /** Trigger characters must reach the machine at once: the `/` and `@`
          menus are driven by the machine's draft, not by the field. */
      var TRIGGER = /[/@]/;

      var onInput = function (event) {
        var value = event.currentTarget.value;
        debug("input " + value.length + " chars (deferred)");
        queueMirror(value, TRIGGER.test(value));
        autosize();
        refreshChrome();
      };
      var onCompositionStart = function () {
        composingRef.current = true;
        debug("compositionstart");
      };
      var onCompositionEnd = function (event) {
        composingRef.current = false;
        debug("compositionend " + event.currentTarget.value.length);
        queueMirror(event.currentTarget.value, false);
        autosize();
      };
      var onBlur = function () {
        debug("blur -> commit");
        mirrorNow();
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
        queueMirror(event.currentTarget.value, false);
        mirrorNow();
        if (sendGesture()) {
          pendingRef.current = null;
          event.preventDefault();
        }
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

      /* Taps anywhere in the stock input region must land on the textarea,
         whatever the engine's hit-testing does with the layers above it: a
         capture listener on the card focuses the field when the tap point is
         inside our box but the target is not the field itself. */
      React.useEffect(function () {
        if (!active) return undefined;
        var card = cardOf();
        if (card === null) return undefined;
        /** The button whose box contains a point (a disabled button is not
            returned by elementFromPoint, so hit it by rect). */
        var buttonAt = function (x, y) {
          var buttons = card.querySelectorAll("button");
          for (var i = 0; i < buttons.length; i += 1) {
            var rect = buttons[i].getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return buttons[i];
          }
          return null;
        };
        var onPointerDown = function (event) {
          var area = areaRef.current;
          var wrap = wrapRef.current;
          if (area === null || wrap === null || event.target === area) return;
          var x = event.clientX;
          var y = event.clientY;
          debug("tap " + Math.round(x) + "," + Math.round(y) + " target=" + (event.target && event.target.tagName));
          var rect = wrap.getBoundingClientRect();
          if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            /* Inside the input box: the field must get the tap, whatever the
               engine did with the layers above it. */
            event.preventDefault();
            try {
              area.focus({ preventScroll: true });
            } catch (error) {
              area.focus();
            }
            return;
          }
          /* Outside the field: a toolbar action whose gate may depend on the
             draft (the send button is disabled while the machine draft is
             empty). Commit first, then replay the tap on a button our commit
             just enabled. */
          var button = buttonAt(x, y);
          var wasDisabled = button !== null && button.disabled === true;
          mirrorNow();
          if (button !== null && wasDisabled && button.disabled === false) {
            event.preventDefault();
            window.setTimeout(function () { button.click(); }, 0);
          }
        };
        /* Engines without a working inert: if anything hands focus back to the
           stock editor, take it straight back to the field. */
        var onFocusIn = function (event) {
          var area = areaRef.current;
          if (area === null || event.target === area) return;
          var editor = card.querySelector("[data-composer-input]");
          if (editor === null || event.target !== editor) return;
          debug("stock editor stole focus -> refocus field");
          try {
            area.focus({ preventScroll: true });
          } catch (error) { /* ignore */ }
        };
        var onHide = function () {
          if (document.visibilityState === "hidden") mirrorNow();
        };
        card.addEventListener("pointerdown", onPointerDown, true);
        document.addEventListener("focusin", onFocusIn, true);
        window.addEventListener("pagehide", onHide);
        document.addEventListener("visibilitychange", onHide);
        return function () {
          card.removeEventListener("pointerdown", onPointerDown, true);
          document.removeEventListener("focusin", onFocusIn, true);
          window.removeEventListener("pagehide", onHide);
          document.removeEventListener("visibilitychange", onHide);
          /* Leaving the surface (phase flip / session switch / unmount) must
             not lose what the user typed. */
          mirrorNow();
        };
      }, [active]);

      /* Debug panel (?dsh-mobile-input=debug): the only read-out available on a
         phone with no console. */
      React.useEffect(function () {
        if (!debugRequested()) return undefined;
        var panel = document.createElement("pre");
        panel.setAttribute("data-mobile-input-debug", "");
        document.body.append(panel);
        debugRef.current = panel;
        debug("debug on; active=" + active + " w=" + window.innerWidth);
        var off = function () {
          debugRef.current = null;
          panel.remove();
        };
        return off;
      }, []);

      /* The seat stays mounted even while the stock editor owns the surface:
         it is how this component finds its card, and it keeps the takeover
         from remounting the subtree on every phase flip. */
      /* A tap on the seat itself (padding area) focuses the field too. */
      var onSeatPointerDown = function (event) {
        var area = areaRef.current;
        if (area === null || event.target === area) return;
        event.preventDefault();
        try {
          area.focus({ preventScroll: true });
        } catch (error) {
          area.focus();
        }
      };

      return h(
        "div",
        { ref: wrapRef, "data-mobile-input-wrap": "", onPointerDown: onSeatPointerDown },
        active
          ? h("textarea", {
            ref: areaRef,
            "data-mobile-input": "",
            rows: 1,
            enterKeyHint: "send",
            autoCapitalize: "sentences",
            onInput: onInput,
            onBlur: onBlur,
            onKeyDown: onKeyDown,
            onPaste: onPaste,
            onCompositionStart: onCompositionStart,
            onCompositionEnd: onCompositionEnd,
          })
          : null,
      );
      };
    }

    /**
     * Escape hatch in the composer tool row (narrow viewports only): one tap
     * swaps the native input back to the stock editor and remembers it, so a
     * device the takeover misbehaves on is never a dead end.
     * @returns the slot entry component.
     */
    function createNativeInputToggle() {
      return function NativeInputToggle() {
        var narrow = useNarrowViewport();
        var state = React.useState(function () { return readOverride(); });
        var preference = state[0];
        var setPreference = state[1];
        React.useEffect(function () {
          var update = function () { setPreference(readOverride()); };
          window.addEventListener(PREFERENCE_EVENT, update);
          window.addEventListener("storage", update);
          return function () {
            window.removeEventListener(PREFERENCE_EVENT, update);
            window.removeEventListener("storage", update);
          };
        }, []);
        if (!narrow) return null;
        var on = preference !== "off";
        var label = on ? "原生输入框：已开启（点击改用官方输入框）" : "原生输入框：已关闭（点击启用）";
        return h(
          "button",
          {
            type: "button",
            "data-mobile-input-toggle": "",
            "data-state": on ? "on" : "off",
            title: label,
            "aria-label": label,
            onMouseDown: function (event) { event.preventDefault(); },
            onClick: function () { writePreference(on ? "off" : "on"); },
          },
          on ? "输入法✓" : "输入法✗",
        );
      };
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
