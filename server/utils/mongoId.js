import mongoose from "mongoose";

const OBJECT_ID_HEX_PATTERN = /^[a-f\d]{24}$/i;

/**
 * Converts an untrusted request value into a typed Mongo ObjectId.
 * Objects and non-canonical strings are rejected before they can enter a query.
 */
export const parseMongoObjectId = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!OBJECT_ID_HEX_PATTERN.test(normalized)) return null;
  return new mongoose.Types.ObjectId(normalized);
};
