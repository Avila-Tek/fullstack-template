// Add domain-error-code → human-readable message mappings here.
// AUTH_* messages are added in F2.
const messages: Record<string, string> = {};

export function domainErrorMessage(error: string): string {
  return messages[error] ?? error;
}
