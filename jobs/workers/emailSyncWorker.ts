import { Job } from 'bullmq';
import { createWorker, QUEUE_NAMES } from '@/lib/queue';
import { syncEmailAccount, syncAllAccounts } from '@/lib/email/imap-sync';

interface EmailSyncJobData {
  accountId?: string;
}

const emailSyncWorker = createWorker<EmailSyncJobData>(
  QUEUE_NAMES.EMAIL_SYNC,
  async (job: Job<EmailSyncJobData>) => {
    const { accountId } = job.data;

    if (accountId) {
      console.log(`[EmailSync] Syncing account ${accountId}`);
      const result = await syncEmailAccount(accountId);
      console.log(`[EmailSync] Account ${accountId}: ${result.fetched} new emails, ${result.errors.length} errors`);
      return result;
    }

    // Sync all accounts
    console.log('[EmailSync] Syncing all accounts');
    const result = await syncAllAccounts();
    console.log(`[EmailSync] Total: ${result.total} new emails, ${result.errors.length} errors`);
    return result;
  },
  3 // concurrency
);

emailSyncWorker.on('failed', (job, err) => {
  console.error(`[EmailSync] Job ${job?.id} failed:`, err.message);
});

export default emailSyncWorker;
