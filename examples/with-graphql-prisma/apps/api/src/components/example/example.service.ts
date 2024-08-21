import { schemaComposer } from 'graphql-compose';

const helloService = schemaComposer.createResolver({
  name: 'greater',
  kind: 'query',
  type: 'String!',
  async resolve({ context }) {
    return `Hello`;
  },
});

export const exampleService = Object.freeze({ helloService });
