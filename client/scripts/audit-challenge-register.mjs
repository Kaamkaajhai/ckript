const CDP_PORT = Number(process.env.CKRIPT_CDP_PORT || 9224);
const APP_ORIGIN = process.env.CKRIPT_APP_ORIGIN || "http://127.0.0.1:4174";
const widths = [320, 360, 390, 430, 768];
const states = [
  { name: "form", marker: "Continue to payment" },
  { name: "free", marker: "Register for free" },
  { name: "invalid", marker: "Select your country" },
  { name: "pending-payment", marker: "A payment still needs confirmation" },
  { name: "processing", marker: "Processing" },
  { name: "external", marker: "We could not confirm that" },
  { name: "external-pending", marker: "With our team for review" },
  { name: "external-approved", marker: "Registration confirmed" },
  { name: "success", marker: "CGSC-8K4M2QPX" },
  { name: "already", marker: "You are already registered" },
  { name: "closed", marker: "Registration is not open" },
  { name: "role", marker: "A writer account is required" },
  { name: "error", marker: "challenge service is unavailable" },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function openTarget(url) {
  const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  if (!response.ok) throw new Error(`CDP target creation failed: ${response.status}`);
  return response.json();
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 0;
  const pending = new Map();
  ws.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result || {});
  });
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  return {
    ready,
    call(method, params = {}) {
      const id = ++nextId;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close: () => ws.close(),
  };
}

const auditExpression = `(() => {
  const root = document.querySelector('.ckm-root');
  const shell = document.querySelector('[data-shell-mode]');
  const frame = root?.getBoundingClientRect();
  const all = [...document.querySelectorAll('body *')];
  const visible = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  };
  const nearestScroller = (element) => {
    let current = element.parentElement;
    while (current && current !== document.body) {
      const style = getComputedStyle(current);
      if (['auto', 'scroll'].includes(style.overflowX)) return current;
      current = current.parentElement;
    }
    return null;
  };
  const overflow = all.filter((element) => {
    if (!visible(element) || !frame || element === root || element.classList.contains('ckm')) return false;
    const rect = element.getBoundingClientRect();
    if (rect.left >= frame.left - 1 && rect.right <= frame.right + 1) return false;
    return !nearestScroller(element);
  }).map((element) => element.className || element.tagName).slice(0, 12);
  const controls = all.filter((element) => visible(element) && element.matches('a[href],button,input,select,textarea,summary'));
  const targetFailures = controls.filter((element) => {
    const target = element.matches('input[type="radio"],input[type="checkbox"]')
      ? (element.closest('label') || element)
      : element;
    const rect = target.getBoundingClientRect();
    const after = getComputedStyle(target, '::after');
    const afterWidth = parseFloat(after.width) || 0;
    const afterHeight = parseFloat(after.height) || 0;
    return Math.max(rect.width, afterWidth) < 44 || Math.max(rect.height, afterHeight) < 44;
  }).map((element) => ({ name: element.getAttribute('aria-label') || element.textContent.trim().slice(0, 60), box: [Math.round(element.getBoundingClientRect().width), Math.round(element.getBoundingClientRect().height)] })).slice(0, 12);
  const unnamed = controls.filter((element) => {
    if (element.matches('input,select,textarea')) {
      const id = element.id;
      return !(element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') || (id && document.querySelector('label[for="' + CSS.escape(id) + '"]')));
    }
    return !(element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') || element.textContent.trim() || element.querySelector('img[alt]:not([alt=""])'));
  }).map((element) => element.outerHTML.slice(0, 120));
  const smallText = all.filter((element) => {
    if (!visible(element) || element.children.length || !element.textContent.trim()) return false;
    return parseFloat(getComputedStyle(element).fontSize) < 11;
  }).map((element) => ({ text: element.textContent.trim().slice(0, 50), size: getComputedStyle(element).fontSize })).slice(0, 12);
  return {
    shell: shell?.dataset.shellMode || '',
    slots: shell?.dataset.shellSlots || '',
    h1: document.querySelectorAll('h1').length,
    frame: frame ? Math.round(frame.width) : 0,
    docScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    rootScroll: root ? root.scrollWidth - root.clientWidth : 0,
    overflow,
    targetFailures,
    unnamed,
    smallText,
    text: document.body.innerText,
  };
})()`;

const failures = [];
const results = [];
const target = await openTarget("about:blank");
const cdp = connect(target.webSocketDebuggerUrl);
await cdp.ready;
await cdp.call("Page.enable");
await cdp.call("Runtime.enable");

for (const state of states) {
  for (const width of widths) {
    await cdp.call("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: true });
    await cdp.call("Page.navigate", { url: `${APP_ORIGIN}/__mobile-challenge-register?state=${state.name}` });
    let shellReady = false;
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const ready = await cdp.call("Runtime.evaluate", {
        expression: "Boolean(document.querySelector('.ckm-challenge-register') && document.querySelector('[data-shell-mode=\"flow\"]'))",
        returnByValue: true,
      });
      if (ready.result?.value) {
        shellReady = true;
        break;
      }
      await sleep(100);
    }
    if (!shellReady) failures.push(`${state.name}@${width}: registration shell did not become ready`);
    await cdp.call("Runtime.evaluate", { expression: "document.fonts?.ready", awaitPromise: true, returnByValue: true });
    const evaluated = await cdp.call("Runtime.evaluate", { expression: auditExpression, returnByValue: true });
    const value = evaluated.result?.value || {};
    results.push({
      state: state.name,
      width,
      shell: value.shell,
      frame: value.frame,
      findings: (value.overflow?.length || 0) + (value.targetFailures?.length || 0) + (value.unnamed?.length || 0) + (value.smallText?.length || 0),
    });
    const checks = [
      [value.shell === "flow", `shell ${value.shell} != flow`],
      [value.h1 === 1, `h1 count ${value.h1}`],
      [value.docScroll <= 0 && value.rootScroll <= 0, `horizontal scroll document=${value.docScroll} root=${value.rootScroll}`],
      [value.overflow?.length === 0, `overflow ${JSON.stringify(value.overflow)}`],
      [value.targetFailures?.length === 0, `targets ${JSON.stringify(value.targetFailures)}`],
      [value.unnamed?.length === 0, `unnamed ${JSON.stringify(value.unnamed)}`],
      [value.smallText?.length === 0, `small text ${JSON.stringify(value.smallText)}`],
      [String(value.text || "").toLowerCase().includes(state.marker.toLowerCase()), `missing marker ${state.marker}`],
      [value.frame === Math.min(width, 520), `frame ${value.frame} != ${Math.min(width, 520)}`],
    ];
    for (const [ok, reason] of checks) if (!ok) failures.push(`${state.name}@${width}: ${reason}`);
  }
}

cdp.close();
await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${target.id}`);

console.table(results);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Challenge registration sweep passed: ${results.length} state-width measurements, 0 findings.`);
}
