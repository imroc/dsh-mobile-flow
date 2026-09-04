# dsh-mobile-flow

**English** | [简体中文](README.zh.md)

Mobile in-flow composer for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) Web UI: on narrow screens (≤720px) the input bar and AI confirmation cards scroll with the page instead of pinning to the viewport floor — swipe up to read and the message transcript gets the full screen back.

A pure client-side CSS overlay. No product source is modified; removing the plugin restores the stock behavior exactly.

## The problem

The stock Web UI pins the composer seat with `position: sticky; bottom: 0`. That seat hosts not only the input bar but also the interactive cards the AI raises mid-conversation — `ask_user_question` option cards, approval prompts, plan review. On a phone all of them stay glued to the bottom of the screen, permanently eating a chunk of the viewport while you scroll back through replies.

## What it does

On viewports ≤720px (the same breakpoint the official question card uses):

1. **The composer seat joins the document flow** — input bar and confirmation cards now live at the end of the transcript. Swipe up and they scroll out of view; the transcript becomes full-screen.
2. **Short conversations still dock to the bottom** — when the transcript is shorter than one screen, the message area stretches so the composer stays flush with the viewport floor, visually identical to the stock behavior. Long conversations get the full-screen treatment.
3. **Floating controls re-anchor** — the back-to-bottom button and turn navigator no longer reserve height for the sticky seat and sit close to the viewport floor again.

Desktop (wide viewports) is completely unaffected.

## How it works

The plugin ships a browser half (`exports["./client"]`, declared via `dsh.client.platform: "web"`), discovered by the client-modules scanner and loaded from the boot manifest. It injects one `<style>` tag with `@media (max-width: 720px)` overrides and removes the tag on unload — fully reversible.

All selectors target the product's stable `data-*` attributes (`data-composer-seat`, `data-conversation-scroll`, `data-phase`, `data-slot`), never CSS-Modules-hashed class names. The sticky-to-static switch is guarded with `:not(:has([data-conversation-composer-overlay]))` so views that own their composer overlay (e.g. trajectory) keep the official absolute positioning. On engines without `:has()` the rules degrade safely back to the stock sticky behavior.

## Requirements

- DeepSeek Harness Web profile (`dsh web`), any recent 0.1.x release
- Selectors verified against 0.1.2-rc.1; they target product slot contracts that are stable within a version line but may need small updates after a major product revamp

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

## Verify

Open a session on a phone (or a desktop DevTools window narrowed to ≤720px): swipe up a few screens — the input bar and confirmation cards should scroll away with the messages. Trigger a tool that asks a question (or just check the input bar with a long transcript): the card sits at the end of the transcript instead of the screen bottom. Widen the window and the stock behavior returns.

## Rollback

- Bundle install: `dsh plugin --profile web remove dsh-mobile-flow`
- Manual: remove the dependency and the `dsh.profile.bundles` entry, restart `dsh web`

No product source is modified; upgrades do not overwrite it.

## License

MIT
