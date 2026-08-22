const CDP_PORT = Number(process.env.CKRIPT_CDP_PORT || 9225);
const APP_ORIGIN = process.env.CKRIPT_APP_ORIGIN || "http://127.0.0.1:4175";
const widths = [320, 360, 390, 430, 768];
const stateDefinitions = [
  { name: "public-list", shell: "public", marker: "Maya Rao" },
  { name: "list", shell: "standard", marker: "Maya Rao" },
  { name: "loading", shell: "standard", marker: "Loading the Hall of Fame" },
  { name: "empty", shell: "standard", marker: "No results yet" },
  { name: "list-error", shell: "standard", marker: "archive service is unavailable" },
  { name: "detail", shell: "detail", marker: "Winning does not publish a private screenplay" },
  { name: "detail-empty", shell: "detail", marker: "Winning does not publish a private screenplay" },
  { name: "detail-error", shell: "detail", marker: "archive service is unavailable" },
  { name: "not-found", shell: "detail", marker: "Competition record not found" },
];
const requestedState = String(process.env.CKRIPT_AUDIT_STATE || "").trim();
const states = requestedState ? stateDefinitions.filter(({ name }) => name === requestedState) : stateDefinitions;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function openTarget(url) { const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(url)}`, { method: "PUT" }); if (!response.ok) throw new Error(`CDP target creation failed: ${response.status}`); return response.json(); }
function connect(wsUrl) { const ws = new WebSocket(wsUrl); let nextId = 0; const pending = new Map(); ws.addEventListener("message", ({ data }) => { const message = JSON.parse(data); if (!message.id || !pending.has(message.id)) return; const task = pending.get(message.id); pending.delete(message.id); if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result || {}); }); const ready = new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); }); return { ready, call(method, params = {}) { const id = ++nextId; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); }, close: () => ws.close() }; }

const auditExpression = `(() => {
  const root=document.querySelector('.ckm-root'),shell=document.querySelector('[data-shell-mode]'),frame=root?.getBoundingClientRect(),all=[...document.querySelectorAll('body *')];
  const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
  const nearestScroller=e=>{let c=e.parentElement;while(c&&c!==document.body){if(['auto','scroll'].includes(getComputedStyle(c).overflowX))return c;c=c.parentElement}return null};
  const overflow=all.filter(e=>{if(!visible(e)||!frame||e===root||e.classList.contains('ckm'))return false;const r=e.getBoundingClientRect();return !(r.left>=frame.left-1&&r.right<=frame.right+1)&&!nearestScroller(e)}).map(e=>e.className||e.tagName).slice(0,12);
  const controls=all.filter(e=>visible(e)&&e.matches('a[href],button,input,select,textarea,summary'));
  const targetFailures=controls.filter(e=>{const t=e.matches('input[type="radio"],input[type="checkbox"]')?(e.closest('label')||e):e,r=t.getBoundingClientRect(),a=getComputedStyle(t,'::after');return Math.max(r.width,parseFloat(a.width)||0)<44||Math.max(r.height,parseFloat(a.height)||0)<44}).map(e=>({name:e.getAttribute('aria-label')||e.textContent.trim().slice(0,60),box:[Math.round(e.getBoundingClientRect().width),Math.round(e.getBoundingClientRect().height)]})).slice(0,12);
  const unnamed=controls.filter(e=>!(e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||e.textContent.trim()||e.querySelector('img[alt]:not([alt=""])'))).map(e=>e.outerHTML.slice(0,120));
  const smallText=all.filter(e=>visible(e)&&!e.children.length&&e.textContent.trim()&&parseFloat(getComputedStyle(e).fontSize)<11).map(e=>({text:e.textContent.trim().slice(0,50),size:getComputedStyle(e).fontSize})).slice(0,12);
  return{shell:shell?.dataset.shellMode||'',h1:document.querySelectorAll('h1').length,frame:frame?Math.round(frame.width):0,docScroll:document.documentElement.scrollWidth-document.documentElement.clientWidth,rootScroll:root?root.scrollWidth-root.clientWidth:0,overflow,targetFailures,unnamed,smallText,text:document.body.innerText};
})()`;

const failures=[]; const results=[]; const target=await openTarget("about:blank"); const cdp=connect(target.webSocketDebuggerUrl); await cdp.ready; await cdp.call("Page.enable"); await cdp.call("Runtime.enable");
for(const state of states){for(const width of widths){await cdp.call("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:true});await cdp.call("Page.navigate",{url:`${APP_ORIGIN}/__mobile-hall-of-fame?state=${state.name}`});let ready=false;for(let i=0;i<100;i+=1){const value=await cdp.call("Runtime.evaluate",{expression:`Boolean(document.querySelector('.ckm-hall') && document.querySelector('[data-shell-mode="${state.shell}"]'))`,returnByValue:true});if(value.result?.value){ready=true;break}await sleep(100)}if(!ready){const diagnostic=await cdp.call("Runtime.evaluate",{expression:"document.body.innerText.slice(0,500)",returnByValue:true});failures.push(`${state.name}@${width}: Hall of Fame shell did not become ready (${diagnostic.result?.value || "blank"})`)}await cdp.call("Runtime.evaluate",{expression:"document.fonts?.ready",awaitPromise:true,returnByValue:true});const evaluated=await cdp.call("Runtime.evaluate",{expression:auditExpression,returnByValue:true});const value=evaluated.result?.value||{};results.push({state:state.name,width,shell:value.shell,frame:value.frame,findings:(value.overflow?.length||0)+(value.targetFailures?.length||0)+(value.unnamed?.length||0)+(value.smallText?.length||0)});const checks=[[value.shell===state.shell,`shell ${value.shell} != ${state.shell}`],[value.h1===1,`h1 count ${value.h1}`],[value.docScroll<=0&&value.rootScroll<=0,`horizontal scroll document=${value.docScroll} root=${value.rootScroll}`],[value.overflow?.length===0,`overflow ${JSON.stringify(value.overflow)}`],[value.targetFailures?.length===0,`targets ${JSON.stringify(value.targetFailures)}`],[value.unnamed?.length===0,`unnamed ${JSON.stringify(value.unnamed)}`],[value.smallText?.length===0,`small text ${JSON.stringify(value.smallText)}`],[String(value.text||"").toLowerCase().includes(state.marker.toLowerCase()),`missing marker ${state.marker}`],[value.frame===Math.min(width,520),`frame ${value.frame} != ${Math.min(width,520)}`]];for(const[ok,reason]of checks)if(!ok)failures.push(`${state.name}@${width}: ${reason}`)}}
cdp.close();await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${target.id}`);console.table(results);if(failures.length){console.error(failures.join("\n"));process.exitCode=1}else console.log(`Hall of Fame sweep passed: ${results.length} state-width measurements, 0 findings.`);
