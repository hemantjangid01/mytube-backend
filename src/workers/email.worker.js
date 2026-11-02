import "dotenv/config";
import { Worker } from "bullmq";
import { Resend } from "resend";
import connection from "../queues/redis.connection.js";

import {
  assertEmailQueueEncryptionKey,
  decryptEmailPayload,
} from "../utils/emailPayloadCrypto.js";

let emailWorker;

export const startEmailWorker = () => {
  if (emailWorker) return emailWorker;

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing");
  }

  if (!process.env.MAIL_FROM) {
    throw new Error("MAIL_FROM is missing");
  }

  assertEmailQueueEncryptionKey();

  const resend = new Resend(process.env.RESEND_API_KEY);

  emailWorker = new Worker(
    "email-queue",
    async (job) => {
      const { to, subject, html } = decryptEmailPayload(
        job.data.encryptedPayload
      );

      if (!to || !subject || !html) {
        throw new Error("Missing email data");
      }

      const { data, error } = await resend.emails.send({
        from: process.env.MAIL_FROM,
        to,
        subject,
        html,
      });

      if (error) throw new Error(error.message);

      return { emailId: data?.id };
    },
    {
      connection,
      concurrency: 2,
    }
  );

  emailWorker.on("completed", (job) => {
    console.log(`Email job ${job.id} completed`);
  });

  emailWorker.on("failed", (job, error) => {
    console.error(
      `Email job ${job?.id} failed:`,
      error.message
    );
  });

  emailWorker.on("error", (error) => {
    console.error("Email worker error:", error.message);
  });

  return emailWorker;
};

// Allows running this file independently if needed later.
if (
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("/src/workers/email.worker.js")
) {
  startEmailWorker();
}