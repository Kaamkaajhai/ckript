import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, ArrowLeft, Eye, MoreVertical, LayoutDashboard, Palette, Clock, CheckSquare, Trophy, Users, Star, MessageSquare, Download, Link2, Bell, Award, Mail, Settings, Activity } from "lucide-react";
import { adminApi } from "../../AdminDashboard";
import OverviewModule from "./modules/OverviewModule";
import BrandingModule from "./modules/BrandingModule";
import TimelineModule from "./modules/TimelineModule";
import ThemeModule from "./modules/ThemeModule";
import PrizesModule from "./modules/PrizesModule";
import JudgesModule from "./modules/JudgesModule";
import SponsorsModule from "./modules/SponsorsModule";
import CommunityModule from "./modules/CommunityModule";
import ResourcesModule from "./modules/ResourcesModule";
import SeoModule from "./modules/SeoModule";
import SettingsModule from "./modules/SettingsModule";
import PreviewPane from "./modules/PreviewPane";

// The API speaks ISO UTC, but <input type="datetime-local"> speaks local wall-clock time
const fromLocalInput = (value) => (value ? new Date(value).toISOString() : null);

const SIDEBAR_NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "branding", label: "Branding & Media", icon: Palette },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "theme", label: "Theme & Requirements", icon: CheckSquare },
  { id: "prizes", label: "Prizes", icon: Trophy },
  { id: "judges", label: "Judging Panel", icon: Users },
  { id: "sponsors", label: "Sponsors", icon: Star },
  { id: "community", label: "Community", icon: MessageSquare },
  { id: "resources", label: "Resources", icon: Download },
  { id: "seo", label: "SEO & Social", icon: Link2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "certificates", label: "Certificates", icon: Award },
  { id: "emails", label: "Emails", icon: Mail },
  { id: "analytics", label: "Analytics", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings, danger: true },
];

export default function AdminCompetitionsEditor({ isDark = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (id === "new") {
      // Mock new competition payload
      setCompetition({
        name: "",
        dates: { regOpensAt: "", regClosesAt: "", startsAt: "", endsAt: "" },
        prizes: { winner: [], runnerUp: [], special: [] },
        detailedPrizes: [],
        rules: [""],
        faq: [],
        judges: [],
        sponsors: [],
        communityLinks: [],
        resources: []
      });
      setLoading(false);
    } else {
      loadCompetition();
    }
  }, [id]);

  const loadCompetition = async () => {
    try {
      setLoading(true);
      const { data } = await adminApi.get("/admin/competitions");
      const found = data.competitions.find(c => c._id === id);
      if (found) {
        setCompetition(found);
      } else {
        setError("Competition not found.");
      }
    } catch (err) {
      setError("Failed to load.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...competition,
        dates: Object.fromEntries(
          Object.entries(competition.dates || {})
            .map(([k, v]) => {
              // If it's already an ISO string (e.g. unmodified from API, or from TimelineModule), leave it.
              // If it's a local input string, convert it. If empty, return null to clear it in Mongo.
              const isIso = typeof v === 'string' && v.endsWith('Z');
              return [k, isIso ? v : (v ? fromLocalInput(v) : null)];
            })
            // we do NOT filter here, so nulls are sent to overwrite/clear existing dates
        )
      };

      if (id === "new") {
        const { data } = await adminApi.post("/admin/competitions", payload);
        navigate(`/admin/competitions/${data.competition._id}`);
      } else {
        await adminApi.put(`/admin/competitions/${id}`, payload);
      }
    } catch (err) {
      alert("Failed to save: " + (err?.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key, value) => {
    setCompetition(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <div className="p-8 text-[#888]">Loading editor...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="flex h-screen bg-[#fbfbfa] text-[#111] overflow-hidden">
      
      {/* Left Sidebar */}
      <div className="w-64 bg-[#f4f2f0] border-r border-[#eaeaea] flex flex-col">
        <div className="p-4 border-b border-[#eaeaea] flex items-center gap-2">
          <button onClick={() => navigate("/admin/competitions")} className="p-1.5 hover:bg-[#e4e2e0] rounded-md transition-colors text-[#555]">
            <ArrowLeft size={16} />
          </button>
          <span className="font-semibold text-sm truncate">{competition.name || "Untitled Competition"}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {SIDEBAR_NAV.map((nav) => {
            const Icon = nav.icon;
            const isActive = activeTab === nav.id;
            return (
              <button
                key={nav.id}
                onClick={() => setActiveTab(nav.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all ${
                  isActive 
                    ? "bg-white shadow-sm text-[#111] font-semibold" 
                    : "text-[#555] hover:bg-[#e4e2e0] font-medium"
                } ${nav.danger && !isActive ? "text-red-600 hover:bg-red-50" : ""}`}
              >
                <Icon size={16} className={isActive ? (nav.danger ? "text-red-500" : "text-[#111]") : "opacity-70"} />
                {nav.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Sticky Header */}
        <div className="h-16 bg-white border-b border-[#eaeaea] px-6 flex items-center justify-between shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold font-serif">{SIDEBAR_NAV.find(n => n.id === activeTab)?.label}</h1>
            <span className="px-2.5 py-1 bg-[#fff0ed] text-[#c94b3a] rounded-full text-xs font-bold uppercase tracking-wide">
              {competition.lifecycle}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setPreviewOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#555] bg-white border border-[#eaeaea] hover:bg-[#faf9f8] rounded-lg transition-all"
            >
              <Eye size={16} />
              Preview
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#111] hover:bg-[#333] shadow-md rounded-lg transition-all disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button className="p-2 text-[#555] hover:bg-[#faf9f8] border border-[#eaeaea] rounded-lg transition-colors">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Form Area */}
        <div className="flex-1 overflow-y-auto bg-[#fbfbfa]">
          <div className="max-w-4xl mx-auto p-8 pb-32">
            
            {activeTab === "overview" && (
              <OverviewModule data={competition} onChange={updateField} />
            )}
            
            {activeTab === "branding" && (
              <BrandingModule data={competition} onChange={updateField} />
            )}
            
            {activeTab === "timeline" && (
              <TimelineModule data={competition} onChange={updateField} />
            )}
            
            {activeTab === "theme" && (
              <ThemeModule data={competition} onChange={updateField} />
            )}

            {activeTab === "prizes" && (
              <PrizesModule data={competition} onChange={updateField} />
            )}

            {activeTab === "judges" && (
              <JudgesModule data={competition} onChange={updateField} />
            )}

            {activeTab === "sponsors" && (
              <SponsorsModule data={competition} onChange={updateField} />
            )}

            {activeTab === "community" && (
              <CommunityModule data={competition} onChange={updateField} />
            )}

            {activeTab === "resources" && (
              <ResourcesModule data={competition} onChange={updateField} />
            )}

            {activeTab === "seo" && (
              <SeoModule data={competition} onChange={updateField} />
            )}

            {activeTab === "settings" && (
              <SettingsModule data={competition} onChange={updateField} />
            )}
            
            {/* Fallback for unbuilt modules */}
            {activeTab !== "overview" && activeTab !== "branding" && activeTab !== "timeline" && activeTab !== "theme" && activeTab !== "prizes" && activeTab !== "judges" && activeTab !== "sponsors" && activeTab !== "community" && activeTab !== "resources" && activeTab !== "seo" && activeTab !== "settings" && (
              <div className="p-12 border-2 border-dashed border-[#eaeaea] rounded-2xl flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-[#f4f2f0] rounded-2xl flex items-center justify-center text-[#888] mb-4">
                  {React.createElement(SIDEBAR_NAV.find(n => n.id === activeTab)?.icon, { size: 32 })}
                </div>
                <h3 className="text-xl font-bold text-[#111] mb-2">{SIDEBAR_NAV.find(n => n.id === activeTab)?.label}</h3>
                <p className="text-[#666] max-w-sm">This module is part of the new architecture and is currently being built.</p>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Slide-over Preview Pane */}
      <PreviewPane 
        data={competition} 
        isVisible={previewOpen} 
        onClose={() => setPreviewOpen(false)} 
      />

    </div>
  );
}
