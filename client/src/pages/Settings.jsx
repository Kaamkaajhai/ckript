import { useState, useContext } from "react";
import { motion } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";

const Settings = () => {
  const { user, setUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    bio: user?.bio || "",
    skills: user?.skills?.join(", ") || "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    messageNotifications: true,
    followNotifications: true,
    postLikeNotifications: false,
    scriptPurchaseNotifications: true,
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const { data } = await api.put("/users/profile", {
        name: profileData.name,
        bio: profileData.bio,
        skills: profileData.skills.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setUser({ ...user, ...data });
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Update failed" });
    } finally { setLoading(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      setLoading(false);
      return;
    }
    try {
      await api.put("/users/password", { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
      setMessage({ type: "success", text: "Password changed successfully!" });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Password change failed" });
    } finally { setLoading(false); }
  };

  const handleNotificationUpdate = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      await api.put("/users/notifications", notificationSettings);
      setMessage({ type: "success", text: "Notification preferences updated!" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update preferences" });
    } finally { setLoading(false); }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: "👤" },
    { id: "password", label: "Password", icon: "🔒" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "privacy", label: "Privacy", icon: "🛡️" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5 sm:mb-6">Settings</h1>

        <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
          {/* Tabs */}
          <div className="md:w-52 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 overflow-x-auto md:overflow-x-visible">
              <div className="flex md:flex-col gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setMessage({ type: "", text: "" }); }}
                    className={[
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition whitespace-nowrap flex-shrink-0 text-sm",
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 font-semibold"
                        : "text-gray-600 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <span>{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
              {message.text && (
                <div className={[
                  "mb-5 px-4 py-2.5 rounded-xl text-sm",
                  message.type === "success" ? "bg-green-50 border border-green-100 text-green-700" : "bg-red-50 border border-red-100 text-red-700",
                ].join(" ")}>
                  {message.text}
                </div>
              )}

              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-5">Profile Settings</h2>
                  <form onSubmit={handleProfileUpdate} className="space-y-4 sm:space-y-5">
                    <div>
                      <label className="block text-sm text-gray-700 font-medium mb-1.5">Name</label>
                      <input type="text" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 font-medium mb-1.5">Email</label>
                      <input type="email" value={profileData.email} disabled
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 cursor-not-allowed" />
                      <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 font-medium mb-1.5">Bio</label>
                      <textarea value={profileData.bio} onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        rows={3} className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 font-medium mb-1.5">Skills (comma-separated)</label>
                      <input type="text" value={profileData.skills} onChange={(e) => setProfileData({ ...profileData, skills: e.target.value })}
                        placeholder="JavaScript, React, Node.js"
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                    </div>
                    <button type="submit" disabled={loading}
                      className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50">
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                  </form>
                </div>
              )}

              {/* Password Tab */}
              {activeTab === "password" && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-5">Change Password</h2>
                  <form onSubmit={handlePasswordChange} className="space-y-4 sm:space-y-5">
                    {[
                      { key: "currentPassword", label: "Current Password" },
                      { key: "newPassword", label: "New Password" },
                      { key: "confirmPassword", label: "Confirm New Password" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-sm text-gray-700 font-medium mb-1.5">{label}</label>
                        <input type="password" value={passwordData[key]}
                          onChange={(e) => setPasswordData({ ...passwordData, [key]: e.target.value })} required
                          className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                      </div>
                    ))}
                    <button type="submit" disabled={loading}
                      className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50">
                      {loading ? "Changing..." : "Change Password"}
                    </button>
                  </form>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-5">Notification Preferences</h2>
                  <div className="space-y-3">
                    {Object.entries(notificationSettings).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-xl">
                        <div>
                          <h3 className="text-sm font-medium text-gray-800">
                            {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                          </h3>
                          <p className="text-xs text-gray-500">Receive notifications for this activity</p>
                        </div>
                        <label className="relative inline-block w-11 h-6 cursor-pointer">
                          <input type="checkbox" checked={value}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, [key]: e.target.checked })}
                            className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-indigo-600 transition">
                            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleNotificationUpdate} disabled={loading}
                    className="mt-5 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50">
                    {loading ? "Saving..." : "Save Preferences"}
                  </button>
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === "privacy" && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-5">Privacy Settings</h2>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h3 className="text-sm font-medium text-gray-800 mb-1.5">Profile Visibility</h3>
                      <p className="text-xs text-gray-500 mb-3">Control who can see your profile</p>
                      <select className="w-full p-2.5 border border-gray-200 rounded-xl text-sm">
                        <option>Public</option>
                        <option>Followers Only</option>
                        <option>Private</option>
                      </select>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                      <h3 className="text-sm font-medium text-gray-800 mb-2">Data & Privacy</h3>
                      <button className="w-full text-left px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition">Download My Data</button>
                      <button className="w-full text-left px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition">View Privacy Policy</button>
                      <button className="w-full text-left px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm hover:bg-red-100 transition">Delete Account</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;
