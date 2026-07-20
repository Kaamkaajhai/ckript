import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { useDarkMode } from "../../context/DarkModeContext";

import { diff_match_patch as DiffMatchPatch } from "diff-match-patch";

// Strip HTML tags
const stripHtml = (h) => String(h||"").replace(/<br\s*\/?>/gi,"\n").replace(/<\/p>/gi,"\n").replace(/<p[^>]*>/gi,"").replace(/<\/div>/gi,"\n").replace(/<div[^>]*>/gi,"").replace(/<[^>]+>/g,"").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\n{3,}/g,"\n\n").trim();

// LCS line diff → [{type:'equal'|'delete'|'insert', text, oldLine, newLine}]
function lineDiff(a, b) {
  const dmp = new DiffMatchPatch();
  const text1 = String(a || "").replace(/\r\n/g, "\n");
  const text2 = String(b || "").replace(/\r\n/g, "\n");

  const aLines = dmp.diff_linesToChars_(text1, text2);
  const diffs = dmp.diff_main(aLines.chars1, aLines.chars2, false);
  dmp.diff_charsToLines_(diffs, aLines.lineArray);
  dmp.diff_cleanupSemantic(diffs);

  const out = [];
  let ol = 1, nl = 1;

  for (const [op, text] of diffs) {
    const lines = text.split("\n");
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.pop();
    }

    for (const line of lines) {
      if (op === 0) {
        out.push({ type: "equal", text: line, oldLine: ol++, newLine: nl++ });
      } else if (op === -1) {
        out.push({ type: "delete", text: line, oldLine: ol++, newLine: null });
      } else if (op === 1) {
        out.push({ type: "insert", text: line, oldLine: null, newLine: nl++ });
      }
    }
  }

  return out;
}

// Group flat diff into blocks: {type:'context',lines[]} | {type:'change',id,removed[],inserted[]}
function groupBlocks(diff) {
  const blocks=[]; let ci=0;
  let i=0;
  const dmp = new DiffMatchPatch();

  while(i<diff.length){
    if(diff[i].type==="equal"){
      const ctx=[];
      while(i<diff.length&&diff[i].type==="equal") ctx.push(diff[i++]);
      blocks.push({type:"context",lines:ctx});
    } else {
      const removed=[],inserted=[];
      while(i<diff.length&&diff[i].type!=="equal"){
        if(diff[i].type==="delete") removed.push(diff[i]);
        else inserted.push(diff[i]);
        i++;
      }

      // Intra-line highlighting
      if (removed.length > 0 && inserted.length > 0) {
        const removedText = removed.map(l => l.text).join("\n");
        const insertedText = inserted.map(l => l.text).join("\n");
        const intraDiffs = dmp.diff_main(removedText, insertedText);
        dmp.diff_cleanupSemantic(intraDiffs);

        let rLineIdx = 0, iLineIdx = 0;
        removed.forEach(l => l.segments = []);
        inserted.forEach(l => l.segments = []);

        for (const [op, text] of intraDiffs) {
          if (op === -1 || op === 0) {
            const parts = text.split("\n");
            for (let pi = 0; pi < parts.length; pi++) {
              if (rLineIdx < removed.length && parts[pi].length > 0) {
                removed[rLineIdx].segments.push({ type: op === -1 ? "delete" : "equal", text: parts[pi] });
              }
              if (pi < parts.length - 1) rLineIdx++;
            }
          }
          if (op === 1 || op === 0) {
            const parts = text.split("\n");
            for (let pi = 0; pi < parts.length; pi++) {
              if (iLineIdx < inserted.length && parts[pi].length > 0) {
                inserted[iLineIdx].segments.push({ type: op === 1 ? "insert" : "equal", text: parts[pi] });
              }
              if (pi < parts.length - 1) iLineIdx++;
            }
          }
        }
      }

      blocks.push({type:"change",id:ci++,removed,inserted});
    }
  }
  return blocks;
}

// Apply per-block decisions to produce merged text
function applyDecisions(blocks, decisions) {
  const lines=[];
  for(const b of blocks){
    if(b.type==="context"){ for(const l of b.lines) lines.push(l.text); }
    else {
      const d=decisions[b.id]??"incoming";
      if(d==="current"||d==="both") for(const l of b.removed) lines.push(l.text);
      if(d==="incoming"||d==="both") for(const l of b.inserted) lines.push(l.text);
    }
  }
  return lines.join("\n");
}

const CONTEXT=3;

// Trim context block lines for display (show at most CONTEXT lines on each edge)
function trimContext(lines, isFirst, isLast) {
  if(lines.length<=CONTEXT*2) return {before:lines,sep:null,after:[]};
  const before=isFirst?[]:lines.slice(0,CONTEXT);
  const after=isLast?[]:lines.slice(-CONTEXT);
  const hidden=lines.length-before.length-after.length;
  return {before,sep:hidden,after};
}

// Theme palettes. The diff add/delete colours stay semantic (green/red) in both themes; the surrounding
// chrome tracks the app's light/dark toggle so the modal matches the rest of the product.
const DARK = {
  overlay:"rgba(0,0,0,.55)", bg:"#0d1117", surface:"#161b22", border:"#30363d", muted:"#7d8590", text:"#e6edf3",
  addBg:"#0f2f1f", addBorder:"#3fb950", addText:"#aff5b4",
  delBg:"#2d1212", delBorder:"#f85149", delText:"#ffa198",
  hunkBg:"#1c2128", hunkText:"#79c0ff", codeAccent:"#79c0ff",
  curBtn:"#1a3a5c", incBtn:"#1a3a1a", bothBtn:"#2a2010",
  blockHeaderBg:"#12191f",
  curBandBg:"#1e0f0f", curBandBorder:"#3d1a1a",
  incBandBg:"#0a1f0a", incBandBorder:"#1a3d1a",
  segInsBg:"#2ea04340", segDelBg:"#f8514940",
  chipBg:"#21262d",
  warnBorder:"#d2992260", warnBg:"#1a150a", warnText:"#e3b341",
  mergedBorder:"#6e40c940", mergedBg:"#1a0a3a", mergedText:"#c084fc",
  rejBorder:"#f8514940", rejBg:"#2d0f0f", rejText:"#fca5a5",
  errBorder:"#f8514940", errBg:"#f8514911", errText:"#ff7b72",
  focusBorder:"#388bfd",
  approveBg:"#238636", approveBorder:"#2ea04320",
  rejBtnBg:"#f8514915", rejBtnBorder:"#f8514940", rejBtnText:"#f85149",
  badgeMerged:"#6e40c9", badgeRejected:"#b91c1c", badgeOpen:"#238636",
};
const LIGHT = {
  overlay:"rgba(0,0,0,.5)", bg:"#ffffff", surface:"#f6f8fa", border:"#e4e2dc", muted:"#57606a", text:"#1f2328",
  addBg:"#e6ffec", addBorder:"#2da44e", addText:"#116329",
  delBg:"#ffebe9", delBorder:"#cf222e", delText:"#82071e",
  hunkBg:"#ddf4ff", hunkText:"#0969da", codeAccent:"#0969da",
  curBtn:"#ddf4ff", incBtn:"#dafbe1", bothBtn:"#fff8c5",
  blockHeaderBg:"#f6f8fa",
  curBandBg:"#ffebe9", curBandBorder:"#ffcecb",
  incBandBg:"#e6ffec", incBandBorder:"#bff5c9",
  segInsBg:"#2da44e33", segDelBg:"#cf222e33",
  chipBg:"#eaeef2",
  warnBorder:"#d4a72c66", warnBg:"#fff8e6", warnText:"#7d4e00",
  mergedBorder:"#8250df66", mergedBg:"#faf5ff", mergedText:"#8250df",
  rejBorder:"#cf222e40", rejBg:"#fff0ee", rejText:"#a40e26",
  errBorder:"#cf222e40", errBg:"#ffebe9", errText:"#cf222e",
  focusBorder:"#D14D37",
  approveBg:"#1f883d", approveBorder:"#1f883d",
  rejBtnBg:"#fff0ee", rejBtnBorder:"#cf222e40", rejBtnText:"#cf222e",
  badgeMerged:"#8250df", badgeRejected:"#cf222e", badgeOpen:"#1f883d",
};

function LineRow({line, C}){
  const isAdd=line.type==="insert", isDel=line.type==="delete";
  const bg=isAdd?C.addBg:isDel?C.delBg:"transparent";
  const bl=isAdd?`2px solid ${C.addBorder}`:isDel?`2px solid ${C.delBorder}`:"2px solid transparent";
  const tc=isAdd?C.addText:isDel?C.delText:C.text;
  const lc=isAdd?C.addBorder:isDel?C.delBorder:C.muted;
  const pfx=isAdd?"+":isDel?"−":" ";
  return(
    <tr style={{background:bg}}>
      <td style={{width:40,minWidth:40,padding:"0 8px",textAlign:"right",color:lc,userSelect:"none",borderRight:`1px solid ${C.border}`,opacity:(isDel||line.type==="equal")?1:0.3,fontFamily:"monospace",fontSize:12}}>
        {line.oldLine??""}</td>
      <td style={{width:40,minWidth:40,padding:"0 8px",textAlign:"right",color:lc,userSelect:"none",borderRight:`1px solid ${C.border}`,opacity:(isAdd||line.type==="equal")?1:0.3,fontFamily:"monospace",fontSize:12}}>
        {line.newLine??""}</td>
      <td style={{width:16,padding:"0 4px 0 10px",color:lc,userSelect:"none",fontWeight:"bold",borderLeft:bl,fontFamily:"monospace",fontSize:12}}>{pfx}</td>
      <td style={{padding:"0 12px 0 4px",color:tc,whiteSpace:"pre-wrap",wordBreak:"break-all",fontFamily:"monospace",fontSize:12}}>
        {line.segments ? line.segments.map((seg, i) => (
          <span key={i} style={{
            background: seg.type === "insert" ? C.segInsBg : seg.type === "delete" ? C.segDelBg : "transparent",
            borderRadius: 2
          }}>{seg.text}</span>
        )) : (line.text || " ")}
      </td>
    </tr>
  );
}

function HunkSep({count,oldStart,newStart,C}){
  return(
    <tr>
      <td colSpan={4} style={{background:C.hunkBg,color:C.hunkText,padding:"3px 12px",userSelect:"none",fontFamily:"monospace",fontSize:11,borderTop:`1px solid ${C.border}`}}>
        @@ -{oldStart} +{newStart} @@ {count>0?`··· ${count} hidden lines ···`:""}
      </td>
    </tr>
  );
}

const OPTS=[
  {id:"current",  label:"Accept Current",  desc:"Keep base branch",  color:"#388bfd"},
  {id:"incoming", label:"Accept Incoming",  desc:"Take PR changes",   color:"#3fb950"},
  {id:"both",     label:"Accept Both",      desc:"Keep both versions",color:"#d29922"},
];

function ChangeBlock({block, decision, onDecide, readOnly, C}){
  const d=decision??"incoming";
  const hasRemoved=block.removed.length>0;
  const hasInserted=block.inserted.length>0;
  const isModify=hasRemoved&&hasInserted;
  const label=isModify?"Modified":hasInserted?"Added":"Removed";
  const labelColor=isModify?"#d29922":hasInserted?C.addBorder:C.delBorder;

  return(
    <div style={{borderTop:`1px solid ${C.border}`}}>
      {/* Block header */}
      <div style={{background:C.blockHeaderBg,padding:"4px 12px",display:"flex",alignItems:"center",gap:8,borderTop:`1px solid ${C.border}`}}>
        <span style={{fontSize:10,fontWeight:700,color:labelColor,letterSpacing:1,textTransform:"uppercase"}}>{label}</span>
        {!readOnly&&isModify&&(
          <span style={{fontSize:10,color:C.muted,marginLeft:4}}>— choose how to resolve</span>
        )}
        <div style={{marginLeft:"auto",display:"flex",gap:4}}>
          {!readOnly&&OPTS.map(o=>(
            <button key={o.id} type="button" onClick={()=>onDecide(o.id)}
              title={o.desc}
              style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,border:`1px solid ${d===o.id?o.color:C.border}`,
                background:d===o.id?(o.id==="current"?C.curBtn:o.id==="incoming"?C.incBtn:C.bothBtn):"transparent",
                color:d===o.id?o.color:C.muted,cursor:"pointer",transition:"all .15s"}}>
              {o.label}
            </button>
          ))}
          {readOnly&&<span style={{fontSize:10,color:C.muted}}>read-only</span>}
        </div>
      </div>

      {/* Removed lines */}
      {hasRemoved&&(
        <>
          {!readOnly&&hasInserted&&(
            <div style={{padding:"2px 12px",fontSize:10,fontWeight:600,color:C.delBorder,background:C.curBandBg,borderTop:`1px solid ${C.curBandBorder}`,letterSpacing:.5}}>
              ▼ CURRENT (base)
            </div>
          )}
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <tbody>{block.removed.map((l,i)=><LineRow key={i} line={l} C={C}/>)}</tbody>
          </table>
        </>
      )}

      {/* Inserted lines */}
      {hasInserted&&(
        <>
          {!readOnly&&hasRemoved&&(
            <div style={{padding:"2px 12px",fontSize:10,fontWeight:600,color:C.addBorder,background:C.incBandBg,borderTop:`1px solid ${C.incBandBorder}`,letterSpacing:.5}}>
              ▲ INCOMING (PR)
            </div>
          )}
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <tbody>{block.inserted.map((l,i)=><LineRow key={i} line={l} C={C}/>)}</tbody>
          </table>
        </>
      )}

      {/* Decision indicator */}
      {!readOnly&&(
        <div style={{padding:"3px 12px",fontSize:10,background:C.bg,color:C.muted,borderTop:`1px solid ${C.border}`}}>
          Result: {d==="current"?"Using current (base) lines":d==="incoming"?"Using incoming (PR) lines":"Keeping both versions"}
        </div>
      )}
    </div>
  );
}

export default function PullRequestDiffModal({scriptId, pr, onClose, onReviewed}){
  const { isDarkMode } = useDarkMode();
  const C = isDarkMode ? DARK : LIGHT;

  const [loading,setLoading]=useState(true);
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState("");
  const [rawData,setRawData]=useState(null);
  const [note,setNote]=useState("");
  const [decisions,setDecisions]=useState({});

  const isReadOnly=String(pr?.status||"open")!=="open";

  useEffect(()=>{
    let dead=false;
    (async()=>{
      try{ setLoading(true); setError("");
        const {data}=await api.get(`/collab/${scriptId}/prs/${pr._id}/diff`);
        if(!dead) setRawData(data);
      }catch(e){ if(!dead) setError(e?.response?.data?.error||"Failed to load diff."); }
      finally{ if(!dead) setLoading(false); }
    })();
    return()=>{ dead=true; };
  },[pr?._id,scriptId]);

  const {blocks,additions,deletions,changeCount}=useMemo(()=>{
    if(!rawData) return {blocks:[],additions:0,deletions:0,changeCount:0};
    const old=stripHtml(rawData.mainContent||"");
    const nw=stripHtml(rawData.branchContent||"");
    const diff=lineDiff(old,nw);
    const blks=groupBlocks(diff);
    const changes=blks.filter(b=>b.type==="change");
    return{
      blocks:blks,
      additions:diff.filter(l=>l.type==="insert").length,
      deletions:diff.filter(l=>l.type==="delete").length,
      changeCount:changes.length,
    };
  },[rawData]);

  // Auto-default all change blocks to "incoming"
  useEffect(()=>{
    if(!blocks.length) return;
    setDecisions(prev=>{
      const next={...prev};
      blocks.forEach(b=>{ if(b.type==="change"&&next[b.id]===undefined) next[b.id]="incoming"; });
      return next;
    });
  },[blocks]);

  const mergedContent=useMemo(()=>applyDecisions(blocks,decisions),[blocks,decisions]);
  const resolvedCount=Object.keys(decisions).length;
  const hasChanges=additions>0||deletions>0;

  const submitReview=async(decision)=>{
    if(decision==="rejected"&&!note.trim()){ setError("Rejection note is required."); return; }
    if(!window.confirm(decision==="approved"?"Approve and merge this PR?":"Reject this PR?")) return;
    try{
      setSubmitting(true); setError("");
      await api.post(`/collab/${scriptId}/prs/${pr._id}/review`,{
        decision, note,
        mergeDecisions:[],
        ...(decision==="approved"?{mergedContent}:{}),
      });
      onReviewed?.(decision);
    }catch(e){ setError(e?.response?.data?.error||"Failed to submit review."); }
    finally{ setSubmitting(false); }
  };

  const decide=(blockId,choice)=>setDecisions(p=>({...p,[blockId]:choice}));

  const statusBadge=isReadOnly
    ?{label:pr?.status==="approved"?"Merged":"Rejected",bg:pr?.status==="approved"?C.badgeMerged:C.badgeRejected}
    :{label:"Open",bg:C.badgeOpen};

  return(
    <div style={{position:"fixed",inset:0,zIndex:100,background:C.overlay,backdropFilter:"blur(4px)",display:"flex",alignItems:"stretch",padding:"0"}} onMouseDown={onClose}>
      <div onMouseDown={(e)=>e.stopPropagation()} style={{margin:"auto",width:"100%",maxWidth:960,display:"flex",flexDirection:"column",background:C.bg,border:`1px solid ${C.border}`,borderRadius:16,maxHeight:"calc(100vh - 32px)",overflow:"hidden",boxShadow:"0 24px 70px rgba(0,0,0,.35)"}}>

        {/* Header */}
        <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"12px 20px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:statusBadge.bg,color:"#fff"}}>{statusBadge.label}</span>
              <span style={{fontSize:14,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {rawData?.title||pr?.title||"Pull Request Review"}
              </span>
            </div>
            <div style={{marginTop:2,fontSize:11,color:C.muted}}>
              by {rawData?.authorName||pr?.authorId?.name||"Unknown"} · merging into <code style={{color:C.codeAccent}}>main</code>
              {!isReadOnly&&changeCount>0&&<span style={{marginLeft:8,color:C.muted}}>· {resolvedCount}/{changeCount} blocks resolved</span>}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",padding:4,borderRadius:6}}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.06 1.06L9.06 8l3.22 3.22a.749.749 0 0 1-1.06 1.06L8 9.06l-3.22 3.22a.749.749 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:"auto",background:C.bg}}>
          {loading?(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,gap:10,color:C.muted}}>
              <svg style={{animation:"spin 1s linear infinite"}} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity=".2"/>
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
              </svg>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <span style={{fontSize:13}}>Loading diff…</span>
            </div>
          ):error&&!rawData?(
            <div style={{margin:20,padding:"10px 14px",borderRadius:8,border:`1px solid ${C.errBorder}`,background:C.errBg,color:C.errText,fontSize:13}}>{error}</div>
          ):(
            <div style={{padding:16,display:"flex",flexDirection:"column",gap:16}}>

              {/* Stats */}
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <span style={{padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:700,background:C.chipBg,color:C.text,border:`1px solid ${C.border}`}}>1 file changed</span>
                <span style={{fontSize:13,fontWeight:700,color:C.addBorder}}>+{additions} additions</span>
                <span style={{fontSize:13,fontWeight:700,color:C.delBorder}}>−{deletions} deletions</span>
                {hasChanges&&(
                  <div style={{display:"flex",height:8,width:100,borderRadius:4,overflow:"hidden",background:C.chipBg}}>
                    <div style={{width:`${Math.round(additions/(additions+deletions)*100)}%`,background:C.addBorder}}/>
                    <div style={{width:`${Math.round(deletions/(additions+deletions)*100)}%`,background:C.delBorder}}/>
                  </div>
                )}
              </div>

              {/* Outdated branch warning */}
              {rawData?.isOutdated && (
                <div style={{padding:"10px 14px",borderRadius:8,border:`1px solid ${C.warnBorder}`,background:C.warnBg,color:C.warnText,fontSize:13,display:"flex",gap:8,alignItems:"flex-start"}}>
                  <span style={{fontSize:16,lineHeight:1}}>⚠️</span>
                  <span>
                    <strong>This branch was created before recent changes were merged into the script.</strong>{" "}
                    Conflicts are highlighted below. Please resolve each one carefully using the{" "}
                    <strong>Accept Current</strong> / <strong>Accept Incoming</strong> / <strong>Accept Both</strong> options.
                  </span>
                </div>
              )}

              {/* Diff area */}
              <div style={{borderRadius:8,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                {/* File bar */}
                <div style={{background:C.surface,padding:"8px 14px",display:"flex",alignItems:"center",gap:8,borderBottom:`1px solid ${C.border}`}}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill={C.muted}><path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688Z"/></svg>
                  <span style={{fontFamily:"monospace",fontSize:12,color:C.text}}>script.txt</span>
                  {!isReadOnly&&changeCount>0&&(
                    <span style={{marginLeft:"auto",fontSize:11,color:C.muted}}>{changeCount} change block{changeCount!==1?"s":""} — resolve each below</span>
                  )}
                </div>

                {!hasChanges?(
                  <div style={{padding:"40px 20px",textAlign:"center",color:C.muted,fontSize:13}}>No differences — branches are identical.</div>
                ):(
                  <div style={{overflowX:"auto"}}>
                    {blocks.map((block,bi)=>{
                      if(block.type==="context"){
                        const isFirst=bi===0;
                        const isLast=bi===blocks.length-1;
                        const {before,sep,after}=trimContext(block.lines,isFirst,isLast);
                        const firstOld=block.lines[0]?.oldLine??"";
                        const firstNew=block.lines[0]?.newLine??"";
                        return(
                          <div key={bi}>
                            {!isFirst&&before.length===0&&sep===null&&after.length===0?(
                              <HunkSep count={block.lines.length} oldStart={firstOld} newStart={firstNew} C={C}/>
                            ):(
                              <>
                                {sep!==null&&!isFirst&&(
                                  <>
                                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                                      <tbody>{before.map((l,i)=><LineRow key={i} line={l} C={C}/>)}</tbody>
                                    </table>
                                    <HunkSep count={sep} oldStart={before[before.length-1]?.oldLine??""} newStart={before[before.length-1]?.newLine??""} C={C}/>
                                  </>
                                )}
                                {(sep===null||isFirst)&&(
                                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                                    <tbody>{before.map((l,i)=><LineRow key={i} line={l} C={C}/>)}</tbody>
                                  </table>
                                )}
                                {after.length>0&&(
                                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                                    <tbody>{after.map((l,i)=><LineRow key={`a${i}`} line={l} C={C}/>)}</tbody>
                                  </table>
                                )}
                              </>
                            )}
                          </div>
                        );
                      }
                      return(
                        <ChangeBlock key={bi} block={block} decision={decisions[block.id]} onDecide={c=>decide(block.id,c)} readOnly={isReadOnly} C={C}/>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reviewed banner */}
              {isReadOnly&&(
                <div style={{padding:"10px 16px",borderRadius:8,border:`1px solid ${pr?.status==="approved"?C.mergedBorder:C.rejBorder}`,background:pr?.status==="approved"?C.mergedBg:C.rejBg,color:pr?.status==="approved"?C.mergedText:C.rejText,fontSize:13}}>
                  <strong>{pr?.status==="approved"?"✓ Merged":"✕ Rejected"}.</strong>
                  {pr?.reviewNote&&<span> Reviewer note: {pr.reviewNote}</span>}
                </div>
              )}

              {/* Note textarea */}
              {!isReadOnly&&(
                <div>
                  <label style={{display:"block",marginBottom:6,fontSize:11,fontWeight:700,color:C.muted}}>
                    Review note <span style={{color:C.delBorder}}>* required for rejection</span>
                  </label>
                  <textarea value={note} onChange={e=>setNote(e.target.value)}
                    placeholder="Leave a comment for the author…" rows={3}
                    style={{width:"100%",resize:"vertical",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:13,outline:"none",boxSizing:"border-box"}}
                    onFocus={e=>e.target.style.borderColor=C.focusBorder}
                    onBlur={e=>e.target.style.borderColor=C.border}/>
                </div>
              )}

              {error&&(
                <div style={{padding:"8px 12px",borderRadius:8,border:`1px solid ${C.errBorder}`,background:C.errBg,color:C.errText,fontSize:13}}>{error}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{background:C.surface,borderTop:`1px solid ${C.border}`,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexShrink:0}}>
          {isReadOnly?(
            <>
              <span style={{fontSize:12,color:C.muted}}>Viewing diff (read-only)</span>
              <button type="button" onClick={onClose} style={{padding:"6px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.text,fontSize:13,fontWeight:600,cursor:"pointer"}}>Close</button>
            </>
          ):(
            <>
              <button type="button" disabled={loading||submitting} onClick={()=>submitReview("rejected")}
                style={{display:"flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:8,border:`1px solid ${C.rejBtnBorder}`,background:C.rejBtnBg,color:C.rejBtnText,fontSize:13,fontWeight:600,cursor:"pointer",opacity:(loading||submitting)?.5:1}}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.06 1.06L9.06 8l3.22 3.22a.749.749 0 0 1-1.06 1.06L8 9.06l-3.22 3.22a.749.749 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/></svg>
                {submitting?"Rejecting…":"Reject PR"}
              </button>
              <div style={{display:"flex",gap:8}}>
                <button type="button" onClick={onClose} disabled={submitting} style={{padding:"6px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:13,fontWeight:600,cursor:"pointer"}}>Close</button>
                <button type="button" disabled={loading||submitting} onClick={()=>submitReview("approved")}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:8,border:`1px solid ${C.approveBorder}`,background:C.approveBg,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",opacity:(loading||submitting)?.5:1}}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>
                  {submitting?"Merging…":"Approve & Merge"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
