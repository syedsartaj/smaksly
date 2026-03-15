import { connectDB } from '@/lib/db';
import { Content } from '@/models/Content';

/**
 * Scheduled Publish Worker
 *
 * Runs periodically to publish posts where:
 * - status = 'scheduled'
 * - scheduledAt <= now
 *
 * Also handles guest post expiry:
 * - type = 'guest_post', status = 'published', expiresAt <= now
 */
export async function processScheduledPublish() {
  await connectDB();
  const now = new Date();

  // 1. Publish scheduled posts
  const scheduledPosts = await Content.find({
    status: 'scheduled',
    scheduledAt: { $lte: now },
  });

  let publishedCount = 0;
  for (const post of scheduledPosts) {
    post.status = 'published';
    post.publishedAt = now;
    await post.save();
    publishedCount++;
    console.log(`[ScheduledPublish] Published: "${post.title}" (${post._id})`);
  }

  // 2. Expire guest posts past their expiresAt date
  const expiredPosts = await Content.find({
    type: 'guest_post',
    status: 'published',
    expiresAt: { $lte: now },
  });

  let expiredCount = 0;
  for (const post of expiredPosts) {
    post.status = 'draft'; // Unpublish
    await post.save();
    expiredCount++;
    console.log(`[ScheduledPublish] Expired guest post: "${post.title}" (${post._id})`);
  }

  return { publishedCount, expiredCount };
}
