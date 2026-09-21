/**
 * dsh-mobile-flow — composer-gate regression test.
 *
 * The resident composer card is reused for states that are NOT text inputs: a
 * blank-session hero whose workspace is not resolved yet renders it as a
 * workspace-PICKER trigger (`aria-haspopup="menu"`, `contenteditable="false"`,
 * no bound editor), and a blocked/removed/offline session renders it disabled
 * (`aria-disabled="true"`).
 *
 * Regression (2026-09-19, phone report "新建会话后点输入框没反应"): the takeover
 * used to activate on those surfaces anyway and latch the composer's
 * non-editability into a permanently READ-ONLY native field — no keyboard on
 * tap, the card's own workspace-picker tap swallowed, no way to send. Only a
 * session switch (a remount) cleared it, which is exactly the workaround the
 * report described.
 *
 *   node test/input-gate.test.mjs
 *
 * Last line is `==== ALL CHECKS PASSED ====` (exit 0) or the failure list.
 */
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'

const PLUGIN = new URL('../lib/client.js', import.meta.url).pathname

const dom = new JSDOM(`<!doctype html><html><head></head><body>
  <div data-composer-card class="cardWorkspaceTrigger">
    <div class="anchor"></div>
    <div data-input-scroll>
      <div class="grow">
        <div data-composer-input contenteditable="false" aria-haspopup="menu" tabindex="0"
             data-placeholder="选择工作区"></div>
        <div data-composer-placeholder>选择工作区</div>
      </div>
    </div>
    <div class="row">
      <div class="fx_tools"><button aria-label="添加附件">attach</button></div>
      <div class="fx_trailing"><button class="fx_primary" aria-label="发送消息" disabled>send</button></div>
    </div>
  </div>
</body></html>`, { url: 'http://127.0.0.1:3080/', pretendToBeVisual: true })

const { window } = dom
const { document } = window

window.matchMedia = query => ({
  matches: /max-width:\s*720px/.test(query),
  media: query,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
})
window.ResizeObserver = class { observe() {} disconnect() {} }
window.requestAnimationFrame = fn => window.setTimeout(() => fn(Date.now()), 0)
window.cancelAnimationFrame = id => window.clearTimeout(id)

const scroll = document.querySelector('[data-input-scroll]')
const card = document.querySelector('[data-composer-card]')
for (const el of [card, scroll]) {
  el.getBoundingClientRect = () => (el === card
    ? { left: 20, top: 400, right: 370, bottom: 480, width: 350, height: 80, x: 20, y: 400 }
    : { left: 21, top: 411, right: 355, bottom: 479, width: 334, height: 68, x: 21, y: 411 })
  Object.defineProperty(el, 'clientLeft', { value: 0 })
  Object.defineProperty(el, 'clientTop', { value: 0 })
  Object.defineProperty(el, 'clientWidth', { value: 334 })
  Object.defineProperty(el, 'clientHeight', { value: 68 })
}

window.__ModuleLoader__ = { load: registration => { window.__registration = registration } }
globalThis.window = window
globalThis.document = document
globalThis.HTMLElement = window.HTMLElement
globalThis.KeyboardEvent = window.KeyboardEvent
globalThis.ClipboardEvent = window.ClipboardEvent
globalThis.ResizeObserver = window.ResizeObserver
globalThis.MutationObserver = window.MutationObserver
globalThis.requestAnimationFrame = window.requestAnimationFrame
globalThis.cancelAnimationFrame = window.cancelAnimationFrame
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true })

const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { act } = await import('react-dom/test-utils')

const failures = []
const check = (name, ok, detail) => {
  console.log(`${ok ? '  ✅' : '  ❌'} ${name}${detail === undefined ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(name)
}

window.eval(readFileSync(PLUGIN, 'utf8'))
const plugin = window.__registration.factory(name => {
  if (name === 'react') return React
  throw new Error(`unexpected require: ${name}`)
})

let snapshot = { draft: '', draftRev: 0, phase: 'plain', attachmentIds: [] }
const calls = { setDraft: [] }
const subscribers = []
const face = {
  setDraft(value) {
    calls.setDraft.push(value)
    snapshot = { ...snapshot, draft: value }
    for (const fn of subscribers) fn()
  },
  submit() {},
  state: { getSnapshot: () => snapshot, subscribe: fn => { subscribers.push(fn); return () => {} } },
}
const components = new Map()
const slots = { inject: (key, cb) => { cb(); return () => {} }, register: (spec, Comp) => { components.set(spec.name, Comp); return { spec } } }
const scopedCtx = { get: name => name === 'conversation' ? { input: { for: () => face } } : undefined }
const ctx = { get: name => name === 'slots' ? slots : (name === 'sessions' ? { scope: () => scopedCtx } : undefined), effect: fn => fn() }
plugin.apply(ctx)

const component = components.get('conversation.input.overlay')
const host = document.createElement('div')
document.querySelector('.anchor').append(host)
const props = { sessionId: 'session-test', useInput: sel => sel(snapshot), inputActions: { setDraft: face.setDraft, submit: face.submit } }
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const root = createRoot(host)
await act(async () => { root.render(React.createElement(component, props)) })

const editor = document.querySelector('[data-composer-input]')
const flush = async () => { await act(async () => { await new Promise(r => window.setTimeout(r, 20)) }) }

console.log('\n— "no workspace yet" hero: the composer is a picker trigger —')
check('takeover stays out of the way', !card.hasAttribute('data-mobile-input-active'))
check('no native field is rendered', host.querySelector('[data-mobile-input]') === null)
check('the seat it would use is hidden', host.querySelector('[data-mobile-input-wrap]').style.display === 'none')
check('the product placeholder is untouched',
  editor.getAttribute('data-placeholder') === '选择工作区' && editor.getAttribute('contenteditable') === 'false',
  `${editor.getAttribute('contenteditable')}`)
check('the stock editor is left focusable for the picker tap',
  !editor.hasAttribute('inert') && editor.getAttribute('aria-hidden') === null)

console.log('\n— the workspace resolves: the composer becomes a real input —')
await act(async () => {
  editor.removeAttribute('aria-haspopup')
  editor.removeAttribute('tabindex')
  editor.setAttribute('contenteditable', 'true')
  editor.setAttribute('data-placeholder', '给 DeepSeek 发送消息')
})
await flush()
const area = host.querySelector('[data-mobile-input]')
check('takeover activates', card.hasAttribute('data-mobile-input-active') && area !== null)
check('the field is editable (the latch regression)', area !== null && area.readOnly === false, `readOnly=${area === null ? 'n/a' : area.readOnly}`)
check('it mirrors the new placeholder', area !== null && area.placeholder === '给 DeepSeek 发送消息', area === null ? 'n/a' : area.placeholder)

console.log('\n— typing still flows into the machine —')
await act(async () => {
  area.value = '恢复后可输入'
  area.dispatchEvent(new window.Event('input', { bubbles: true }))
  area.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true }))
})
check('draft published at the commit point', calls.setDraft.at(-1) === '恢复后可输入', JSON.stringify(calls.setDraft.at(-1)))

console.log('\n— the composer locks again (blocked / removed session) —')
await act(async () => { editor.setAttribute('aria-disabled', 'true') })
await flush()
check('surface handed back to the product', !card.hasAttribute('data-mobile-input-active'))
check('the feed-back releases the seat', host.querySelector('[data-mobile-input-wrap]').style.display === 'none')

console.log('\n— and unlocks again —')
await act(async () => { editor.removeAttribute('aria-disabled') })
await flush()
check('takeover re-activates', card.hasAttribute('data-mobile-input-active'))
check('field editable again', host.querySelector('[data-mobile-input]').readOnly === false)

console.log(failures.length === 0 ? '\n==== ALL CHECKS PASSED ====' : `\nFAILED: ${failures.join(', ')}`)
process.exit(failures.length === 0 ? 0 : 1)
