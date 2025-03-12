import { Project } from 'ts-morph';
import { capitalize, FileGenerator, readAvilaConfig } from '../utils';

export async function createModelFile(
  fullPath: string,
  project: Project,
  component: string,
  algolia: boolean,
  overwrite: boolean = false
): Promise<void> {
  const fileGenerator = new FileGenerator(project, component);
  fileGenerator.setFile(`${fullPath}/${component}.model.ts`, overwrite);
  const schema = `${component}Schema`;

  const { project: projectName } = readAvilaConfig();

  fileGenerator.addImports([
    {
      moduleSpecifier: 'mongoose',
      import: ['model'],
    },
    {
      moduleSpecifier: `@${projectName}/models`,
      import: [schema],
    },
  ]);

  if (algolia) {
    // we will set up algolia in a certain way, creating another file and installing mongoose-algolia, but for now it is commented
  }

  const capitalized = capitalize(component);

  fileGenerator.addConstDeclaration({
    name: capitalized,
    initializer: `model('${capitalized}', ${schema});`,
  });

  await fileGenerator.save();
}
