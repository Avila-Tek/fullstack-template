import { Project } from 'ts-morph';
import {
  addLocalDependency,
  createFolder,
  readAvilaConfig,
  resolvePath,
} from '../../utils';
import { createModelFile } from './model';
import { createServiceFile } from './service';
import { createPaginationFile } from './pagination';
import { createControllerFile } from './controller';
import { createRoutesFile } from './routes';
import { updateRootRoutes } from './root.routes';

interface ApiBootstrapProps {
  component: string;
  project: Project;
  algolia?: boolean;
  overwrite?: boolean;
  serverName?: string;
  isProtected?: boolean;
}

/**
 * @async
 * @function
 * @description Bootstraps the code generation of the API portion of the project.
 * @implements {ts-morph}
 * @param {string} component - The name of the component to generate.
 * @requires ts-morph
 * @returns {void}
 * @see {@link https://ts-morph.com/}
 * @since 1.0.0
 * @summary API Generation
 * @version 1
 */

export async function restBootstrap({
  component,
  project,
  algolia = false,
  overwrite = false,
  isProtected = false,
}: ApiBootstrapProps): Promise<void> {
  const { serverLocation, project: projectName } = readAvilaConfig();
  const api = resolvePath('apps/api');
  const apiPath = `${api}/src`;

  // First try to create the utils folder and add the pagination portion
  createFolder(`${apiPath}/utils`);

  await createPaginationFile(`${apiPath}/utils`, project);

  // Then Create the components folder
  createFolder(`${apiPath}/components`);

  const modelPath = `${apiPath}/components/${component}`;

  await Promise.all([
    createModelFile(modelPath, project, component, algolia, overwrite),
    createServiceFile(modelPath, project, component, overwrite),
    createControllerFile(modelPath, project, component, overwrite),
    createRoutesFile(modelPath, project, component, overwrite),
    updateRootRoutes(apiPath, project, component, serverLocation, isProtected),
  ]);

  addLocalDependency(
    `${api}/package.json`,
    `@${projectName}/models`,
    'Regular'
  );
}
