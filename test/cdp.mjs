/* Minimal CDP driver for a live DSH page: headless Chromium + the built-in
   WebSocket client, no puppeteer/playwright dependency. Used by the probes in
   this directory (facts-probe.mjs, probe-live.mjs).
 *
 *   import { open } from './cdp.mjs'
 *   const page = await open({ token, params: '&dsh-mobile-input=bench' })
 *   await page.ev('document.title')
 *   page.close()
 *
 * The launch token comes from `journalctl --user -u dsh-web | grep -o token=...`
 * and changes on every restart.
 */
import { spawn } from 'node:child_process'

const CHROME = process.env.DSH_CHROME ?? '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome'
const BASE = process.env.DSH_BASE ?? 'http://127.0.0.1:3080'

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Open a mobile-sized page against the running DSH web app.
 * @param options.token - launch token (see the file header)
 * @param options.params - extra query string, e.g. '&dsh-mobile-input=bench'
 * @param options.settle - ms to wait for the app shell to boot
 * @returns the page handle: { send, ev, errors, url, close }
 */
export async function open(options = {}) {
  const { token, params = '', width = 390, height = 844, settle = 10000 } = options
  /* Per-process port and profile: two probes running side by side (or a stale
     instance from a crashed run) must never share a debugging endpoint. */
  const port = options.port ?? 9300 + (process.pid % 500)
  const profile = options.profile ?? `/tmp/dsh-cdp-profile-${port}`
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
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
  const errors = []
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
      ws = new WebSocket(info.webSocketDebuggerUrl)
      await new Promise((r) => ws.addEventListener('open', r, { once: true }))
      break
    } catch {
      await sleep(250)
    }
  }
  if (ws === undefined) throw new Error('CDP endpoint never came up')

  const send = (method, payload = {}, sessionId) => {
    const id = ++seq
    ws.send(JSON.stringify({ id, method, params: payload, ...(sessionId ? { sessionId } : {}) }))
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
  }
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id !== undefined) {
      const p = pending.get(m.id)
      if (p) {
        pending.delete(m.id)
        m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result)
      }
      return
    }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description ?? 'exception')
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push(m.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
    }
  })

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  await send('Page.enable', {}, sessionId)
  await send('Runtime.enable', {}, sessionId)
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 3, mobile: true }, sessionId)
  const url = `${BASE}/?token=${token}${params}`
  await send('Page.navigate', { url }, sessionId)
  await sleep(settle)

  /** Evaluate an expression in the page and return its value. */
  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'evaluate failed')
    return r.result.value
  }

  return {
    send: (method, payload) => send(method, payload, sessionId),
    ev,
    errors,
    url,
    /** Load another path in the same page (the cookie keeps the session). */
    navigate: async (path, settleMs = settle) => {
      await send('Page.navigate', { url: path.startsWith('http') ? path : `${BASE}${path}` }, sessionId)
      await sleep(settleMs)
    },
    close: async () => {
      try {
        await send('Target.closeTarget', { targetId })
      } catch { /* already gone */ }
      chrome.kill()
    },
  }
}
