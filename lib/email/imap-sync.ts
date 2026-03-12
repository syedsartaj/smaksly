import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import { EmailAccount, IEmailAccount } from '@/models/EmailAccount';
import { Email } from '@/models/Email';
import { decryptPassword } from './crypto';
import { connectDB } from '@/lib/db';

function generateThreadId(parsed: ParsedMail): string {
  const inReplyTo = parsed.inReplyTo;
  const references = parsed.references;

  if (references && references.length > 0) {
    return references[0];
  }
  if (inReplyTo) {
    return inReplyTo;
  }
  return parsed.messageId || `standalone-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function extractSnippet(text: string | undefined, html: string | undefined): string {
  const source = text || (html ? html.replace(/<[^>]+>/g, '') : '');
  return source.replace(/\s+/g, ' ').trim().slice(0, 200);
}

/**
 * Extract all email addresses from To and CC fields
 */
function getRecipientAddresses(parsed: ParsedMail): string[] {
  const addresses: string[] = [];

  if (parsed.to) {
    const toValues = Array.isArray(parsed.to) ? parsed.to : [parsed.to];
    for (const group of toValues) {
      if (group.value) {
        for (const addr of group.value) {
          if (addr.address) addresses.push(addr.address.toLowerCase());
        }
      }
    }
  }

  if (parsed.cc) {
    const ccValues = Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc];
    for (const group of ccValues) {
      if (group.value) {
        for (const addr of group.value) {
          if (addr.address) addresses.push(addr.address.toLowerCase());
        }
      }
    }
  }

  return addresses;
}

/**
 * Check if an email is relevant to a specific account.
 * For inbound: account email must be in To or CC.
 * For outbound (sent folder): account email must be in From.
 */
function isEmailForAccount(parsed: ParsedMail, accountEmail: string, folder: 'inbox' | 'sent'): boolean {
  const email = accountEmail.toLowerCase();

  if (folder === 'sent') {
    const fromAddr = parsed.from?.value?.[0]?.address?.toLowerCase();
    return fromAddr === email;
  }

  // For inbox: check To and CC
  const recipients = getRecipientAddresses(parsed);
  return recipients.includes(email);
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

    // Sync both INBOX and Sent folders
    const foldersToSync: Array<{ name: string; folder: 'inbox' | 'sent'; direction: 'inbound' | 'outbound' }> = [
      { name: 'INBOX', folder: 'inbox', direction: 'inbound' },
      { name: 'Sent', folder: 'sent', direction: 'outbound' },
    ];

    // Common sent folder names across providers
    const sentFolderNames = ['Sent', 'INBOX.Sent', 'Sent Items', 'Sent Messages', '[Gmail]/Sent Mail'];

    for (const syncTarget of foldersToSync) {
      let mailboxName = syncTarget.name;

      // For sent folder, try to find the correct folder name
      if (syncTarget.folder === 'sent') {
        let found = false;
        for (const name of sentFolderNames) {
          try {
            const lock = await client.getMailboxLock(name);
            lock.release();
            mailboxName = name;
            found = true;
            break;
          } catch {
            // Folder doesn't exist, try next
          }
        }
        if (!found) continue; // Skip sent sync if folder not found
      }

      try {
        const lock = await client.getMailboxLock(mailboxName);

        try {
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

              // Filter: only import emails relevant to this account's email address
              // This handles shared IMAP (Zoho aliases, Cloudflare forwarding)
              if (!isEmailForAccount(parsed, account.email, syncTarget.folder)) {
                continue;
              }

              // Skip if already stored for this account
              const exists = await Email.findOne({
                accountId: account._id,
                messageId,
              }).select('_id').lean();
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
                direction: syncTarget.direction,
                isRead: syncTarget.folder === 'sent',
                folder: syncTarget.folder,
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
      } catch (folderErr) {
        if (syncTarget.folder === 'inbox') {
          throw folderErr; // INBOX failure is critical
        }
        // Sent folder failure is non-critical
        errors.push(`Could not sync ${mailboxName}: ${(folderErr as Error).message}`);
      }
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

  const accounts = await EmailAccount.find({ status: { $ne: 'disabled' } })
    .select('_id imapHost username')
    .lean();

  // Group accounts by IMAP credentials to avoid hammering the same server
  // Multiple accounts may share the same IMAP (e.g. Zoho aliases)
  // We still sync each account separately since they filter by email address
  let total = 0;
  const allErrors: string[] = [];

  for (const account of accounts) {
    const result = await syncEmailAccount(account._id.toString());
    total += result.fetched;
    allErrors.push(...result.errors);
  }

  return { total, errors: allErrors };
}
