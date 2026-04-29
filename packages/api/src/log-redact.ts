const POSTGRES_URL_RE = /(postgres(?:ql)?:\/\/[^:@/\s]+):([^@/\s]+)@/gi;

export function redactSecrets(input: string): string {
  return input.replace(POSTGRES_URL_RE, "$1:****@");
}
