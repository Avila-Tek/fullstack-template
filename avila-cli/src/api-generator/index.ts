import { IBoostrap, promptProtected } from '../utils';
import { graphqlBootstrap } from './graphql';
import { restBootstrap } from './rest';

export async function bootstrap(input: IBoostrap): Promise<void> {
  const {
    project,
    techStack: { backendArchitecture },
    name,
  } = input;

  switch (backendArchitecture) {
    case 'RESTful':
      const { isProtected } = await promptProtected();
      await restBootstrap({
        component: name,
        project,
        algolia: false,
        overwrite: true,
        isProtected,
      });
      break;
    case 'GraphQL':
      await graphqlBootstrap({
        component: name,
        project,
        algolia: false,
        overwrite: true,
      });
      break;
  }
}
