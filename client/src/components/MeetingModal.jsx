import { useState } from "react";
import api from "../services/api";

const MeetingModal = ({ isOpen, onClose, writerId, scriptId, writerName, scriptName, onMeetingScheduled }) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("30");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    
    if (!title || !date || !time || !duration) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post(
        `/meetings`,
        {
          writerId,
          scriptId,
          title,
          scheduledDate: date,
          scheduledTime: time,
          duration: parseInt(duration, 10),
          message,
        }
      );

      setSuccessMsg("Meeting requested successfully!");
      if (onMeetingScheduled) {
        onMeetingScheduled(response.data);
      }
      setTimeout(() => {
        onClose();
        setSuccessMsg("");
      }, 1500);
    } catch (err) {
      console.error(err);
      if (err.response?.data?.limitReached) {
        setErrorMsg("You have reached your scheduled meetings limit.");
      } else {
        setErrorMsg(err.response?.data?.message || "Failed to request meeting.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-white dark:bg-[#0B0A06] border border-[#e4e2dc] dark:border-[#1A1813] rounded-2xl shadow-xl overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#e4e2dc] dark:border-[#1A1813]">
          <h2 className="text-xl font-bold font-serif text-[#0B0A06] dark:text-[#f3f2ee]">Schedule Meeting</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:!text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Meeting with <strong className="text-[#0B0A06] dark:text-[#f3f2ee]">{writerName}</strong> about <strong>{scriptName}</strong>.
          </p>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
              {successMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#0B0A06] dark:text-[#f3f2ee] mb-1">
              Meeting Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-[#11100C] border border-[#e4e2dc] dark:border-[#2C2A26] rounded-lg text-gray-900 dark:!text-white dark:[color-scheme:dark] placeholder-gray-500 dark:!placeholder-white focus:ring-2 focus:ring-[#D14D37] focus:border-transparent outline-none transition-all"
              placeholder="e.g. Script Review & Deal Discussion"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#0B0A06] dark:text-[#f3f2ee] mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split("T")[0]}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#11100C] border border-[#e4e2dc] dark:border-[#2C2A26] rounded-lg text-gray-900 dark:!text-white dark:[color-scheme:dark] placeholder-gray-500 dark:!placeholder-white focus:ring-2 focus:ring-[#D14D37] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0B0A06] dark:text-[#f3f2ee] mb-1">
                Time *
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#11100C] border border-[#e4e2dc] dark:border-[#2C2A26] rounded-lg text-gray-900 dark:!text-white dark:[color-scheme:dark] placeholder-gray-500 dark:!placeholder-white focus:ring-2 focus:ring-[#D14D37] outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0B0A06] dark:text-[#f3f2ee] mb-1">
              Duration *
            </label>
            <select
              required
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-[#11100C] border border-[#e4e2dc] dark:border-[#2C2A26] rounded-lg text-gray-900 dark:!text-white dark:[color-scheme:dark] placeholder-gray-500 dark:!placeholder-white focus:ring-2 focus:ring-[#D14D37] outline-none transition-all"
            >
              <option value="30">30 Minutes</option>
              <option value="60">1 Hour</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0B0A06] dark:text-[#f3f2ee] mb-1">
              Optional Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-[#11100C] border border-[#e4e2dc] dark:border-[#2C2A26] rounded-lg text-gray-900 dark:!text-white dark:[color-scheme:dark] placeholder-gray-500 dark:!placeholder-white focus:ring-2 focus:ring-[#D14D37] outline-none transition-all resize-none"
              placeholder="Any details to share beforehand?"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#D14D37] hover:bg-[#b53c29] !text-white font-semibold rounded-lg transition-all shadow-md disabled:opacity-70"
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                "Send Meeting Request"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MeetingModal;
