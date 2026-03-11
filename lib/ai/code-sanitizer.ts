/**
 * Code Sanitizer for AI-Generated Code
 * Removes potentially dangerous patterns and validates safe imports
 */

// Dangerous patterns that should be removed from generated code
const DANGEROUS_PATTERNS: { pattern: RegExp; replacement: string; reason: string }[] = [
  {
    pattern: /\beval\s*\(/gi,
    replacement: '/* UNSAFE: eval removed */',
    reason: 'eval() can execute arbitrary code',
  },
  {
    pattern: /new\s+Function\s*\(/gi,
    replacement: '/* UNSAFE: Function constructor removed */',
    reason: 'Function constructor can execute arbitrary code',
  },
  {
    pattern: /document\.write\s*\(/gi,
    replacement: '/* UNSAFE: document.write removed */',
    reason: 'document.write can inject arbitrary HTML',
  },
  {
    pattern: /\.innerHTML\s*=(?!=)/gi,
    replacement: '.textContent =',
    reason: 'innerHTML can execute scripts',
  },
  {
    pattern: /<script[^>]*>[\s\S]*?<\/script>/gi,
    replacement: '<!-- UNSAFE: script tag removed -->',
    reason: 'Script tags can execute arbitrary code',
  },
  {
    pattern: /javascript:/gi,
    replacement: '#',
    reason: 'javascript: protocol can execute code',
  },
  {
    pattern: /\bon\w+\s*=\s*["'][^"']*["']/gi,
    replacement: '',
    reason: 'Inline event handlers can execute code',
  },
  {
    pattern: /window\.location\s*=(?!=)/gi,
    replacement: '/* UNSAFE: direct location assignment removed */',
    reason: 'Can redirect to malicious sites',
  },
  {
    pattern: /document\.cookie/gi,
    replacement: '/* UNSAFE: cookie access removed */',
    reason: 'Direct cookie manipulation is dangerous',
  },
  {
    pattern: /\blocalStorage\s*\.\s*(getItem|setItem|removeItem|clear|key|length)/gi,
    replacement: '/* localStorage removed */ void 0 /* .$1 */',
    reason: 'Direct localStorage access should be controlled',
  },
  {
    pattern: /\bsessionStorage\s*\.\s*(getItem|setItem|removeItem|clear|key|length)/gi,
    replacement: '/* sessionStorage removed */ void 0 /* .$1 */',
    reason: 'Direct sessionStorage access should be controlled',
  },
];

// Allowed import sources
const ALLOWED_IMPORTS = [
  'react',
  'next',
  'next/image',
  'next/link',
  'next/font',
  'next/navigation',
  'next/headers',
  'lucide-react',
  '@/components',
  '@/lib',
  '@/utils',
  '@/hooks',
  '@/types',
  './',
  '../',
];

// Blocked import sources
const BLOCKED_IMPORTS = [
  'fs',
  'path',
  'child_process',
  'os',
  'crypto',
  'http',
  'https',
  'net',
  'dns',
  'cluster',
  'worker_threads',
  'vm',
  'process',
];

export interface SanitizationResult {
  code: string;
  isValid: boolean;
  warnings: string[];
  errors: string[];
  removedPatterns: string[];
}

/**
 * Sanitize AI-generated code by removing dangerous patterns
 */
export function sanitizeCode(code: string): SanitizationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const removedPatterns: string[] = [];

  let sanitizedCode = code;

  // Remove dangerous patterns
  for (const { pattern, replacement, reason } of DANGEROUS_PATTERNS) {
    const matches = sanitizedCode.match(pattern);
    if (matches) {
      removedPatterns.push(`${reason}: ${matches.join(', ')}`);
      sanitizedCode = sanitizedCode.replace(pattern, replacement);
      warnings.push(`Removed potentially unsafe pattern: ${reason}`);
    }
  }

  // Validate imports
  const importValidation = validateImports(sanitizedCode);
  if (!importValidation.valid) {
    errors.push(...importValidation.errors);
  }
  warnings.push(...importValidation.warnings);

  // Check for suspicious patterns that might not be caught
  const suspiciousPatterns = checkSuspiciousPatterns(sanitizedCode);
  warnings.push(...suspiciousPatterns);

  return {
    code: sanitizedCode,
    isValid: errors.length === 0,
    warnings,
    errors,
    removedPatterns,
  };
}

/**
 * Validate that all imports are from allowed sources
 */
export function validateImports(code: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Match all import statements
  const importRegex = /import\s+(?:(?:\{[^}]*\}|[\w*\s,]+)\s+from\s+)?['"]([^'"]+)['"]/g;
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  const allImports: string[] = [];

  let match;
  while ((match = importRegex.exec(code)) !== null) {
    allImports.push(match[1]);
  }
  while ((match = dynamicImportRegex.exec(code)) !== null) {
    allImports.push(match[1]);
  }
  while ((match = requireRegex.exec(code)) !== null) {
    allImports.push(match[1]);
    warnings.push(`Using require() is discouraged. Found: require('${match[1]}')`);
  }

  for (const importPath of allImports) {
    // Check blocked imports first
    const isBlocked = BLOCKED_IMPORTS.some(
      (blocked) => importPath === blocked || importPath.startsWith(`${blocked}/`)
    );

    if (isBlocked) {
      errors.push(`Blocked import detected: '${importPath}' - Server-side modules are not allowed`);
      continue;
    }

    // Check if import is allowed
    const isAllowed = ALLOWED_IMPORTS.some(
      (allowed) => importPath === allowed || importPath.startsWith(allowed)
    );

    if (!isAllowed) {
      // Check if it's a node_modules package that's not in our allowed list
      if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
        warnings.push(
          `Unrecognized import: '${importPath}' - This package may not be available`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check for suspicious patterns that might indicate malicious code
 */
function checkSuspiciousPatterns(code: string): string[] {
  const warnings: string[] = [];

  // Check for base64 encoded strings (might be obfuscated code)
  if (/atob\s*\(|btoa\s*\(/i.test(code)) {
    warnings.push('Base64 encoding/decoding detected - review for obfuscated code');
  }

  // Check for fetch to external URLs
  const fetchMatches = code.match(/fetch\s*\(\s*['"`]https?:\/\/[^'"`]+['"`]/g);
  if (fetchMatches) {
    warnings.push(`External fetch calls detected: ${fetchMatches.length} occurrences - verify URLs are trusted`);
  }

  // Check for very long strings (might be obfuscated)
  const longStrings = code.match(/['"`][^'"`]{500,}['"`]/g);
  if (longStrings) {
    warnings.push('Very long strings detected - might contain obfuscated code');
  }

  // Check for hex-encoded strings
  if (/\\x[0-9a-f]{2}/i.test(code)) {
    warnings.push('Hex-encoded characters detected - review for obfuscated code');
  }

  // Check for dangerous DOM methods
  if (/\.(insertAdjacentHTML|outerHTML)\s*=/i.test(code)) {
    warnings.push('Dangerous DOM manipulation method detected');
  }

  return warnings;
}

/**
 * Extract code from markdown code blocks if present
 */
export function extractCodeFromResponse(response: string): string {
  // Try to extract from markdown code blocks
  const codeBlockMatch = response.match(/```(?:tsx?|jsx?|typescript|javascript)?\s*\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to extract from generic code blocks
  const genericBlockMatch = response.match(/```\s*\n([\s\S]*?)```/);
  if (genericBlockMatch) {
    return genericBlockMatch[1].trim();
  }

  // Return as-is if no code blocks found
  return response.trim();
}

/**
 * Validate that the code is valid TSX/JSX
 */
export function validateCodeStructure(code: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for default export
  if (!/export\s+default\s+/i.test(code)) {
    errors.push('Missing default export - component must have a default export');
  }

  // Check for basic React structure
  if (!/function\s+\w+|const\s+\w+\s*=\s*(\([^)]*\)|[^=])\s*=>/i.test(code)) {
    errors.push('No function component detected');
  }

  // Check for balanced braces
  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
  }

  // Check for balanced parentheses
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push(`Unbalanced parentheses: ${openParens} open, ${closeParens} close`);
  }

  // Check for JSX return
  if (!/return\s*\(/i.test(code) && !/=>\s*\(/i.test(code) && !/=>\s*</i.test(code)) {
    errors.push('No JSX return statement detected');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Full validation and sanitization pipeline
 */
export function processGeneratedCode(rawCode: string): SanitizationResult {
  // Extract code from markdown if needed
  const extractedCode = extractCodeFromResponse(rawCode);

  // Sanitize the code
  const sanitizationResult = sanitizeCode(extractedCode);

  // Validate structure
  const structureValidation = validateCodeStructure(sanitizationResult.code);
  sanitizationResult.errors.push(...structureValidation.errors);
  sanitizationResult.isValid = sanitizationResult.isValid && structureValidation.valid;

  return sanitizationResult;
}
