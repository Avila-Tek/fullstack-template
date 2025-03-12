import { FileGenerator, IBoostrap } from '../utils';
import { restBootstrap } from './rest';

export async function bootstrap(input: IBoostrap): Promise<void> {
  const {
    project,
    techStack: { backendArchitecture, webService },
    name,
  } = input;

  const fileGenerator = new FileGenerator(project, '');

  switch (backendArchitecture) {
    case 'RESTful':
      await restBootstrap(fileGenerator, project, name, webService);
      break;
  }
}
