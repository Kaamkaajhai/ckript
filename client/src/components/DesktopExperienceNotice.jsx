import React, { useState, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, X } from "lucide-react";
import DarkModeContext from "../context/DarkModeContext";

const DesktopExperienceNotice = () => {
    const { isDark } = useContext(DarkModeContext);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if the user is on a mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const windowWidth = window.innerWidth;
        
        // Only show if it's a mobile device (or small screen) and hasn't been dismissed in this session
        if ((isMobile || windowWidth <= 768) && !sessionStorage.getItem("desktopNoticeDismissed")) {
            // Small delay to not immediately block the screen
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem("desktopNoticeDismissed", "true");
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className={`relative w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl border ${
                            isDark
                                ? "bg-[#111111] border-gray-800"
                                : "bg-white border-gray-100"
                        }`}
                    >
                        {/* Decorative Top Accent */}
                        <div className="h-1.5 w-full bg-[#8B1E1E]" />

                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${
                                    isDark ? "bg-[#1a1a1a]" : "bg-gray-50"
                                }`}>
                                    <Monitor className={`w-6 h-6 ${isDark ? "text-gray-300" : "text-gray-700"}`} />
                                </div>
                                <button
                                    onClick={handleDismiss}
                                    className={`p-2 rounded-full transition-colors ${
                                        isDark ? "hover:bg-gray-800 text-gray-400 hover:text-gray-200" : "hover:bg-gray-100 text-gray-500 hover:text-gray-800"
                                    }`}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <h3 className={`text-xl font-medium tracking-tight mb-2 ${
                                isDark ? "text-white" : "text-gray-900"
                            }`}>
                                Switch to Desktop
                            </h3>
                            
                            <p className={`text-[15px] leading-relaxed mb-6 ${
                                isDark ? "text-gray-400" : "text-gray-600"
                            }`}>
                                For the full Ckript experience with access to all professional tools, dashboard features, and script viewers, please use a laptop or desktop computer.
                            </p>

                            <button
                                onClick={handleDismiss}
                                className="w-full py-3.5 px-4 rounded-xl font-medium text-[15px] tracking-wide transition-all bg-[#8B1E1E] hover:bg-[#7a1a1a] text-white shadow-[0_4px_14px_0_rgba(139,30,30,0.39)]"
                            >
                                Continue on Mobile
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default DesktopExperienceNotice;
