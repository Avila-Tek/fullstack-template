import {
  capitalize,
  createFolder,
  FileGenerator,
  readAvilaConfig,
} from '../../utils';
import { docs } from '../../utils/docs.template';

export function createQueriesFile(
  src: string,
  name: string,
  fileGenerator: FileGenerator,
  hasExtraDots: boolean,
): void {
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
  const { project } = readAvilaConfig();

  fileGenerator.addImports([
    {
      moduleSpecifier: `../${hasExtraDots ? '../' : ''}lib/api`,
      import: ['api'],
    },
    {
      moduleSpecifier: `@${project}/models`,
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
      {
        name: 'options',
        type: 'RequestInit',
        hasQuestionToken: true,
      },
    ],
    returnType: `Promise<${iModel} | null>`,
    statements: [
      `// ! Change to actual param to filter\n`,
      `const { data } = await api.get<${iModel}>({ url: \`/${name}/v1?_id=$\{input?._id\}\`, options })
      return data;`,
    ],
    docs: docs({
      description: `Finds one ${name} with filters`,
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
      {
        name: 'options',
        type: 'RequestInit',
        hasQuestionToken: true,
      },
    ],
    statements: [
      `// ! Add the filter to the url as needed`,
      `const { data } = await api.get<Pagination<${iModel}>>({ url: \`/${name}/v1/paginate/$\{paginationParams?.page\}/$\{paginationParams?.perPage\}?_id=$\{input?._id\}\`, ...options })
      return data;`,
    ],
    docs: docs({
      description: `Paginates ${name}s with filters`,
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
}
