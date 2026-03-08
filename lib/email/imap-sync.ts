import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import { EmailAccount, IEmailAccount } from '@/models/EmailAccount';
import { Email } from '@/models/Email';
import { decryptPassword } from './crypto';
import { connectDB } from '@/lib/db';

function generateThreadId(parsed: ParsedMail): string {
  // Use In-Reply-To or References to group into threads
  const inReplyTo = parsed.inReplyTo;
  const references = parsed.references;

  if (references && references.length > 0) {
    // First reference is the original message — use as thread root
    return references[0];
  }
  if (inReplyTo) {
    return inReplyTo;
  }
  // Standalone message — use its own messageId as threadId
  return parsed.messageId || `standalone-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function extractSnippet(text: string | undefined, html: string | undefined): string {
  const source = text || (html ? html.replace(/<[^>]+>/g, '') : '');
  return source.replace(/\s+/g, ' ').trim().slice(0, 200);
}

export async function syncEmailAccount(accountId: string): Promise<{ fetched: number; errors: string[] }> {
  await connectDB();

  const account = await EmailAccount.findById(accountId);
  if (!account || account.status === 'disabled') {
    return { fetched: 0, errors: ['Account not found or disabled'] };
  }

  const password = decryptPassword(
    account.passwordEncrypted,
    account.passwordIv,
    account.passwordTag
  );

  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapPort === 993,
    auth: {
      user: account.username,
      pass: password,
    },
    logger: false,
  });

  const errors: string[] = [];
  let fetched = 0;

  try {
    await client.connect();

    const lock = await client.getMailboxLock('INBOX');

    try {
      // Fetch emails since last sync (or last 30 days if first sync)
      const since = account.lastSyncAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const messages = client.fetch(
        { since },
        {
          envelope: true,
          source: true,
          uid: true,
        }
      );

      for await (const msg of messages) {
        try {
          if (!msg.source) continue;
          const parsed = await simpleParser(msg.source);
          const messageId = parsed.messageId || `uid-${msg.uid}-${account.email}`;

          // Skip if already stored
          const exists = await Email.findOne({ messageId }).select('_id').lean();
          if (exists) continue;

          const threadId = generateThreadId(parsed);

          await Email.create({
            accountId: account._id,
            messageId,
            threadId,
            from: {
              name: parsed.from?.value?.[0]?.name || '',
              address: parsed.from?.value?.[0]?.address || 'unknown',
            },
            to: (parsed.to && !Array.isArray(parsed.to) ? parsed.to.value : []).map((v) => ({
              name: v.name || '',
              address: v.address || '',
            })),
            cc: (parsed.cc && !Array.isArray(parsed.cc) ? parsed.cc.value : []).map((v) => ({
              name: v.name || '',
              address: v.address || '',
            })),
            subject: parsed.subject || '(no subject)',
            snippet: extractSnippet(parsed.text, parsed.html as string | undefined),
            body: (parsed.html as string) || parsed.text || '',
            bodyText: parsed.text || '',
            direction: 'inbound',
            isRead: false,
            folder: 'inbox',
            receivedAt: parsed.date || new Date(),
          });

          fetched++;
        } catch (msgErr) {
          errors.push(`Failed to parse message UID ${msg.uid}: ${(msgErr as Error).message}`);
        }
      }
    } finally {
      lock.release();
    }

    // Update last sync timestamp and status
    await EmailAccount.findByIdAndUpdate(accountId, {
      lastSyncAt: new Date(),
      status: 'active',
      errorMessage: undefined,
    });
  } catch (err) {
    const errorMsg = (err as Error).message;
    errors.push(`IMAP connection failed: ${errorMsg}`);

    await EmailAccount.findByIdAndUpdate(accountId, {
      status: 'error',
      errorMessage: errorMsg,
    });
  } finally {
    try {
      await client.logout();
    } catch {
      // ignore logout errors
    }
  }

  return { fetched, errors };
}

export async function syncAllAccounts(): Promise<{ total: number; errors: string[] }> {
  await connectDB();

  const accounts = await EmailAccount.find({ status: { $ne: 'disabled' } }).select('_id').lean();
  let total = 0;
  const allErrors: string[] = [];

  for (const account of accounts) {
    const result = await syncEmailAccount(account._id.toString());
    total += result.fetched;
    allErrors.push(...result.errors);
  }

  return { total, errors: allErrors };
}
