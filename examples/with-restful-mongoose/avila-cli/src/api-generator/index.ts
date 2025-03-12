import { Project } from 'ts-morph';
import {
  addLocalDependency,
  createFolder,
  readAvilaConfig,
} from '../utils';
import * as path from 'path';
import { createModelFile } from './model';
import { createServiceFile } from './service';
import { createPaginationFile } from './pagination';
import { createControllerFile } from './controller';
import { createRoutesFile } from './routes';
import { updateRootRoutes } from './root.routes';

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

export async function bootstrap(
  component: string,
  project: Project,
  algolia: boolean = false,
  overwrite: boolean = false,
  serverName: string = 'app.ts'
): Promise<void> {
  const api = path.resolve(__dirname, '../../../apps/api');
  const apiPath = `${api}/src`;

  // First try to create the utils folder and add the pagination portion
  createFolder(`${apiPath}/utils`);

  await createPaginationFile(`${apiPath}/utils`, project);

  const { project: projectName } = readAvilaConfig();

  // Then Create the components folder
  createFolder(`${apiPath}/components`);

  const modelPath = `${apiPath}/components/${component}`;

  await Promise.all([
    createModelFile(modelPath, project, component, algolia, overwrite),
    createServiceFile(modelPath, project, component, overwrite),
    createControllerFile(modelPath, project, component, overwrite),
    createRoutesFile(modelPath, project, component, overwrite),
    updateRootRoutes(apiPath, project, component, serverName),
  ]);

  addLocalDependency(`${api}/package.json`, `${projectName}/models`, 'Dev');
}
