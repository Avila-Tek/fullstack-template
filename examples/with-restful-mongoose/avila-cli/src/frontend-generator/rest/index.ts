import * as fs from 'fs';
import { createApiFile } from '../api';
import {
  addLocalDependency,
  createFolder,
  FileGenerator,
  getServicePath,
  readAvilaConfig,
  resolvePath,
  WebService,
} from '../../utils';
import { Project } from 'ts-morph';
import { createQueriesFile } from '../rest/queries';
import { createIndexFile } from '../rest/_index';
import { createMutationsFile } from '../rest/mutations';
import { createHooksFile } from '../rest/hooks';
import { generateServicePackage } from '../services-package-generator';

/**
 * @async
 * @function
 * @description Bootstraps the code generation of the REST portion of the project.
 * @implements {ts-morph}
 * @param {FileGenerator} fileGenerator - The file generator object.
 * @param {Project} project - The project to create the file in.
 * @param {string} name - The name of the component to generate.
 * @param {WebService} webService - The web service to generate the code for.
 * @requires ts-morph
 * @requires fs
 * @requires path
 * @requires generateServicePackage
 * @returns {Promise<void>}
 * @see {@link https://ts-morph.com/}
 * @since 1.0.0
 * @summary REST Generation
 * @version 1
 */

export async function restBootstrap(
  fileGenerator: FileGenerator,
  project: Project,
  name: string,
  webService: WebService
): Promise<void> {
  // First, we create the lib folder to store the api wrapper for requests
  const appPath = getServicePath(webService);

  if (!appPath) {
    throw new Error('The web service is not supported');
  }

  if (appPath.type === 'Shared') {
    generateServicePackage();
  } else {
    const servicesPath = resolvePath(appPath.src);
    createFolder(servicesPath);
  }

  const root = resolvePath(appPath.root);
  const src = resolvePath(appPath.src);
  const lib = resolvePath(appPath.lib);

  // Create the lib folder and if it already exists, it won't overwrite it
  createFolder(lib);
  const apiFile = `${lib}/api.ts`;

  // If the file doesn't exist, we create it
  if (!fs.existsSync(apiFile)) {
    await createApiFile(apiFile, project);
  }

  const hasExtraDots = webService !== 'Shared';

  createQueriesFile(src, name, fileGenerator, hasExtraDots);
  createMutationsFile(src, name, fileGenerator, hasExtraDots);
  createHooksFile(src, name, fileGenerator);
  createIndexFile(`${src}/${name}`, fileGenerator);

  // Update the index.ts file in the src folder

  const indexFile = `${src}/index.ts`;
  fileGenerator.setFile(indexFile, true);
  fileGenerator.appendExportDeclaration(indexFile, name);

  const { project: projectName } = readAvilaConfig();

  addLocalDependency(`${root}/package.json`, `@${projectName}/models`, 'Dev');

  await project.save();
}
