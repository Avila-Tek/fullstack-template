import { Project } from 'ts-morph';
import {
  addLocalDependency,
  createFolder,
  readAvilaConfig,
  resolvePath,
} from '../../utils';
import { createPaginationFile } from '../pagination';
import { createModelFile } from '../model';
import { createServiceFile } from '../rest/service';

interface GraphQLBootstrapProps {
  component: string;
  project: Project;
  algolia?: boolean;
  overwrite?: boolean;
}

/**
 * @async
 * @function
 * @description Bootstraps the code generation of the GraphQL portion of the project.
 * @implements {ts-morph}
 * @param {string} component - The name of the component to generate.
 * @requires ts-morph
 * @returns {void}
 * @see {@link https://ts-morph.com/}
 * @since 1.0.0
 * @summary API Generation
 * @version 1
 */
export async function graphqlBootstrap({
  component,
  project,
  algolia = false,
  overwrite = false,
}: GraphQLBootstrapProps): Promise<void> {
  const { serverLocation, project: projectName } = readAvilaConfig();
  const api = resolvePath('apps/api');
  const apiPath = `${api}/src`;

  // First try to create the utils folder and add the pagination portion
  createFolder(`${apiPath}/utils`);

  await createPaginationFile(`${apiPath}/utils`, project, true);

  // Then Create the components folder

  createFolder(`${apiPath}/components`);

  const modelPath = `${apiPath}/components/${component}`;

  await Promise.all([
    // TODO: Add to the dto file in models package generator the graphql consts
    createModelFile(modelPath, project, component, algolia, overwrite),
    createServiceFile(modelPath, project, component, overwrite),
  ]);
}
