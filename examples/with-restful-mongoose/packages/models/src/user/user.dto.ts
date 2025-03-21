import { z } from 'zod';
import { basicModelDefinition } from '../basicDefinitions';

export const userDefinition = basicModelDefinition.extend({
  name: z.string(),
});
