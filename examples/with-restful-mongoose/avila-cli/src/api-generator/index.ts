import { IBoostrap } from '../utils';
import { restBootstrap } from './rest';

export async function bootstrap(
  input: IBoostrap & { isProtected: boolean }
): Promise<void> {
  const {
    project,
    techStack: { backendArchitecture },
    name,
    isProtected,
  } = input;

  switch (backendArchitecture) {
    case 'RESTful':
      await restBootstrap({
        component: name,
        project,
        algolia: false,
        overwrite: true,
        isProtected,
      });
  }
}
