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
      "/* Send-button honesty (phone report 2026-09-21: text typed, the send",
      "   button stays grey — it reads as \"cannot send\"). The product derives",
      "   that button from the MACHINE draft, and the takeover keeps the machine",
      "   draft deliberately stale while the user types (the ArkWeb fix), so a",
      "   filled field sits next to a disabled, 40%-opacity button. The field's",
      "   own value state is the truth the eye needs, and :placeholder-shown is",
      "   the one PURE-CSS value probe — no DOM write, which is the hard rule",
      "   while a field has focus. The gesture is carried by the commit bridge in",
      "   the card's capture pointerdown, so the look and the tap agree: one tap,",
      "   one send. The submit button is the trailing row's LAST primary control;",
      "   an interruptible child's extra Stop circle renders before it. */",
      "[data-composer-card][data-mobile-input-active]:has([data-mobile-input]:not(:placeholder-shown)) [class*='_trailing'] > [class*='_primary']:last-child:disabled {",
      "  opacity: 1;",
      "  cursor: pointer;",
      "}",
      "/* Pressed feedback for that same button: the product's own :active rules",
      "   only cover the enabled state, and a tap with no visible answer reads as",
      "   a dead control. */",
      "[data-composer-card][data-mobile-input-active]:has([data-mobile-input]:not(:placeholder-shown)) [class*='_trailing'] > [class*='_primary']:last-child:disabled:active {",
      "  opacity: 0.72;",
      "}",
      "/* The running-turn case: while a turn streams, the product puts its Stop",
      "   square on that button (its stale-empty draft tells it the composer holds",
      "   nothing, so interrupting is the only action left). With text in the",
      "   field the tap SENDS — the bridge turns it into the product's own submit",
      "   gesture (queue / steer under a running turn) — so the face has to say",
      "   send. Gated on the machine draft still being EMPTY (the stock editor is",
      "   never empty in that state), so the arrow only ever replaces the Stop",
      "   square and never the product's own send arrow. The glyph is the",
      "   product's own arrow: 16px, currentColor on the blue fill. */",
      "[data-composer-card][data-mobile-input-active]:has([data-composer-input]:empty):has([data-mobile-input]:not(:placeholder-shown)) [class*='_trailing'] > [class*='_primary']:last-child:not(:disabled) > svg {",
      "  display: none;",
      "}",
      "[data-composer-card][data-mobile-input-active]:has([data-composer-input]:empty):has([data-mobile-input]:not(:placeholder-shown)) [class*='_trailing'] > [class*='_primary']:last-child:not(:disabled)::after {",
      "  content: '';",
      "  width: 16px;",
      "  height: 16px;",
      "  background: currentColor;",
      "  -webkit-mask: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M8.3125 0.980183C8.66767 1.0531 8.97902 1.20418 9.2627 1.43233C9.48724 1.61297 9.73029 1.85793 9.97949 2.10714L14.707 6.83468L13.293 8.24874L9 3.95577V15.0417H7V3.95577L2.70703 8.24874L1.29297 6.83468L6.02051 2.10714C6.26971 1.85793 6.51277 1.61297 6.7373 1.43233C6.97662 1.23986 7.28445 1.04402 7.6875 0.980183C7.8973 0.947006 8.1031 0.95516 8.3125 0.980183Z' fill='%23000'/%3E%3C/svg%3E\") center / 16px 16px no-repeat;",
      "  mask: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M8.3125 0.980183C8.66767 1.0531 8.97902 1.20418 9.2627 1.43233C9.48724 1.61297 9.73029 1.85793 9.97949 2.10714L14.707 6.83468L13.293 8.24874L9 3.95577V15.0417H7V3.95577L2.70703 8.24874L1.29297 6.83468L6.02051 2.10714C6.26971 1.85793 6.51277 1.61297 6.7373 1.43233C6.97662 1.23986 7.28445 1.04402 7.6875 0.980183C7.8973 0.947006 8.1031 0.95516 8.3125 0.980183Z' fill='%23000'/%3E%3C/svg%3E\") center / 16px 16px no-repeat;",
      "}",
      "/* Escape hatch in the composer tool row (narrow viewports only): one tap",
      "   returns the stock input box when the native one misbehaves on a device",
      "   we cannot test on. Its neighbour switches the diagnostics surfaces on",
      "   and off (a tokenized URL is rewritten before plugins load, so a phone",
      "   cannot always pass ?dsh-mobile-input=... from the address bar). */",
      "[data-mobile-input-toggle],",
      "[data-mobile-input-copy],",
      "[data-mobile-input-diagnostics] {",
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
      "[data-mobile-input-toggle][data-state='on'],",
      "[data-mobile-input-diagnostics][data-state='on'] {",
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
      "}",
      "[data-mobile-input-debug-body] {",
      "  margin: 0;",
      "  white-space: pre-wrap;",
      "}",
      "[data-mobile-input-debug-button],",
      "[data-mobile-input-bench] button {",
      "  padding: 3px 8px;",
      "  border: 1px solid currentColor;",
      "  border-radius: 999px;",
      "  background: transparent;",
      "  color: inherit;",
      "  font: 11px/1.4 ui-monospace, monospace;",
      "}",
      "/* Device test bench (?dsh-mobile-input=bench): ONE fixed panel anchored to",
      "   the TOP, so the composer at the bottom of the screen stays visible and",
      "   the field under test is the REAL one. The log lives inside that panel and",
      "   is painted only when no field has focus (the diary defers it), so a log",
      "   repaint cannot reflow anything under a live IME. */",
      "[data-mobile-input-bench] {",
      "  position: fixed;",
      "  top: 0;",
      "  left: 0;",
      "  right: 0;",
      "  z-index: 2147483000;",
      "  max-height: 42vh;",
      "  overflow: auto;",
      "  padding: 6px 8px;",
      "  font: 12px/1.4 ui-monospace, monospace;",
      "  color: var(--dsw-alias-label-primary, #111);",
      "  background: var(--dsw-alias-bg-base, #fff);",
      "  border-bottom: 1px solid var(--dsw-alias-border-l2, #ccc);",
      "}",
      "[data-mobile-input-log] {",
      "  max-height: 22vh;",
      "  overflow: auto;",
      "  margin: 6px 0 0;",
      "  padding: 6px 8px;",
      "  white-space: pre-wrap;",
      "  color: #0f0;",
      "  background: rgba(0, 0, 0, 0.86);",
      "  border-radius: 6px;",
      "}",
      "[data-mobile-input-bench] label {",
      "  display: block;",
      "  margin-top: 6px;",
      "  font-size: 11px;",
      "  opacity: 0.75;",
      "}",
      "[data-mobile-input-bench-field] {",
      "  display: block;",
      "  box-sizing: border-box;",
      "  width: 100%;",
      "  height: 36px;",
      "  margin: 0;",
      "  padding: 6px 8px;",
      "  border: 1px solid var(--dsw-alias-border-l2, #ccc);",
      "  border-radius: 6px;",
      "  background: var(--dsw-alias-bg-base, #fff);",
      "  color: var(--dsw-alias-label-primary, #111);",
      "  font-family: inherit;",
      "  font-size: 13px;",
      "  line-height: 20px;",
      "  resize: none;",
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

      /* Diagnostics are opt-in per page load (they cost a ring buffer and a
         couple of listeners, and nothing else). Both instrument the real
         composer field, so a device report can always be read against the
         production code path. */
      var diagnostics = debugRequested() || benchRequested() ? createDiary() : null;
      if (diagnostics !== null) {
        try {
          diagnostics.add("start ua=" + String(navigator.userAgent).slice(0, 96));
          diagnostics.add("h=" + window.innerHeight
            + " growth=" + readGrowthMode()
            + " input=" + String(readOverride())
            + " narrow=" + String(window.matchMedia !== undefined && window.matchMedia(NARROW_QUERY).matches));
          ctx.effect(function () {
            return watchKeyboard(diagnostics);
          });
          if (benchRequested()) {
            /* Guarded: diagnostics are a debugging aid, and a broken aid must
               never take the takeover (or the plugin) down with it. */
            ctx.effect(function () {
              try {
                return installBench(diagnostics);
              } catch (error) {
                diagnostics.add("bench failed: " + String(error && error.message), true);
                return function () {};
              }
            });
          }
        } catch (error) { /* diagnostics are optional; the takeover is not */ }
      }

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
      }, createNativeInput(ctx, diagnostics)));

      /* Escape hatch: a compact toggle in the composer tool row (narrow
         viewports only) that returns the stock input box for one device
         without touching a console. */
      slots.inject("conversation.input.left", () => slots.register({
        name: "conversation.input.left",
        id: "native-input-toggle",
        order: 60,
      }, createNativeInputToggle(diagnostics)));
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

       ArkWeb lesson #1 (HarmonyOS 7, 2026-09-11): mirroring on EVERY keystroke
       made the on-screen keyboard close after each character. Each mirror
       republished the machine draft, which re-rendered the composer card and
       made Lexical rewrite the (hidden) stock editor's DOM; a strict engine
       drops the IME when the editing surface churns under its feet. So the
       field now owns its text while the user types: the machine is updated at
       COMMIT POINTS only (Enter, blur, any toolbar tap, page hide, unmount,
       and immediately when a `/` or `@` trigger character is typed, because
       the trigger menu needs the machine).

       ArkWeb lesson #2 (2026-09-14): pulling the mirror off the typing path
       was not enough — the keyboard still closed after each character. The
       remaining per-keystroke work was the field's own geometry: `autosize`
       probed `style.height = 0px` (read scrollHeight, write the height back)
       and the seat re-aligned itself whenever the card's box moved, so the
       focused editable collapsed to zero height and changed size on every key.
       The rule is therefore absolute: WHILE THE FIELD HAS FOCUS THE PLUGIN
       PERFORMS ZERO DOM WRITES. Resizing, re-alignment and chrome syncing (a
       placeholder or read-only flip) all happen at commit points, when focus
       has already left — the field keeps one fixed height (the product's own
       floor, 36px docked / 52px hero) and scrolls internally while typing.

       Why: the stock composer's text surface is a Lexical contenteditable.
       Android IMEs — voice keyboards above all — drive composition through
       Chrome's InputConnection -> beforeinput("insertCompositionText")
       recomposition flow. A framework editor answers those events by
       reconciling the DOM from its own state, so the composing text (and on
       recomposition already-committed text) gets wiped. A native <textarea>
       is edited by the platform itself and never enters that fight — which is
       why the same IME behaves in ordinary textarea comment boxes.

       What: while the machine is plain, the draft surface becomes a native
       textarea laid over the stock scrollport. Keystrokes are mirrored into
       the official input machine through the public session input face at
       commit points, so the send button, slash adjudication, attachments,
       busy-Enter policy and draft persistence all keep working unchanged. The
       Lexical editor keeps its layout box (hidden, never removed) because that
       box is what sizes the card for the mirrored draft.

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

    /** Requested diagnostics surfaces, from `?dsh-mobile-input=debug[,bench]`. */
    function requestedModes() {
      try {
        var raw = new window.URLSearchParams(window.location.search).get("dsh-mobile-input");
        return raw === null ? [] : raw.split(",");
      } catch (error) {
        return [];
      }
    }

    /**
     * Which diagnostics surface this page load should install.
     *
     * The URL comes first, but it is NOT reliable on the real shell: a load
     * with `?token=` is rewritten (the shell consumes the token and replaces
     * the whole query) before plugins apply, so a phone that bookmarks a
     * tokenized URL can never pass a parameter. The tool-row chip therefore
     * persists the request in localStorage, which survives that rewrite.
     */
    var DIAGNOSTICS_KEY = "dsh-mobile-flow:diagnostics";

    function diagnosticsModes() {
      var requested = requestedModes();
      if (requested.length !== 0) return requested;
      try {
        var stored = window.localStorage.getItem(DIAGNOSTICS_KEY);
        if (stored === "bench") return ["bench"];
        if (stored === "debug") return ["debug"];
        if (stored === "both") return ["debug", "bench"];
      } catch (error) { /* storage unavailable: no persisted diagnostics */ }
      return [];
    }

    /** Persist the diagnostics request: "bench" | "debug" | "both" | "off". */
    function writeDiagnostics(mode) {
      try {
        if (mode === "off") window.localStorage.removeItem(DIAGNOSTICS_KEY);
        else window.localStorage.setItem(DIAGNOSTICS_KEY, mode);
      } catch (error) { /* storage unavailable: the reload cannot honour it */ }
    }

    /** Whether the debug panel is requested (`?dsh-mobile-input=debug`). */
    function debugRequested() {
      return diagnosticsModes().indexOf("debug") !== -1;
    }

    /** Whether the on-device test bench is requested (`?dsh-mobile-input=bench`). */
    function benchRequested() {
      return diagnosticsModes().indexOf("bench") !== -1;
    }

    /**
     * How tall the takeover field may become, and WHEN it may change size.
     *
     * `commit` (default) — the field only resizes while it does NOT have focus:
     * the strict-engine-safe path (see the section comment).
     * `live` — resize on every input event, i.e. the pre-0.6 behaviour, kept as
     * the A/B control for a device that still misbehaves.
     * `none` — never resize: the field keeps the product's own floor height.
     */
    var GROWTH_KEY = "dsh-mobile-flow:growth";
    var GROWTH_EVENT = "dsh-mobile-flow:growth-change";
    var GROWTH_MODES = ["commit", "live", "none"];

    function readGrowthMode() {
      try {
        var stored = window.localStorage.getItem(GROWTH_KEY);
        if (GROWTH_MODES.indexOf(stored) !== -1) return stored;
      } catch (error) { /* storage unavailable: fall through to the query */ }
      try {
        var param = new window.URLSearchParams(window.location.search).get("dsh-mobile-growth");
        if (GROWTH_MODES.indexOf(param) !== -1) return param;
      } catch (error) { /* no URLSearchParams: the default decides */ }
      return "commit";
    }

    function writeGrowthMode(value) {
      try { window.localStorage.setItem(GROWTH_KEY, value); } catch (error) { /* ignore */ }
      try { window.dispatchEvent(new window.Event(GROWTH_EVENT)); } catch (error) { /* ignore */ }
    }

    /**
     * How the `/` and `@` trigger characters reach the machine.
     *
     * `changes` (default) — mirror when a trigger character is ADDED or REMOVED,
     * so the command menu opens (and closes) at the trigger, but the characters
     * typed after it stay in the field. This matters more than it looks: a
     * per-keystroke mirror republishes the machine draft, which re-renders the
     * composer card, rewrites the hidden Lexical editor's DOM and re-renders the
     * command menu — every keystroke. On ArkWeb (HarmonyOS 7, measured
     * 2026-09-14) that is exactly the "keyboard closes after each character"
     * report, and it only shows up in slash-prefixed drafts, because any text
     * containing `/` used to be mirrored on every keystroke.
     * `resync` (default, 2026-09-14) — the mirror itself is what makes ArkWeb
     * drop the keyboard: republishing the draft makes the app rewrite the
     * (hidden, inert) stock editor's DOM asynchronously, i.e. NOT inside the
     * keystroke's gesture, and the engine answers that by closing the IME. The
     * stock path never does that (its own editing IS the draft change), which is
     * why typing `/` in the stock editor keeps the keyboard (measured on the
     * device). So: drop focus, land the write, take focus back — all inside the
     * same task as the keystroke, so the churn lands with no IME attached and
     * the re-focus is still part of a user gesture.
     * `changes` — v0.6.1 behaviour (plain in-task mirror), kept as the control.
     * `live` — the pre-0.6 behaviour (mirror every keystroke).
     * `off` — never mirror a trigger mid-typing (commit points only).
     */
    var TRIGGER_KEY = "dsh-mobile-flow:trigger";
    var TRIGGER_EVENT = "dsh-mobile-flow:trigger-change";
    var TRIGGER_MODES = ["resync", "changes", "live", "off"];

    function readTriggerMode() {
      try {
        var stored = window.localStorage.getItem(TRIGGER_KEY);
        if (TRIGGER_MODES.indexOf(stored) !== -1) return stored;
      } catch (error) { /* storage unavailable: fall through to the query */ }
      try {
        var param = new window.URLSearchParams(window.location.search).get("dsh-mobile-trigger");
        if (TRIGGER_MODES.indexOf(param) !== -1) return param;
      } catch (error) { /* no URLSearchParams: the default decides */ }
      return "resync";
    }

    function writeTriggerMode(value) {
      try { window.localStorage.setItem(TRIGGER_KEY, value); } catch (error) { /* ignore */ }
      try { window.dispatchEvent(new window.Event(TRIGGER_EVENT)); } catch (error) { /* ignore */ }
    }

    /**
     * Whether the diagnostics CONTROLS are un-hidden in the tool row. They are
     * hidden by default (the everyday composer keeps one chip: the escape
     * hatch); a long press on that chip calls them out, and the choice sticks
     * so a device that needed them keeps them without hunting for the gesture.
     */
    var REVEAL_KEY = "dsh-mobile-flow:reveal";
    var REVEAL_EVENT = "dsh-mobile-flow:reveal-change";

    function readReveal() {
      try {
        return window.localStorage.getItem(REVEAL_KEY) === "1";
      } catch (error) {
        return false;
      }
    }

    function writeReveal(value) {
      try {
        if (value === true) window.localStorage.setItem(REVEAL_KEY, "1");
        else window.localStorage.removeItem(REVEAL_KEY);
      } catch (error) { /* storage unavailable: the event below still applies */ }
      try { window.dispatchEvent(new window.Event(REVEAL_EVENT)); } catch (error) { /* ignore */ }
    }

    /** Whether the focused element is a text field (the diary's hold rule). */
    function typingSomewhere() {
      var el = document.activeElement;
      if (el === null || el === undefined) return false;
      if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return true;
      return el.isContentEditable === true;
    }

    /**
     * Page-local diagnostics. A phone has no console and Chromium cannot
     * reproduce ArkWeb's IME, so the plugin keeps its own event ring buffer and
     * paints it into panels ON DEMAND — never on the typing path: a panel write
     * is DOM churn itself, and an instrument that perturbs what it measures is
     * worse than no instrument (2026-09-14 lesson: the first debug panel wrote
     * on every event and could have caused the very keyboard drop it reported).
     *
     * Lines carry a millisecond offset from the first line so a keyboard
     * transition can be read against the events that preceded it.
     */
    function createDiary() {
      var lines = [];
      var panels = [];
      var base = 0;
      var paint = function (force) {
        if (panels.length === 0) return;
        /* While a field has focus the paint is deferred: the caller either
           forces it (a keyboard transition, a blur) or the next line paints. */
        if (force !== true && typingSomewhere()) return;
        var tail = lines.slice(-14).join("\n");
        for (var i = 0; i < panels.length; i += 1) panels[i].textContent = tail;
      };
      return {
        add: function (line, force) {
          if (base === 0) base = Date.now();
          lines.push("+" + (Date.now() - base) + "ms " + line);
          if (lines.length > 400) lines.shift();
          paint(force === true);
        },
        paint: function (force) { paint(force === true); },
        text: function () { return lines.join("\n"); },
        watch: function (el) { panels.push(el); paint(true); },
        unwatch: function (el) {
          panels = panels.filter(function (panel) { return panel !== el; });
        },
      };
    }

    /**
     * Keyboard visibility, as a timestamped fact. ArkWeb reports the on-screen
     * keyboard through a window/viewport height change, so every transition is
     * recorded next to the input events — that is what turns "the keyboard
     * closed after one character" into something readable without a console.
     */
    function watchKeyboard(diary) {
      var last = window.innerHeight;
      var onResize = function () {
        var height = window.innerHeight;
        if (height === last) return;
        var viewport = window.visualViewport;
        var visual = viewport !== undefined && viewport !== null
          ? Math.round(viewport.height)
          : null;
        diary.add("KEYBOARD " + last + "->" + height + "px"
          + (visual === null ? "" : " vv=" + visual), true);
        last = height;
      };
      window.addEventListener("resize", onResize);
      var viewport = window.visualViewport;
      if (viewport !== undefined && viewport !== null && typeof viewport.addEventListener === "function") {
        viewport.addEventListener("resize", onResize);
      }
      return function () {
        window.removeEventListener("resize", onResize);
        if (viewport !== undefined && viewport !== null && typeof viewport.removeEventListener === "function") {
          viewport.removeEventListener("resize", onResize);
        }
      };
    }

    /** Put the diary on the clipboard (a phone cannot attach a log file). */
    function copyDiary(diary, button) {
      var text = diary.text();
      var done = function (ok) {
        button.textContent = ok ? "已复制" : "复制失败";
        window.setTimeout(function () { button.textContent = "复制日志"; }, 2500);
      };
      try {
        var clipboard = navigator.clipboard;
        if (clipboard !== undefined && clipboard !== null && typeof clipboard.writeText === "function") {
          clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
          return;
        }
      } catch (error) { /* fall through to the legacy path */ }
      try {
        var scratch = document.createElement("textarea");
        scratch.value = text;
        scratch.style.cssText = "position:fixed;top:-1000px;left:0";
        document.body.append(scratch);
        scratch.select();
        var ok = typeof document.execCommand === "function" && document.execCommand("copy");
        scratch.remove();
        done(ok === true);
      } catch (error) {
        done(false);
      }
    }

    /**
     * Whether the product's composer on this card is a LIVE TEXT INPUT.
     *
     * The resident composer card is reused for states that are not inputs at
     * all: a blank-session hero whose workspace is not resolved yet renders the
     * same surface as a workspace-PICKER trigger (tapping it opens the picker,
     * `editor={null}`, `contenteditable="false"`), and a blocked/removed/offline
     * session renders it disabled. The takeover must not own those surfaces: a
     * read-only field that swallows the card's own tap is worse than no
     * takeover — the user cannot type AND cannot open the picker.
     *
     * Two product-owned attributes carry that fact and the takeover never
     * writes either (see the "no workspace yet" note on the editability refs):
     *   - `aria-haspopup="menu"` — the workspace-picker trigger state
     *   - `aria-disabled="true"` — the locked states (blocked composer, removed
     *     session, offline parent)
     * `contenteditable` is deliberately NOT consulted here: the takeover forces
     * it to "false" while it owns the surface, so reading it once at mount and
     * latching the answer is what left a phone with a permanently read-only
     * field (v0.7.2 phone report: "new session, tapping the input box does
     * nothing").
     *
     * @param card - the resident composer card, or null.
     * @returns true when the card currently hosts a real text input.
     */
    function composerIsTextInput(card) {
      if (card === null || typeof card.querySelector !== "function") return false;
      var editor = card.querySelector("[data-composer-input]");
      if (editor === null) return false;
      if (editor.getAttribute("aria-haspopup") === "menu") return false;
      if (editor.getAttribute("aria-disabled") === "true") return false;
      return true;
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
     * @param diary - the diagnostics ring buffer, or null when no diagnostics
     *   surface was requested for this page load.
     * @returns the slot entry component.
     */
    function createNativeInput(ctx, diary) {
      return function NativeInput(props) {
      var live = useTakeoverViewport();
      var useInput = props.useInput;
      var input = typeof useInput === "function" ? useInput(function (s) { return s; }) : undefined;
      var sessionId = props.sessionId;
      var actions = props.inputActions;
      var phase = input === undefined ? "plain" : input.phase;
      /* Whether the product's composer is a real text input right now. Tracked
         live (see the mount effect below), never latched: a new session is
         routinely created before its workspace resolves, and that hero composer
         is a workspace-picker trigger, not an input. */
      var readyPair = React.useState(false);
      var composerReady = readyPair[0];
      var setComposerReady = readyPair[1];
      /* Ownership is surface-level only: claims fall back to the stock editor
         (see the section comment). */
      var active = live && composerReady && phase === "plain" && sessionId !== undefined;

      var wrapRef = React.useRef(null);
      var areaRef = React.useRef(null);
      var composingRef = React.useRef(false);
      /* Trigger characters present when the current IME composition started. */
      var compositionTriggersRef = React.useRef(0);
      /* True while the takeover itself is dropping/re-taking focus (see
         `resync`): the blur in between is plumbing, not a commit point. */
      var resyncingRef = React.useRef(false);
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
      /* The product's editability intent for the composer, kept across takeover
         releases. The field mirrors THIS, never our own override: the takeover
         forces contenteditable="false" while it owns the surface, so the
         attribute cannot be read back as the product's answer. `forcedRef` marks
         a "false" that is ours. (A latched read-only field used to survive the
         composer becoming editable again — one phone report: a new session whose
         workspace was not resolved yet left the input dead until the next
         session switch.) */
      var appEditableRef = React.useRef(true);
      /* True while the "false" standing on the product's editor is OUR force. */
      var forcedRef = React.useRef(false);
      /* Last geometry applied: style writes are skipped when nothing moved, so
         a strict engine's IME is not disturbed by pointless relayouts. */
      var geometryRef = React.useRef("");

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

      /* Is the product's composer a text input right now? Re-answered on every
         product-side change of the two attributes that decide it, whether the
         takeover is active or not — that is what lets the surface be handed
         back when a new session opens without a resolved workspace, and taken
         over again the moment the composer becomes an input. */
      React.useEffect(function () {
        var card = cardOf();
        var update = function () {
          var next = composerIsTextInput(cardOf());
          setComposerReady(function (previous) {
            if (previous !== next) {
              debug("composer " + (next ? "is a text input -> takeover may own it"
                : "is NOT a text input (picker/locked) -> stock surface stays"));
            }
            return next;
          });
        };
        update();
        if (card === null || typeof window.MutationObserver !== "function") return undefined;
        var observer = new window.MutationObserver(update);
        observer.observe(card, {
          attributes: true,
          attributeFilter: ["aria-haspopup", "aria-disabled"],
          subtree: true,
        });
        return function () { observer.disconnect(); };
      }, []);

      /* The one invariant this whole file is built around (see the section
         comment): while the field has focus the plugin writes NOTHING to the
         DOM. Every measurement, resize and chrome sync below starts with this
         guard, so no reachable path — input event, ResizeObserver, rAF pass,
         MutationObserver — can churn the DOM under a live IME. */
      var hasFocus = function () {
        return document.activeElement === areaRef.current;
      };

      /** Growth policy for this mount (re-read on every preference change). */
      var growthRef = React.useRef(readGrowthMode());
      /** Trigger-sync policy for this mount (see readTriggerMode). */
      var triggerRef = React.useRef(readTriggerMode());
      /** Last value seen by onInput: the trigger delta is what decides a mirror. */
      var lastValueRef = React.useRef("");
      React.useEffect(function () {
        var update = function () {
          growthRef.current = readGrowthMode();
          triggerRef.current = readTriggerMode();
        };
        window.addEventListener(GROWTH_EVENT, update);
        window.addEventListener(TRIGGER_EVENT, update);
        window.addEventListener("storage", update);
        return function () {
          window.removeEventListener(GROWTH_EVENT, update);
          window.removeEventListener(TRIGGER_EVENT, update);
          window.removeEventListener("storage", update);
        };
      }, []);

      /** Diagnostics, prefixed so a log mixing bench variants with the real
          composer field stays readable. */
      var debug = function (line, force) {
        if (diary === null) return;
        diary.add("composer " + line, force === true);
      };

      /** Publish the stock scrollport's box onto our seat (idempotent).
          Refuses to run while the field has focus: moving or resizing the
          focused editable is what closes the keyboard on ArkWeb. */
      var measure = function (force) {
        var wrap = wrapRef.current;
        if (wrap === null) return;
        if (hasFocus() && force !== true) return;
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
        wrap.style.left = left + "px";
        wrap.style.top = top + "px";
        wrap.style.width = width + "px";
        wrap.style.height = height + "px";
        if (scroll.scrollTop !== 0) scroll.scrollTop = 0;
        debug("measure " + next);
      };

      /** Grow the field to its own content and keep the card tall enough.
          Runs at commit points only (see the section comment); the measurement
          is non-destructive — the old probe collapsed the field to
          `height: 0px` and back, which on ArkWeb is indistinguishable from the
          editable disappearing. */
      var autosize = function (force) {
        var area = areaRef.current;
        if (area === null) return;
        if (hasFocus() && force !== true && growthRef.current !== "live") return;
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
        area.style.height = "auto";
        var needed = area.scrollHeight;
        area.style.height = previous;
        if (needed < floor) needed = floor;
        if (cap > 0 && needed > cap) needed = cap;
        /* `none`: the field is pinned to the product's own floor — it never
           grows, but it still shrinks back after a send. */
        if (growthRef.current === "none") needed = floor;
        var box = Math.round(needed) + "px";
        if (area.style.height !== box) area.style.height = box;
        /* Floor on the stock row's box: the absolutely positioned seat cannot
           make the card grow by itself. */
        if (grow !== null && grow.style.minHeight !== box) grow.style.minHeight = box;
      };

      /** Mirror the stock surface's chrome: placeholder text + editability.
          Also deferred while the field has focus (a read-only flip is a DOM
          write like any other). */
      var refreshChrome = function (force) {
        var area = areaRef.current;
        if (area === null) return;
        if (hasFocus() && force !== true) return;
        var card = cardOf();
        var editor = card === null ? null : card.querySelector("[data-composer-input]");
        if (editor === null) return;
        var placeholder = editor.getAttribute("data-placeholder");
        /* A surface that renders no placeholder still gets an invisible one:
           the CSS that keeps the send button honest reads the field's value
           state through :placeholder-shown, which needs the attribute to be
           there at all. */
        if (placeholder === null || placeholder === "") placeholder = " ";
        if (area.placeholder !== placeholder) area.placeholder = placeholder;
        /* The product's own gate (locked / inert / takeover states) rides this
           attribute; mirror it instead of re-deriving the policy. The takeover
           only ever writes "false" AND marks those writes, so an unmarked value
           is the product speaking: "true" means it made its composer editable
           again, which must clear any latched read-only state (see
           `composerIsTextInput`). */
        if (!forcedRef.current && editor.getAttribute("contenteditable") === "false") {
          appEditableRef.current = false;
        } else if (editor.getAttribute("contenteditable") !== "false") {
          if (appEditableRef.current === false) debug("stock editor editable again");
          appEditableRef.current = true;
          forcedRef.current = false;
        }
        var editable = appEditableRef.current;
        /* Keep the stock editor out of the browser's editable set for as long
           as the takeover owns the surface (React re-applies its own value only
           when the prop changes, so ours sticks until then). */
        if (activeRef.current && editor.getAttribute("contenteditable") !== "false") {
          editor.setAttribute("contenteditable", "false");
          forcedRef.current = true;
          debug("re-forced contenteditable=false");
        }
        if (area.readOnly === editable) area.readOnly = !editable;
      };

      /** One settle pass, for the moments focus has already left the field.
          `force` overrides the focus guard for the single case that has to win
          over it: a committed send clearing the draft (the card has just
          shrunk, so a grown field would hang out of it). */
      var settle = function (force) {
        if (hasFocus() && force !== true) return;
        measure(force);
        autosize(force);
        refreshChrome(force);
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
            /* Trust the product's value unless the "false" standing there is
               the one we wrote ourselves. */
            if (!forcedRef.current || hadEditable !== "false") {
              appEditableRef.current = hadEditable !== "false";
            }
            if (typeof editor.inert === "boolean") editor.inert = true;
            else editor.setAttribute("inert", "");
            editor.setAttribute("aria-hidden", "true");
            editor.setAttribute("contenteditable", "false");
            forcedRef.current = true;
            restore = function () {
              if (!hadInert) {
                if (typeof editor.inert === "boolean") editor.inert = false;
                editor.removeAttribute("inert");
              }
              if (hadAria === null) editor.removeAttribute("aria-hidden");
              else editor.setAttribute("aria-hidden", hadAria);
              /* Hand editability back to the product — but only while it still
                 wants an input. When the takeover is released because the
                 product locked the composer (picker trigger / blocked session),
                 our own "false" IS the product's answer and must stand: writing
                 the pre-takeover "true" back would re-enable a surface the
                 product has just disabled (and hand the IME a hidden editable
                 again — the exact bug the inert/aria-hidden pair exists for). */
              if (composerIsTextInput(card)) {
                editor.setAttribute("contenteditable", appEditableRef.current ? "true" : "false");
                forcedRef.current = false;
              }
            };
          }
        } else {
          card.removeAttribute("data-mobile-input-active");
          if (wrap !== null) wrap.style.display = "none";
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
          settle();
        };
        var schedule = function () {
          if (frame !== 0) return;
          frame = window.requestAnimationFrame(run);
        };
        settle();
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
             machine publishes meanwhile — including an EMPTY publish: the
             machine draft is stale by design while typing, so "" is not "the
             user cleared the field", it is just the machine never having heard
             about this text. Only our own flush (which nulls the pending value
             first) may clear the field. */
          if (pendingRef.current !== null) {
            if (next !== "" || area.value !== "") {
              debug("keep " + pendingRef.current.length + " uncommitted chars");
              return;
            }
          }
          /* While uncommitted text is still ours, an external draft must not
             clobber it. Once it is flushed (pending null), the app is the
             authority again — that is how a command picked from the menu lands
             in the field. */
          if (focused && next !== "" && next !== pushedRef.current && pendingRef.current !== null) {
            debug("skip external write while focused: " + next.length + " chars");
            return;
          }
          if (area.value !== next) {
            area.value = next;
            debug("write " + next.length + " chars (focused=" + focused + ")");
            /* A committed send is the one write the plugin performs on a
               FOCUSED field, and it has to resize too: the card has just
               shrunk back to its floor, so a grown field would hang out of
               it. It follows an explicit user action, never typing. */
            if (next === "" && focused) {
              settle(true);
              return;
            }
          }
          settle();
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

      /* Diagnostics only: report APP-side DOM churn while the field has focus.
         This is what separates "our writes" from "the app re-rendered" (the
         command menu, Lexical rewriting the hidden editor) when a device report
         says the keyboard dropped — the two look identical from the outside. */
      React.useEffect(function () {
        if (diary === null || !active) return undefined;
        var card = cardOf();
        if (card === null || typeof window.MutationObserver !== "function") return undefined;
        var observer = new window.MutationObserver(function (records) {
          if (records.length === 0 || !hasFocus()) return;
          var kinds = [];
          for (var i = 0; i < records.length && i < 4; i += 1) {
            var record = records[i];
            kinds.push(record.type + ":"
              + (record.attributeName !== null && record.attributeName !== undefined
                ? record.attributeName
                : record.target.tagName));
          }
          debug("CHURN while focused: " + records.length + " [" + kinds.join(",") + "]");
        });
        observer.observe(card, { attributes: true, childList: true, characterData: true, subtree: true });
        return function () { observer.disconnect(); };
      }, [active]);

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

      /** Mirror a trigger change immediately (the menus read the machine). */
      var chattyMirror = function (value) {
        debug("trigger mirror " + value.length + " chars");
        return queueMirror(value, true);
      };

      /** Flush pending React work now, when react-dom is reachable. */
      var flushNow = function (fn) {
        try {
          var dom = require("react-dom");
          if (dom !== null && dom !== undefined && typeof dom.flushSync === "function") {
            dom.flushSync(fn);
            return;
          }
        } catch (error) { /* no react-dom: the update stays async */ }
        fn();
      };

      /**
       * Trigger mirror for strict engines. The write makes the app rewrite the
       * hidden stock editor's DOM; doing that while the IME is attached is what
       * closes the keyboard (measured 2026-09-14: churn lands ~30ms after the
       * write, the keyboard drops ~100ms later, and typing the same `/` in the
       * stock editor — where the write IS the user's own editing — keeps it).
       * So the whole thing happens while focus is deliberately elsewhere, and
       * focus comes back inside the same gesture.
       */
      var resyncTrigger = function (value) {
        var area = areaRef.current;
        pendingRef.current = value;
        if (area === null || document.activeElement !== area) {
          return mirrorNow();
        }
        resyncingRef.current = true;
        try {
          area.blur();
          flushNow(function () { mirrorNow(); });
        } catch (error) {
          debug("resync failed: " + String(error && error.message));
        } finally {
          resyncingRef.current = false;
        }
        try {
          area.focus({ preventScroll: true });
        } catch (error) {
          try { area.focus(); } catch (again) { /* the field keeps its text anyway */ }
        }
        debug("resync " + value.length + " chars");
        return true;
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

      /** The `/` and `@` menus are driven by the machine's draft, not by the
          field, so a trigger character has to reach the machine — but ONLY the
          trigger character, never every character typed after it (see
          readTriggerMode: a per-keystroke mirror is what drops the keyboard on
          ArkWeb, and any draft containing `/` used to take that path). */
      var countTriggers = function (text) {
        var total = 0;
        for (var i = 0; i < text.length; i += 1) {
          var ch = text.charAt(i);
          if (ch === "/" || ch === "@") total += 1;
        }
        return total;
      };

      /* The typing path. It touches NO DOM: no resize, no re-align, no chrome
         sync, no panel paint — only refs and (for a trigger character) the
         machine write the menus are driven by. Everything else waits for a
         commit point (see the section comment). */
      var onInput = function (event) {
        var value = event.currentTarget.value;
        var previous = lastValueRef.current;
        lastValueRef.current = value;
        var mode = triggerRef.current;
        var triggerChanged = countTriggers(value) !== countTriggers(previous);
        /* Mid-composition the text is provisional: mirroring it would churn the
           card AND reset the IME session on a strict engine, so the composition
           path always defers (compositionend decides, against the count captured
           when the composition started). */
        var composing = composingRef.current === true;
        debug("input " + value.length + " chars"
          + (triggerChanged && !composing ? " (trigger changed)" : " (deferred)"));
        if (!composing && triggerChanged && mode === "resync") {
          resyncTrigger(value);
        } else if (!composing && (mode === "live" || (mode === "changes" && triggerChanged))) {
          /* Urgent: the menu needs the machine draft. Everything else waits for
             a commit point — that is the whole ArkWeb fix. */
          chattyMirror(value);
        } else {
          queueMirror(value, false);
        }
        if (growthRef.current === "live") autosize();
      };
      var onCompositionStart = function () {
        composingRef.current = true;
        compositionTriggersRef.current = countTriggers(areaRef.current === null ? "" : areaRef.current.value);
        debug("compositionstart");
      };
      var onCompositionEnd = function (event) {
        composingRef.current = false;
        var value = event.currentTarget.value;
        /* Compared against the count captured at compositionstart: the per-input
           events during the composition already moved lastValueRef forward. */
        var triggerChanged = countTriggers(value) !== compositionTriggersRef.current;
        lastValueRef.current = value;
        debug("compositionend " + value.length);
        if (triggerChanged && triggerRef.current === "resync") resyncTrigger(value);
        else if (triggerChanged) chattyMirror(value);
        else queueMirror(value, false);
        if (growthRef.current === "live") autosize();
      };
      var onFocus = function () {
        if (resyncingRef.current) return;
        debug("focus");
      };
      /** Commit point: publish the field, then settle the surface (focus is on
          its way out, so the write is safe again). */
      var onBlur = function () {
        if (resyncingRef.current) {
          debug("blur (resync)", true);
          return;
        }
        debug("blur -> commit", true);
        mirrorNow();
        settle();
        /* Some engines report the old activeElement while the blur handler
           runs; the deferred pass covers that, and stays a no-op when focus is
           already back in the field. */
        window.setTimeout(function () { settle(); }, 0);
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
        /** The composer's submit control: the trailing row's LAST primary
            button (an interruptible child's extra Stop circle renders before
            it). It is the one control whose gate AND face read the machine
            draft — exactly the state the takeover keeps stale while typing. */
        var submitAt = function (button) {
          if (button === null || typeof button.className !== "string"
            || button.className.indexOf("_primary") < 0) return false;
          var trailing = typeof button.closest === "function" ? button.closest("[class*='_trailing']") : null;
          if (trailing === null) return false;
          var primaries = trailing.querySelectorAll("[class*='_primary']");
          return primaries.length !== 0 && primaries[primaries.length - 1] === button;
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
          /* Outside the field: a toolbar action. Everywhere else the commit is
             bookkeeping and the gesture runs untouched. The submit button is
             the exception: its gate AND its face read the machine draft, so
             while the user types they describe a composer the product has not
             heard about yet — a grey send button that a tap may never reach,
             or the running turn's Stop square on a button whose tap means
             send. Commit first (the submit reads the machine draft), then run
             the product's own send gesture — the same path Enter takes (slash
             adjudication, busy policy, steer/queue) — so one tap is one send,
             whatever the engine would have made of the stale control. */
          var button = buttonAt(x, y);
          if (submitAt(button) === true && pendingRef.current !== null) {
            event.preventDefault();
            mirrorNow();
            debug("carry tap -> " + (sendGesture() ? "submit" : "nothing"));
            return;
          }
          mirrorNow();
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
         phone with no console. The panel is a VIEWER of the diary — it never
         writes while a field has focus (the diary defers the paint), and it
         re-paints on demand, on the way out of the field, or when the keyboard
         state changes (the moment a report is actually about). */
      React.useEffect(function () {
        if (diary === null || !debugRequested() || benchRequested()) return undefined;
        var panel = document.createElement("div");
        panel.setAttribute("data-mobile-input-debug", "");
        var head = document.createElement("div");
        head.style.cssText = "display:flex;gap:6px;align-items:center;margin-bottom:4px";
        var stage = document.createElement("span");
        stage.textContent = "诊断日志";
        var refresh = document.createElement("button");
        refresh.type = "button";
        refresh.setAttribute("data-mobile-input-debug-button", "");
        refresh.textContent = "刷新";
        refresh.addEventListener("click", function () { diary.paint(true); });
        var copy = document.createElement("button");
        copy.type = "button";
        copy.setAttribute("data-mobile-input-debug-button", "");
        copy.textContent = "复制日志";
        copy.addEventListener("click", function () { copyDiary(diary, copy); });
        head.append(stage, refresh, copy);
        var body = document.createElement("pre");
        body.setAttribute("data-mobile-input-debug-body", "");
        panel.append(head, body);
        document.body.append(panel);
        diary.watch(body);
        debug("panel on; active=" + active, true);
        return function () {
          diary.unwatch(body);
          panel.remove();
        };
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
            onFocus: onFocus,
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
    function createNativeInputToggle(diagnostics) {
      return function NativeInputToggle() {
        var narrow = useNarrowViewport();
        var state = React.useState(function () { return readOverride(); });
        var preference = state[0];
        var setPreference = state[1];
        var revealState = React.useState(function () { return readReveal(); });
        var revealed = revealState[0];
        var setRevealed = revealState[1];
        /* Long press on the escape hatch calls the diagnostics controls out (or
           puts them away); the click that ends the press must not also flip the
           input preference. */
        var pressTimer = React.useRef(0);
        var longPressed = React.useRef(false);
        var startPress = function () {
          longPressed.current = false;
          if (pressTimer.current !== 0) window.clearTimeout(pressTimer.current);
          pressTimer.current = window.setTimeout(function () {
            pressTimer.current = 0;
            longPressed.current = true;
            writeReveal(!readReveal());
          }, 600);
        };
        var endPress = function () {
          if (pressTimer.current !== 0) {
            window.clearTimeout(pressTimer.current);
            pressTimer.current = 0;
          }
        };
        React.useEffect(function () {
          var update = function () {
            setPreference(readOverride());
            setRevealed(readReveal());
          };
          window.addEventListener(PREFERENCE_EVENT, update);
          window.addEventListener(REVEAL_EVENT, update);
          window.addEventListener("storage", update);
          return function () {
            window.removeEventListener(PREFERENCE_EVENT, update);
            window.removeEventListener(REVEAL_EVENT, update);
            window.removeEventListener("storage", update);
            endPress();
          };
        }, []);
        if (!narrow) return null;
        var on = preference !== "off";
        var label = (on ? "原生输入框：已开启（点击改用官方输入框）" : "原生输入框：已关闭（点击启用）")
          + "；长按显示/隐藏诊断按钮";
        var diagnosing = diagnosticsModes().length !== 0;
        var diagnosisLabel = diagnosing
          ? "诊断面板：已开启（点击关闭并刷新）"
          : "诊断面板：点击开启（测试台 + 事件日志，页面会刷新）";
        /* Two chips: the escape hatch, and the diagnostics switch. The latter
           is here because a tokenized URL is rewritten by the shell before
           plugins load, so a phone cannot always pass ?dsh-mobile-input=... */
        return h(
          React.Fragment,
          null,
          h(
            "button",
            {
              type: "button",
              "data-mobile-input-toggle": "",
              "data-state": on ? "on" : "off",
              title: label,
              "aria-label": label,
              onMouseDown: function (event) { event.preventDefault(); },
              onPointerDown: startPress,
              onPointerUp: endPress,
              onPointerCancel: endPress,
              onPointerLeave: endPress,
              onClick: function () {
                /* A long press already did its job: swallow the click. */
                if (longPressed.current === true) {
                  longPressed.current = false;
                  return;
                }
                writePreference(on ? "off" : "on");
              },
            },
            on ? "输入法✓" : "输入法✗",
          ),
          diagnostics !== null
            ? h(
              "button",
              {
                type: "button",
                "data-mobile-input-copy": "",
                title: "复制诊断日志（与面板里的同一份）",
                "aria-label": "复制诊断日志",
                onMouseDown: function (event) { event.preventDefault(); },
                onClick: function (event) { copyDiary(diagnostics, event.currentTarget); },
              },
              "复制日志",
            )
            : null,
          revealed || diagnosing
            ? h(
              "button",
              {
                type: "button",
                "data-mobile-input-diagnostics": "",
                "data-state": diagnosing ? "on" : "off",
                title: diagnosisLabel,
                "aria-label": diagnosisLabel,
                onMouseDown: function (event) { event.preventDefault(); },
                onClick: function () {
                  writeDiagnostics(diagnosing ? "off" : "bench");
                  try {
                    window.location.reload();
                  } catch (error) { /* the next load picks the switch up anyway */ }
                },
              },
              diagnosing ? "诊断✓" : "诊断",
            )
            : null,
        );
      };
    }

    /**
     * Device test bench (?dsh-mobile-input=bench).
     *
     * Chromium cannot reproduce ArkWeb's IME and a phone has no console, so
     * when the keyboard still drops while typing, the only way to tell WHICH
     * ingredient does it is to run the candidates side by side on the device
     * itself. Each variant is a real field the user types into:
     *
     *   A  bare textarea (normal flow, no JS writes)          — baseline
     *   B  textarea inside a height:0 absolute container      — the seat shape
     *   C  B + a style write on every keystroke               — the pre-0.6 autosize
     *   D  B + logging only, nothing written                  — the 0.6 behaviour
     *   E  bare textarea inside an iframe                     — a clean document
     *
     * The diary records focus/blur/input per field AND every keyboard (window
     * height) transition, so the answer reads off as a timeline: whichever
     * variant is followed by a KEYBOARD line is the guilty one. The log lives
     * in its OWN fixed panel, so repainting it can never reflow a field under
     * test (fixed boxes are out of flow).
     * @param diary - the diagnostics ring buffer created by apply().
     * @returns a disposer for ctx.effect.
     */
    function installBench(diary) {
      var panel = document.createElement("div");
      panel.setAttribute("data-mobile-input-bench", "");
      var log = document.createElement("pre");
      log.setAttribute("data-mobile-input-log", "");

      var title = document.createElement("div");
      title.style.cssText = "font-size:11px;line-height:1.35";
      title.textContent = "诊断中：本面板只占屏幕顶部，下方真实输入框可直接打字。日志在打字期间不刷新，"
        + "失焦或键盘开合时更新；收起来时点「复制日志」发给 AI。";

      var row = document.createElement("div");
      row.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:4px 0";

      var copy = document.createElement("button");
      copy.type = "button";
      copy.textContent = "复制日志";
      copy.addEventListener("click", function () { copyDiary(diary, copy); });
      row.append(copy);

      /* Growth-policy switches: A/B the PRODUCTION field (below in the real
         composer) without editing the URL on a phone keyboard. */
      var modes = [
        ["commit", "生产:提交点增高"],
        ["live", "生产:逐键增高"],
        ["none", "生产:固定高度"],
      ];
      var modeButtons = [];
      var paintModes = function () {
        var current = readGrowthMode();
        for (var i = 0; i < modeButtons.length; i += 1) {
          modeButtons[i].el.textContent = modeButtons[i].label + (current === modeButtons[i].mode ? " ✓" : "");
        }
      };
      for (var i = 0; i < modes.length; i += 1) {
        var makeMode = function (mode, label) {
          var button = document.createElement("button");
          button.type = "button";
          button.textContent = label;
          button.setAttribute("data-mobile-input-growth", mode);
          button.addEventListener("click", function () {
            writeGrowthMode(mode);
            paintModes();
            diary.add("growth=" + mode);
          });
          modeButtons.push({ el: button, mode: mode, label: label });
          return button;
        };
        row.append(makeMode(modes[i][0], modes[i][1]));
      }
      paintModes();

      /* The variant fields are a SECOND step: the decisive test is the real
         composer field below this panel, so the variants start collapsed. */
      var variantsBox = document.createElement("div");
      variantsBox.setAttribute("data-mobile-input-bench-variants", "");
      variantsBox.hidden = true;
      var variantsToggle = document.createElement("button");
      variantsToggle.type = "button";
      variantsToggle.setAttribute("data-mobile-input-bench-variants-toggle", "");
      variantsToggle.textContent = "展开变体 A-E";
      variantsToggle.addEventListener("click", function () {
        variantsBox.hidden = !variantsBox.hidden;
        variantsToggle.textContent = variantsBox.hidden ? "展开变体 A-E" : "收起变体";
      });
      row.append(variantsToggle);

      /* Trigger-sync switches: the A/B for the slash-command keyboard drop. */
      var triggerModes = [
        ["resync", "触发:重聚焦"],
        ["changes", "触发:仅触发"],
        ["live", "触发:逐键"],
        ["off", "触发:关"],
      ];
      var triggerButtons = [];
      var paintTriggers = function () {
        var current = readTriggerMode();
        for (var i = 0; i < triggerButtons.length; i += 1) {
          triggerButtons[i].el.textContent = triggerButtons[i].label
            + (current === triggerButtons[i].mode ? " ✓" : "");
        }
      };
      for (var j = 0; j < triggerModes.length; j += 1) {
        var makeTrigger = function (mode, label) {
          var button = document.createElement("button");
          button.type = "button";
          button.textContent = label;
          button.setAttribute("data-mobile-input-trigger", mode);
          button.addEventListener("click", function () {
            writeTriggerMode(mode);
            paintTriggers();
            diary.add("trigger=" + mode);
          });
          triggerButtons.push({ el: button, mode: mode, label: label });
          return button;
        };
        row.append(makeTrigger(triggerModes[j][0], triggerModes[j][1]));
      }
      paintTriggers();

      var close = document.createElement("button");
      close.type = "button";
      close.textContent = "关闭测试台";
      close.addEventListener("click", function () {
        diary.unwatch(log);
        panel.remove();
        log.remove();
        /* The request is persisted, so turning the panels off has to clear it
           too — otherwise the next load brings them straight back. */
        writeDiagnostics("off");
        try { window.location.reload(); } catch (error) { /* panels already gone */ }
      });
      row.append(close);

      panel.append(title, row);

      var instrument = function (area, id, live) {
        area.addEventListener("focus", function () { diary.add(id + " focus"); });
        area.addEventListener("blur", function () { diary.add(id + " blur", true); });
        area.addEventListener("input", function (event) {
          var el = event.currentTarget;
          diary.add(id + " input " + el.value.length + " chars");
          if (live === true) {
            /* The pre-0.6 autosize probe, verbatim: collapse to zero, read the
               content height, write the height back. */
            var previous = el.style.height;
            el.style.height = "0px";
            void el.scrollHeight;
            el.style.height = previous;
          }
        });
        area.addEventListener("compositionstart", function () { diary.add(id + " compositionstart"); });
        area.addEventListener("compositionend", function () { diary.add(id + " compositionend", true); });
      };

      var caption = function (text) {
        var label = document.createElement("label");
        label.textContent = text;
        variantsBox.append(label);
      };

      var field = function (id, text, zero, live) {
        caption(id + " " + text);
        var holder = document.createElement("div");
        holder.setAttribute("data-mobile-input-bench-variant", "");
        var area = document.createElement("textarea");
        if (zero === true) {
          /* The real seat's shape, replicated: card(position:relative) >
             anchor(position:absolute, height:0) > seat(absolute, explicit box)
             > textarea. */
          holder.style.cssText = "position:relative;height:38px";
          var anchor = document.createElement("div");
          anchor.style.cssText = "position:absolute;left:0;top:0;right:0;height:0";
          area.style.cssText = "position:absolute;left:0;top:0;width:100%;height:36px";
          anchor.append(area);
          holder.append(anchor);
        } else {
          holder.append(area);
        }
        area.setAttribute("data-mobile-input-bench-field", "");
        area.setAttribute("data-mobile-input-bench-id", id);
        area.setAttribute("rows", "1");
        area.setAttribute("placeholder", text);
        variantsBox.append(holder);
        instrument(area, id, live === true);
        return area;
      };

      field("A", "裸 textarea（普通流，零 JS 写入）", false, false);
      field("B", "零高容器内的 textarea（复刻插件结构，零 JS 写入）", true, false);
      field("C", "同 B + 每次按键都写高度（v0.5.2 的逐键 autosize）", true, true);
      field("D", "同 B + 只记录、不写任何 DOM（v0.6 行为）", true, false);

      var frame = document.createElement("iframe");
      frame.setAttribute("data-mobile-input-bench-frame", "");
      frame.style.cssText = "display:block;box-sizing:border-box;width:100%;height:56px;margin-top:6px;border:1px solid #ccc;border-radius:6px;background:#fff";
      caption("E 隔离文档（iframe）里的裸 textarea");
      /* Same-origin (srcdoc inherits the parent origin), so the parent wires the
         instrument to the inner field directly. */
      frame.setAttribute("srcdoc", "<!doctype html><html><head>"
        + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
        + "<style>body{margin:4px}textarea{display:block;box-sizing:border-box;width:100%;height:36px;"
        + "font:13px/20px sans-serif;padding:6px 8px;border:1px solid #ccc;border-radius:6px}</style></head>"
        + "<body><textarea rows=\"1\" placeholder=\"E 隔离文档里的裸 textarea\"></textarea></body></html>");
      frame.addEventListener("load", function () {
        var doc = frame.contentDocument;
        if (doc === null || doc === undefined) return;
        var area = doc.querySelector("textarea");
        if (area !== null && area !== undefined) instrument(area, "E", false);
      });
      variantsBox.append(frame);
      panel.append(variantsBox);

      document.body.append(panel, log);
      /* A single panel: instructions + buttons + log + (collapsed) variants. */
      panel.append(log);
      diary.watch(log);
      diary.add("bench on; 直接在下方真实输入框里打字即可（变体在「展开变体 A-E」里）", true);
      return function () {
        diary.unwatch(log);
        panel.remove();
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
