import { schemaComposer } from 'graphql-compose';

import { Mutation } from './Mutation';
import { Query } from './Query';

schemaComposer.Query.addFields({
  ...Query,
});

schemaComposer.Mutation.addFields({
  ...Mutation,
});

export const schema = schemaComposer.buildSchema();
