import Anthropic from '@anthropic-ai/sdk';

let anthropicClient: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 0, // We handle retries ourselves in withRetry
    });
  }
  return anthropicClient;
}

export const CLAUDE_MODEL = 'claude-opus-4-6';
export const CLAUDE_SONNET = 'claude-sonnet-4-6';
export const MAX_TOKENS = 16000;
