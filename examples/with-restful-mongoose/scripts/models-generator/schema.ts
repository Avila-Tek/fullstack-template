import { Project } from 'ts-morph';
import { capitalize } from '../utils';
import { FileGenerator } from '../utils';

export async function createSchemaFile(
  fullPath: string,
  project: Project,
  component: string,
  overwrite = false
) {
  const capitalized = capitalize(component);
  const fileGenerator = new FileGenerator(project, component);
  fileGenerator.setFile(`${fullPath}/${component}.schema.ts`, overwrite);
  fileGenerator.addImports([
    {
      moduleSpecifier: 'zod',
      import: ['z'],
      default: false,
      isTypeOnly: true,
    },
    {
      moduleSpecifier: 'mongoose',
      import: ['Schema'],
      default: false,
    },
    {
      moduleSpecifier: 'mongoose',
      import: ['Types', 'Document'],
      default: false,
      isTypeOnly: true,
    },
    {
      moduleSpecifier: `./${component}.dto`,
      import: [`${component}Definition`],
      default: false,
    },
  ]);

  const model = `I${capitalized}`;

  fileGenerator.addTypeDefinition({
    name: `${model}`,
    type: `z.infer<typeof ${component}Definition>`,
  });

  fileGenerator.addTypeDefinition({
    name: `${capitalized}Document`,
    type: `${model} & Document<Types.ObjectId, object, ${model}>`,
  });

  fileGenerator.addConstDeclaration({
    name: `${component}Schema`,
    initializer: `new Schema<${model}>({},{ timestamps: true })`,
  });

  await fileGenerator.save();
}
