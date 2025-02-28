import { IBoostrap } from '../utils';
import { generateServicePackage } from './services-package-generator';
import { bootstrap as sharedBootstrap } from './shared';

export async function bootstrap(input: IBoostrap): Promise<void> {
  const {
    techStack: { webService },
  } = input;
  switch (webService) {
    case 'Admin':
      break;
    case 'Client':
      break;
    case 'Shared':
      await generateServicePackage();
      await sharedBootstrap(input);
      break;
  }
}
