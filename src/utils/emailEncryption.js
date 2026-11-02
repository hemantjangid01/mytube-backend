
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const getEncryptionKey = () => {
  const key = process.env.EMAIL_QUEUE_ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      "EMAIL_QUEUE_ENCRYPTION_KEY is missing"
    );
  }

  const buffer = Buffer.from(key, "base64");

  if (buffer.length !== 32) {
    throw new Error(
      "Encryption key must decode to exactly 32 bytes"
    );
  }

  return buffer;
};

export const encryptEmailPayload = (payload) => {
  const key = getEncryptionKey();
  const iv = randomBytes(12);

  const cipher = createCipheriv(
    "aes-256-gcm",
    key,
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);

  return {
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };
};

export const decryptEmailPayload = (encryptedPayload) => {
  const key = getEncryptionKey();

  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(encryptedPayload.iv, "base64")
  );

  decipher.setAuthTag(
    Buffer.from(encryptedPayload.authTag, "base64")
  );

  const decrypted = Buffer.concat([
    decipher.update(
      Buffer.from(encryptedPayload.data, "base64")
    ),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8"));
};
