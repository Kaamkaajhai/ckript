import { useState, useMemo } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Cell,
} from "recharts";

const sourceBarColor = (source) => {
  if (source === "AI") return "#1e3a5f";
  if (source === "Reader") return "#4a6d8c";
  return "#a8c4d8";
};

const distBarFill = (range) => {
  const map = {
    "0-20": "#d1d5db",
    "21-40": "#a8c4d8",
    "41-60": "#7a9bb5",
    "61-80": "#4a6d8c",
    "81-100": "#1e3a5f",
  };
  return map[range] || "#94a3b8";
};

const DashboardCharts = ({ reviews }) => {
  const [graphView, setGraphView] = useState("bar");

  const radarData = useMemo(() => {
    const aiWithScores = (reviews?.ai || []).filter((r) => r.scores);
    if (aiWithScores.length === 0) return [];
    const dims = ["plot", "characters", "dialogue", "pacing", "marketability"];
    return dims.map((d) => ({
      dimension: d.charAt(0).toUpperCase() + d.slice(1),
      score: Math.round(
        aiWithScores.reduce((sum, r) => sum + (r.scores[d] || 0), 0) /
          aiWithScores.length
      ),
      fullMark: 100,
    }));
  }, [reviews?.ai]);

  const ratingsBarData = useMemo(() => {
    const all = [
      ...(reviews?.ai || []).map((r) => ({ ...r, source: "AI" })),
      ...(reviews?.readers || []).map((r) => ({ ...r, source: "Reader" })),
      ...(reviews?.platform || []).map((r) => ({ ...r, source: "Editorial" })),
    ].filter((r) => r.rating != null);
    return all.map((r) => ({
      name: r.reviewer || r.scriptTitle || r.source,
      rating: r.rating,
      source: r.source,
    }));
  }, [reviews]);

  const distributionData = useMemo(() => {
    const buckets = [
      { range: "0-20", min: 0, max: 20, count: 0 },
      { range: "21-40", min: 21, max: 40, count: 0 },
      { range: "41-60", min: 41, max: 60, count: 0 },
      { range: "61-80", min: 61, max: 80, count: 0 },
      { range: "81-100", min: 81, max: 100, count: 0 },
    ];
    [
      ...(reviews?.ai || []),
      ...(reviews?.readers || []),
      ...(reviews?.platform || []),
    ]
      .filter((r) => r.rating != null)
      .forEach((r) => {
        const b = buckets.find((bk) => r.rating >= bk.min && r.rating <= bk.max);
        if (b) b.count++;
      });
    return buckets;
  }, [reviews]);

  const hasData = radarData.length > 0 || ratingsBarData.length > 0;

  if (!hasData) return null;

  const tooltipStyle = {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    fontSize: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  };

  return (
    <div className="mb-6">
      {/* Graph toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-4">
        {[
          { key: "radar", label: "Radar" },
          { key: "bar", label: "Ratings" },
          { key: "distribution", label: "Distribution" },
        ].map((g) => (
          <button
            key={g.key}
            onClick={() => setGraphView(g.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              graphView === g.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        {/* Radar */}
        {graphView === "radar" && radarData.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
              Avg AI Score Breakdown
            </p>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis
                    dataKey="dimension"
                    tick={{ fontSize: 11, fill: "#6b7280", fontWeight: 500 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: "#9ca3af" }}
                    axisLine={false}
                  />
                  <Radar
                    dataKey="score"
                    stroke="#0f2544"
                    fill="#0f2544"
                    fillOpacity={0.15}
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#0f2544" }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {graphView === "radar" && radarData.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400">
              No AI scores yet — score a script to see the radar
            </p>
          </div>
        )}

        {/* Bar — all ratings */}
        {graphView === "bar" && ratingsBarData.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
              All Ratings
            </p>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ratingsBarData}
                  margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f3f4f6"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "rgba(0,0,0,0.02)" }}
                  />
                  <Bar dataKey="rating" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {ratingsBarData.map((entry, i) => (
                      <Cell key={i} fill={sourceBarColor(entry.source)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-5 mt-2">
              {[
                { s: "AI", c: "#1e3a5f" },
                { s: "Reader", c: "#4a6d8c" },
                { s: "Editorial", c: "#a8c4d8" },
              ].map((l) => (
                <div key={l.s} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: l.c }}
                  />
                  <span className="text-[10px] text-gray-400 font-medium">
                    {l.s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {graphView === "bar" && ratingsBarData.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400">No ratings to display yet</p>
          </div>
        )}

        {/* Distribution */}
        {graphView === "distribution" && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
              Score Distribution
            </p>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={distributionData}
                  margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f3f4f6"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "rgba(0,0,0,0.02)" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {distributionData.map((entry, i) => (
                      <Cell key={i} fill={distBarFill(entry.range)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCharts;
