import React from "react";
import { Calendar } from "lucide-react";

// The API speaks ISO UTC, but <input type="datetime-local"> speaks local wall-clock time
const toLocalInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const fromLocalInput = (value) => (value ? new Date(value).toISOString() : "");

export default function TimelineModule({ data, onChange }) {
  const dates = data.dates || {};

  const handleDateChange = (key, value) => {
    onChange("dates", { ...dates, [key]: fromLocalInput(value) });
  };

  const scheduleStages = [
    { key: "regOpensAt", label: "Registration Opens", description: "When writers can start claiming their spot." },
    { key: "regClosesAt", label: "Registration Closes", description: "The final moment to enter before the prompt drops." },
    { key: "startsAt", label: "Competition Starts (Theme Reveal)", description: "The prompt is revealed and the timer begins." },
    { key: "endsAt", label: "Submission Deadline", description: "The moment the competition ends and uploads lock." },
    { key: "resultsAt", label: "Results Announcement", description: "Informational date displayed to participants." },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="mb-8">
          <h2 className="text-xl font-serif font-bold text-[#111]">Timeline & Schedule</h2>
          <p className="text-sm text-[#666] mt-1">Configure the exact lifecycle of your event. Times are stored in UTC.</p>
        </div>

        <div className="relative">
          {/* Vertical Track Line */}
          <div className="absolute left-6 top-6 bottom-6 w-px bg-[#e4e2e0] z-0"></div>
          
          <div className="space-y-8 relative z-10">
            {scheduleStages.map((stage, idx) => (
              <div key={stage.key} className="flex items-start gap-6">
                
                {/* Node */}
                <div className="w-12 flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full border-[3px] border-white flex items-center justify-center shrink-0 shadow-sm ${
                    dates[stage.key] ? "bg-[#111] text-white" : "bg-[#f4f2f0] text-[#888]"
                  }`}>
                    <Calendar size={16} />
                  </div>
                </div>

                {/* Content Card */}
                <div className="flex-1 bg-[#fbfbfa] border border-[#eaeaea] rounded-2xl p-6 transition-all hover:border-[#ccc]">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-[#111] text-base">{stage.label}</h3>
                      <p className="text-[#666] text-sm mt-1">{stage.description}</p>
                    </div>
                    {/* Status Badge */}
                    {dates[stage.key] && (
                      <span className="px-2.5 py-1 bg-[#eefcf3] text-[#0f8c3b] rounded-full text-[10px] font-bold uppercase tracking-wider">
                        Scheduled
                      </span>
                    )}
                  </div>
                  
                  <input
                    type="datetime-local"
                    value={toLocalInput(dates[stage.key])}
                    onChange={(e) => handleDateChange(stage.key, e.target.value)}
                    className="w-full max-w-sm px-4 py-3 bg-white border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111] transition-all font-mono text-sm"
                  />
                </div>

              </div>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
}
