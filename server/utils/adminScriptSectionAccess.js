import crypto from "node:crypto";
import jwt from "jsonwebtoken";

export const ADMIN_SCRIPT_SECTION_ACCESS_HEADER = "x-admin-script-access-token";

const ADMIN_SCRIPT_SECTION_ACCESS_TOKEN_TYPE = "admin_script_section_access";
const ADMIN_SCRIPT_SECTION_ACCESS_SCOPE = "script_sections";
const DEFAULT_SCRIPT_SECTION_ACCESS_TTL = "12h";
const DEFAULT_ADMIN_SCRIPT_SECTION_PASSWORD_SHA256 = "3d9c000ba0c2af17dbf37602a92c7e24b6fe6dc2bcc0152855ad7f5cfdcebf70";

const normalizeHash = (value = "") => String(value || "").trim().toLowerCase();

const getConfiguredPasswordHash = () =>
    normalizeHash(process.env.ADMIN_SCRIPT_SECTION_PASSWORD_SHA256)
    || DEFAULT_ADMIN_SCRIPT_SECTION_PASSWORD_SHA256;

const hashPassword = (password = "") =>
    crypto.createHash("sha256").update(String(password || ""), "utf8").digest("hex");

const safeCompareHex = (left = "", right = "") => {
    const normalizedLeft = normalizeHash(left);
    const normalizedRight = normalizeHash(right);

    if (!normalizedLeft || !normalizedRight || normalizedLeft.length !== normalizedRight.length) {
        return false;
    }

    try {
        return crypto.timingSafeEqual(
            Buffer.from(normalizedLeft, "hex"),
            Buffer.from(normalizedRight, "hex")
        );
    } catch {
        return false;
    }
};

export const hasAdminScriptSectionPasswordConfigured = () =>
    Boolean(getConfiguredPasswordHash());

export const validateAdminScriptSectionPassword = (candidatePassword = "") => {
    const configuredHash = getConfiguredPasswordHash();
    if (!configuredHash) return false;
    return safeCompareHex(hashPassword(candidatePassword), configuredHash);
};

export const issueAdminScriptSectionAccessToken = (userId) => {
    const secret = String(process.env.JWT_SECRET || "").trim();
    if (!secret) {
        throw new Error("JWT_SECRET is required to issue admin script section access tokens.");
    }

    const token = jwt.sign(
        {
            id: String(userId || ""),
            type: ADMIN_SCRIPT_SECTION_ACCESS_TOKEN_TYPE,
            scope: ADMIN_SCRIPT_SECTION_ACCESS_SCOPE,
        },
        secret,
        { expiresIn: process.env.ADMIN_SCRIPT_SECTION_ACCESS_TTL || DEFAULT_SCRIPT_SECTION_ACCESS_TTL }
    );

    const decoded = jwt.decode(token);

    return {
        token,
        expiresAt: decoded?.exp ? decoded.exp * 1000 : null,
    };
};

export const verifyAdminScriptSectionAccessToken = (token, userId) => {
    const secret = String(process.env.JWT_SECRET || "").trim();
    if (!secret || !token || !userId) return false;

    try {
        const decoded = jwt.verify(token, secret);
        return (
            decoded?.type === ADMIN_SCRIPT_SECTION_ACCESS_TOKEN_TYPE
            && decoded?.scope === ADMIN_SCRIPT_SECTION_ACCESS_SCOPE
            && String(decoded?.id || "") === String(userId || "")
        );
    } catch {
        return false;
    }
};
