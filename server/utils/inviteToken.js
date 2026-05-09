import crypto from "crypto";

export const INVITE_EXPIRY_HOURS = 72;
export const INVITE_EXPIRY_MS = INVITE_EXPIRY_HOURS * 60 * 60 * 1000;

export const generateInviteToken = () => crypto.randomBytes(32).toString("hex");

export const getInviteExpiryDate = (baseTime = Date.now()) =>
  new Date(Number(baseTime) + INVITE_EXPIRY_MS);

export const isInviteExpired = (inviteExpiresAt) => {
  if (!inviteExpiresAt) return true;
  return new Date(inviteExpiresAt).getTime() < Date.now();
};
