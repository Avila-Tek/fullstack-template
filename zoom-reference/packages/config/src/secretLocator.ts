export type SecretLocator = {
  project: string;
  name: string;
  version: string;
};

const LOCATOR_REGEX =
  /^projects\/([a-z][a-z0-9-]{4,28}[a-z0-9])\/secrets\/([A-Za-z0-9_-]{1,255})(?:\/versions\/(latest|\d+))?$/;

export function isLocator(value: unknown): value is string {
  return typeof value === 'string' && LOCATOR_REGEX.test(value);
}

export function parseLocator(value: string): SecretLocator | null {
  const match = LOCATOR_REGEX.exec(value);
  if (!match) {
    return null;
  }
  const project = match[1];
  const name = match[2];
  if (project === undefined || name === undefined) {
    return null;
  }
  return {
    project,
    name,
    version: match[3] ?? 'latest',
  };
}
