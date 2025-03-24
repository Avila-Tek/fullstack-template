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

  const { project: projectName, ORM, backendArchitecture } = readAvilaConfig();

  // const isMongoose = ORM === 'Mongoose';
  const isGraphQL = backendArchitecture === 'GraphQL';
  const capitalized = capitalize(component);
  const _document = `${capitalized}Document`;

  const importsFromModels = [
    schema,
    ...(isGraphQL ? [_document, `I${capitalized}`] : []),
  ];
  const importsFromMongoose = [
    'model',
    // I Think if i import Model without the `type` keyword it works
    ...(isGraphQL ? ['Model'] : []),
  ];

  // I think this file is not necessary in Prisma implementations

  fileGenerator.addImports([
    {
      moduleSpecifier: 'mongoose',
      import: importsFromMongoose,
    },
    {
      moduleSpecifier: `@${projectName}/models`,
      import: importsFromModels,
    },
  ]);

  if (algolia) {
    // we will set up algolia in a certain way, creating another file and installing mongoose-algolia, but for now it is commented
  }

  fileGenerator.addConstDeclaration({
    name: capitalized,
    initializer: `model${
      isGraphQL ? `<I${capitalized}, Model<${_document}>>` : ''
    }('${capitalized}', ${schema});`,
  });

  if (isGraphQL) {
    // if (isMongoose) { // TODO: check if this is necessary
    // Add compose-mongoose

    fileGenerator.addImports([
      {
        moduleSpecifier: 'graphql-compose-mongoose',
        import: ['composeMongoose'],
      },
    ]);

    fileGenerator.addConstDeclaration({
      name: `${capitalized}TC`,
      initializer: `composeMongoose<${_document}>(${capitalized})`,
    });
    // }
  }

  await fileGenerator.save();
}
