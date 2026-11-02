
import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is missing");
}

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  const { data, error } = await resend.emails.send({
    from: process.env.MAIL_FROM,
    to: [to],
    subject,
    html,
  });

  if (error) {
    console.error("Email delivery failed:", error);
    throw new Error("Failed to send email");
  }

  return data;
};

export default sendEmail;
