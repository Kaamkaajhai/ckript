import React from "react";
import { Plus, Trash2 } from "lucide-react";

/**
 * Prizes — the fields the competition pages actually render.
 *
 * CompetitionLanding and the entrant dashboard read `prizes.winner`, `prizes.runnerUp` and
 * `prizes.special`; `prizes.special` also feeds the declare-results award-name suggestions, so a
 * declared title can match what was advertised instead of being retyped from memory. This module
 * used to write only `detailedPrizes` — a parallel list rendered solely by the deleted /events
 * surface — so an admin configuring prizes here changed a list no competitor would ever see, while
 * the list they did see stayed frozen at whatever the old editor last wrote.
 *
 * The detailedPrizes builder went with that surface. The schema field remains (removing it is a
 * migration, not a UI fix); if a richer prize treatment is ever ported into the competition pages,
 * the builder can return with an actual renderer behind it.
 *
 * Prize lines are free text ON PURPOSE: prizes mix cash with subscriptions, trailers and features,
 * and the cash element is settled off-platform in whatever currency suits the edition.
 */

/** One list of free-text prize lines, with the label of the surface that renders it. */
function PrizeLines({ title, hint, items, onChange, placeholder }) {
  const set = (index, value) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };

  return (
    <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#111]">{title}</h2>
          <p className="text-sm text-[#666] mt-1">{hint}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-[#333] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add
        </button>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-[#888] italic">Nothing listed yet.</p>
        ) : items.map((line, i) => (
          <div key={i} className="flex items-center gap-3">
            <input
              value={line}
              onChange={(e) => set(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 bg-[#fbfbfa] border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111]"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label={`Remove line ${i + 1}`}
              className="p-2 text-[#999] hover:text-red-600 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PrizesModule({ data, onChange }) {
  const prizes = data.prizes || {};
  const special = prizes.special || [];

  const setTier = (tier, value) => onChange("prizes", { ...prizes, [tier]: value });

  const tiers = data.referralTiers || [];
  const setTierField = (index, key, value) => {
    const next = [...tiers];
    next[index] = { ...next[index], [key]: value };
    onChange("referralTiers", next);
  };

  const setSpecial = (index, key, value) => {
    const next = [...special];
    next[index] = { ...next[index], [key]: value };
    setTier("special", next);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* The headline figure on cards and the hub — free text, not a number. */}
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-serif font-bold text-[#111]">Prize Pool</h2>
          <p className="text-sm text-[#666] mt-1">
            The headline shown on competition cards (e.g. "$50k + Industry Features").
          </p>
        </div>
        <input
          type="text"
          value={data.prizePool || ""}
          onChange={(e) => onChange("prizePool", e.target.value)}
          placeholder="e.g. $50,000 + Producer Meetings"
          className="w-full px-4 py-3 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#111]"
        />
      </div>

      <PrizeLines
        title="Winner"
        hint="Shown on the competition page and the entrant dashboard."
        items={prizes.winner || []}
        onChange={(v) => setTier("winner", v)}
        placeholder='e.g. "Cash Prize" or "Gold Subscription (30 days)"'
      />

      <PrizeLines
        title="Runner-Up"
        hint="Shown beside the winner card on the competition page."
        items={prizes.runnerUp || []}
        onChange={(v) => setTier("runnerUp", v)}
        placeholder='e.g. "Silver Subscription (30 days)"'
      />

      {/* Named awards. These titles double as the declare-results suggestions, which is what keeps a
          declared "Best Dialogue" spelled the way it was advertised. */}
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#111]">Special Awards</h2>
            <p className="text-sm text-[#666] mt-1">
              Named category awards — the titles offered when results are declared.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTier("special", [...special, { title: "", description: "" }])}
            className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-[#333] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Award
          </button>
        </div>
        <div className="space-y-3">
          {special.length === 0 ? (
            <p className="text-sm text-[#888] italic">No special awards yet.</p>
          ) : special.map((award, i) => (
            <div key={i} className="flex items-start gap-3">
              <input
                value={award?.title || ""}
                onChange={(e) => setSpecial(i, "title", e.target.value)}
                placeholder='Title — e.g. "Best Dialogue"'
                className="w-2/5 px-3 py-2 bg-[#fbfbfa] border border-[#e4e2e0] rounded-lg text-sm font-semibold focus:outline-none focus:border-[#111]"
              />
              <input
                value={award?.description || ""}
                onChange={(e) => setSpecial(i, "description", e.target.value)}
                placeholder="What it recognises (optional)"
                className="flex-1 px-3 py-2 bg-[#fbfbfa] border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111]"
              />
              <button
                type="button"
                onClick={() => setTier("special", special.filter((_, j) => j !== i))}
                aria-label={`Remove award ${i + 1}`}
                className="p-2 text-[#999] hover:text-red-600 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Referral rewards. The server side of this is fully wired — sanitizeReferralTiers,
          storage, the grant loop at declare-results and its idempotency — but the new console
          shipped without an editor, so every competition silently fell back to the module defaults
          the copy below calls a fallback rather than a policy. Lives here because rewards do. */}
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#111]">Referral Rewards</h2>
            <p className="text-sm text-[#666] mt-1">
              Writers who bring other writers in earn these.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange("referralTiers", [...tiers, { count: "", id: "", label: "", days: "" }])}
            className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-[#333] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Tier
          </button>
        </div>
        <p className="text-xs text-[#888] mb-4">
          Leave empty to use the platform defaults (3 &rarr; Challenge Advocate, 5 &rarr; +15 days
          Silver, 10 &rarr; +30 days Silver). The ID becomes the reward&rsquo;s permanent key &mdash;
          changing it after results are declared will not re-grant anything.
        </p>
        <div className="space-y-2">
          {tiers.length === 0 ? (
            <p className="text-sm text-[#888] italic">Using platform defaults.</p>
          ) : tiers.map((tier, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input
                type="number" min="1"
                value={tier?.count ?? ""}
                onChange={(e) => setTierField(i, "count", e.target.value)}
                placeholder="Referrals"
                className="col-span-2 px-3 py-2 bg-[#fbfbfa] border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111]"
              />
              <input
                value={tier?.id || ""}
                onChange={(e) => setTierField(i, "id", e.target.value)}
                placeholder="Reward ID (e.g. challenge_referral_gold)"
                className="col-span-5 px-3 py-2 bg-[#fbfbfa] border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111]"
              />
              <input
                value={tier?.label || ""}
                onChange={(e) => setTierField(i, "label", e.target.value)}
                placeholder="Label"
                className="col-span-3 px-3 py-2 bg-[#fbfbfa] border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111]"
              />
              <input
                type="number" min="0"
                value={tier?.days ?? ""}
                onChange={(e) => setTierField(i, "days", e.target.value)}
                placeholder="Days"
                className="col-span-1 px-3 py-2 bg-[#fbfbfa] border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111]"
              />
              <button
                type="button"
                onClick={() => onChange("referralTiers", tiers.filter((_, j) => j !== i))}
                aria-label={`Remove tier ${i + 1}`}
                className="col-span-1 p-2 text-[#999] hover:text-red-600 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Referral rewards. The server side of this is fully wired — sanitizeReferralTiers,
          storage, the grant loop at declare-results and its idempotency — but the new console
          shipped without an editor, so every competition silently fell back to the module defaults
          the copy below calls a fallback rather than a policy. Lives here because rewards do. */}
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#111]">Referral Rewards</h2>
            <p className="text-sm text-[#666] mt-1">
              Writers who bring other writers in earn these.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange("referralTiers", [...tiers, { count: "", id: "", label: "", days: "" }])}
            className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-[#333] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Tier
          </button>
        </div>
        <p className="text-xs text-[#888] mb-4">
          Leave empty to use the platform defaults (3 &rarr; Challenge Advocate, 5 &rarr; +15 days
          Silver, 10 &rarr; +30 days Silver). The ID becomes the reward&rsquo;s permanent key &mdash;
          changing it after results are declared will not re-grant anything.
        </p>
        <div className="space-y-2">
          {tiers.length === 0 ? (
            <p className="text-sm text-[#888] italic">Using platform defaults.</p>
          ) : tiers.map((tier, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input
                type="number" min="1"
                value={tier?.count ?? ""}
                onChange={(e) => setTierField(i, "count", e.target.value)}
                placeholder="Referrals"
                className="col-span-2 px-3 py-2 bg-[#fbfbfa] border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111]"
              />
              <input
                value={tier?.id || ""}
                onChange={(e) => setTierField(i, "id", e.target.value)}
                placeholder="Reward ID (e.g. challenge_referral_gold)"
                className="col-span-5 px-3 py-2 bg-[#fbfbfa] border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111]"
              />
              <input
                value={tier?.label || ""}
                onChange={(e) => setTierField(i, "label", e.target.value)}
                placeholder="Label"
                className="col-span-3 px-3 py-2 bg-[#fbfbfa] border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111]"
              />
              <input
                type="number" min="0"
                value={tier?.days ?? ""}
                onChange={(e) => setTierField(i, "days", e.target.value)}
                placeholder="Days"
                className="col-span-1 px-3 py-2 bg-[#fbfbfa] border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111]"
              />
              <button
                type="button"
                onClick={() => onChange("referralTiers", tiers.filter((_, j) => j !== i))}
                aria-label={`Remove tier ${i + 1}`}
                className="col-span-1 p-2 text-[#999] hover:text-red-600 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
