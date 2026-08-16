import React, { useState, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import DarkModeContext from "../context/DarkModeContext";
import { AuthContext } from "../context/AuthContext";
import { resolveMobileExperience } from "../mobile/routes/mobileRoutePolicy";
import useIsMobile from "../mobile/hooks/useIsMobile";

/*
 * DEF-23. This notice predates the native mobile app, and it is mounted
 * globally — so as routes are promoted to real mobile screens it began
 * covering them with a full-viewport scrim whose message is that the full
 * experience needs a laptop. Measured on /featured AND /top-script at 320,
 * 360, 390, 430 and 768 px.
 *
 * It is GATED rather than deleted, because on a route that is still a desktop
 * migration fallback the message is simply true: that page really is desktop
 * markup on a phone. The gate asks the SAME policy the router asks, so the
 * notice disappears from a route on the day that route becomes a screen, with
 * no second list to keep in sync — and it removes itself entirely once the
 * migration finishes.
 */
const DesktopExperienceNotice = () => {
    const { isDark } = useContext(DarkModeContext);
    const { user, loading: authLoading } = useContext(AuthContext) || {};
    const { pathname, search } = useLocation();
    const isMobileViewport = useIsMobile();
    const [isVisible, setIsVisible] = useState(false);

    /*
     * The dev harnesses are DEV_ONLY, so the policy correctly answers
     * "desktop" for them — RootExperience must not intercept a route that
     * mounts MobileApp with its own fixture context. But they DO render a
     * native screen, and a sweep that measures one is measuring the screen.
     * Without this the notice would keep covering every future five-width
     * run, which is how it stayed invisible to D25's and D26's probes.
     */
    const isMobileHarness = import.meta.env.DEV && pathname.startsWith("/__mobile");

    const nativeScreen = isMobileHarness || resolveMobileExperience({
        isMobile: isMobileViewport,
        authLoading: Boolean(authLoading),
        user,
        pathname,
        search,
        isDev: import.meta.env.DEV,
    }).experience === "mobile";

    useEffect(() => {
        // Never arm the timer on a route that renders a native screen. The
        // "already open when the route changed" case is handled by DERIVING
        // visibility below rather than by closing it from here — an effect
        // that calls setState paints the wrong frame first.
        if (nativeScreen) return undefined;

        // Check if the user is on a mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const windowWidth = window.innerWidth;

        // Only show if it's a mobile device (or small screen) and hasn't been dismissed in this session
        if ((isMobile || windowWidth <= 768) && !sessionStorage.getItem("desktopNoticeDismissed")) {
            // Small delay to not immediately block the screen
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [nativeScreen]);

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem("desktopNoticeDismissed", "true");
    };

    return (
        <AnimatePresence>
            {/* Derived, not synced: navigating from a fallback route to a
                native screen with the notice already open must close it, and
                deriving means it is never painted over the screen even once. */}
            {isVisible && !nativeScreen && (
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
                                {/* Was an unnamed 38x38 px target: no accessible
                                    name at all, and under the 44 px floor. */}
                                <button
                                    type="button"
                                    onClick={handleDismiss}
                                    aria-label="Dismiss this notice"
                                    className={`flex items-center justify-center w-11 h-11 rounded-full transition-colors ${
                                        isDark ? "hover:bg-gray-800 text-gray-400 hover:text-gray-200" : "hover:bg-gray-100 text-gray-500 hover:text-gray-800"
                                    }`}
                                >
                                    <X className="w-5 h-5" aria-hidden="true" />
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

                            {/*
                              * `text-white` on this button was DEAD, and the
                              * label rendered near-black on #8B1E1E at 2.17:1
                              * (measured). Tailwind v4 emits utilities inside
                              * @layer utilities, and index.css:136 declares an
                              * UNLAYERED `button { color: inherit }` — unlayered
                              * author CSS beats any layer regardless of
                              * specificity, so the utility never applied. The
                              * colour is set inline here because that is the
                              * only fix local to this component; the general
                              * defect is DEF-24 and needs a visual pass.
                              */}
                            <button
                                type="button"
                                onClick={handleDismiss}
                                style={{ color: "#ffffff" }}
                                className="w-full py-3.5 px-4 rounded-xl font-medium text-[15px] tracking-wide transition-all bg-[#8B1E1E] hover:bg-[#7a1a1a] shadow-[0_4px_14px_0_rgba(139,30,30,0.39)]"
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
