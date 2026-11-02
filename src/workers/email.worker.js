
import "dotenv/config";
import { Worker } from "bullmq";
import { Resend } from "resend";
import connection from "../queues/redis.connection.js";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is missing");
}

if (!process.env.MAIL_FROM) {
  throw new Error("MAIL_FROM is missing");
}

const resend = new Resend(process.env.RESEND_API_KEY);

const emailWorker = new Worker(
  "email-queue",
  async (job) => {
    const { to, subject, html } = job.data;

    if (!to || !subject || !html) {
      throw new Error("Missing email data");
    }

    const { data, error } = await resend.emails.send({
      from: process.env.MAIL_FROM,
      to,
      subject,
      html,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { emailId: data?.id };
  },
  {
    connection,
    concurrency: 5,
  }
);

emailWorker.on("completed", (job) => {
  console.log(`Email job ${job.id} completed`);
});

emailWorker.on("failed", (job, error) => {
  console.error(`Email job ${job?.id} failed:`, error.message);
});

emailWorker.on("error", (error) => {
  console.error("Email worker error:", error.message);
});
