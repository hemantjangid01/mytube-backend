import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

export const assertEmailQueueEncryptionKey = () => {
  const encodedKey = process.env.EMAIL_QUEUE_ENCRYPTION_KEY;

  if (!encodedKey) {
    throw new Error("EMAIL_QUEUE_ENCRYPTION_KEY is missing");
  }

  const key = Buffer.from(encodedKey, "base64");

  if (key.length !== 32) {
    throw new Error(
      "EMAIL_QUEUE_ENCRYPTION_KEY must be a base64-encoded 32-byte key"
    );
  }

  return key;
};

export const encryptEmailPayload = (payload) => {
  const iv = randomBytes(12);

  const cipher = createCipheriv(
    "aes-256-gcm",
    assertEmailQueueEncryptionKey(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);

  return {
    version: 1,
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: encrypted.toString("base64"),
  };
};

export const decryptEmailPayload = (encryptedPayload) => {
  if (
    encryptedPayload?.version !== 1 ||
    !encryptedPayload.iv ||
    !encryptedPayload.authTag ||
    !encryptedPayload.ciphertext
  ) {
    throw new Error("Invalid encrypted email payload");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    assertEmailQueueEncryptionKey(),
    Buffer.from(encryptedPayload.iv, "base64")
  );

  decipher.setAuthTag(
    Buffer.from(encryptedPayload.authTag, "base64")
  );

  const decrypted = Buffer.concat([
    decipher.update(
      Buffer.from(encryptedPayload.ciphertext, "base64")
    ),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8"));
};