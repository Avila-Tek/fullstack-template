import {
  capitalize,
  createFolder,
  FileGenerator,
  readAvilaConfig,
  WebService,
} from '../../utils';
import { docs } from '../../utils/docs.template';

export function createMutationsFile(
  src: string,
  name: string,
  fileGenerator: FileGenerator,
  hasExtraDots: boolean
): void {
  const component = `${src}/${name}`;

  createFolder(component);

  fileGenerator.setFile(`${component}/mutations.ts`, true);
  const capitalized = capitalize(name);
  const { project } = readAvilaConfig();

  const input = `${capitalized}Input`;

  const iModel = `I${capitalized}`;
  const createOne = `create${input}`;
  const updateOne = `update${input}`;
  const deleteOne = `delete${input}`;

  const tCreate = `T${capitalize(createOne)}`;
  const tUpdate = `T${capitalize(updateOne)}`;
  const tDelete = `T${capitalize(deleteOne)}`;

  fileGenerator.addImports([
    {
      moduleSpecifier: `../${hasExtraDots ? '../' : ''}lib/api`,
      import: ['api'],
    },
    {
      moduleSpecifier: `@${project}/models`,
      import: [iModel, tCreate, tUpdate, tDelete],
    },
  ]);

  // create one
  fileGenerator.addFunctionDefinition({
    name: `create${capitalize(name)}`,
    isAsync: true,
    parameters: [
      {
        name: 'input',
        type: tCreate,
      },
    ],
    returnType: `Promise<${iModel}>`,
    statements: [
      `// ! Change to actual param to filter\n`,
      `const { data } = await api.post<${iModel}>({ url: \`/${name}/v1\`, options: { body: JSON.stringify(input) } })
      return data;`,
    ],
    docs: docs({
      description: `Creates one ${name}`,
      params: [
        {
          name: 'input',
          type: tCreate,
          description: `The Body of ${name}`,
        },
      ],
      since: '1.0.0',
      summary: `Creates one ${name}`,
      version: '1',
      async: true,
      requires: `{${iModel}, ${tCreate}} - @avila-tek/models`,
    }),
    isExported: true,
  });

  // update one

  fileGenerator.addFunctionDefinition({
    name: `update${capitalize(name)}`,
    isAsync: true,
    parameters: [
      {
        name: 'input',
        type: tUpdate,
      },
    ],
    returnType: `Promise<${iModel}>`,
    statements: [
      `// ! Change to actual param to filter\n`,
      `const { data } = await api.put<${iModel}>({ url: \`/${name}/v1\`, options: { body: JSON.stringify(input) } })
      return data;`,
    ],
    docs: docs({
      description: `Updates one ${name}`,
      returns: {
        type: `Promise<${iModel}>`,
        description: `The ${name} created.`,
      },
      params: [
        {
          name: 'input',
          type: tUpdate,
          description: `The Body of ${name}`,
        },
      ],
      since: '1.0.0',
      summary: `Updates one ${name}`,
      version: '1',
      async: true,
      requires: `{${iModel}, ${tUpdate}} - @avila-tek/models`,
    }),
    isExported: true,
  });

  // delete one

  fileGenerator.addFunctionDefinition({
    name: `delete${capitalize(name)}`,
    isAsync: true,
    parameters: [
      {
        name: 'input',
        type: tDelete,
      },
    ],
    returnType: `Promise<${iModel}>`,
    statements: [
      `// ! Change to actual param to filter\n`,
      `const { data } = await api.delete<${iModel}>({ url: \`/${name}/v1/\${input._id}\` })
      return data;`,
    ],
    docs: docs({
      description: `Soft Deletes one ${name}`,
      returns: {
        type: `Promise<${iModel}>`,
        description: `The ${name} created.`,
      },
      params: [
        {
          name: 'input',
          type: tDelete,
          description: `The _id of the ${name}`,
        },
      ],
      since: '1.0.0',
      summary: `Soft Deletes one ${name}`,
      version: '1',
      async: true,
      requires: `{${iModel}, ${tDelete}} - @avila-tek/models`,
    }),
    isExported: true,
  });
}
