/* Facts probe: reads the live DSH composer's DOM/CSS structure and the engine
 * capabilities the takeover cares about. Read-only, no session mutations.
 *
 *   node test/facts-probe.mjs <launch-token> [url]
 */
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const CHROME = '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome'
const PORT = 9347
const BASE = process.env.DSH_BASE ?? 'http://127.0.0.1:3080'
const token = process.argv[2]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=/tmp/dsh-facts-profile',
    '--no-first-run',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

let ws
let seq = 0
const pending = new Map()
const send = (m, p = {}, s) => {
  const id = ++seq
  ws.send(JSON.stringify({ id, method: m, params: p, ...(s ? { sessionId: s } : {}) }))
  return new Promise((res, rej) => pending.set(id, { res, rej }))
}

for (let i = 0; i < 60; i += 1) {
  try {
    const info = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()
    ws = new WebSocket(info.webSocketDebuggerUrl)
    await new Promise((r) => ws.addEventListener('open', r, { once: true }))
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data)
      if (m.id !== undefined) {
        const p = pending.get(m.id)
        if (p) {
          pending.delete(m.id)
          m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result)
        }
      }
    })
    break
  } catch {
    await sleep(250)
  }
}

const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
await send('Page.enable', {}, sessionId)
await send('Runtime.enable', {}, sessionId)
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, sessionId)
await send('Page.navigate', { url: `${BASE}/?token=${token}` }, sessionId)
await sleep(10000)

const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sessionId)
  return r.exceptionDetails ? { __error: r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails) } : r.result.value
}

const report = await ev(`(() => {
  const out = {};
  out.ua = navigator.userAgent;
  out.capabilities = {
    fieldSizing: CSS.supports('field-sizing', 'content'),
    dvh: CSS.supports('height', '100dvh'),
    visualViewport: typeof window.visualViewport === 'object' && window.visualViewport !== null,
    inert: 'inert' in HTMLElement.prototype,
    inputEvents: typeof InputEvent === 'function',
    resizeObserver: typeof ResizeObserver === 'function',
  };
  out.innerHeight = window.innerHeight;
  out.visualViewportHeight = window.visualViewport ? Math.round(window.visualViewport.height) : null;
  const pluginStyle = document.querySelector('style[data-plugin="dsh-mobile-flow"]');
  out.plugin = {
    styleTag: pluginStyle !== null,
    hasTakeoverCss: pluginStyle !== null && pluginStyle.textContent.includes('data-mobile-input-wrap'),
  };
  const card = document.querySelector('[data-composer-card]');
  out.card = card === null ? null : {
    mobileInputActive: card.hasAttribute('data-mobile-input-active'),
    hasWrap: card.querySelector('[data-mobile-input-wrap]') !== null,
    hasArea: card.querySelector('[data-mobile-input]') !== null,
    hasToggle: document.querySelector('[data-mobile-input-toggle]') !== null,
    areaH: (() => { const a = card.querySelector('[data-mobile-input]'); return a === null ? null : Math.round(a.getBoundingClientRect().height); })(),
  };
  /* Ancestor chain of the takeover seat with the properties that decide
     containing blocks, clipping, and hit-testing. */
  const wrap = document.querySelector('[data-mobile-input-wrap]');
  const chain = [];
  for (let el = wrap; el !== null && el !== document.documentElement; el = el.parentElement) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    chain.push({
      tag: el.tagName.toLowerCase(),
      slot: el.getAttribute('data-slot'),
      cls: (el.className || '').toString().slice(0, 60),
      position: cs.position,
      overflow: cs.overflow,
      height: Math.round(r.height),
      width: Math.round(r.width),
      transform: cs.transform === 'none' ? null : cs.transform,
      filter: cs.filter === 'none' ? null : cs.filter,
      contain: cs.contain === 'none' ? null : cs.contain,
      willChange: cs.willChange === 'auto' ? null : cs.willChange,
      zIndex: cs.zIndex,
      pointerEvents: cs.pointerEvents,
    });
  }
  out.chain = chain;
  return out;
})()`)

console.log(JSON.stringify(report, null, 2))
writeFileSync('/tmp/dsh-facts.json', JSON.stringify(report, null, 2))
await send('Target.closeTarget', { targetId })
chrome.kill()
