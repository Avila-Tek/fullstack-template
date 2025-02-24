import { Project } from "ts-morph";
import { createFolder } from "../utils";
import * as path from "path";
import { createModelFile } from "./model";
import { createServiceFile } from "./service";
import { createPaginationFile } from "./pagination";

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
): Promise<void> {
  const apiPath = path.resolve(__dirname, "../../apps/api/src");

  // First try to create the utils folder and add the pagination portion
  createFolder(`${apiPath}/utils`);

  await createPaginationFile(`${apiPath}/utils`, project);

  // Then Create the components folder
  createFolder(`${apiPath}/components`);

  const modelPath = `${apiPath}/components/${component}`;

  await createModelFile(modelPath, project, component, algolia, overwrite);
  await createServiceFile(modelPath, project, component, overwrite);
}
