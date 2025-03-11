import path from 'path';
import { Project } from 'ts-morph';
import { createFolder } from '../utils';
import { createDtoFile } from './dto';
import { createSchemaFile } from './schema';
import { createIndexFile } from './_index';
import { FileGenerator } from '../utils';
import { generateModelsPackage } from './models-package-generator';

/**
 * @async
 * @function
 * @description Bootstraps the code generation of the models portion of the project.
 * @implements {ts-morph}
 * @listens {createFolder}
 * @param {string} component - The name of the component to generate.
 * @param {boolean} [overwrite] - Whether to overwrite the existing files
 * @requires ts-morph
 * @returns {Promise<void>}
 * @see {@link https://ts-morph.com/}
 * @since 1.0.0
 * @todo Add jsonSchema portion of the dto file
 * @summary Models Generation
 * @version 1
 */

export async function bootstrap(
  component: string,
  project: Project,
  overwrite?: boolean
): Promise<void> {
  
  await generateModelsPackage();
  const modelsPath = path.resolve(__dirname, '../../packages/models/src');
  const fullPath = `${modelsPath}/${component}`;
  createFolder(fullPath);

  await createDtoFile(fullPath, project, component, overwrite);
  await createSchemaFile(fullPath, project, component, overwrite);
  await createIndexFile(fullPath, project, component, overwrite);

  const indexFilePath = path.resolve(modelsPath, 'index.ts');
  const fileGenerator = new FileGenerator(project, '');

  fileGenerator.appendExportDeclaration(indexFilePath, component);

  await project.save();
}
