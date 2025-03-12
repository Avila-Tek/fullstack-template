import { Project } from 'ts-morph';
import { capitalize } from '../utils';
import { FileGenerator } from '../utils';

export async function createDtoFile(
  fullPath: string,
  project: Project,
  component: string,
  overwrite = false
) {
  const capitalized = capitalize(component);
  const fileGenerator = new FileGenerator(project, component);
  fileGenerator.setFile(`${fullPath}/${component}.dto.ts`, overwrite);
  fileGenerator.addImports([
    {
      moduleSpecifier: 'zod',
      import: ['z'],
    },
    {
      moduleSpecifier: 'mongoose',
      import: ['Types'],
    },
    {
      moduleSpecifier: '../basicDefinitions',
      import: ['basicModelDefinition'],
    },
  ]);

  const modelDefinition = `${component}Definition`;

  fileGenerator.addConstDeclaration({
    name: modelDefinition,
    initializer: `basicModelDefinition.extend({})`,
  });

  // #region Create

  const createInput = `create${capitalized}Input`;

  fileGenerator.addConstDeclaration({
    name: createInput,
    initializer: `${modelDefinition}.omit({ _id: true, createdAt: true, updatedAt: true })`,
  });

  fileGenerator.addTypeDefinition({
    name: `TCreate${capitalized}Input`,
    type: `z.infer<typeof ${createInput}>`,
  });

  // #endregion

  // #region Update

  const updateInput = `update${capitalized}Input`;

  fileGenerator.addConstDeclaration({
    name: updateInput,
    initializer: `${modelDefinition}.partial().required({ _id: true })`,
  });

  fileGenerator.addTypeDefinition({
    name: `TUpdate${capitalized}Input`,
    type: `z.infer<typeof ${updateInput}>`,
  });

  // #endregion

  // #region FinOne

  const findOneInput = `findOne${capitalized}Input`;

  fileGenerator.addConstDeclaration({
    name: findOneInput,
    initializer: `${modelDefinition}.pick({ _id: true }).required({ _id: true })`,
  });

  fileGenerator.addTypeDefinition({
    name: `TFindOne${capitalized}Input`,
    type: `z.infer<typeof ${findOneInput}>`,
  });

  // #endregion

  // #region paginate

  const filterInput = `filter${capitalized}Input`;

  fileGenerator.addConstDeclaration({
    name: filterInput,
    initializer: `${modelDefinition}.partial().optional()`,
  });

  fileGenerator.addTypeDefinition({
    name: `TFilter${capitalized}Input`,
    type: `z.infer<typeof ${filterInput}>`,
  });

  // #endregion

  // #region delete

  const deleteInput = `delete${capitalized}Input`;

  fileGenerator.addConstDeclaration({
    name: deleteInput,
    initializer: `${modelDefinition}.pick({ _id: true }).required({ _id: true })`,
  });

  fileGenerator.addTypeDefinition({
    name: `TDelete${capitalized}Input`,
    type: `z.infer<typeof ${deleteInput}>`,
  });

  await fileGenerator.save();
}
