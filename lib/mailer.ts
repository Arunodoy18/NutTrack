import nodemailer from "nodemailer";
import { Resend } from "resend";

/**
 * Sends one email. Two ways, in this order:
 *  1. SMTP (SMTP_USER + SMTP_PASS, e.g. a Gmail account with an "app password"): can email anyone, no domain needed.
 *  2. Resend (RESEND_API_KEY): only emails other people once a domain is verified there.
 * Throws if neither is configured or the provider refuses, so callers never claim an email was sent when it wasn't.
 */
export const mailConfigured = () => !!((process.env.SMTP_USER && process.env.SMTP_PASS) || process.env.RESEND_API_KEY);

export async function sendMail(m: { to: string; subject: string; html: string }): Promise<void> {
  const user = process.env.SMTP_USER, pass = process.env.SMTP_PASS;
  if (user && pass) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 465,
      secure: (Number(process.env.SMTP_PORT) || 465) === 465,
      auth: { user, pass: pass.replace(/\s+/g, "") }, // Google shows app passwords with spaces
      connectionTimeout: 10_000, socketTimeout: 15_000,
    });
    await transport.sendMail({ from: process.env.MAIL_FROM || `Nura <${user}>`, to: m.to, subject: m.subject, html: m.html });
    return;
  }
  if (process.env.RESEND_API_KEY) {
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: process.env.MAIL_FROM || "Nura <onboarding@resend.dev>", to: [m.to], subject: m.subject, html: m.html });
    if (error) throw new Error(`Resend: ${error.message ?? "failed"}`);
    return;
  }
  throw new Error("No email service configured");
}
