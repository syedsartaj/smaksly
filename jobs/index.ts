import { startKeywordWorker } from './workers/keywordWorker';
import { startContentWorker } from './workers/contentWorker';
import { startDeployWorker } from './workers/deployWorker';
import { startHealthWorker } from './workers/healthWorker';
import { startFixWorker } from './workers/fixWorker';
import type { Worker } from 'bullmq';

const workers: Worker[] = [];

export function startAllWorkers(): Worker[] {
  console.log('[Jobs] Starting all workers...');

  workers.push(
    startKeywordWorker(),
    startContentWorker(),
    startDeployWorker(),
    startHealthWorker(),
    startFixWorker(),
  );

  console.log(`[Jobs] ${workers.length} workers started`);
  return workers;
}

export async function stopAllWorkers(): Promise<void> {
  console.log('[Jobs] Stopping all workers...');
  await Promise.all(workers.map((w) => w.close()));
  workers.length = 0;
  console.log('[Jobs] All workers stopped');
}

export { startKeywordWorker } from './workers/keywordWorker';
export { startContentWorker } from './workers/contentWorker';
export { startDeployWorker } from './workers/deployWorker';
export { startHealthWorker } from './workers/healthWorker';
export { startFixWorker } from './workers/fixWorker';
