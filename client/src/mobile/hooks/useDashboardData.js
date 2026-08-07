import { useState, useEffect } from "react";
import api from "../../services/api";
import { DASHBOARD_PREVIEW_DATA } from "../data/dashboardData";

const DEFAULT_STATS = {
  totalEarnings: 0, totalUnlocks: 0, totalViews: 0,
  profileViews: 0, trailersGenerated: 0, avgScore: null, plan: "free",
};

export function useDashboardData(user, { preview = false } = {}) {
  const [data, setData] = useState(() => preview ? DASHBOARD_PREVIEW_DATA : null);
  const [loading, setLoading] = useState(() => !preview);

  useEffect(() => {
    if (preview) {
      setData(DASHBOARD_PREVIEW_DATA);
      setLoading(false);
      return undefined;
    }

    let disposed = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [scriptsRes, statsRes, reviewsRes] = await Promise.allSettled([
          api.get("/scripts/mine?includeCollaborations=1"),
          api.get("/dashboard"),
          api.get("/dashboard/reviews"),
        ]);
        
        if (disposed) return;

        let allScripts = [];
        if (scriptsRes.status === "fulfilled") {
          allScripts = Array.isArray(scriptsRes.value.data) ? scriptsRes.value.data : [];
        }

        let rawStats = DEFAULT_STATS;
        if (statsRes.status === "fulfilled") {
          rawStats = statsRes.value.data.stats ?? statsRes.value.data ?? DEFAULT_STATS;
        }

        let rawReviews = { ai: [], adminScores: [] };
        if (reviewsRes.status === "fulfilled") {
          rawReviews = reviewsRes.value.data ?? rawReviews;
        }

        // Processing
        const myScripts = allScripts.filter(s => !s?.isCollaborator);
        const sharedScripts = allScripts.filter(s => s?.isCollaborator);
        const published = myScripts.filter(s => s.status === "published");
        const pending = myScripts.filter(s => s.status === "pending_approval");
        
        const totalViews = published.reduce((s, sc) => s + (sc.views || 0), 0);
        const topScript = published.length
          ? published.reduce((a, b) => (a.views || 0) >= (b.views || 0) ? a : b)
          : null;
        const avgViews = published.length ? Math.round(totalViews / published.length) : 0;

        const topRailScripts = [...published]
          .sort((a, b) => (b.views || 0) - (a.views || 0))
          .slice(0, 4);

        const profileCompletionValue = typeof user?.profileCompletion === 'object' ? (user?.profileCompletion?.percentage || 0) : (user?.profileCompletion || 0);

        // Overview
        const overview = {
          profileCompletion: profileCompletionValue,
          hero: {
            title: "Your Stories in Motion",
            body: "Track scripts, trailer engagement & producer interest — all in one place.",
          },
          glance: [
            { icon: "visibility", label: "Profile Views", value: (rawStats.profileViews ?? rawStats.totalViews ?? 0).toLocaleString(), note: "", tone: "muted" },
            { icon: "payments", label: "Earnings", value: `₹${(rawStats.totalEarnings || 0).toLocaleString()}`, note: "", tone: "muted" },
            { icon: "lock_open", label: "Unlocks", value: (rawStats.totalUnlocks || 0).toLocaleString(), note: "", tone: "muted" },
            { icon: "movie", label: "AI Trailers", value: (rawStats.trailersGenerated || 0).toLocaleString(), note: "", tone: "muted" },
          ],
          avgScore: { value: rawStats.avgScore != null ? rawStats.avgScore : "—", out: 100, note: "Across all reviewed scripts" },
          biggestMover: { title: topRailScripts[0]?.title || "—", note: topRailScripts[0] ? `${(topRailScripts[0].views || 0).toLocaleString()} views` : "" },
          topScripts: topRailScripts.map((s, i) => ({
            rank: i + 1,
            title: s.title,
            meta: `${s.genre || "Script"} · ${s.format || "Feature"}`,
            views: `${(s.views || 0).toLocaleString()}`
          })),
        };

        // Performance
        const barData = [...myScripts]
          .sort((a, b) => (b.views || 0) - (a.views || 0))
          .slice(0, 6);
        const maxV = Math.max(...barData.map(b => b.views || 0), 1);
        const performance = {
          stats: [
            { label: "Total Views", value: totalViews.toLocaleString() },
            { label: "Top Script", value: (topScript?.views || 0).toLocaleString(), sub: topScript?.title },
            { label: "Avg / Script", value: avgViews.toLocaleString() },
          ],
          chart: {
            yAxis: [maxV, Math.round(maxV * 0.75), Math.round(maxV * 0.5), Math.round(maxV * 0.25), 0].map(v => v.toLocaleString()),
            bars: barData.map((b, i) => ({
              label: b.title?.length > 10 ? b.title.slice(0, 10) + "…" : (b.title || "Untitled"),
              h: Math.max(1.5, ((b.views || 0) / maxV) * 100),
              accent: i === 0,
              opacity: i === 0 ? 1 : Math.max(0.3, 1 - i * 0.12)
            }))
          },
          details: [
            { icon: "schedule", label: "Avg watch time", value: "—" },
            { icon: "bookmark", label: "Saves", value: "—" },
          ],
        };

        // Projects
        const projects = {
          total: myScripts.length,
          pendingApproval: pending.length,
          featured: myScripts.slice(0, 2).map(s => ({
            id: s._id,
            title: s.title,
            author: s.creator?.name || user?.name || "Unknown",
            date: new Date(s.createdAt).toLocaleDateString(),
            logline: s.logline || "No logline provided",
            status: { label: s.status, dot: s.status === "published" ? "var(--ckm-live)" : "#f5a623" },
            score: null, // would need to merge with reviews
            tags: [
              { label: s.genre || "Unknown", tone: "neutral" },
              { label: s.format || "Unknown", tone: "neutral" },
            ],
            views: `${(s.views || 0).toLocaleString()}`,
            rating: "—",
            price: s.isPremium ? "Premium" : "Free",
            cover: "placeholder",
          })),
          collaborations: sharedScripts.map(s => ({
            id: s._id,
            title: s.title,
            by: `Shared by ${s.creator?.name || "Unknown"}`,
            status: "Open",
            swatch: "linear-gradient(135deg,#e6efe4,#c9ddc4)",
          })),
        };

        // All Projects
        const SWATCHES = [
          "linear-gradient(135deg,#dce9f8,#b5d0ef)",
          "linear-gradient(135deg,#f0e5d6,#e0cdb2)",
          "linear-gradient(135deg,#e6efe4,#c9ddc4)",
          "linear-gradient(135deg,#f2dede,#e6bcbc)",
        ];
        const allProjects = myScripts.map((s, id) => ({
          id: s._id,
          title: s.title,
          score: null,
          state: s.status,
          meta: s.status === "published" ? `${(s.views || 0).toLocaleString()} views` : s.status,
          swatch: SWATCHES[id % SWATCHES.length],
        }));

        // Reviews
        // Need to parse actual AI and Platform reviews from rawReviews.ai and rawReviews.adminScores
        // This logic is mostly same as data mappings
        const aiReviews = (rawReviews.ai || []).map((r, id) => {
          let score = r.score || 0;
          return {
            id: r.scriptId || id,
            title: r.scriptTitle || "Untitled",
            score: score,
            excerpt: r.summary || "AI Analysis completed.",
            verdict: "Analyzed", vcol: "var(--ckm-accent)", vbg: "var(--ckm-accent-soft)",
            bars: [
              { label: "Structure", val: score, w: `${score}%` },
              { label: "Dialogue", val: score, w: `${score}%` },
              { label: "Pacing", val: score, w: `${score}%` },
              { label: "Originality", val: score, w: `${score}%` },
            ],
            raw: r // keep raw for details
          };
        });

        const platformReviews = (rawReviews.adminScores || []).map((r, id) => {
          let score = r.score || 0;
          return {
            id: r.scriptId || id,
            title: r.scriptTitle || "Untitled",
            score: score,
            grade: score >= 75 ? "Grade A" : "Grade B",
            gcol: "var(--ckm-green)", gbg: "var(--ckm-green-bg)",
            feedback: r.feedback || "Platform review completed.",
            bars: [
              { label: "Main Content", val: score, w: `${score}%` },
            ]
          };
        });

        setData({
          overview,
          performance,
          projects,
          allProjects,
          aiReviews,
          platformReviews
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => { disposed = true; };
  }, [preview, user]);

  return { data, loading };
}
