import { Project } from 'ts-morph';
import { FileGenerator } from '@/utils';

/**
 * @async
 * @function
 * @description Creates an index file for the component
 * @implements {ts-morph}
 * @listens {FileGenerator}
 * @param {string} fullPath - The full path to the file
 * @param {Project} project - The project to create the file in
 * @param {string} component - The component to create the file for
 * @requires ts-morph
 * @returns {Promise<void>}
 * @see {@link https://ts-morph.com/}
 * @since 1.0.0
 * @summary Create Index File
 * @version 1
 */

export async function createIndexFile(
  fullPath: string,
  project: Project,
  component: string,
  overwrite = false,
): Promise<void> {
  const fileGenerator = new FileGenerator(project, component);
  fileGenerator.setFile(`${fullPath}/index.ts`, overwrite);
  fileGenerator.addExportDeclaration([
    {
      export: undefined,
      moduleSpecifier: `./${component}.schema`,
    },
    {
      export: undefined,
      moduleSpecifier: `./${component}.dto`,
    },
  ]);
  await fileGenerator.save();
}
