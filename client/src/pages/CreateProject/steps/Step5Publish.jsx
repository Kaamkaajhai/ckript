import { useCreateProject } from "../CreateProjectContext";
import { Link } from "react-router-dom";
import { LEGAL_AGREEMENT, SCRIPT_UPLOAD_TERMS_VERSION } from "../constants";
import { normalizeRightsLicensingState } from "../lib/rights";
import TagSelect from "../../../components/TagSelect";

const Step5Publish = () => {
  const {
    agreementRef, cardCls, dark, inputCls, legal, rightsLicensing, scriptPrice, setLegal, setRightsLicensing, setScriptPrice,
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

                    {/* Price presets */}
                    <div className={`rounded-xl p-4 sm:p-5 ${dark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Your Asking Price</p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {[49, 99, 149, 199, 249].map(price => (
                          <button
                            key={price}
                            type="button"
                            onClick={() => setScriptPrice(price)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${scriptPrice === price ? (dark ? "bg-emerald-600 text-white border-emerald-500" : "bg-emerald-600 text-white border-emerald-600") : (dark ? "border-white/[0.1] text-gray-400 hover:border-white/[0.2]" : "border-gray-200 text-gray-600 hover:bg-gray-50")}`}
                          >
                            ₹{price}
                          </button>
                        ))}
                      </div>

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
                            placeholder="Custom..."
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
                          "Industry pros will review your preview pages and rights terms—your full screenplay remains strictly secure.",
                          "If they see potential, they'll contact you or schedule a meeting directly to discuss a deal.",
                          "Set a target price that reflects the true value of your intellectual property and creative ownership.",
                        ].map((tip, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${dark ? "bg-amber-400" : "bg-amber-500"}`} />
                            <p className={`text-[12px] leading-relaxed ${dark ? "text-amber-200/70" : "text-amber-800"}`}>{tip}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Rights Accordion */}
                  <div className={`rounded-2xl border p-4 min-[420px]:p-5 sm:p-6 space-y-6 ${dark ? "border-emerald-500/20 bg-emerald-500/5" : "border-emerald-200 bg-emerald-50/60"}`}>
                    <div>
                      <h3 className={`text-sm font-bold ${dark ? "text-emerald-400" : "text-emerald-700"}`}>Rights Type</h3>
                      <p className={`text-xs mb-3 ${dark ? "text-gray-400" : "text-gray-600"}`}>What type of rights are you offering?</p>
                      <TagSelect
                        ariaLabel="rightsType"
                        options={[{ value: "full_rights_sale", label: "Full Rights Sale (Ownership Transfer)" }, { value: "exclusive_license", label: "Exclusive License" }, { value: "custom_negotiation_required", label: "Custom Negotiation Required" }]}
                        value={rightsLicensing?.rightsType || "custom_negotiation_required"}
                        onChange={(v) => setRightsLicensing(prev => normalizeRightsLicensingState({ ...prev, rightsType: v }))}
                        dark={dark}
                        size="sm"
                      />
                    </div>

                    {rightsLicensing?.rightsType === "exclusive_license" && (
                      <div>
                        <h3 className={`text-sm font-bold ${dark ? "text-emerald-400" : "text-emerald-700"}`}>License Duration</h3>
                        <p className={`text-xs mb-3 ${dark ? "text-gray-400" : "text-gray-600"}`}>How many months will the license last?</p>
                        <input type="number" min="1" max="120" value={rightsLicensing?.timeBound?.licenseDurationMonths || 12} onChange={(e) => setRightsLicensing(prev => normalizeRightsLicensingState({ ...prev, timeBound: { ...prev.timeBound, licenseDurationMonths: Number(e.target.value) } }))} className={inputCls} />
                      </div>
                    )}

                    <div>
                      <h3 className={`text-sm font-bold ${dark ? "text-emerald-400" : "text-emerald-700"}`}>Modification Rights</h3>
                      <p className={`text-xs mb-3 ${dark ? "text-gray-400" : "text-gray-600"}`}>How much creative control are you willing to give up?</p>
                      <TagSelect
                        ariaLabel="modificationRights"
                        options={[{ value: "buyer_can_freely_modify", label: "Publisher can modify freely" }, { value: "buyer_must_consult_writer", label: "Must consult writer" }, { value: "writer_approval_required", label: "Writer approval required" }]}
                        value={rightsLicensing?.modificationRights || ""}
                        onChange={(v) => setRightsLicensing(prev => normalizeRightsLicensingState({ ...prev, modificationRights: v }))}
                        dark={dark}
                        size="sm"
                      />
                    </div>

                    <div>
                      <h3 className={`text-sm font-bold ${dark ? "text-emerald-400" : "text-emerald-700"}`}>Payment Structure</h3>
                      <p className={`text-xs mb-3 ${dark ? "text-gray-400" : "text-gray-600"}`}>How do you expect to be paid for these rights?</p>
                      <TagSelect
                        ariaLabel="paymentStructure"
                        options={[{ value: "one_time_upfront_payment", label: "One-time upfront payment" }, { value: "lower_upfront_plus_royalty_percent", label: "Lower upfront + royalty %" }, { value: "revenue_sharing_model", label: "Revenue sharing model" }, { value: "custom_deal", label: "Custom deal" }]}
                        value={rightsLicensing?.paymentStructure || ""}
                        onChange={(v) => setRightsLicensing(prev => normalizeRightsLicensingState({ ...prev, paymentStructure: v }))}
                        dark={dark}
                        size="sm"
                      />
                    </div>

                    {["lower_upfront_plus_royalty_percent", "revenue_sharing_model"].includes(rightsLicensing?.paymentStructure) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <h3 className={`text-sm font-bold ${dark ? "text-emerald-400" : "text-emerald-700"}`}>Royalty Percentage (%)</h3>
                          <input type="number" min="0" max="100" value={rightsLicensing?.royaltySettings?.percentage || 0} onChange={(e) => setRightsLicensing(prev => normalizeRightsLicensingState({ ...prev, royaltySettings: { ...prev.royaltySettings, percentage: Number(e.target.value) } }))} className={inputCls} />
                        </div>
                        <div>
                          <h3 className={`text-sm font-bold ${dark ? "text-emerald-400" : "text-emerald-700"}`}>Royalty Duration</h3>
                          <TagSelect
                            ariaLabel="Royalty duration"
                            options={[{ value: "none", label: "None" }, { value: "project_lifetime", label: "Project Lifetime" }, { value: "years", label: "Fixed Years" }]}
                            value={rightsLicensing?.royaltySettings?.durationType || "none"}
                            onChange={(v) => setRightsLicensing(prev => normalizeRightsLicensingState({ ...prev, royaltySettings: { ...prev.royaltySettings, durationType: v } }))}
                            dark={dark}
                            size="sm"
                          />
                        </div>
                        {rightsLicensing?.royaltySettings?.durationType === "years" && (
                          <div className="sm:col-span-2">
                            <h3 className={`text-sm font-bold ${dark ? "text-emerald-400" : "text-emerald-700"}`}>Number of Years</h3>
                            <input type="number" min="1" max="99" value={rightsLicensing?.royaltySettings?.durationYears || 1} onChange={(e) => setRightsLicensing(prev => normalizeRightsLicensingState({ ...prev, royaltySettings: { ...prev.royaltySettings, durationYears: Number(e.target.value) } }))} className={inputCls} />
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <h3 className={`text-sm font-bold ${dark ? "text-emerald-400" : "text-emerald-700"}`}>Negotiation Mode</h3>
                      <p className={`text-xs mb-3 ${dark ? "text-gray-400" : "text-gray-600"}`}>Are you open to counter-offers?</p>
                      <TagSelect
                        ariaLabel="negotiationMode"
                        options={[{ value: "fixed_terms", label: "Fixed terms" }, { value: "open_to_negotiation", label: "Open to negotiation" }]}
                        value={rightsLicensing?.negotiationMode || ""}
                        onChange={(v) => setRightsLicensing(prev => normalizeRightsLicensingState({ ...prev, negotiationMode: v }))}
                        dark={dark}
                        size="sm"
                      />
                    </div>

                    <div>
                      <h3 className={`text-sm font-bold ${dark ? "text-emerald-400" : "text-emerald-700"}`}>Custom Conditions (Optional)</h3>
                      <textarea
                        placeholder="e.g. Specific investor terms, guaranteed credit conditions..."
                        value={rightsLicensing?.customConditions || ""}
                        onChange={(e) => setRightsLicensing(prev => normalizeRightsLicensingState({ ...prev, customConditions: e.target.value }))}
                        className={`${inputCls} min-h-[100px] resize-y`}
                      />
                    </div>
                  </div>

                  <div className={`rounded-2xl border p-4 min-[420px]:p-5 sm:p-6 ${dark ? "border-[#1d3350] bg-[#080f1a]" : "border-gray-200 bg-gray-50/60"}`}>
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dark ? "bg-white/[0.05]" : "bg-black/[0.05]"}`}>
                        <svg className={`w-4 h-4 ${dark ? "text-gray-300" : "text-gray-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h3.75A2.625 2.625 0 0116.5 4.875v1.5H7.5v-1.5A2.625 2.625 0 0110.125 2.25zM7.5 9h9m-9 0v8.625A2.625 2.625 0 0010.125 20.25h3.75A2.625 2.625 0 0016.5 17.625V9m-9 0h9" /></svg>
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

                    <p className={`text-xs mb-3 mt-4 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                      Review the full legal document:
                      {" "}
                      <Link to="/script-upload-terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-500 hover:text-blue-400 underline underline-offset-2">
                        Script Upload Terms & Conditions
                      </Link>
                    </p>

                    <label className="flex items-start gap-3 cursor-pointer mt-4">
                      <input type="checkbox" checked={legal.agreedToTerms} onChange={e => setLegal((prev) => ({ ...prev, agreedToTerms: e.target.checked }))}
                        className="w-5 h-5 rounded mt-0.5 accent-black" />
                      <span className={`text-sm leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>
                        I confirm I own or control the rights to this script and agree to the Script Upload Terms & Conditions (v{SCRIPT_UPLOAD_TERMS_VERSION}).
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer mt-3">
                      <input type="checkbox" checked={rightsLicensing?.legalAcknowledgement?.ownershipConfirmed} onChange={e => setRightsLicensing(prev => normalizeRightsLicensingState({ ...prev, legalAcknowledgement: { ...prev.legalAcknowledgement, ownershipConfirmed: e.target.checked } }))} className="w-5 h-5 rounded mt-0.5 accent-emerald-600" />
                      <span className={`text-sm leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>I explicitly confirm that I am the sole creator or own the IP outright.</span>
                    </label>
                  </div>
                </div>
            </div>
    </>
  );
};

export default Step5Publish;
