import { FileGenerator, IBoostrap } from '../utils';
import { restBootstrap } from './rest';

export async function bootstrap({
  name,
  project,
  techStack: { backendArchitecture },
}: IBoostrap): Promise<void> {
  const fileGenerator = new FileGenerator(project, '');

  switch (backendArchitecture) {
    case 'RESTful':
      await restBootstrap(fileGenerator, project, name);
      break;
  }
}
