import { useAdminDashboard } from "../dashboardContext";


/**
 * "meetings" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5c. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const MeetingsSection = () => {
    const {
        isDark,
        meetings,
    } = useAdminDashboard();

                return (
                    <div>
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>Scheduled Meetings<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({meetings.length})</span></h2>
                        <div className="space-y-4">
                            {meetings.length === 0 ? (
                                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No meetings found.</p>
                            ) : (
                                meetings.map((meeting) => (
                                    <div key={meeting._id} className={`p-4 rounded-xl border ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200"}`}>
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                                            <div>
                                                <h3 className={`font-semibold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>{meeting.title}</h3>
                                                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"} mt-1`}>
                                                    Producer: <span className="font-semibold">{meeting.producer_name}</span> | Writer: <span className="font-semibold">{meeting.writer_name}</span>
                                                </p>
                                                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                                    Script: <a href={`/admin/scripts/${meeting.script}`} className="text-blue-500 hover:underline">{meeting.script_name}</a>
                                                </p>
                                                <div className={`mt-2 flex gap-4 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                                    <span>📅 {new Date(meeting.scheduledDate).toLocaleDateString()}</span>
                                                    <span>⏰ {meeting.scheduledTime}</span>
                                                    <span>⏱️ {meeting.duration} min</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col sm:items-end gap-2">
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wider ${
                                                    meeting.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                                                    meeting.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {meeting.status}
                                                </span>
                                                {meeting.status === "accepted" && (
                                                    <a
                                                        href={meeting.meetingLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-1 text-xs font-bold text-[#D14D37] hover:underline"
                                                    >
                                                        Meeting Link
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );
};

export default MeetingsSection;
