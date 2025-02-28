import { IBoostrap } from '../utils';
import { generateServicePackage } from './services-package-generator';


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
      const filePath = await generateServicePackage();
      break;
  }
}
