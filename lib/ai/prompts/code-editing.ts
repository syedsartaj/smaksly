export const CODE_EDIT_SYSTEM_PROMPT = `You are an expert React/TypeScript developer making surgical edits to existing code.

CRITICAL RULES:
1. ONLY modify the specific section indicated by the selection
2. Maintain the same coding style and patterns used in the existing code
3. Keep all existing imports intact (add new ones if needed)
4. Return the COMPLETE updated code, not just the changed section
5. Preserve all TypeScript types and interfaces
6. Maintain Tailwind CSS class patterns
7. Do NOT change anything outside the selection unless absolutely necessary for the change to work
8. Preserve component structure and hierarchy
9. Keep the same export pattern (default export, named export, etc.)
10. Maintain proper indentation and formatting

COMMON MODIFICATIONS:
- Styling changes: Only modify Tailwind classes, keep component structure
- Layout changes: Adjust flex/grid properties, keep content
- Content changes: Update text/elements, keep styling
- Adding features: Insert new code without disrupting existing functionality
- Accessibility improvements: Add aria-labels, semantic elements without changing appearance

OUTPUT FORMAT:
Return ONLY the complete updated component code.
No explanations, no markdown code blocks, just the raw TSX code.
Start directly with 'use client' (if present) or import statements.`;

export const createCodeEditPrompt = (params: {
  fullCode: string;
  selectedCode: string;
  instruction: string;
  selectionContext?: {
    startLine: number;
    endLine: number;
  };
}): string => {
  const { fullCode, selectedCode, instruction, selectionContext } = params;

  const lineInfo = selectionContext
    ? `\nSelection is from line ${selectionContext.startLine} to line ${selectionContext.endLine}.`
    : '';

  return `FULL CURRENT CODE:
\`\`\`tsx
${fullCode}
\`\`\`

SELECTED SECTION TO MODIFY:${lineInfo}
\`\`\`tsx
${selectedCode}
\`\`\`

MODIFICATION REQUEST:
${instruction}

INSTRUCTIONS:
1. Apply the requested modification ONLY to the selected section
2. Return the COMPLETE updated code with the change applied
3. Ensure the code remains valid TypeScript/TSX
4. Maintain all existing functionality outside the selection
5. Keep consistent styling and patterns

Generate the complete updated code now:`;
};

export const createQuickEditPrompt = (params: {
  fullCode: string;
  instruction: string;
}): string => {
  const { fullCode, instruction } = params;

  return `CURRENT CODE:
\`\`\`tsx
${fullCode}
\`\`\`

MODIFICATION REQUEST:
${instruction}

Apply this change to the entire component as appropriate. Return the complete updated code:`;
};

export const IMPROVEMENT_SUGGESTIONS_PROMPT = `Analyze this React/TypeScript code and suggest improvements:

AREAS TO ANALYZE:
1. Accessibility (WCAG compliance, aria-labels, semantic HTML)
2. Performance (unnecessary re-renders, heavy computations)
3. SEO (meta tags, heading structure, alt texts)
4. Responsiveness (mobile-first, breakpoint coverage)
5. Code quality (TypeScript types, code organization)
6. UX (hover states, loading states, error handling)

OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "suggestions": [
    {
      "category": "accessibility" | "performance" | "seo" | "responsiveness" | "code-quality" | "ux",
      "severity": "low" | "medium" | "high",
      "description": "Brief description of the issue",
      "suggestion": "How to fix it",
      "lineNumbers": [1, 5] // Optional: relevant line numbers
    }
  ],
  "score": {
    "accessibility": 80,
    "performance": 90,
    "seo": 70,
    "responsiveness": 85,
    "overall": 81
  }
}`;

export const createImprovementAnalysisPrompt = (code: string): string => {
  return `Analyze this code for improvements:

\`\`\`tsx
${code}
\`\`\`

${IMPROVEMENT_SUGGESTIONS_PROMPT}`;
};
