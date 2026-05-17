import {
    ADMIN_SCRIPT_SECTION_ACCESS_HEADER,
    verifyAdminScriptSectionAccessToken,
} from "../utils/adminScriptSectionAccess.js";

const SCRIPT_SECTION_ACCESS_ERROR = {
    code: "ADMIN_SCRIPT_SECTION_PASSWORD_REQUIRED",
    message: "Script section password is required for this admin action.",
};

const requireAdminScriptSectionAccess = (req, res, next) => {
    const accessToken = String(req.get(ADMIN_SCRIPT_SECTION_ACCESS_HEADER) || "").trim();

    if (!accessToken || !verifyAdminScriptSectionAccessToken(accessToken, req.user?._id)) {
        return res.status(403).json(SCRIPT_SECTION_ACCESS_ERROR);
    }

    next();
};

export default requireAdminScriptSectionAccess;
