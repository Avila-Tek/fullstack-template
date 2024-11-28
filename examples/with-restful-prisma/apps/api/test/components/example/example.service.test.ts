import { fakerES as faker } from '@faker-js/faker';
import { describe, expect, test } from 'vitest';
import { exampleService } from '../../../src/components/example/example.service';

describe('[EXAMPLE][Service]', () => {
  test('GREATER FUNCTION', async () => {
    const data = await exampleService.greater();
    expect(data).toBe('Hello');
  });
});
