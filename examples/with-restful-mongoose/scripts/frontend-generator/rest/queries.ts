import { capitalize, createFolder, FileGenerator } from '../../utils';
import { docs } from '../../utils/docs.template';

export async function createQueriesFile(
  src: string,
  name: string,
  fileGenerator: FileGenerator
): Promise<void> {
  const component = `${src}/${name}`;

  createFolder(component);

  fileGenerator.setFile(`${component}/queries.ts`, true);

  const capitalized = capitalize(name);

  const input = `${capitalized}Input`;

  const iModel = `I${capitalized}`;
  const findOne = `findOne${input}`;
  const filter = `filter${input}`;
  const paginateParams = 'TPaginateParams';

  const tFindOne = `T${capitalize(findOne)}`;
  const tFilter = `T${capitalize(filter)}`;

  fileGenerator.addImports([
    {
      moduleSpecifier: '../lib/api',
      import: ['api', 'TFetchOutput'],
    },
    {
      moduleSpecifier: '@avila-tek/models',
      import: [iModel, tFindOne, tFilter, paginateParams, 'Pagination'],
    },
  ]);

  // Find one

  fileGenerator.addFunctionDefinition({
    name: `findOne${capitalize(name)}`,
    isAsync: true,
    parameters: [
      {
        name: 'input',
        type: tFindOne,
      },
    ],
    returnType: `Promise<TFetchOutput<${iModel} | null>>`,
    statements: [
      `// ! Change to actual param to filter\n`,
      `return await api.get<${iModel}>({ url: \`/${name}/v1?_id=$\{input._id\}\` })`,
    ],
    docs: docs({
      description: `Finds one ${name} with filters`,
      returns: {
        type: `Promise<TFetchOutput<${iModel} | null>>`,
        description: `The ${name} found`,
      },
      params: [
        {
          name: 'input',
          type: tFindOne,
          description: `The filters to find the ${name}`,
        },
      ],
      since: '1.0.0',
      summary: `Find one ${name}`,
      version: '1',
      async: true,
      requires: `{${iModel}, ${tFindOne}} - @avila-tek/models`,
    }),
    isExported: true,
  });

  // paginate

  fileGenerator.addFunctionDefinition({
    name: `paginate${capitalize(name)}`,
    isAsync: true,
    parameters: [
      {
        name: 'paginationParams',
        type: paginateParams,
      },
      {
        name: 'input',
        type: tFilter,
        hasQuestionToken: true,
      },
    ],
    returnType: `Promise<TFetchOutput<Pagination<${iModel} | null>>>`,
    statements: [
      `// ! Add the filter to the url as needed`,
      `return await api.get<Pagination<${iModel}>>({ url: \`/${name}/v1/paginate/$\{paginationParams?.page\}/$\{paginationParams?.perPage\}?_id=$\{input?._id\}\` })`,
    ],
    docs: docs({
      description: `Paginates ${name}s with filters`,
      returns: {
        type: `Promise<TFetchOutput<Pagination<${iModel} | null>>>`,
        description: `The ${name}s paginated `,
      },
      params: [
        {
          name: 'input',
          type: tFindOne,
          description: `The filters to find the ${name}s paginated`,
        },
      ],
      since: '1.0.0',
      summary: `Paginate ${name}s`,
      version: '1',
      async: true,
      requires: `{${iModel}, ${tFindOne}} - @avila-tek/models`,
    }),
    isExported: true,
  });

  await fileGenerator.save();
}
