# dsh-mobile-flow

**English** | [简体中文](README.zh.md)

Two mobile fixes for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) Web UI:

1. **In-flow composer** — on narrow screens (≤720px) the input bar and AI confirmation cards scroll with the page instead of pinning to the viewport floor, so swiping up gives the message transcript the full screen back.
2. **Native input takeover** — on narrow screens the draft surface becomes a native `<textarea>`, sidestepping the Lexical contenteditable IME flow that swallows text on Android keyboards (voice input most of all).

A client-side overlay plus one slot component. No product source is modified; removing the plugin restores the stock behavior exactly.

## The problems

### 1. The composer is pinned to the bottom of the screen

The stock Web UI pins the composer seat with `position: sticky; bottom: 0`. That seat hosts not only the input bar but also the interactive cards the AI raises mid-conversation — `ask_user_question` option cards, approval prompts, plan review. On a phone all of them stay glued to the bottom of the screen, permanently eating a chunk of the viewport while you scroll back through replies.

### 2. Mobile IMEs clear text you already typed

The stock composer's text surface is a **Lexical contenteditable** (`createEditor` + `registerPlainText` in `packages/client/ui-conversation`). Android IMEs — voice keyboards above all — drive composition through Chrome's `InputConnection → beforeinput("insertCompositionText")` recomposition flow, and a framework editor answers those events by writing its own state back into the DOM. The text being composed, and on recomposition text already committed, gets wiped. A native `<textarea>` is edited by the platform itself and never enters that fight, which is why the same IME behaves in an ordinary textarea comment box.

## What it does

On viewports ≤720px (the same breakpoint the official question card uses):

1. **The composer seat joins the document flow** — input bar and confirmation cards now live at the end of the transcript. Swipe up and they scroll out of view; the transcript becomes full-screen.
2. **Short conversations still dock to the bottom** — when the transcript is shorter than one screen, the message area stretches so the composer stays flush with the viewport floor, visually identical to the stock behavior. Long conversations get the full-screen treatment.
3. **Floating controls re-anchor** — the back-to-bottom button and turn navigator no longer reserve height for the sticky seat and sit close to the viewport floor again.
4. **Slim edges** — the content-layer paddings that keep the transcript, header, input card, and confirmation cards well off the screen edges (16–32px per side) shrink to a slim 4px side inset (8px top), reclaiming most of the wasted width without the cramped feel of full-bleed. The page shell itself never adds whitespace; the gaps come entirely from these paddings.
5. **No auto-focus on session switch** — the stock UI returns focus to the input box on every mount / session switch (a desktop convenience), which pops the on-screen keyboard over half the screen on phones. In narrow viewports the programmatic focus is swallowed; tapping the input box still focuses it normally.
6. **Workspace row actions always visible** — the trailing buttons on workspace and session rows (the ⋯ menu with rename/delete and the ＋ for a new session in that workspace) surface on hover only; touch has no hover, so narrow viewports show them whenever the sidebar list is rendered.
7. **Native input takeover** — the draft surface is drawn by a native textarea whose metrics match the stock box exactly (geometry is measured from the live composer every frame the card relayouts). Enter still performs the official send gesture (including `/` menu arbitration and the busy-Enter policy), file pastes are forwarded to the official attachment intake, and locked states follow the product's own editability gate.

Desktop (wide viewports) is completely unaffected.

## How it works

The plugin ships a browser half (`exports["./client"]`, declared via `dsh.client.platform: "web"`), discovered by the client-modules scanner and loaded from the boot manifest.

- **Layout half**: one `<style>` tag with `@media (max-width: 720px)` overrides, removed on unload — fully reversible. All selectors target the product's stable `data-*` attributes (`data-composer-seat`, `data-conversation-scroll`, `data-phase`, `data-slot`), never CSS-Modules-hashed class names. The sticky-to-static switch is guarded with `:not(:has([data-conversation-composer-overlay]))` so views that own their composer overlay (e.g. trajectory) keep the official absolute positioning. On engines without `:has()` the rules degrade safely back to the stock sticky behavior.
- **Input half**: registered into the official `conversation.input.overlay` slot (a session-scope seat inside the composer card) with the standard props it carries (`useInput` / `inputActions`). Every keystroke is mirrored into the official input machine (`conversation.input.for(ctx).setDraft`), while the read side subscribes to the same store's live snapshot — so the send button, placeholder, `/` trigger pipeline, attachments and draft persistence all keep working, with no stale-render race to clobber fast typing. The Lexical editor keeps its layout box (hidden, never removed) because that box is what sizes the card for the mirrored draft.
- **Scope**: the takeover owns the surface only while the machine is `plain`. A claim (a `/` command picked from the menu, adjudicating, submitting) hands the surface straight back to the stock editor — command tokens and chips are state a plain-text mirror cannot reproduce.

## Requirements

- DeepSeek Harness Web profile (`dsh web`), any recent 0.1.x release
- Selectors and slot contracts verified against 0.1.2-rc.1 and 0.1.5-rc.1; they target product slot contracts that are stable within a version line but may need small updates after a major product revamp

## Install

### From npm

```sh
dsh plugin --profile web add dsh-mobile-flow
```

### From GitHub

```sh
dsh plugin --profile web add github:imroc/dsh-mobile-flow
```

Restart `dsh web`, then refresh the browser page.

## Overrides (optional)

The native takeover is on by default **on narrow viewports only** (≤720px). To override it — for instance to exercise it on a desktop browser:

```js
// Browser console, same origin, persists
localStorage.setItem("dsh-mobile-flow:input", "off");    // never take over
localStorage.setItem("dsh-mobile-flow:input", "on");     // narrow viewports only (default)
localStorage.setItem("dsh-mobile-flow:input", "force");  // take over on any viewport
localStorage.removeItem("dsh-mobile-flow:input");        // back to default
```

One-shot override: `?dsh-mobile-input=1` (force) / `=0` (off).

## Verify

Open a session on a phone (or a desktop DevTools window narrowed to ≤720px):

- Swipe up a few screens: the input bar and confirmation cards scroll away with the messages.
- The draft surface should be a native textarea (the page carries `[data-mobile-input]`). Type with an IME or voice input: text must not be cleared.
- Send with the send button or Enter (same gesture as the stock composer).
- Widen the window and the stock behavior returns.

## Update discipline (this plugin's convention)

1. **Hot updates only**: after a change, restart `dsh web` so the bundle revision is recomputed — client bundles are served `immutable`, and a new rev is what guarantees a phone refresh picks up the new code (never make the user clear caches).
2. **Always keep an escape hatch**: anything that takes over stock UI behaviour must be revertible from the page itself (see the 输入法✓/✗ button below), so a bad build never blocks normal use.

## Compatibility hardening (v0.5.1 / v0.5.2, after HarmonyOS / ArkWeb feedback)

The first release broke on **HarmonyOS 7's built-in browser (ArkWeb)**: taps rarely opened the keyboard, and only
one character could be typed. Both are addressed:

1. **Taps not reaching the field** — a paint/hit-order bug: the stock input row lives in `.grow`
   (`position: relative`) which comes *after* our overlay seat in DOM order, so at equal stacking level it painted
   (and hit-tested) above the textarea; a `document.elementFromPoint` probe hit the stock container at 3 of 5 sample
   points inside the input box. Fixed with `z-index: 5` + an opaque seat background, `pointer-events: none` on the
   hidden row, and a capture-phase `pointerdown` on the card that focuses the field for taps anywhere inside it.
2. **One character then nothing** — two defences: the DSH-side draft is never written back into a *focused* field
   (that write resets an IME session; only a committed-send clear is applied), and the stock editor is taken out of
   the focus/IME candidate tree (`inert` + `aria-hidden`, with a `focusin` guard for engines without `inert`);
   geometry writes are idempotent and the field declares `user-select: text` / `touch-action: manipulation`.

**v0.5.2 (second round of HarmonyOS feedback)**: with the takeover on, the keyboard closed after every character. Cause: mirroring the draft on **every keystroke** re-rendered the composer card and made Lexical rewrite the hidden editor's DOM — a strict engine drops the IME when the editing surface churns. Now:

- **zero DOM churn while typing**: the field owns its text and only commits to the machine at commit points — Enter, blur, any tap outside the field (toolbar/send), page hide, unmount — plus immediately when a `/` or `@` trigger character is typed (the menus need the machine).
- **the field grows itself**: the textarea autosizes (cap from the product's own 14-line token, floor read from the stock `min-height`: 36px docked / 52px hero) and a matching `min-height` floor is put on the stock row's box, because the absolutely positioned seat cannot make the card grow; it shrinks back after a send clears the draft.
- **send-button bridge**: the stock send button is disabled while the machine draft is empty, so a tap outside the field commits first and, if that commit enabled the button, the tap is replayed onto it (one tap = send).
- the stock editor is additionally forced to `contenteditable="false"` next to `inert` + `aria-hidden`, so the IME can only ever target the textarea; while the field is focused the seat never moves, the hidden scroller is left alone, and geometry is rounded to whole pixels (no sub-pixel style churn).

**Escape hatch**: a small tool-row button (**输入法✓ / 输入法✗**, narrow viewports only) swaps back to the stock
input box and remembers the choice — no device can be left stuck.

**Diagnostics**: append `&dsh-mobile-input=debug` to the URL to get an on-page event panel (tap coordinates and
hit target, focus changes, input/composition events, geometry writes) for phones without a console.

## Known limits

- While the takeover is active, inline chip/decoration rendering inside the draft (e.g. `@` reference decorations) is not shown; entering a command claim switches back to the stock editor automatically.
- Pasting an image is implemented by forwarding the paste to the official attachment intake; browsers that refuse a constructed paste event fall back to the paperclip picker.
- IME candidate/assist behavior itself belongs to the system keyboard and is outside the plugin's control.

## Development

```sh
npm install --no-save jsdom react@18 react-dom@18
node test/takeover.test.mjs     # runs the real client bundle in a jsdom composer card
```

The test boots the shipped `lib/client.js`, renders the slot entry through React against a
composer-card DOM, and asserts the render path, the draft mirror (typing / IME composition /
machine-side writes), the Enter gesture, and the phase gate that hands the surface back to the
stock editor. It exists because a broken entry renders nothing visible — only a console error.

## Rollback

- Bundle install: `dsh plugin --profile web remove dsh-mobile-flow`
- Manual: remove the dependency and the `dsh.profile.bundles` entry, restart `dsh web`
- Temporarily: `localStorage.setItem("dsh-mobile-flow:input", "off")` and refresh (turns off the native input only; the layout fixes stay)

No product source is modified; upgrades do not overwrite it.

## License

MIT
