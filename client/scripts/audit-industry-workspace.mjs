const CDP_PORT = Number(process.env.CKRIPT_CDP_PORT || 9226);
const APP_ORIGIN = process.env.CKRIPT_APP_ORIGIN || "http://127.0.0.1:4176";
const widths = [320, 360, 390, 430, 768];
const states = [
  { query: "view=home&state=ready", root: ".ckm-industry-home", marker: "The Last Lantern" },
  { query: "view=home&state=loading", root: ".ckm-industry-home", marker: "Loading your industry desk" },
  { query: "view=home&state=empty", root: ".ckm-industry-home", marker: "No project matches this shelf" },
  { query: "view=home&state=error", root: ".ckm-industry-home", marker: "discovery service is unavailable" },
  { query: "view=home&state=degraded", root: ".ckm-industry-home", marker: "Showing latest projects" },
  { query: "view=dashboard&state=ready", root: ".ckm-industry-dashboard", marker: "Scripts read" },
  { query: "view=dashboard&state=partial", root: ".ckm-industry-dashboard", marker: "Some account data did not load" },
  { query: "view=dashboard&state=ready&role=actor", root: ".ckm-industry-dashboard", marker: "Discovery-only account" },
  { query: "view=dashboard&state=loading", root: ".ckm-industry-dashboard", marker: "Loading industry dashboard" },
  { query: "view=dashboard&state=error", root: ".ckm-industry-dashboard", marker: "account service is unavailable" },
  { query: "view=writers&state=ready", root: ".ckm-writers", marker: "Maya Rao" },
  { query: "view=writers&state=loading", root: ".ckm-writers", marker: "Loading writers" },
  { query: "view=writers&state=empty", root: ".ckm-writers", marker: "No writers in the roster yet" },
  { query: "view=writers&state=error", root: ".ckm-writers", marker: "writer roster is unavailable" },
  { query: "view=writers&state=degraded", root: ".ckm-writers", marker: "Mandate matching is unavailable" },
  { query: "view=mandates&state=ready", root: ".ckm-mandates", marker: "Feature Film" },
  { query: "view=mandates&state=loading", root: ".ckm-mandates", marker: "Loading your mandate" },
  { query: "view=mandates&state=error", root: ".ckm-mandates", marker: "Your mandate is unavailable" },
  { query: "view=mandates&state=save-error", root: ".ckm-mandates", marker: "Your changes were not saved" },
  { query: "view=mandates&state=saved", root: ".ckm-mandates", marker: "Mandate saved" },
  { query: "view=holds&state=ready", root: ".ckm-holds", marker: "The Last Lantern" },
  { query: "view=holds&state=loading", root: ".ckm-holds", marker: "Loading your holds" },
  { query: "view=holds&state=empty", root: ".ckm-holds", marker: "No holds yet" },
  { query: "view=holds&state=error", root: ".ckm-holds", marker: "Could not load your holds" },
  { query: "view=holds&state=release", root: ".ckm-holds", marker: "not refunded" },
];

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
for(const state of states){for(const width of widths){await cdp.call("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:true});await cdp.call("Page.navigate",{url:`${APP_ORIGIN}/__mobile-industry?${state.query}`});let ready=false;for(let i=0;i<100;i+=1){const value=await cdp.call("Runtime.evaluate",{expression:`Boolean(document.querySelector('${state.root}') && document.querySelector('[data-shell-mode="standard"]'))`,returnByValue:true});if(value.result?.value){ready=true;break}await sleep(100)}if(!ready)failures.push(`${state.query}@${width}: shell did not become ready`);if(state.query.includes("state=release")){await cdp.call("Runtime.evaluate",{expression:"document.querySelector('.ckm-holds__release')?.click()"});await sleep(100)}await cdp.call("Runtime.evaluate",{expression:"document.fonts?.ready",awaitPromise:true,returnByValue:true});const evaluated=await cdp.call("Runtime.evaluate",{expression:auditExpression,returnByValue:true});const value=evaluated.result?.value||{};const findings=(value.overflow?.length||0)+(value.targetFailures?.length||0)+(value.unnamed?.length||0)+(value.smallText?.length||0);results.push({state:state.query,width,frame:value.frame,findings});const checks=[[value.shell==="standard",`shell ${value.shell}`],[value.h1===1,`h1 count ${value.h1}`],[value.docScroll<=0&&value.rootScroll<=0,`horizontal scroll document=${value.docScroll} root=${value.rootScroll}`],[value.overflow?.length===0,`overflow ${JSON.stringify(value.overflow)}`],[value.targetFailures?.length===0,`targets ${JSON.stringify(value.targetFailures)}`],[value.unnamed?.length===0,`unnamed ${JSON.stringify(value.unnamed)}`],[value.smallText?.length===0,`small text ${JSON.stringify(value.smallText)}`],[String(value.text||"").toLowerCase().includes(state.marker.toLowerCase()),`missing marker ${state.marker}`],[value.frame===Math.min(width,520),`frame ${value.frame} != ${Math.min(width,520)}`]];for(const[ok,reason]of checks)if(!ok)failures.push(`${state.query}@${width}: ${reason}`)}}
cdp.close();await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${target.id}`);console.table(results);if(failures.length){console.error(failures.join("\n"));process.exitCode=1}else console.log(`Industry workspace sweep passed: ${results.length} state-width measurements, 0 findings.`);
