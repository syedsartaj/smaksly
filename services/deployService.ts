import { connectDB } from '@/lib/db';
import { Website, Content } from '@/models';

const GITHUB_API = 'https://api.github.com';
const VERCEL_API = 'https://api.vercel.com';

function getGithubHeaders(): Record<string, string> {
  return { Authorization: `token ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github.v3+json' };
}
function getVercelHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${process.env.VERCEL_TOKEN}`, 'Content-Type': 'application/json' };
}
function extractRepoName(gitRepo: string): string {
  if (gitRepo.includes('github.com')) { const m = gitRepo.match(/github\.com\/[^/]+\/([^/.]+)/); return m?.[1] || gitRepo; }
  if (gitRepo.includes('/')) return gitRepo.split('/').pop() || gitRepo;
  return gitRepo;
}

export async function commitMarkdownToGithub(siteId: string, filePath: string, content: string, commitMessage: string): Promise<{ sha: string; commitUrl: string }> {
  await connectDB();
  const website = await Website.findById(siteId);
  if (!website) throw new Error(`Website not found: ${siteId}`);
  if (!website.gitRepo) throw new Error(`No git repo configured for: ${website.name}`);

  const owner = process.env.GITHUB_USERNAME!;
  const repo = extractRepoName(website.gitRepo);

  const refRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/main`, { headers: getGithubHeaders() });
  if (!refRes.ok) throw new Error(`Failed to get branch ref: ${await refRes.text()}`);
  const refData = await refRes.json() as { object: { sha: string } };
  const baseSha = refData.object.sha;

  const commitRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits/${baseSha}`, { headers: getGithubHeaders() });
  const commitData = await commitRes.json() as { tree: { sha: string } };

  const blobRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/blobs`, {
    method: 'POST', headers: getGithubHeaders(),
    body: JSON.stringify({ content: Buffer.from(content).toString('base64'), encoding: 'base64' }),
  });
  if (!blobRes.ok) throw new Error(`Failed to create blob: ${await blobRes.text()}`);
  const blobData = await blobRes.json() as { sha: string };

  const treeRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/trees`, {
    method: 'POST', headers: getGithubHeaders(),
    body: JSON.stringify({ base_tree: commitData.tree.sha, tree: [{ path: filePath, mode: '100644', type: 'blob', sha: blobData.sha }] }),
  });
  if (!treeRes.ok) throw new Error(`Failed to create tree: ${await treeRes.text()}`);
  const treeData = await treeRes.json() as { sha: string };

  const newCommitRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits`, {
    method: 'POST', headers: getGithubHeaders(),
    body: JSON.stringify({ message: commitMessage, tree: treeData.sha, parents: [baseSha] }),
  });
  if (!newCommitRes.ok) throw new Error(`Failed to create commit: ${await newCommitRes.text()}`);
  const newCommitData = await newCommitRes.json() as { sha: string; html_url: string };

  const updateRefRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/main`, {
    method: 'PATCH', headers: getGithubHeaders(),
    body: JSON.stringify({ sha: newCommitData.sha, force: false }),
  });
  if (!updateRefRes.ok) throw new Error(`Failed to update ref: ${await updateRefRes.text()}`);

  return { sha: newCommitData.sha, commitUrl: newCommitData.html_url };
}

export async function triggerVercelDeploy(siteId: string): Promise<{ deploymentId: string; url: string; status: string }> {
  await connectDB();
  const website = await Website.findById(siteId);
  if (!website) throw new Error(`Website not found: ${siteId}`);
  if (!website.vercelProjectName) throw new Error(`No Vercel project for: ${website.name}`);

  const deployRes = await fetch(`${VERCEL_API}/v13/deployments`, {
    method: 'POST', headers: getVercelHeaders(),
    body: JSON.stringify({
      name: website.vercelProjectName, target: 'production',
      gitSource: { type: 'github', repo: `${process.env.GITHUB_USERNAME}/${extractRepoName(website.gitRepo!)}`, ref: 'main' },
    }),
  });
  if (!deployRes.ok) throw new Error(`Vercel deployment failed: ${await deployRes.text()}`);
  const deployData = await deployRes.json() as { id: string; url: string; readyState: string };
  return { deploymentId: deployData.id, url: `https://${deployData.url}`, status: deployData.readyState };
}

export async function deployArticle(siteId: string, contentId: string, markdownContent: string, slug: string) {
  const { sha } = await commitMarkdownToGithub(siteId, `content/blog/${slug}.md`, markdownContent, `feat: add article "${slug}"`);
  await connectDB();
  await Content.findByIdAndUpdate(contentId, { status: 'published', publishedAt: new Date() });

  const deployment = await triggerVercelDeploy(siteId);
  await Website.findByIdAndUpdate(siteId, { lastContentPublishedAt: new Date() });

  return { commitSha: sha, deploymentId: deployment.deploymentId };
}
