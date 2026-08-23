const CDP_PORT = Number(process.env.CKRIPT_CDP_PORT || 9224);
const APP_ORIGIN = process.env.CKRIPT_APP_ORIGIN || "http://127.0.0.1:4174";
const widths = [320, 360, 390, 430, 768];
const states = [
  { name: "live", query: "tab=live", marker: "Global Script Challenge 2026", shell: "standard" },
  { name: "past", query: "tab=past", marker: "Winter Stories 2025", shell: "standard" },
  { name: "hall", query: "tab=hall-of-fame", marker: "3 writers honoured", shell: "standard" },
  { name: "mine", query: "tab=mine", marker: "CGSC-7KQ9M2RX", shell: "standard" },
  { name: "timeline", query: "tab=mine&state=timeline", marker: "Certificate available", shell: "standard", click: "Show timeline" },
  { name: "empty", query: "tab=mine&state=empty", marker: "No challenge entries", shell: "standard" },
  { name: "public", query: "tab=live&state=public", marker: "Sign in", shell: "public" },
  { name: "public-error", query: "tab=live&state=public-error", marker: "Challenges are unavailable", shell: "standard" },
  { name: "mine-error", query: "tab=mine&state=mine-error", marker: "Your challenges are unavailable", shell: "standard" },
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
  const controls = all.filter((element) => visible(element) && element.matches('a[href],button,input,select,textarea,[role="tab"]'));
  const targetFailures = controls.filter((element) => {
    const rect = element.getBoundingClientRect();
    const after = getComputedStyle(element, '::after');
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
    h1: document.querySelectorAll('h1').length,
    selectedTabs: document.querySelectorAll('[role="tab"][aria-selected="true"]').length,
    panels: document.querySelectorAll('[role="tabpanel"]').length,
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

for (const state of states) {
  for (const width of widths) {
    const url = `${APP_ORIGIN}/__mobile-challenges?${state.query}`;
    const target = await openTarget("about:blank");
    const cdp = connect(target.webSocketDebuggerUrl);
    await cdp.ready;
    await cdp.call("Page.enable");
    await cdp.call("Runtime.enable");
    await cdp.call("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: true });
    await cdp.call("Page.navigate", { url });
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const ready = await cdp.call("Runtime.evaluate", {
        expression: "Boolean(document.querySelector('.ckm-root') && document.querySelector('[data-shell-mode]'))",
        returnByValue: true,
      });
      if (ready.result?.value) break;
      await sleep(100);
    }
    await cdp.call("Runtime.evaluate", { expression: "document.fonts?.ready", awaitPromise: true, returnByValue: true });
    if (state.click) {
      await cdp.call("Runtime.evaluate", {
        expression: `([...document.querySelectorAll('button')].find((button) => button.textContent.includes(${JSON.stringify(state.click)}))?.click(), true)`,
        returnByValue: true,
      });
      await sleep(100);
    }
    const evaluated = await cdp.call("Runtime.evaluate", { expression: auditExpression, returnByValue: true });
    const value = evaluated.result?.value || {};
    const row = {
      state: state.name,
      width,
      shell: value.shell,
      frame: value.frame,
      findings: (value.overflow?.length || 0) + (value.targetFailures?.length || 0) + (value.unnamed?.length || 0) + (value.smallText?.length || 0),
    };
    results.push(row);
    const checks = [
      [value.shell === state.shell, `shell ${value.shell} != ${state.shell}`],
      [value.h1 === 1, `h1 count ${value.h1}`],
      [value.selectedTabs === 1, `selected tab count ${value.selectedTabs}`],
      [value.panels === 1, `tabpanel count ${value.panels}`],
      [value.docScroll <= 0 && value.rootScroll <= 0, `horizontal scroll document=${value.docScroll} root=${value.rootScroll}`],
      [value.overflow?.length === 0, `overflow ${JSON.stringify(value.overflow)}`],
      [value.targetFailures?.length === 0, `targets ${JSON.stringify(value.targetFailures)}`],
      [value.unnamed?.length === 0, `unnamed ${JSON.stringify(value.unnamed)}`],
      [value.smallText?.length === 0, `small text ${JSON.stringify(value.smallText)}`],
      [String(value.text || "").includes(state.marker), `missing marker ${state.marker}`],
      [value.frame === Math.min(width, 520), `frame ${value.frame} != ${Math.min(width, 520)}`],
    ];
    for (const [ok, reason] of checks) if (!ok) failures.push(`${state.name}@${width}: ${reason}`);
    cdp.close();
    await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${target.id}`);
  }
}

console.table(results);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Challenge hub sweep passed: ${results.length} state-width measurements, 0 findings.`);
}
