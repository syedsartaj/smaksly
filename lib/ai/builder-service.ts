import OpenAI from 'openai';
import {
  PAGE_GENERATION_SYSTEM_PROMPT,
  createPageGenerationPrompt,
  createComponentGenerationPrompt,
} from './prompts/page-generation';
import {
  CODE_EDIT_SYSTEM_PROMPT,
  createCodeEditPrompt,
  createQuickEditPrompt,
  createImprovementAnalysisPrompt,
} from './prompts/code-editing';
import {
  processGeneratedCode,
  extractCodeFromResponse,
  SanitizationResult,
} from './code-sanitizer';

// Lazy-load OpenAI client to avoid build-time errors
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export interface ProjectSettings {
  siteName: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

export interface MediaReference {
  url: string;
  name: string;
  alt?: string;
}

export interface PageGenerationParams {
  description: string;
  pageType: 'static' | 'dynamic' | 'blog-listing' | 'blog-post';
  pagePath: string;
  existingComponents: string[];
  projectSettings: ProjectSettings;
  mediaReferences?: MediaReference[];
}

export interface PageGenerationResult {
  code: string;
  isValid: boolean;
  warnings: string[];
  errors: string[];
  suggestedComponents: string[];
}

export interface CodeEditParams {
  fullCode: string;
  selectedCode?: string;
  instruction: string;
  selectionContext?: {
    startLine: number;
    endLine: number;
  };
}

export interface CodeEditResult {
  code: string;
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export interface PageInfo {
  name: string;
  path: string;
}

export interface ComponentGenerationParams {
  description: string;
  componentName: string;
  componentType: 'layout' | 'section' | 'element' | 'widget';
  projectSettings: ProjectSettings;
  pages?: PageInfo[];
}

export interface ImprovementSuggestion {
  category: 'accessibility' | 'performance' | 'seo' | 'responsiveness' | 'code-quality' | 'ux';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
  lineNumbers?: number[];
}

export interface ImprovementAnalysisResult {
  suggestions: ImprovementSuggestion[];
  score: {
    accessibility: number;
    performance: number;
    seo: number;
    responsiveness: number;
    overall: number;
  };
}

/**
 * AI Builder Service
 * Handles all AI-powered code generation and editing for the website builder
 */
export class BuilderAIService {
  private model = 'gpt-4o';
  private maxTokens = 8000;

  /**
   * Generate a complete page based on user description
   */
  async generatePage(params: PageGenerationParams): Promise<PageGenerationResult> {
    const { description, pageType, pagePath, existingComponents, projectSettings, mediaReferences } = params;

    try {
      let userPrompt = createPageGenerationPrompt({
        description,
        pageType,
        pagePath,
        existingComponents,
        projectSettings,
      });

      // Add media references to the prompt if available
      if (mediaReferences && mediaReferences.length > 0) {
        const mediaContext = `

AVAILABLE IMAGES:
The following images have been provided for use in this page. Use these exact URLs when the user's description mentions these images:
${mediaReferences.map((m, i) => `${i + 1}. "${m.name}" - ${m.url}${m.alt ? ` (alt: ${m.alt})` : ''}`).join('\n')}

When using these images, use the Image component with the exact URL provided. For example:
<Image src="${mediaReferences[0]?.url || ''}" alt="${mediaReferences[0]?.alt || mediaReferences[0]?.name || 'Image'}" fill className="object-cover" />
`;
        userPrompt = userPrompt + mediaContext;
      }

      const completion = await getOpenAI().chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: PAGE_GENERATION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: this.maxTokens,
      });

      const rawResponse = completion.choices[0]?.message?.content || '';

      // Process and sanitize the generated code
      const sanitizationResult = processGeneratedCode(rawResponse);

      // Extract suggested components from the response
      const suggestedComponents = this.extractSuggestedComponents(rawResponse);

      return {
        code: sanitizationResult.code,
        isValid: sanitizationResult.isValid,
        warnings: sanitizationResult.warnings,
        errors: sanitizationResult.errors,
        suggestedComponents,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate page: ${errorMessage}`);
    }
  }

  /**
   * Edit existing code based on user instructions
   */
  async editCode(params: CodeEditParams): Promise<CodeEditResult> {
    const { fullCode, selectedCode, instruction, selectionContext } = params;

    try {
      let userPrompt: string;

      if (selectedCode && selectedCode.trim()) {
        userPrompt = createCodeEditPrompt({
          fullCode,
          selectedCode,
          instruction,
          selectionContext,
        });
      } else {
        userPrompt = createQuickEditPrompt({
          fullCode,
          instruction,
        });
      }

      const completion = await getOpenAI().chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: CODE_EDIT_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5, // Lower temperature for more precise edits
        max_tokens: this.maxTokens,
      });

      const rawResponse = completion.choices[0]?.message?.content || '';

      // Process and sanitize the edited code
      const sanitizationResult = processGeneratedCode(rawResponse);

      return {
        code: sanitizationResult.code,
        isValid: sanitizationResult.isValid,
        warnings: sanitizationResult.warnings,
        errors: sanitizationResult.errors,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to edit code: ${errorMessage}`);
    }
  }

  /**
   * Generate a reusable component
   */
  async generateComponent(params: ComponentGenerationParams): Promise<PageGenerationResult> {
    const { description, componentName, componentType, projectSettings, pages } = params;

    try {
      const userPrompt = createComponentGenerationPrompt({
        description,
        componentName,
        componentType,
        projectSettings,
        pages,
      });

      const completion = await getOpenAI().chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: PAGE_GENERATION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: this.maxTokens,
      });

      const rawResponse = completion.choices[0]?.message?.content || '';
      const sanitizationResult = processGeneratedCode(rawResponse);

      return {
        code: sanitizationResult.code,
        isValid: sanitizationResult.isValid,
        warnings: sanitizationResult.warnings,
        errors: sanitizationResult.errors,
        suggestedComponents: [],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate component: ${errorMessage}`);
    }
  }

  /**
   * Analyze code for improvement suggestions
   */
  async analyzeForImprovements(code: string): Promise<ImprovementAnalysisResult> {
    try {
      const userPrompt = createImprovementAnalysisPrompt(code);

      const completion = await getOpenAI().chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a code analysis expert. Respond only with valid JSON.',
          },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const rawResponse = completion.choices[0]?.message?.content || '{}';

      try {
        const result = JSON.parse(rawResponse);
        return {
          suggestions: result.suggestions || [],
          score: result.score || {
            accessibility: 0,
            performance: 0,
            seo: 0,
            responsiveness: 0,
            overall: 0,
          },
        };
      } catch {
        return {
          suggestions: [],
          score: {
            accessibility: 0,
            performance: 0,
            seo: 0,
            responsiveness: 0,
            overall: 0,
          },
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to analyze code: ${errorMessage}`);
    }
  }

  /**
   * Conversational code editing with context
   */
  async conversationalEdit(
    code: string,
    conversation: Array<{ role: 'user' | 'assistant'; content: string }>,
    newInstruction: string
  ): Promise<CodeEditResult> {
    try {
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: CODE_EDIT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Current code:\n\`\`\`tsx\n${code}\n\`\`\``,
        },
      ];

      // Add conversation history
      for (const msg of conversation.slice(-6)) {
        // Keep last 6 messages for context
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }

      // Add new instruction
      messages.push({
        role: 'user',
        content: newInstruction,
      });

      const completion = await getOpenAI().chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.5,
        max_tokens: this.maxTokens,
      });

      const rawResponse = completion.choices[0]?.message?.content || '';

      // Check if response contains code
      if (rawResponse.includes('```') || rawResponse.includes('import ') || rawResponse.includes('export ')) {
        const sanitizationResult = processGeneratedCode(rawResponse);
        return {
          code: sanitizationResult.code,
          isValid: sanitizationResult.isValid,
          warnings: sanitizationResult.warnings,
          errors: sanitizationResult.errors,
        };
      }

      // Response is conversational, not code
      return {
        code: code, // Return original code
        isValid: true,
        warnings: [],
        errors: [],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed in conversational edit: ${errorMessage}`);
    }
  }

  /**
   * Extract suggested components from AI response
   */
  private extractSuggestedComponents(response: string): string[] {
    const suggestions: string[] = [];

    // Look for component mentions in various patterns
    const patterns = [
      /(?:create|need|use|add)\s+(?:a\s+)?(\w+(?:Component|Header|Footer|Card|List|Nav|Section|Button|Modal|Form)?)\s+component/gi,
      /import\s+\{\s*(\w+)\s*\}\s+from\s+['"]@\/components/gi,
      /should\s+(?:create|have)\s+(?:a\s+)?(\w+)\s+component/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const componentName = match[1];
        if (
          componentName &&
          componentName.length > 2 &&
          /^[A-Z]/.test(componentName) &&
          !suggestions.includes(componentName)
        ) {
          suggestions.push(componentName);
        }
      }
    }

    return suggestions;
  }
}

// Export singleton instance
export const builderAIService = new BuilderAIService();
