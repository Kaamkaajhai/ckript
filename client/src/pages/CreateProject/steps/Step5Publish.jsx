import { useCreateProject } from "../CreateProjectContext";
import { Link } from "react-router-dom";
import { LEGAL_AGREEMENT, SCRIPT_UPLOAD_TERMS_VERSION } from "../constants";
import { normalizeRightsLicensingState } from "../lib/rights";

const Step5Publish = () => {
  const {
    agreementRef, cardCls, dark, inputCls, legal, publishingDetails, rightsLicensing, scriptPrice, setLegal, setPublishingDetails, setRightsLicensing, setScriptPrice, targetPublishing,
  } = useCreateProject();

  return (
    <>
            <div className="space-y-6">
                <div className={`${cardCls} p-4 min-[420px]:p-5 sm:p-8 space-y-5 min-[420px]:space-y-6`}>
                  <div>
                    <h2 className={`text-lg font-bold mb-1 ${dark ? "text-gray-100" : "text-gray-900"}`}>Submission Setup</h2>
                    <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Choose access, set price, select services, and accept terms.</p>
                  </div>

                  <div className={`rounded-2xl border p-4 min-[420px]:p-5 sm:p-6 space-y-5 ${dark ? "border-[#1d3350] bg-[#080f1a]" : "border-gray-200 bg-gray-50/60"}`}>
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${dark ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
                        <svg className={`w-4.5 h-4.5 ${dark ? "text-emerald-400" : "text-emerald-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                      </div>
                      <div>
                        <h3 className={`text-[15px] min-[420px]:text-base font-bold ${dark ? "text-white" : "text-gray-900"}`}>Monetization</h3>
                        <p className={`text-[11px] mt-0.5 ${dark ? "text-gray-500" : "text-gray-500"}`}>Set what buyers pay to access your script and rights terms.</p>
                      </div>
                    </div>

                    {/* Price input */}
                    <div className={`rounded-xl p-4 sm:p-5 ${dark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Your Asking Price</p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="relative w-full sm:w-44">
                          <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold ${dark ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                          <input
                            type="number" min="1" step="1"
                            value={scriptPrice}
                            onChange={(e) => {
                              const normalized = String(e.target.value || "").replace(/^0+(?=\d)/, "");
                              setScriptPrice(Number(normalized) || 0);
                            }}
                            placeholder="0"
                            className={`w-full pl-8 pr-4 py-3 rounded-xl text-lg font-bold border-2 outline-none transition-all ${dark ? "bg-white/[0.04] border-emerald-500/40 text-white focus:border-emerald-400" : "bg-emerald-50/60 border-emerald-200 text-gray-900 focus:border-emerald-500 focus:bg-white"}`}
                          />
                        </div>
                        <p className={`text-[12px] leading-relaxed ${dark ? "text-gray-500" : "text-gray-500"}`}>
                          This is the amount buyers pay to unlock your script. You can update it anytime before publishing.
                        </p>
                      </div>
                    </div>

                    {/* How it works */}
                    <div className={`rounded-xl p-4 space-y-2.5 ${dark ? "bg-amber-500/5 border border-amber-500/15" : "bg-amber-50/70 border border-amber-100"}`}>
                      <p className={`text-xs font-bold uppercase tracking-wide ${dark ? "text-amber-300" : "text-amber-700"}`}>Before you set your price</p>
                      <ul className="space-y-2">
                        {[
                          "Buyers are evaluating rights — for films, web series, TV serials, remakes, or adaptations.",
                          "They're not paying just to read — they're assessing your script for a potential deal.",
                          "Price it based on what those rights are worth, not just the read.",
                        ].map((tip, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${dark ? "bg-amber-400" : "bg-amber-500"}`} />
                            <p className={`text-[12px] leading-relaxed ${dark ? "text-amber-200/70" : "text-amber-800"}`}>{tip}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>





                  {targetPublishing && (
                    <div className={`rounded-2xl border p-4 min-[420px]:p-5 sm:p-6 ${dark ? "border-emerald-500/20 bg-emerald-500/5" : "border-emerald-200 bg-emerald-50/60"}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dark ? "bg-emerald-500/10" : "bg-emerald-100"}`}>
                            <svg className={`w-4 h-4 ${dark ? "text-emerald-400" : "text-emerald-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <div>
                            <h3 className={`text-sm font-bold ${dark ? "text-emerald-400" : "text-emerald-700"}`}>Publishing Rights</h3>
                            <p className={`text-[11px] ${dark ? "text-emerald-500/70" : "text-emerald-600/70"}`}>Do you want to sell publishing rights?</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={publishingDetails.sellPublishingRights || false} onChange={(e) => setPublishingDetails(p => ({ ...p, sellPublishingRights: e.target.checked }))} />
                          <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${dark ? "bg-gray-700 peer-checked:bg-emerald-500" : "bg-gray-200 peer-checked:bg-emerald-500"}`}></div>
                        </label>
                      </div>

                      {publishingDetails.sellPublishingRights && (
                        <div className={`mt-5 pt-5 border-t ${dark ? "border-emerald-500/20" : "border-emerald-200"}`}>
                          <h4 className={`text-[11px] font-bold uppercase tracking-widest mb-3 ${dark ? "text-emerald-500" : "text-emerald-700"}`}>Auto-fill Presets</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                            <button type="button" onClick={() => {
                              setPublishingDetails(p => ({
                                ...p,
                                publishingRights: {
                                  ...p.publishingRights,
                                  rightsBundle: "basic",
                                  exclusivity: "non_exclusive",
                                  digitalPublishing: true,
                                  bookPublishing: false,
                                  audiobookRights: false,
                                  adaptationIncluded: false,
                                  territory: ["worldwide"],
                                  languages: ["all_languages"],
                                  durationYears: "3 years",
                                  paymentType: "royalty_based",
                                  negotiationMode: "fixed_terms"
                                }
                              }))
                            }} 
                              className={`rounded-xl p-4 text-left transition-all border ${publishingDetails.publishingRights?.rightsBundle === "basic" ? dark ? "bg-emerald-600/20 border-emerald-500" : "bg-emerald-100 border-emerald-600" : dark ? "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]" : "bg-white border-gray-200 hover:bg-gray-50"}`}>
                              <h4 className={`text-sm font-bold ${dark ? "text-emerald-300" : "text-emerald-800"}`}>Basic Entry</h4>
                              <p className={`text-[10px] mt-1 ${dark ? "text-emerald-500/70" : "text-emerald-600/70"}`}>Digital-only, non-exclusive, 3 years.</p>
                            </button>
                            <button type="button" onClick={() => {
                              setPublishingDetails(p => ({
                                ...p,
                                publishingRights: {
                                  ...p.publishingRights,
                                  rightsBundle: "full",
                                  exclusivity: "exclusive",
                                  digitalPublishing: true,
                                  bookPublishing: true,
                                  audiobookRights: true,
                                  adaptationIncluded: true,
                                  territory: ["worldwide"],
                                  languages: ["all_languages"],
                                  durationYears: "perpetual",
                                  paymentType: "advance_plus_royalty",
                                  negotiationMode: "open_to_negotiation"
                                }
                              }))
                            }} 
                              className={`rounded-xl p-4 text-left transition-all border ${publishingDetails.publishingRights?.rightsBundle === "full" ? dark ? "bg-emerald-600/20 border-emerald-500" : "bg-emerald-100 border-emerald-600" : dark ? "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]" : "bg-white border-gray-200 hover:bg-gray-50"}`}>
                              <h4 className={`text-sm font-bold ${dark ? "text-emerald-300" : "text-emerald-800"}`}>Full Traditional</h4>
                              <p className={`text-[10px] mt-1 ${dark ? "text-emerald-500/70" : "text-emerald-600/70"}`}>All formats, exclusive, long-term.</p>
                            </button>
                            <button type="button" onClick={() => {
                              setPublishingDetails(p => ({
                                ...p,
                                publishingRights: {
                                  ...p.publishingRights,
                                  rightsBundle: "custom",
                                }
                              }))
                            }} 
                              className={`rounded-xl p-4 text-left transition-all border ${publishingDetails.publishingRights?.rightsBundle === "custom" ? dark ? "bg-emerald-600/20 border-emerald-500" : "bg-emerald-100 border-emerald-600" : dark ? "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]" : "bg-white border-gray-200 hover:bg-gray-50"}`}>
                              <h4 className={`text-sm font-bold ${dark ? "text-emerald-300" : "text-emerald-800"}`}>Custom Setup</h4>
                              <p className={`text-[10px] mt-1 ${dark ? "text-emerald-500/70" : "text-emerald-600/70"}`}>Build your own rights configuration.</p>
                            </button>
                          </div>

                          <div className="space-y-6">
                            {/* 1. Rights Scope */}
                            <div>
                              <h4 className={`text-[13px] font-bold mb-3 ${dark ? "text-emerald-400" : "text-emerald-700"}`}>1. Rights Scope</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                  <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Rights Type</label>
                                  <select value={publishingDetails.publishingRights?.exclusivity || "non_exclusive"} onChange={(e) => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, exclusivity: e.target.value } }))} className={inputCls}>
                                    <option value="exclusive">Exclusive</option>
                                    <option value="non_exclusive">Non-Exclusive</option>
                                  </select>
                                </div>
                                <div className="sm:col-span-2">
                                  <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Formats Included</label>
                                  <div className="flex flex-wrap gap-4 mt-2">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={publishingDetails.publishingRights?.bookPublishing || false} onChange={e => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, bookPublishing: e.target.checked } }))} /> Print</label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={publishingDetails.publishingRights?.digitalPublishing || false} onChange={e => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, digitalPublishing: e.target.checked } }))} /> Digital (eBook)</label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={publishingDetails.publishingRights?.audiobookRights || false} onChange={e => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, audiobookRights: e.target.checked } }))} /> Audio (Audiobook)</label>
                                  </div>
                                </div>
                                <div className="sm:col-span-3">
                                  <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Adaptation Rights (Film/TV)</label>
                                  <div className="flex gap-4 mt-2">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="adaptationIncluded" checked={publishingDetails.publishingRights?.adaptationIncluded === true} onChange={() => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, adaptationIncluded: true } }))} /> Included</label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="adaptationIncluded" checked={publishingDetails.publishingRights?.adaptationIncluded !== true} onChange={() => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, adaptationIncluded: false } }))} /> Not Included</label>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 2. Territory & Language */}
                            <div>
                              <h4 className={`text-[13px] font-bold mb-3 ${dark ? "text-emerald-400" : "text-emerald-700"}`}>2. Territory & Language</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Territory</label>
                                  <select value={(publishingDetails.publishingRights?.territory && publishingDetails.publishingRights.territory[0]) || "worldwide"} onChange={(e) => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, territory: [e.target.value] } }))} className={inputCls}>
                                    <option value="worldwide">Worldwide</option>
                                    <option value="specific_regions">Specific Regions</option>
                                    <option value="india_only">India Only</option>
                                  </select>
                                </div>
                                <div>
                                  <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Language Rights</label>
                                  <select value={(publishingDetails.publishingRights?.languages && publishingDetails.publishingRights.languages[0]) || "all_languages"} onChange={(e) => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, languages: [e.target.value] } }))} className={inputCls}>
                                    <option value="all_languages">All Languages</option>
                                    <option value="english">English Only</option>
                                    <option value="hindi">Hindi Only</option>
                                    <option value="regional">Regional Languages</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* 3. Duration */}
                            <div>
                              <h4 className={`text-[13px] font-bold mb-3 ${dark ? "text-emerald-400" : "text-emerald-700"}`}>3. License Duration</h4>
                              <div className="flex flex-wrap gap-2">
                                {["3 years", "5 years", "10 years", "perpetual"].map(dur => (
                                  <button key={dur} type="button" onClick={() => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, durationYears: dur } }))} className={`px-4 py-2 rounded-lg text-[13px] font-semibold border transition-all ${publishingDetails.publishingRights?.durationYears === dur ? "bg-emerald-600 text-white border-emerald-600" : dark ? "border-[#1d3350] text-gray-400 hover:border-[#2a4a6a]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                                    {dur.charAt(0).toUpperCase() + dur.slice(1)}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 4. Payment Structure */}
                            <div>
                              <h4 className={`text-[13px] font-bold mb-3 ${dark ? "text-emerald-400" : "text-emerald-700"}`}>4. Payment Structure</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="sm:col-span-2 lg:col-span-1">
                                  <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Payment Type</label>
                                  <select value={publishingDetails.publishingRights?.paymentType || "one_time_upfront"} onChange={(e) => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, paymentType: e.target.value } }))} className={inputCls}>
                                    <option value="one_time_upfront">One-time Buyout</option>
                                    <option value="royalty_based">Royalty-based</option>
                                    <option value="advance_plus_royalty">Advance + Royalty</option>
                                  </select>
                                </div>
                                {["royalty_based", "advance_plus_royalty"].includes(publishingDetails.publishingRights?.paymentType) && (
                                  <div>
                                    <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Royalty % (Optional)</label>
                                    <div className="relative">
                                      <input type="number" min="0" max="100" placeholder="e.g. 15" value={publishingDetails.publishingRights?.royaltyPercentage || ""} onChange={(e) => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, royaltyPercentage: Number(e.target.value) } }))} className={inputCls} />
                                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                                    </div>
                                  </div>
                                )}
                                {publishingDetails.publishingRights?.paymentType === "advance_plus_royalty" && (
                                  <div>
                                    <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Advance (Optional)</label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                      <input type="number" min="0" placeholder="e.g. 50000" value={publishingDetails.publishingRights?.advanceAmount || ""} onChange={(e) => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, advanceAmount: Number(e.target.value) } }))} className={`${inputCls} pl-8`} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 5 & 6. Control and Deal Mode */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <h4 className={`text-[13px] font-bold mb-3 ${dark ? "text-emerald-400" : "text-emerald-700"}`}>5. Creative Control</h4>
                                <select value={publishingDetails.publishingRights?.modificationRights || "buyer_must_consult_writer"} onChange={(e) => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, modificationRights: e.target.value } }))} className={inputCls}>
                                  <option value="buyer_can_freely_modify">Publisher can modify freely</option>
                                  <option value="buyer_must_consult_writer">Must consult writer</option>
                                  <option value="writer_approval_required">Writer approval required</option>
                                </select>
                              </div>
                              <div>
                                <h4 className={`text-[13px] font-bold mb-3 ${dark ? "text-emerald-400" : "text-emerald-700"}`}>6. Negotiation Mode</h4>
                                <select value={publishingDetails.publishingRights?.negotiationMode || "fixed_terms"} onChange={(e) => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, negotiationMode: e.target.value } }))} className={inputCls}>
                                  <option value="fixed_terms">Fixed terms</option>
                                  <option value="open_to_negotiation">Open to negotiation</option>
                                </select>
                              </div>
                            </div>

                          </div>
                        </div>
                      )}

                      <div className={`mt-5 pt-5 border-t ${dark ? "border-emerald-500/20" : "border-emerald-200"}`}>
                        <h4 className={`text-[11px] font-bold uppercase tracking-widest mb-3 ${dark ? "text-emerald-500" : "text-emerald-700"}`}>
                          Rights Acknowledgements
                        </h4>
                        <div className="grid grid-cols-1 gap-2.5">
                          <label className={`flex items-start gap-2.5 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>
                            <input
                              type="checkbox"
                              checked={Boolean(rightsLicensing?.legalAcknowledgement?.ownershipConfirmed)}
                              onChange={(e) => setRightsLicensing((prev) => normalizeRightsLicensingState({
                                ...prev,
                                legalAcknowledgement: {
                                  ...prev.legalAcknowledgement,
                                  ownershipConfirmed: e.target.checked,
                                },
                              }))}
                              className="mt-0.5"
                            />
                            <span>I confirm I own or control all rights required for this listing.</span>
                          </label>
                          <label className={`flex items-start gap-2.5 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>
                            <input
                              type="checkbox"
                              checked={Boolean(rightsLicensing?.legalAcknowledgement?.platformTermsAccepted)}
                              onChange={(e) => setRightsLicensing((prev) => normalizeRightsLicensingState({
                                ...prev,
                                legalAcknowledgement: {
                                  ...prev.legalAcknowledgement,
                                  platformTermsAccepted: e.target.checked,
                                },
                              }))}
                              className="mt-0.5"
                            />
                            <span>I acknowledge these rights terms under platform legal policy.</span>
                          </label>
                          <label className={`flex items-start gap-2.5 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>
                            <input
                              type="checkbox"
                              checked={Boolean(rightsLicensing?.legalAcknowledgement?.exclusivityUnderstood)}
                              onChange={(e) => setRightsLicensing((prev) => normalizeRightsLicensingState({
                                ...prev,
                                legalAcknowledgement: {
                                  ...prev.legalAcknowledgement,
                                  exclusivityUnderstood: e.target.checked,
                                },
                              }))}
                              className="mt-0.5"
                            />
                            <span>I understand exclusivity enforcement for settled transactions.</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={`rounded-2xl border p-4 min-[420px]:p-5 sm:p-6 ${dark ? "border-[#1d3350] bg-[#080f1a]" : "border-gray-200 bg-gray-50/60"}`}>
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dark ? "bg-white/[0.05]" : "bg-[#1e3a5f]/[0.07]"}`}>
                        <svg className={`w-4 h-4 ${dark ? "text-purple-300" : "text-purple-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h3.75A2.625 2.625 0 0116.5 4.875v1.5H7.5v-1.5A2.625 2.625 0 0110.125 2.25zM7.5 9h9m-9 0v8.625A2.625 2.625 0 0010.125 20.25h3.75A2.625 2.625 0 0016.5 17.625V9m-9 0h9" /></svg>
                      </div>
                      <div>
                        <h3 className={`text-sm font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>Submission Agreement</h3>
                        <p className={`text-[11px] ${dark ? "text-gray-500" : "text-gray-400"}`}>Read and accept before publishing.</p>
                      </div>
                    </div>

                    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 ${dark ? "text-gray-400" : "text-gray-600"}`}>
                      <div className={`rounded-xl px-3 py-3 ${dark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${dark ? "text-gray-500" : "text-gray-400"}`}>Rights</p>
                        <p className="text-[12px] mt-2 leading-relaxed">You retain ownership of your script.</p>
                      </div>
                      <div className={`rounded-xl px-3 py-3 ${dark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${dark ? "text-gray-500" : "text-gray-400"}`}>License</p>
                        <p className="text-[12px] mt-2 leading-relaxed">Platform gets a non-exclusive display and promotion license.</p>
                      </div>
                      <div className={`rounded-xl px-3 py-3 ${dark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${dark ? "text-gray-500" : "text-gray-400"}`}>Refunds</p>
                        <p className="text-[12px] mt-2 leading-relaxed">Service charges are not refundable after processing starts.</p>
                      </div>
                    </div>

                    <div ref={agreementRef} className={`rounded-xl p-4 h-48 overflow-y-auto text-xs leading-relaxed border ${dark ? "border-[#182840] text-gray-400 bg-[#050b14]" : "border-gray-200 text-gray-500 bg-white"}`}>
                      <pre className="whitespace-pre-wrap font-sans">{LEGAL_AGREEMENT}</pre>
                    </div>

                    <p className={`text-xs mb-3 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                      Review the full legal document:
                      {" "}
                      <Link to="/script-upload-terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-500 hover:text-blue-400 underline underline-offset-2">
                        Script Upload Terms & Conditions
                      </Link>
                    </p>

                    <label className="flex items-start gap-3 cursor-pointer mt-4">
                      <input type="checkbox" checked={legal.agreedToTerms} onChange={e => setLegal((prev) => ({ ...prev, agreedToTerms: e.target.checked }))}
                        className="w-5 h-5 rounded mt-0.5 accent-[#1e3a5f]" />
                      <span className={`text-sm leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>
                        I confirm I own or control the rights to this script and agree to the Script Upload Terms & Conditions (v{SCRIPT_UPLOAD_TERMS_VERSION}).
                      </span>
                    </label>
                  </div>
                </div>
            </div>
    </>
  );
};

export default Step5Publish;
