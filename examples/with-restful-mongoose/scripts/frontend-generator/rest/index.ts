import path from 'path';
import fs from 'fs';
import { createApiFile } from '../api';
import { createFolder, FileGenerator } from '../../utils';
import { Project } from 'ts-morph';
import { createQueriesFile } from './queries';
import { createIndexFile } from './_index';
import { createMutationsFile } from './mutations';
import { createHooksFile } from './hooks';

export async function restBootstrap(
  fileGenerator: FileGenerator,
  project: Project,
  name: string
): Promise<void> {
  // First, we create the lib folder to store the api wrapper for requests
  const servicePath = path.resolve(__dirname, '../../../packages');
  const root = `${servicePath}/services`;
  const src = `${root}/src`;
  const lib = `${src}/lib`;
  // Create the lib folder and if it already exists, it won't overwrite it
  createFolder(lib);
  const apiFile = `${lib}/api.ts`;

  // If the file doesn't exist, we create it
  if (!fs.existsSync(apiFile)) {
    await createApiFile(apiFile, project);
  }
  createQueriesFile(src, name, fileGenerator);
  createMutationsFile(src, name, fileGenerator);
  createHooksFile(src, name, fileGenerator);
  createIndexFile(`${src}/${name}`, fileGenerator);

  // Update the index.ts file in the src folder

  const indexFile = `${src}/index.ts`;
  fileGenerator.setFile(indexFile, true);
  fileGenerator.appendExportDeclaration(indexFile, name);

  await project.save();
}
