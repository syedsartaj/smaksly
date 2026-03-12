import nodemailer from 'nodemailer';
import { EmailAccount } from '@/models/EmailAccount';
import { Email } from '@/models/Email';
import { decryptPassword } from './crypto';
import { connectDB } from '@/lib/db';

interface SendEmailParams {
  accountId: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string; // HTML
  bodyText?: string;
  inReplyTo?: string; // messageId of the email being replied to
  threadId?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  await connectDB();

  const account = await EmailAccount.findById(params.accountId);
  if (!account) {
    return { success: false, error: 'Email account not found' };
  }

  // Use separate SMTP credentials if provided, otherwise fall back to IMAP credentials
  const smtpUser = account.smtpUsername || account.username;
  const smtpPass = account.smtpPasswordEncrypted
    ? decryptPassword(account.smtpPasswordEncrypted, account.smtpPasswordIv!, account.smtpPasswordTag!)
    : decryptPassword(account.passwordEncrypted, account.passwordIv, account.passwordTag);

  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  try {
    const headers: Record<string, string> = {};
    if (params.inReplyTo) {
      headers['In-Reply-To'] = params.inReplyTo;
      headers['References'] = params.inReplyTo;
    }

    const info = await transporter.sendMail({
      from: account.displayName
        ? `"${account.displayName}" <${account.email}>`
        : account.email,
      to: params.to.join(', '),
      cc: params.cc?.join(', '),
      subject: params.subject,
      html: params.body,
      text: params.bodyText || params.body.replace(/<[^>]+>/g, ''),
      headers,
    });

    const messageId = info.messageId || `sent-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const threadId = params.threadId || messageId;

    // Store outbound copy
    await Email.create({
      accountId: account._id,
      messageId,
      threadId,
      from: { name: account.displayName || '', address: account.email },
      to: params.to.map((addr) => ({ address: addr })),
      cc: (params.cc || []).map((addr) => ({ address: addr })),
      subject: params.subject,
      snippet: (params.bodyText || params.body.replace(/<[^>]+>/g, '')).slice(0, 200),
      body: params.body,
      bodyText: params.bodyText || params.body.replace(/<[^>]+>/g, ''),
      direction: 'outbound',
      isRead: true,
      folder: 'sent',
      receivedAt: new Date(),
    });

    return { success: true, messageId };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function testSmtpConnection(params: {
  host: string;
  port: number;
  username: string;
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: params.host,
      port: params.port,
      secure: params.port === 465,
      auth: {
        user: params.username,
        pass: params.password,
      },
    });

    await transporter.verify();
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
