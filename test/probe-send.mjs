/* Live probe for the send button under the native-input takeover.
 *
 *   node test/probe-send.mjs <launch-token>
 *
 * Phone report (2026-09-21): "with the native input on, I type text and the
 * send button at the bottom right stays grey — it looks like I cannot send".
 * The button is derived from the MACHINE draft, which the takeover keeps
 * deliberately stale while the user types (the ArkWeb fix), so a filled field
 * used to sit next to a disabled, 40 %-opacity button. The old bridge also
 * left the tap to the engine's own click on a control that was disabled when
 * the finger landed — engine-dependent, and under a running turn the same
 * button wore the Stop square.
 *
 * This probe runs against the real app in a 390x844 viewport and checks both
 * halves of the fix:
 *   phase 1 — the LOOK: the button reads enabled as soon as the field holds
 *             text (pure CSS, zero DOM writes while typing);
 *   phase 2 — the TAP: one touch sends, on the first tap, exactly once — and
 *             the gesture is demonstrably OURS (the card's capture pointerdown
 *             was consumed), not the engine happening to click in time;
 *   phase 3 — the RUNNING case: while a turn streams, the button stops wearing
 *             the Stop square once the field holds text, and tapping it hands
 *             the follow-up to the product instead of interrupting the turn.
 *
 * Runs end with `==== ALL CHECKS PASSED ====` or the failure list. The run
 * lands on the workspace's blank session and therefore leaves one test session
 * behind (the app opens a fresh one per boot); delete it from the sidebar when
 * the probe is done.
 */
import { open } from './cdp.mjs'

const token = process.argv[2]
if (token === undefined) {
  console.error('usage: node test/probe-send.mjs <launch-token>')
  process.exit(2)
}

const failures = []
const check = (name, ok, detail) => {
  console.log(`${ok ? '  ✅' : '  ❌'} ${name}${detail === undefined ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(name)
}
const journal = (title) => console.log(`\n── ${title}`)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const page = await open({ token, settle: 12000 })

/* The submit button = the trailing row's last primary control, the same hook
   the plugin's CSS and its tap bridge use. */
const STATE = `(() => {
  const area = document.querySelector('[data-mobile-input]');
  const card = document.querySelector('[data-composer-card]');
  const editor = document.querySelector('[data-composer-input]');
  const primary = [...document.querySelectorAll("[class*='_trailing'] > [class*='_primary']")].at(-1);
  const svg = primary === undefined ? null : primary.querySelector('svg');
  const rect = primary === undefined ? null : primary.getBoundingClientRect();
  return {
    field: area === null ? null : { value: area.value, placeholder: area.placeholder, focused: document.activeElement === area },
    takeover: card !== null && card.hasAttribute('data-mobile-input-active'),
    machine: editor === null ? null : editor.textContent,
    machineEmpty: editor === null ? null : editor.childNodes.length === 0,
    primary: primary === undefined ? null : {
      label: primary.getAttribute('aria-label'), disabled: primary.disabled,
      opacity: getComputedStyle(primary).opacity, cursor: getComputedStyle(primary).cursor,
      svg: svg === null ? 'none' : getComputedStyle(svg).display,
      glyph: getComputedStyle(primary, '::after').width,
      x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2),
    },
    userRows: document.querySelectorAll("[class*='_userRow']").length,
  };
})()`

const state = () => page.ev(STATE)
/** The page's own verdict on whether a string has reached the transcript. */
const pageText = () => page.ev('document.body.innerText')
const waitFor = async (predicate, timeout = 8000) => {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (await predicate()) return true
    await sleep(250)
  }
  return false
}
const tap = async (x, y) => {
  await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  await sleep(60)
  await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}
const type = async (text) => {
  await page.ev(`(() => { document.querySelector('[data-mobile-input]').focus(); return true; })()`)
  await page.send('Input.insertText', { text })
  await sleep(350)
}
const enter = async () => {
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 })
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 })
}

/* Audit: who consumed the tap. Registered AFTER the plugin's own capture
   listener on the same element and phase, so it sees the plugin's verdict —
   `prevented` true means the takeover carried the gesture itself. */
await page.ev(`(() => {
  window.__taps = [];
  const card = document.querySelector('[data-composer-card]');
  card.addEventListener('pointerdown', event => {
    window.__taps.push({
      x: Math.round(event.clientX), y: Math.round(event.clientY),
      prevented: event.defaultPrevented, target: event.target.tagName,
    });
  }, true);
  /* And every write inside the card while typing (the ArkWeb invariant). */
  window.__writes = [];
  new MutationObserver(records => {
    for (const record of records) {
      const el = record.target;
      if (el.closest !== undefined && el.closest('[data-composer-card]') !== null) {
        window.__writes.push(record.type + ':' + (record.attributeName ?? el.tagName));
      }
    }
  }).observe(card, { attributes: true, childList: true, characterData: true, subtree: true });
  return true;
})()`)

/* ── phase 1: the look ─────────────────────────────────────────────────── */
journal('phase 1 — the button follows the FIELD, not the stale machine draft')
let st = await state()
check('the takeover is live on the landing composer', st.takeover === true && st.field !== null)
check('the disabled send button is the product grey to start with',
  st.primary.disabled === true && Number(st.primary.opacity) < 1,
  `opacity=${st.primary.opacity} label=${st.primary.label}`)

await type('你好')
st = await state()
check('the field holds the typed text', st.field.value === '你好', JSON.stringify(st.field.value))
check('the machine draft is still stale (deferred mirror)', st.machineEmpty === true, JSON.stringify(st.machine))
check('the send button now READS as enabled (the reported grey is gone)',
  st.primary.disabled === true && st.primary.opacity === '1' && st.primary.cursor === 'pointer',
  `opacity=${st.primary.opacity} cursor=${st.primary.cursor}`)
check('the product\'s own send arrow is kept (no glyph swap on the send face)',
  st.primary.svg === 'block' && st.primary.glyph === 'auto', `svg=${st.primary.svg} glyph=${st.primary.glyph}`)
const writes = await page.ev('window.__writes')
check('typing still writes NOTHING inside the composer card', writes.length === 0, JSON.stringify(writes.slice(0, 6)))

/* ── phase 2: the tap ──────────────────────────────────────────────────── */
journal('phase 2 — one tap on that button sends')
const before = st.userRows
await tap(st.primary.x, st.primary.y)
const sent = await waitFor(async () => (await state()).userRows > before)
st = await state()
const taps = await page.ev('window.__taps')
const carried = taps.at(-1) !== undefined && taps.at(-1).prevented === true
check('the tap was CARRIED by the takeover, not left to the engine', carried,
  JSON.stringify(taps.at(-1)))
check('the tap sent exactly one message', st.userRows === before + 1, `${before} -> ${st.userRows}`)
check('the message reached the transcript', sent === true)
check('the field and the machine both cleared', st.field.value === '' && st.machineEmpty === true,
  `field=${JSON.stringify(st.field.value)} machine=${JSON.stringify(st.machine)}`)
check('no duplicate send (still one message)', (await state()).userRows === before + 1)
check('the sent message carries the typed text', (await pageText()).includes('你好'))
check('a turn is running (the button became Stop)', st.primary.label === '停止生成',
  JSON.stringify(st.primary.label))

/* ── phase 3: the running case ─────────────────────────────────────────── */
journal('phase 3 — a follow-up typed while the turn streams')
if (st.primary.label === '停止生成') {
  await type('follow-up')
  st = await state()
  check('the button wears the send arrow while the field holds text',
    st.primary.svg === 'none' && st.primary.glyph === '16px',
    `svg=${st.primary.svg} glyph=${st.primary.glyph}`)
  await tap(st.primary.x, st.primary.y)
  const delivered = await waitFor(async () => (await pageText()).includes('follow-up'))
  st = await state()
  const taps2 = await page.ev('window.__taps')
  check('the follow-up tap was carried too', taps2.at(-1).prevented === true, JSON.stringify(taps2.at(-1)))
  check('the follow-up reached the conversation instead of interrupting the turn', delivered === true)
  check('the field gave the follow-up up (it was handed to the product)', st.field.value === '',
    JSON.stringify(st.field.value))
} else {
  /* The model answered before the follow-up could be typed — the running case
     needs a live turn, so report it instead of faking it. */
  console.log('  (skipped: the turn finished before the follow-up could be typed)')
}

/* Page errors: only ours count. Match the MESSAGE line, never the stack — every
   plugin's bundle URL appears in every stack, so a substring match there
   blames whoever happens to be listed (e.g. an unrelated set of plugins
   fighting over one keyed tool-view slot). */
const firstLine = (line) => String(line).split('\n')[0]
const mine = page.errors.filter((line) => /mobile-flow|mobile-input/.test(firstLine(line)))
check('no page error from the takeover', mine.length === 0, JSON.stringify(mine.slice(0, 2)))
if (page.errors.length !== mine.length) {
  console.log(`  (ignored ${page.errors.length - mine.length} unrelated page error(s): ${JSON.stringify(firstLine(page.errors[0]).slice(0, 120))})`)
}

await page.close()
console.log(`\n==== ${failures.length === 0 ? 'ALL CHECKS PASSED' : `${failures.length} FAILED`} ====`)
for (const f of failures) console.log(`  FAIL: ${f}`)
process.exit(failures.length === 0 ? 0 : 1)
