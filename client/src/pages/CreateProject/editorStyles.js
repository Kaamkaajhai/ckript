import { CP_ACCENT } from "./constants";

/* Pure style factories for the ported Step-1 screenplay/prose editor chrome.
   Each returns an inline-style object; `dark`/`active` flip colors to mirror the
   "Create Project.dc.html" handoff. Kept as plain functions (no component state). */

// Insert-bar element pill (light base + JS-computed active/dark states, mirroring
// the DC's `elements[].style`). Active element gets red text on a subtle fill.
export const cpElemBtnStyle = (active, dark) => ({
  display: "flex", alignItems: "center", gap: "6px", height: "32px", padding: "0 12px",
  border: "none", borderRadius: "8px", fontFamily: "inherit", fontWeight: 500,
  fontSize: "12.5px", cursor: "pointer", whiteSpace: "nowrap",
  background: active ? (dark ? "#1f1f1f" : "#f5f5f5") : "transparent",
  color: active ? CP_ACCENT : (dark ? "#9a9a9a" : "#767676"),
});
export const cpMoreMenuStyle = (dark) => ({
  position: "absolute", top: "38px", left: 0, zIndex: 40, minWidth: "206px",
  maxHeight: "300px", overflowY: "auto", background: dark ? "#181818" : "#fff",
  border: `1px solid ${dark ? "#2a2a2a" : "#ececec"}`, borderRadius: "12px",
  boxShadow: `0 14px 34px rgba(0,0,0,${dark ? "0.5" : "0.14"})`, padding: "6px",
});
export const cpMoreItemStyle = (active, dark) => ({
  width: "100%", display: "flex", alignItems: "center", gap: "10px", height: "34px",
  padding: "0 10px", border: "none", borderRadius: "8px", background: "transparent",
  fontFamily: "inherit", fontWeight: active ? 600 : 500, fontSize: "12.5px",
  cursor: "pointer", textAlign: "left", color: active ? CP_ACCENT : (dark ? "#d0d0d0" : "#3a352e"),
});
// The floating text-format pill is always dark (DC's `#27272a` bubble); its
// buttons flip to the accent when active. `onMouseDown`+preventDefault at the
// call site keeps the editor selection alive (see ScreenplayFormatBar).
export const cpFmtBtnStyle = (on) => ({
  width: "26px", height: "26px", display: "inline-flex", alignItems: "center",
  justifyContent: "center", border: "none", borderRadius: "6px", cursor: "pointer",
  background: on ? CP_ACCENT : "transparent", color: on ? "#fff" : "#e4e4e7",
});
// Header icon buttons, the thin dividers, and the footer zoom buttons.
export const cpIconBtnStyle = (dark) => ({
  display: "flex", alignItems: "center", justifyContent: "center", width: "36px",
  height: "36px", border: "none", borderRadius: "9px", background: "transparent",
  color: dark ? "#b0b0b0" : "#767676", cursor: "pointer",
});
export const cpVrStyle = (dark) => ({ width: "1px", height: "20px", background: dark ? "#2a2a2a" : "#eeeeee", margin: "0 3px" });
export const cpZoomBtnStyle = (dark) => ({
  width: "30px", height: "30px", display: "inline-flex", alignItems: "center",
  justifyContent: "center", border: "none", borderRadius: "8px", background: "transparent",
  color: dark ? "#b0b0b0" : "#767676", cursor: "pointer",
});
