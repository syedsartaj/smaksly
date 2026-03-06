/**
 * Simple line-by-line diff for showing AI edit changes.
 * No external dependencies.
 */

export interface DiffLine {
  type: 'same' | 'added' | 'removed';
  content: string;
  lineNumber?: number;
}

export interface DiffResult {
  lines: DiffLine[];
  addedCount: number;
  removedCount: number;
  changedCount: number;
}

/**
 * Compute a simple LCS-based line diff between two strings.
 */
export function computeDiff(oldCode: string, newCode: string): DiffResult {
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');

  // Build LCS table
  const m = oldLines.length;
  const n = newLines.length;

  // For very large files, use a simpler approach
  if (m * n > 500000) {
    return simpleDiff(oldLines, newLines);
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to get diff
  const lines: DiffLine[] = [];
  let i = m;
  let j = n;

  const result: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({ type: 'same', content: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', content: newLines[j - 1], lineNumber: j });
      j--;
    } else if (i > 0) {
      result.push({ type: 'removed', content: oldLines[i - 1], lineNumber: i });
      i--;
    }
  }

  result.reverse();

  // Count changes
  let addedCount = 0;
  let removedCount = 0;
  for (const line of result) {
    if (line.type === 'added') addedCount++;
    if (line.type === 'removed') removedCount++;
  }

  return {
    lines: result,
    addedCount,
    removedCount,
    changedCount: Math.min(addedCount, removedCount),
  };
}

/**
 * Fallback simple diff for very large files
 */
function simpleDiff(oldLines: string[], newLines: string[]): DiffResult {
  const lines: DiffLine[] = [];
  const maxLen = Math.max(oldLines.length, newLines.length);
  let addedCount = 0;
  let removedCount = 0;

  for (let i = 0; i < maxLen; i++) {
    const oldLine = i < oldLines.length ? oldLines[i] : undefined;
    const newLine = i < newLines.length ? newLines[i] : undefined;

    if (oldLine === newLine) {
      lines.push({ type: 'same', content: oldLine! });
    } else {
      if (oldLine !== undefined) {
        lines.push({ type: 'removed', content: oldLine, lineNumber: i + 1 });
        removedCount++;
      }
      if (newLine !== undefined) {
        lines.push({ type: 'added', content: newLine, lineNumber: i + 1 });
        addedCount++;
      }
    }
  }

  return { lines, addedCount, removedCount, changedCount: Math.min(addedCount, removedCount) };
}

/**
 * Get a compact summary of changes
 */
export function getDiffSummary(diff: DiffResult): string {
  const parts: string[] = [];
  if (diff.addedCount > 0) parts.push(`+${diff.addedCount} lines`);
  if (diff.removedCount > 0) parts.push(`-${diff.removedCount} lines`);
  if (parts.length === 0) return 'No changes';
  return parts.join(', ');
}
