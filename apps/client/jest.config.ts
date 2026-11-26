import dotenv from 'dotenv';
import type { Config } from 'jest';
import nextJest from 'next/jest.js';

// load .env.test environment variables Importante debe colocar el nombre del archivo de las variables de entorno de su proyecto
dotenv.config({ path: '.env.local' });

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jest-fixed-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.(test|spec).[jt]s?(x)'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/', '<rootDir>/example/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
};

// msw depends on ESM-only packages that Jest must transform. next/jest always
// ignores node_modules, so its patterns are replaced after the config resolves.
const esmPackages = ['until-async', 'rettime', '@open-draft/deferred-promise'];

async function jestConfig(): Promise<Record<string, unknown>> {
  const nextJestConfig = await createJestConfig(config)();

  return {
    ...nextJestConfig,
    transformIgnorePatterns: [
      `/node_modules/(?!(${esmPackages.join('|')})/)`,
      '^.+\\.module\\.(css|sass|scss)$',
    ],
  };
}

export default jestConfig;
