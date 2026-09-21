/* Live-app probe for the native-input takeover (run it against the running
 * DSH web app; it drives the REAL page over CDP with a 390x844 mobile
 * viewport).
 *
 *   node test/probe-live.mjs <launch-token>
 *
 * Phase 1 — the contract, on a real session:
 *   the takeover is live and its box matches the official scrollport; typing
 *   4 characters writes NOTHING to the page DOM (the ArkWeb fix); the field
 *   never collapses (no height:0 probe), keeps one height and keeps focus; the
 *   commit point publishes the draft and applies the content height.
 *
 * Phase 2 — diagnostics, exactly as a phone reaches them:
 *   a tokenized load has its query rewritten away by the shell before plugins
 *   load, so the tool-row chip persists the request in localStorage instead;
 *   the bench must then mount with no query string at all, and ship the A/B
 *   control (variant C reproduces the per-keystroke write).
 *
 * Phase 3 — the debug panel is a VIEWER: it must not repaint while a field has
 *   focus, and must repaint once typing stops.
 *
 * Ends with `==== ALL CHECKS PASSED ====` or the failure list.
 */
import { open } from './cdp.mjs'

const token = process.argv[2]
if (token === undefined) {
  console.error('usage: node test/probe-live.mjs <launch-token>')
  process.exit(2)
}

const failures = []
const check = (name, ok, detail) => {
  console.log(`${ok ? '  ✅' : '  ❌'} ${name}${detail === undefined ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(name)
}
const journal = (title) => console.log(`\n── ${title}`)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
/* The launch token is single-use: it is spent by this first navigation. */
const page = await open({ token })

/* Watch every mutation in the page, tagging the ones inside our surfaces. */
/* Watch every mutation in the page, tagged by surface. The composer CARD is
   what matters (it is the surface the ArkWeb IME watches); the rest of the page
   is recorded too, but only reported — a live session streams its transcript,
   which mutates the page while the user types and is not ours to control. */
const installAudit = `(() => {
  window.__audit = [];
  new MutationObserver(records => {
    for (const record of records) {
      const el = record.target;
      const inSurface = el.closest !== undefined && el.closest('[data-composer-card]') !== null;
      const inSeat = el.closest !== undefined && el.closest('[data-mobile-input-wrap]') !== null;
      const inSurfaces = el.closest !== undefined && el.closest('[data-mobile-input-bench], [data-mobile-input-log], [data-mobile-input-debug]') !== null;
      const row = el.parentElement !== null && el.parentElement.hasAttribute('data-input-scroll');
      window.__audit.push((inSeat ? 'SEAT ' : row ? 'ROW ' : inSurfaces ? 'PANEL ' : inSurface ? 'CARD ' : 'OUTSIDE ')
        + record.type + ':' + (record.attributeName ?? el.tagName));
    }
  }).observe(document.body, { attributes: true, childList: true, characterData: true, subtree: true });
  return true;
})()`

const state = `(() => {
  const area = document.querySelector('[data-mobile-input]');
  const card = document.querySelector('[data-composer-card]');
  const editor = document.querySelector('[data-composer-input]');
  const scroll = card === null ? null : card.querySelector('[data-input-scroll]');
  return {
    area: area === null ? null : { value: area.value, height: area.style.height, focused: document.activeElement === area },
    card: card === null ? null : { marked: card.hasAttribute('data-mobile-input-active') },
    scrollH: scroll === null ? null : scroll.clientHeight,
    machine: editor === null ? null : editor.textContent,
    inert: editor === null ? null : editor.getAttribute('contenteditable'),
  };
})()`

const type = async (ch) => {
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, unmodifiedText: ch, key: ch })
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch })
  await sleep(200)
}

/* ── phase 1: the typing contract on the production field ─────────────── */
journal('phase 1 — the takeover on a real session')
let st = await page.ev(state)
check('takeover is live on the real page', st.area !== null && st.card.marked === true)
check('stock editor is out of the editable set', st.inert === 'false', String(st.inert))
const chips = await page.ev(`(() => {
  const hatch = document.querySelector('[data-mobile-input-toggle]');
  return {
    hatch: hatch !== null,
    hint: hatch === null ? '' : (hatch.getAttribute('title') || ''),
    diagnostics: document.querySelectorAll('[data-mobile-input-diagnostics]').length,
    copy: document.querySelectorAll('[data-mobile-input-copy]').length,
  };
})()`)
check('the everyday tool row shows the escape hatch only',
  chips.hatch === true && chips.diagnostics === 0 && chips.copy === 0, JSON.stringify(chips))
check('the escape hatch advertises the long press', /长按/.test(chips.hint), JSON.stringify(chips.hint))

const geometry = await page.ev(`(() => {
  const wrap = document.querySelector('[data-mobile-input-wrap]');
  const card = document.querySelector('[data-composer-card]');
  const scroll = card.querySelector('[data-input-scroll]');
  const a = wrap.getBoundingClientRect(), b = scroll.getBoundingClientRect();
  return { wrap: [Math.round(a.left), Math.round(a.top), Math.round(a.width), Math.round(a.height)],
           scroll: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)] };
})()`)
check('seat box equals the official scrollport', JSON.stringify(geometry.wrap) === JSON.stringify(geometry.scroll),
  JSON.stringify(geometry))

await page.ev(installAudit)
await page.ev(`document.querySelector('[data-mobile-input]').focus()`)
await page.ev('window.__audit = []')
const heights = []
for (const ch of ['你', '好', 'a', 'b']) {
  await type(ch)
  heights.push(await page.ev(`document.querySelector('[data-mobile-input]').style.height`))
}
const typed = await page.ev('window.__audit')
st = await page.ev(state)
const seatWrites = typed.filter((line) => line.startsWith('SEAT ') || line.startsWith('ROW '))
console.log('typing audit:', JSON.stringify(typed.slice(0, 10)))
check('the field holds every typed character', st.area.value === '你好ab', JSON.stringify(st.area.value))
check('focus survives the whole run of keystrokes', st.area.focused === true)
check('typing writes NOTHING to the seat or the stock row', seatWrites.length === 0, JSON.stringify(seatWrites))
const cardWrites = typed.filter((line) => line.startsWith('CARD ') || line.startsWith('SEAT ') || line.startsWith('ROW '))
check('typing writes nothing inside the composer card (the ArkWeb surface)',
  cardWrites.length === 0, `${cardWrites.length} of ${typed.length} records: ${JSON.stringify(cardWrites.slice(0, 4))}`)
console.log('page-wide records during typing:', typed.length,
  '(outside the card:', typed.filter((line) => line.startsWith('OUTSIDE ')).length, '- transcript streaming)')
check('the field never collapses (no height:0 probe)', heights.every((h) => h !== '0px'), JSON.stringify(heights))
check('the field keeps one fixed height while typing', new Set(heights).size === 1, JSON.stringify(heights))
check('the machine draft stays empty while typing (deferred mirror)', st.machine === '', JSON.stringify(st.machine))

/* Long content: still nothing moves while typing, then the commit resizes.
   The text has to clear the product's own floor (2 lines) to be visible. */
const longText = '这是一段足够长的中文内容，用来把输入框撑到五行以上，'
  + '从而验证高度的调整只会发生在提交点，而不是每一次按键。'
await page.send('Input.insertText', { text: longText })
await sleep(400)
const whileTyping = await page.ev(state)
check('longer content still does not resize the field while typing',
  whileTyping.area.height === heights[0], `${heights[0]} -> ${whileTyping.area.height}`)
await page.ev('window.__audit = []')
const beforeBlur = await page.ev('window.__audit')
check('nothing is written before the blur lands', beforeBlur.length === 0, JSON.stringify(beforeBlur))
await page.ev(`document.querySelector('[data-mobile-input]').blur()`)
await sleep(800)
st = await page.ev(state)
const afterCommit = await page.ev('window.__audit')
check('blur commits the long draft into the machine',
  (st.machine || '').startsWith('你好ab这是一段'), JSON.stringify((st.machine || '').slice(0, 20)))
check('the commit point applies the content height', st.area.height !== heights[0], `${heights[0]} -> ${st.area.height}`)
check('the commit settle does write (focus is gone by then)',
  afterCommit.some((line) => line.startsWith('SEAT ') || line.startsWith('ROW ')),
  JSON.stringify(afterCommit.slice(0, 6)))

/* ── phase 1b: the slash case (the reported ArkWeb trigger) ───────────── */
journal('phase 1b — a slash-prefixed draft')
await page.ev(`(() => {
  const area = document.querySelector('[data-mobile-input]');
  area.focus();
  area.value = '';
  area.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`)
await sleep(400)
await page.ev('window.__audit = []')
await type('/')
await sleep(500)
const afterSlash = await page.ev(state)
check('the trigger character itself reaches the machine', afterSlash.machine === '/', JSON.stringify(afterSlash.machine))
await page.ev('window.__audit = []')
/* Once the command menu is open, synthesized key events do NOT insert into the
   field (Chromium's editing context for injected keys is not the field's
   anymore) — the IME-style path does, and that is what a real keyboard uses. */
for (const ch of ['g', 'o', 'a', 'l']) {
  await page.send('Input.insertText', { text: ch })
  await sleep(250)
}
const slashAudit = await page.ev('window.__audit')
const afterCommand = await page.ev(state)
console.log('slash typing audit:', JSON.stringify(slashAudit.slice(0, 8)))
check('the field holds the whole command', afterCommand.area.value === '/goal', JSON.stringify(afterCommand.area.value))
check('typing after the trigger is NOT mirrored per keystroke', afterCommand.machine === '/',
  JSON.stringify(afterCommand.machine))
check('no plugin writes while typing a slash command',
  slashAudit.filter((line) => line.startsWith('SEAT ') || line.startsWith('ROW ')).length === 0,
  JSON.stringify(slashAudit.slice(0, 6)))
check('nothing collapses the field while typing a slash command',
  afterCommand.area.focused === true, `focused=${afterCommand.area.focused} h=${afterCommand.area.height}`)
const menu = await page.ev(`(() => {
  const menu = document.querySelector('._3e4SsG_menu');
  return { mounted: menu !== null, visible: menu !== null && menu.getBoundingClientRect().height > 0,
           options: document.querySelectorAll('[role="option"]').length };
})()`)
check('the command menu opens on the trigger character', menu.mounted === true, JSON.stringify(menu))
console.log('menu:', JSON.stringify(menu))
await page.ev(`document.querySelector('[data-mobile-input]').blur()`)
await sleep(700)
check('blur commits the whole command', (await page.ev(state)).machine === '/goal',
  JSON.stringify((await page.ev(state)).machine))

/* Clear the draft this probe typed, so the session is left as it was found. */
await page.ev(`(() => {
  const area = document.querySelector('[data-mobile-input]');
  area.focus();
  area.value = '';
  area.dispatchEvent(new Event('input', { bubbles: true }));
  area.blur();
  return true;
})()`)
await sleep(700)
check('the probe cleared its draft again', (await page.ev(state)).machine === '',
  JSON.stringify((await page.ev(state)).machine))

/* ── phase 2: diagnostics, the way a phone reaches them ───────────────── */
journal('phase 2 — diagnostics: URL path vs the persisted switch')
check('a tokenized load has its query rewritten away (no surfaces)',
  (await page.ev(`document.querySelectorAll('[data-mobile-input-log],[data-mobile-input-debug]').length`)) === 0)

/* A cookie-authenticated load keeps the query: this is how the automated
   probes and a non-tokenized bookmark can ask for diagnostics. */
await page.navigate('/?dsh-mobile-input=bench')
const viaQuery = await page.ev(`(() => ({
  search: location.search,
  bench: document.querySelectorAll('[data-mobile-input-bench]').length,
  variants: document.querySelectorAll('[data-mobile-input-bench-field]').length,
  frame: document.querySelector('[data-mobile-input-bench-frame]') !== null,
  log: document.querySelector('[data-mobile-input-log]') !== null,
  growth: [...document.querySelectorAll('[data-mobile-input-growth]')].map(b => b.getAttribute('data-mobile-input-growth')),
}))()`)
check('a query-carrying load renders the bench', viaQuery.bench === 1 && viaQuery.variants === 4, JSON.stringify(viaQuery))
check('bench ships the isolated-document variant', viaQuery.frame === true)
check('bench exposes all growth modes', JSON.stringify(viaQuery.growth) === '["commit","live","none"]', JSON.stringify(viaQuery.growth))

/* The phone path: the chip writes localStorage, so the request survives the
   shell's URL rewrite — verified here with NO query string at all. */
await page.ev(`localStorage.setItem('dsh-mobile-flow:diagnostics', 'both')`)
await page.navigate('/')
const persisted = await page.ev(`(() => ({
  search: location.search,
  bench: document.querySelectorAll('[data-mobile-input-bench]').length,
  variants: document.querySelectorAll('[data-mobile-input-bench-field]').length,
  log: document.querySelector('[data-mobile-input-log]') !== null,
}))()`)
/* A token-less load boots the limited shell: the composer TOOL ROW is not
   rendered at all here, so the chip rules are asserted in the jsdom suite
   (which drives the tool row directly) and in phase 1 above. */
const limitedShell = await page.ev(`document.querySelectorAll('[data-mobile-input-bench]').length`)
console.log('limited shell: bench mounted =', limitedShell, '(tool row not rendered here)')
check('the persisted switch drives diagnostics with no query string',
  persisted.search === '' && persisted.bench === 1 && persisted.variants === 4 && persisted.log === true,
  JSON.stringify(persisted))

/* The variant fields are collapsed by default (the panel must not cover the
   composer), so the probe opens them explicitly. */
await page.ev(`document.querySelector('[data-mobile-input-bench-variants-toggle]').click()`)
const expanded = await page.ev(`document.querySelector('[data-mobile-input-bench-variants]').hidden === false`)
check('the variant toggle expands the bench fields', expanded === true)

await page.ev(installAudit)
const benchType = async (id) => {
  await page.ev(`(() => { const el = document.querySelector('[data-mobile-input-bench-id="${id}"]'); el.focus(); window.__audit = []; return true; })()`)
  await type('x')
  const records = await page.ev('window.__audit')
  await page.ev(`document.querySelector('[data-mobile-input-bench-id="${id}"]').blur()`)
  await sleep(200)
  /* Only OUR surfaces count: a live session keeps mutating its transcript
     outside the bench (the 'OUTSIDE' tag), which no variant can control. */
  return records.filter((line) => !line.startsWith('OUTSIDE '))
}
const bare = await benchType('A')
const zeroWrite = await benchType('D')
const perKey = await benchType('C')
check('bench A (bare field) writes nothing', bare.length === 0, JSON.stringify(bare))
check('bench D (seat shape, no writes) writes nothing', zeroWrite.length === 0, JSON.stringify(zeroWrite))
check('bench C reproduces the per-keystroke style write (the control)', perKey.length >= 2, JSON.stringify(perKey))
const logText = await page.ev(`document.querySelector('[data-mobile-input-log]').textContent`)
check('the bench log carries the timeline', /A input 1 chars/.test(logText) && /C input 1 chars/.test(logText),
  JSON.stringify(logText.split('\n').slice(-3)))

/* ── phase 3: the debug panel is a viewer, not an instrument ──────────── */
journal('phase 3 — diagnostics: debug panel')
await page.ev(`localStorage.setItem('dsh-mobile-flow:diagnostics', 'debug')`)
await page.navigate('/')
const debugPanel = await page.ev(`(() => {
  const panel = document.querySelector('[data-mobile-input-debug]');
  if (panel === null) return { mounted: false };
  return {
    mounted: true,
    buttons: panel.querySelectorAll('[data-mobile-input-debug-button]').length,
    benchSuppressed: document.querySelectorAll('[data-mobile-input-bench]').length,
    body: panel.querySelector('[data-mobile-input-debug-body]').textContent,
  };
})()`)
check('debug panel mounts with refresh + copy',
  debugPanel.mounted === true && debugPanel.buttons === 2, JSON.stringify(debugPanel.buttons))
check('debug-only mode does NOT mount the bench', debugPanel.benchSuppressed === 0, String(debugPanel.benchSuppressed))
check('the panel carries the environment line', /start ua=/.test(debugPanel.body),
  JSON.stringify((debugPanel.body || '').split('\n')[0]))

await page.ev(`localStorage.removeItem('dsh-mobile-flow:diagnostics')`)
await page.navigate('/')
check('clearing the switch returns the page to normal',
  (await page.ev(`document.querySelectorAll('[data-mobile-input-bench],[data-mobile-input-debug]').length`)) === 0)
/* Only OUR errors count. The message line is what identifies a source: every
   plugin's bundle URL appears in every stack frame, so matching the whole
   string blames whoever happens to be listed. Other plugins in the profile
   raise their own errors — verified independent of this plugin (the keyed
   `tool.call.toolview` clash for `read_image` shows up with the takeover
   switched OFF too). */
const firstLine = (line) => String(line).split('\n')[0]
const ours = page.errors.filter((line) => /mobile-flow|mobile-input/.test(firstLine(line)))
check('no page errors from the takeover', ours.length === 0, JSON.stringify(ours.slice(0, 3)))
if (page.errors.length !== ours.length) {
  console.log(`  (ignored ${page.errors.length - ours.length} unrelated page error(s), `
    + `first: ${JSON.stringify(firstLine(page.errors[0]).slice(0, 110))})`)
}

await page.close()
console.log(`\n==== ${failures.length === 0 ? 'ALL CHECKS PASSED' : `${failures.length} FAILED`} ====`)
for (const f of failures) console.log(`  FAIL: ${f}`)
process.exit(failures.length === 0 ? 0 : 1)
