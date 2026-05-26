// Copied from https://github.com/johno/normalize-email/blob/94a93fa55b26dc669ca2330155289623031b4505/index.js

const PLUS_ONLY = /\+.*$/;
const PLUS_AND_DOT = /\.|\+.*$/g;

const normalizeableProviders = {
  'gmail.com': {
    cut: PLUS_AND_DOT,
  },
  'googlemail.com': {
    cut: PLUS_AND_DOT,
    aliasOf: 'gmail.com',
  },
  'hotmail.com': {
    cut: PLUS_ONLY,
  },
  'live.com': {
    cut: PLUS_ONLY,
  },
  'outlook.com': {
    cut: PLUS_ONLY,
  },
} as const;

/** Used to enforce the one-canonical-identity-per-email guarantee. */
export function normalizeEmail(input: string): string {
  const email = input.trim().toLowerCase();
  const emailParts = email.split(/@/);

  if (emailParts.length !== 2) {
    return email;
  }

  let username = emailParts[0] as string;
  let domain = emailParts[1] as string;

  const providerKey = domain as keyof typeof normalizeableProviders;
  if (providerKey in normalizeableProviders) {
    const provider = normalizeableProviders[providerKey];
    username = username.replace(provider.cut, '');
    if ('aliasOf' in provider) {
      domain = provider.aliasOf;
    }
  }

  return `${username}@${domain}`;
}
