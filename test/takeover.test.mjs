/**
 * Render test for dsh-mobile-flow's native input takeover.
 * Loads the real plugin bundle (lib/client.js) in a jsdom page shaped like the
 * DSH composer card, renders the slot component, and drives the input path.
 */
/**
 * dsh-mobile-flow — native input takeover render test.
 *
 * Runs the real `lib/client.js` bundle in a jsdom page shaped like the DSH
 * composer card, renders the slot entry through React, and drives the input
 * path (typing, IME composition, Enter, machine-side writes, phase flips).
 *
 *   npm install --no-save jsdom react@18 react-dom@18
 *   node test/takeover.test.mjs
 *
 * Last line is `==== ALL CHECKS PASSED ====` (exit 0) or the failure list.
 */
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'

/* Install the jsdom globals BEFORE React loads: React DOM decides at import
   time whether it runs in a browser, and loading it against a Node global
   would take the server path and break its event system. */

const PLUGIN = new URL('../lib/client.js', import.meta.url).pathname

const dom = new JSDOM(`<!doctype html><html><head></head><body>
  <div data-composer-card>
    <div class="anchor"></div>
    <div data-input-scroll>
      <div class="grow">
        <div data-composer-input contenteditable="true" data-placeholder="给 DeepSeek 发送消息"></div>
        <div data-composer-placeholder>给 DeepSeek 发送消息</div>
      </div>
    </div>
    <div class="row"><button aria-label="发送消息" disabled>send</button></div>
  </div>
</body></html>`, { url: 'http://127.0.0.1:3080/', pretendToBeVisual: true })

const { window } = dom
const { document } = window

// --- platform stubs the DSH shell provides -----------------------------
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

// --- globals the bundle expects ---------------------------------------
const modLoader = { load: registration => { window.__registration = registration } }
window.__ModuleLoader__ = modLoader
globalThis.window = window
globalThis.document = document
globalThis.HTMLElement = window.HTMLElement
globalThis.KeyboardEvent = window.KeyboardEvent
globalThis.ClipboardEvent = window.ClipboardEvent
globalThis.ResizeObserver = window.ResizeObserver
globalThis.MutationObserver = window.MutationObserver
globalThis.requestAnimationFrame = window.requestAnimationFrame
globalThis.cancelAnimationFrame = window.cancelAnimationFrame
Object.defineProperty(globalThis, "navigator", { value: window.navigator, configurable: true })

const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { act } = await import('react-dom/test-utils')

const failures = []
const check = (name, ok, detail) => {
  console.log(`${ok ? '  ✅' : '  ❌'} ${name}${detail === undefined ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(name)
}

// --- load the real bundle ---------------------------------------------
window.eval(readFileSync(PLUGIN, 'utf8'))
const registration = window.__registration
const plugin = registration.factory(name => {
  if (name === 'react') return React
  throw new Error(`unexpected require: ${name}`)
})

// --- fake session input face -------------------------------------------
const calls = { setDraft: [], submit: 0 }
let snapshot = { draft: '', draftRev: 0, phase: 'plain', attachmentIds: [] }
const subscribers = []
const face = {
  setDraft(value) {
    calls.setDraft.push(value)
    if (typeof globalThis.__afterSetDraft === 'function') globalThis.__afterSetDraft(value)
    snapshot = { ...snapshot, draft: value, draftRev: snapshot.draftRev + 1 }
    for (const fn of subscribers) fn()
  },
  submit() { calls.submit += 1 },
  state: { getSnapshot: () => snapshot, subscribe: fn => { subscribers.push(fn); return () => {} } },
}
const components = new Map()
const slots = {
  inject: (key, cb) => { cb(); return () => {} },
  register: (spec, Comp) => { components.set(spec.name, Comp); return { spec } },
}
const scopedCtx = { get: name => name === 'conversation' ? { input: { for: () => face } } : undefined }
const sessionsService = { scope: () => scopedCtx }
/* Cordis contexts throw when an undeclared service is read as a property
   (`ctx.sessions` without inject); the proxy reproduces that so this test
   catches the class of bug instead of shipping it. */
const ctx = new Proxy({
  get: name => name === 'slots' ? slots : (name === 'sessions' ? sessionsService : undefined),
  effect: fn => fn(),
}, {
  get(target, prop) {
    if (prop in target) return target[prop]
    throw new Error(`cannot get property "${String(prop)}" without inject`)
  },
})
plugin.apply(ctx)

const component = components.get('conversation.input.overlay')
const toggleComponent = components.get('conversation.input.left')
check('plugin registered the overlay entry', component !== undefined)
check('plugin registered the tool-row escape hatch', toggleComponent !== undefined)

// --- render -------------------------------------------------------------
const host = document.createElement('div')
document.querySelector('.anchor').append(host)
const props = {
  sessionId: 'session-test',
  useInput: sel => sel(snapshot),
  inputActions: { setDraft: face.setDraft, submit: face.submit },
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const root = createRoot(host)
/* A harness wrapper that subscribes to the fake store like the real slot
   binding does, so machine publishes re-render the entry. */
function Harness() {
  const [, bump] = React.useState(0)
  React.useEffect(() => {
    const off = face.state.subscribe(() => bump(n => n + 1))
    return () => { off() }
  }, [])
  return React.createElement(component, props)
}
await act(async () => { root.render(React.createElement(Harness)) })

const wrap = host.querySelector('[data-mobile-input-wrap]')
const area = host.querySelector('[data-mobile-input]')
check('wrapper + textarea rendered', wrap !== null && area !== null)
check('card marked as taken over', card.hasAttribute('data-mobile-input-active'))
check('textarea picks up the stock placeholder', area.placeholder === '给 DeepSeek 发送消息', area.placeholder)
check('geometry copied from the stock scrollport',
  wrap.style.left === '1px' && wrap.style.top === '11px' && wrap.style.width === '334px' && wrap.style.height === '68px',
  `left=${wrap.style.left} top=${wrap.style.top} w=${wrap.style.width} h=${wrap.style.height}`)
check('editability mirrored from the stock editor', area.readOnly === false, `readOnly=${area.readOnly}`)

// typing through the native input
await act(async () => {
  area.value = '移动端输入法测试'
  area.dispatchEvent(new window.Event('input', { bubbles: true }))
})
check('typing is deferred (no DOM churn per keystroke)', calls.setDraft.length === 0, JSON.stringify(calls.setDraft))
await act(async () => { area.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true })) })
check('blur commits the field into the input machine', calls.setDraft.at(-1) === '移动端输入法测试', JSON.stringify(calls.setDraft))
// a trigger character must reach the machine at once (the `/` menu needs it)
await act(async () => {
  area.value = '/goal'
  area.dispatchEvent(new window.Event('input', { bubbles: true }))
})
check('trigger character commits immediately', calls.setDraft.at(-1) === '/goal', JSON.stringify(calls.setDraft.at(-1)))

// an external machine write lands in the textarea (send committed / restore)
await act(async () => { face.setDraft('') })
check('external draft change clears the textarea', area.value === '', JSON.stringify(area.value))

// composition round trip
await act(async () => {
  area.dispatchEvent(new window.CompositionEvent('compositionstart', { bubbles: true }))
  area.value = '语音输入'
  area.dispatchEvent(new window.Event('input', { bubbles: true }))
  area.dispatchEvent(new window.CompositionEvent('compositionend', { bubbles: true, data: '语音输入' }))
})
check('composition is deferred too', !calls.setDraft.includes('语音输入'), JSON.stringify(calls.setDraft))
await act(async () => { area.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true })) })
check('composition text commits on blur', calls.setDraft.at(-1) === '语音输入', JSON.stringify(calls.setDraft.at(-1)))

// Enter replays the stock send gesture (no Lexical here -> the face fallback)
await act(async () => {
  area.value = '回车发送'
  const enter = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
  area.dispatchEvent(enter)
})
check('enter sends through the session face', calls.submit === 1, `submit calls=${calls.submit}`)

// shift+enter is a newline, never a send
await act(async () => {
  const shiftEnter = new window.KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true })
  area.dispatchEvent(shiftEnter)
})
check('shift+enter does not send', calls.submit === 1, `submit calls=${calls.submit}`)

// When the stock keymap consumes the replay (the real product path), our
// fallback must stay silent — no double submit.
let replay = null
const stockHandler = ev => { replay = ev, ev.preventDefault() }
const editorEl = card.querySelector('[data-composer-input]')
editorEl.addEventListener('keydown', stockHandler)
await act(async () => {
  area.value = '再次回车'
  area.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
})
check('enter is replayed onto the stock editor', replay !== null && replay.key === 'Enter' && replay.cancelable === true,
  replay === null ? 'no replay seen' : `key=${replay.key}`)
check('consumed replay does not fall back to a second submit', calls.submit === 1, `submit calls=${calls.submit}`)
editorEl.removeEventListener('keydown', stockHandler)

const seat = host.querySelector('[data-mobile-input-wrap]')
Object.defineProperty(seat, 'getBoundingClientRect', {
  value: () => ({ left: 0, top: 0, right: 334, bottom: 68, width: 334, height: 68, x: 0, y: 0 }),
})

// Send-button bridge: a tap on a button the commit enables must still send.
const sendButton = document.querySelector('[aria-label="发送消息"]')
sendButton.getBoundingClientRect = () => ({ left: 300, top: 500, right: 350, bottom: 530, width: 50, height: 30, x: 300, y: 500 })
let sendClicks = 0
sendButton.addEventListener('click', () => { sendClicks += 1 })
await act(async () => {
  area.value = '桥接发送'
  area.dispatchEvent(new window.Event('input', { bubbles: true }))
})
check('bridge: the typed text is still uncommitted before the tap', calls.setDraft.at(-1) !== '桥接发送', JSON.stringify(calls.setDraft.at(-1)))
sendButton.disabled = true
globalThis.__afterSetDraft = value => { if (value === '桥接发送') sendButton.disabled = false }
await act(async () => {
  seat.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 320, clientY: 515 }))
})
check('bridge: tapping the (disabled) send button commits the draft', calls.setDraft.at(-1) === '桥接发送', JSON.stringify(calls.setDraft.at(-1)))
await act(async () => { await new Promise(r => setTimeout(r, 10)) })
check('bridge: the tap is replayed on the button our commit enabled', sendClicks === 1, `clicks=${sendClicks}`)
globalThis.__afterSetDraft = null

// The stock editor is taken out of the focus / IME tree while we own the field.
check('stock editor neutralised (inert + aria-hidden)',
  editorEl.hasAttribute('inert') && editorEl.getAttribute('aria-hidden') === 'true',
  `inert=${editorEl.hasAttribute('inert')} aria-hidden=${editorEl.getAttribute('aria-hidden')}`)

// While the field has focus it owns its text: an external non-empty write must
// not clobber an IME session mid-typing.
await act(async () => { area.focus() })
const beforeExternal = area.value
await act(async () => { face.setDraft('外部写入不应覆盖') })
check('focused field ignores external non-empty writes', area.value === beforeExternal,
  `value="${area.value}"`)
// ...but a committed send still clears it.
await act(async () => { face.setDraft('') })
check('committed send still clears the focused field', area.value === '', `value="${area.value}"`)
await act(async () => { area.blur() })
await act(async () => { face.setDraft('失焦后应采纳') })
check('blurred field adopts external writes', area.value === '失焦后应采纳', `value="${area.value}"`)

// Tap forwarding: a tap anywhere in the input box focuses the field, whatever
// the engine did with the layers above it.
await act(async () => {
  face.setDraft('')
})
document.body.focus()
await act(async () => { area.blur() })
await act(async () => {
  seat.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 5, clientY: 5 }))
})
check('tapping the seat focuses the field', document.activeElement === host.querySelector('[data-mobile-input]'),
  `active=${(document.activeElement || {}).tagName}`)

// The escape hatch flips the preference and hands the surface back.
window.localStorage.removeItem('dsh-mobile-flow:input')
const toggleHost = document.createElement('div')
document.body.append(toggleHost)
const toggleRoot = createRoot(toggleHost)
await act(async () => { toggleRoot.render(React.createElement(toggleComponent, {})) })
const button = toggleHost.querySelector('[data-mobile-input-toggle]')
check('escape hatch renders on narrow viewports', button !== null && button.getAttribute('data-state') === 'on',
  button === null ? 'missing' : `state=${button.getAttribute('data-state')}`)
await act(async () => { button.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) })
check('escape hatch persists the preference',
  window.localStorage.getItem('dsh-mobile-flow:input') === 'off',
  String(window.localStorage.getItem('dsh-mobile-flow:input')))
check('escape hatch unmounts the native textarea',
  host.querySelector('[data-mobile-input]') === null && !card.hasAttribute('data-mobile-input-active'))
await act(async () => { toggleRoot.unmount() })
// back to the default preference for the remaining checks
await act(async () => {
  window.localStorage.removeItem('dsh-mobile-flow:input')
  window.dispatchEvent(new window.Event('dsh-mobile-flow:preference'))
})

// phase flip hands the surface back to the stock editor
await act(async () => {
  snapshot = { ...snapshot, phase: 'claimed' }
  for (const fn of subscribers) fn()
})
check('phase flip unmounts the native textarea', host.querySelector('[data-mobile-input]') === null)
check('phase flip clears the card marker (stock editor returns)',
  !card.hasAttribute('data-mobile-input-active'))
// ...and flipping back re-arms it from the machine's live draft
await act(async () => {
  snapshot = { ...snapshot, draft: '恢复的草稿', draftRev: snapshot.draftRev + 1, phase: 'plain' }
  for (const fn of subscribers) fn()
})
const restored = host.querySelector('[data-mobile-input]')
check('returning to plain re-mounts the textarea with the machine draft',
  restored !== null && restored.value === '恢复的草稿', restored === null ? 'missing' : `value="${restored.value}"`)
check('card marker restored', card.hasAttribute('data-mobile-input-active'))

console.log(`\n==== ${failures.length === 0 ? 'ALL CHECKS PASSED' : `${failures.length} FAILED`} ====`)
for (const f of failures) console.log(`  FAIL: ${f}`)
process.exit(failures.length === 0 ? 0 : 1)
