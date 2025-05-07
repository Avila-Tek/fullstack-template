import { schemaComposer } from 'graphql-compose';
import { exampleService } from './example.service';

const helloQuery = schemaComposer.createResolver({
  name: 'greater',
  kind: 'query',
  type: 'String!',
  async resolve({ context: _context }) {
    return exampleService.greater();
  },
});

export const exampleQueries = Object.freeze({ helloQuery });
