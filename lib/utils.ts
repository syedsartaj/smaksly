// lib/utils.ts
export function generateVerificationToken(): string {
  const random = Math.random().toString(36).substring(2, 15);
  return `smaksly-${random}`;
}
