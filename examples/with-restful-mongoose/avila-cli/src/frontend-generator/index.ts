import { FileGenerator, IBoostrap } from '@/utils';
import { restBootstrap } from '@/frontend-generator/rest';

export async function bootstrap(input: IBoostrap): Promise<void> {
  const {
    project,
    techStack: { backendArchitecture, webService },
    name,
  } = input;

  const fileGenerator = new FileGenerator(project, '');

  switch (backendArchitecture) {
    case 'RESTful':
      // We do null assertion here because we know that the webService is defined
      await restBootstrap(fileGenerator, project, name, webService!);
      break;
  }
}
