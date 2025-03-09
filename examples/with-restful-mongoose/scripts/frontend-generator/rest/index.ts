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

  await createQueriesFile(src, name, fileGenerator);
  await createMutationsFile(src, name, fileGenerator);
  await createHooksFile(src, name, fileGenerator);
  // The index inside the ${name} folder
  await createIndexFile(src, fileGenerator);

  // Update the index.ts file in the src folder

  const indexFile = `${src}/index.ts`;

  if (!fs.existsSync(indexFile)) {
    fileGenerator.setFile(indexFile, false);
    await fileGenerator.save();
  } else {
    // Do some logic here to append the export of the new component
  }
}
