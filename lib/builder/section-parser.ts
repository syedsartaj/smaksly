/**
 * Parses JSX/TSX code to detect logical sections (hero, features, etc.)
 * Used by AI Edit Panel for section-aware editing.
 */

export interface DetectedSection {
  id: string;
  name: string;
  startLine: number;
  endLine: number;
  preview: string; // first ~80 chars of content
}

// Patterns that indicate a named section in JSX
const SECTION_PATTERNS = [
  // {/* Section Name */} or {/* --- Section Name --- */}
  /\{\/\*[\s\-]*([A-Z][a-zA-Z\s&]+?)[\s\-]*\*\/\}/,
  // id="section-name" or id="sectionName"
  /id=["']([a-zA-Z][\w-]+)["']/,
  // <!-- Section Name -->
  /<!--\s*([A-Z][a-zA-Z\s&]+?)\s*-->/,
];

// Known section keywords to identify by className/content
const KNOWN_SECTIONS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /hero|banner/i, name: 'Hero' },
  { pattern: /feature/i, name: 'Features' },
  { pattern: /testimonial|review/i, name: 'Testimonials' },
  { pattern: /pricing|plan/i, name: 'Pricing' },
  { pattern: /faq|question/i, name: 'FAQ' },
  { pattern: /contact|get.?in.?touch/i, name: 'Contact' },
  { pattern: /about/i, name: 'About' },
  { pattern: /team|member/i, name: 'Team' },
  { pattern: /blog|article|post/i, name: 'Blog' },
  { pattern: /portfolio|project|work/i, name: 'Portfolio' },
  { pattern: /service/i, name: 'Services' },
  { pattern: /stat|number|counter/i, name: 'Stats' },
  { pattern: /newsletter|subscribe|signup/i, name: 'Newsletter' },
  { pattern: /cta|call.?to.?action/i, name: 'CTA' },
  { pattern: /gallery|image/i, name: 'Gallery' },
  { pattern: /partner|client|logo/i, name: 'Partners' },
  { pattern: /footer/i, name: 'Footer' },
  { pattern: /header|nav/i, name: 'Header/Nav' },
];

const UPPERCASE_WORDS = new Set(['cta', 'faq', 'api', 'seo', 'ui', 'ux']);

function cleanSectionName(raw: string): string {
  return raw
    .replace(/[-_]/g, ' ')
    .replace(/section$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => {
      const lower = w.toLowerCase();
      if (UPPERCASE_WORDS.has(lower)) return lower.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

function getPreviewText(lines: string[], start: number, end: number): string {
  const contentLines = lines.slice(start, Math.min(end, start + 5));
  const text = contentLines
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//') && !l.startsWith('{/*'))
    .join(' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/className="[^"]*"/g, '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 80 ? text.slice(0, 77) + '...' : text;
}

/**
 * Find the matching closing brace/tag for a section element
 */
function findSectionEnd(lines: string[], startLine: number): number {
  let depth = 0;
  let foundOpen = false;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    // Count opening and closing tags/braces
    for (const ch of line) {
      if (ch === '<' || ch === '{') {
        // Rough approximation - we look for the section-level tag balance
      }
    }

    // Count JSX tags
    const opens = (line.match(/<(?!\/|!)[a-zA-Z]/g) || []).length;
    const closes = (line.match(/<\//g) || []).length;
    const selfClose = (line.match(/\/>/g) || []).length;

    depth += opens - closes - selfClose;

    if (opens > 0) foundOpen = true;

    // Once we've opened and closed back to 0, that's the section end
    if (foundOpen && depth <= 0) {
      return i;
    }
  }

  // Fallback: look for next section start or end of return
  return Math.min(startLine + 30, lines.length - 1);
}

export function parseSections(code: string): DetectedSection[] {
  const lines = code.split('\n');
  const sections: DetectedSection[] = [];
  const usedNames = new Set<string>();

  // First pass: find comment-marked sections
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const pattern of SECTION_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        const rawName = match[1];
        const name = cleanSectionName(rawName);

        // Skip very short or generic names
        if (name.length < 3 || usedNames.has(name.toLowerCase())) continue;

        // Find the section's JSX block (next line with a tag)
        let sectionStart = i;
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          if (lines[j].match(/<(?:section|div|main|article|aside|footer|header|nav)/i)) {
            sectionStart = j;
            break;
          }
        }

        const sectionEnd = findSectionEnd(lines, sectionStart);
        usedNames.add(name.toLowerCase());

        sections.push({
          id: `section-${sections.length}`,
          name,
          startLine: sectionStart + 1, // 1-indexed
          endLine: sectionEnd + 1,
          preview: getPreviewText(lines, sectionStart, sectionEnd),
        });
        break;
      }
    }
  }

  // Second pass: find sections by className/id patterns if we didn't find many
  if (sections.length < 2) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Look for top-level section/div/main elements
      if (!line.match(/<(?:section|div|main|article|aside)\s/i)) continue;

      // Check className and id for known section names
      const contextBlock = lines.slice(i, Math.min(i + 5, lines.length)).join(' ');
      for (const known of KNOWN_SECTIONS) {
        if (known.pattern.test(contextBlock)) {
          const name = known.name;
          if (usedNames.has(name.toLowerCase())) continue;

          const sectionEnd = findSectionEnd(lines, i);

          // Skip very small sections (likely nested elements, not top-level sections)
          if (sectionEnd - i < 3) continue;

          usedNames.add(name.toLowerCase());
          sections.push({
            id: `section-${sections.length}`,
            name,
            startLine: i + 1,
            endLine: sectionEnd + 1,
            preview: getPreviewText(lines, i, sectionEnd),
          });
          break;
        }
      }
    }
  }

  // Sort by line number
  sections.sort((a, b) => a.startLine - b.startLine);

  return sections;
}

/**
 * Extract the code for a specific section
 */
export function extractSectionCode(code: string, section: DetectedSection): string {
  const lines = code.split('\n');
  return lines.slice(section.startLine - 1, section.endLine).join('\n');
}

/**
 * Generate smart quick actions based on detected sections
 */
export interface SmartAction {
  label: string;
  instruction: string;
  targetSection?: string;
}

export function generateSmartActions(code: string, sections: DetectedSection[]): SmartAction[] {
  const actions: SmartAction[] = [];

  for (const section of sections.slice(0, 6)) {
    const name = section.name;
    const sectionCode = extractSectionCode(code, section);

    // Section-specific suggestions
    if (/hero/i.test(name)) {
      actions.push({ label: `Edit Hero heading & CTA`, instruction: `In the Hero section, improve the heading text and call-to-action button to be more compelling`, targetSection: section.id });
    } else if (/feature/i.test(name)) {
      actions.push({ label: `Restyle Features cards`, instruction: `Restyle the Features section cards with better shadows, hover effects, and spacing`, targetSection: section.id });
    } else if (/testimonial/i.test(name)) {
      actions.push({ label: `Improve Testimonials layout`, instruction: `Improve the Testimonials section layout and styling`, targetSection: section.id });
    } else if (/pricing/i.test(name)) {
      actions.push({ label: `Highlight popular plan`, instruction: `In the Pricing section, make the most popular plan stand out with a highlighted border and "Popular" badge`, targetSection: section.id });
    } else if (/faq/i.test(name)) {
      actions.push({ label: `Make FAQ collapsible`, instruction: `Make the FAQ section items collapsible/accordion style`, targetSection: section.id });
    } else if (/contact/i.test(name)) {
      actions.push({ label: `Improve Contact form`, instruction: `Improve the Contact section form styling and layout`, targetSection: section.id });
    } else if (/footer/i.test(name)) {
      actions.push({ label: `Redesign Footer`, instruction: `Redesign the Footer with better layout, links organization, and social icons`, targetSection: section.id });
    } else {
      actions.push({ label: `Improve ${name}`, instruction: `Improve the ${name} section styling and layout`, targetSection: section.id });
    }

    // Check for common missing patterns
    if (!sectionCode.includes('hover:') && !(/header|nav|footer/i.test(name))) {
      actions.push({ label: `Add hover effects to ${name}`, instruction: `Add smooth hover effects and transitions to interactive elements in the ${name} section`, targetSection: section.id });
    }
  }

  // Global actions (always useful)
  actions.push({ label: 'Add padding to bottom', instruction: 'Add more padding/spacing to the bottom of the page' });
  actions.push({ label: 'Improve mobile layout', instruction: 'Improve the responsive layout for mobile devices across all sections' });
  actions.push({ label: 'Enhance color scheme', instruction: 'Enhance the color scheme to be more modern and cohesive, keeping the same brand colors but using better shades and contrast' });

  return actions;
}
