import crypto from "crypto";

// Reversible at-rest encryption for sensitive third-party tokens (Google Calendar refresh tokens).
// AES-256-GCM (authenticated) keyed by TOKEN_ENC_KEY (64 hex chars = 32 bytes). Output format is
// "iv:authTag:ciphertext", all hex — self-describing so decrypt() needs no extra state.
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit nonce, the GCM standard

const getKey = () => {
  const raw = String(process.env.TOKEN_ENC_KEY || "").trim();
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error(
      "TOKEN_ENC_KEY must be 64 hex characters (32 bytes). Generate one with: openssl rand -hex 32"
    );
  }
  return Buffer.from(raw, "hex");
};

export const isTokenCryptoConfigured = () => /^[0-9a-fA-F]{64}$/.test(String(process.env.TOKEN_ENC_KEY || "").trim());

export const encryptToken = (plaintext) => {
  if (plaintext == null || plaintext === "") return "";
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decryptToken = (payload) => {
  if (!payload) return "";
  const parts = String(payload).split(":");
  if (parts.length !== 3) throw new Error("Malformed encrypted token");
  const [ivHex, authTagHex, dataHex] = parts;
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
};
