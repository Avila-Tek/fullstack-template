import {
  capitalize,
  createFolder,
  FileGenerator,
  readAvilaConfig,
} from '../../utils';
import { docs } from '../../utils/docs.template';

export function createHooksFile(
  src: string,
  name: string,
  fileGenerator: FileGenerator,
): void {
  const component = `${src}/${name}`;

  createFolder(component);

  const { project: projectName } = readAvilaConfig();

  fileGenerator.setFile(`${component}/hooks.ts`, true);

  const capitalized = capitalize(name);

  const input = `${capitalized}Input`;

  const iModel = `I${capitalized}`;
  const createOne = `create${input}`;
  const updateOne = `update${input}`;
  const deleteOne = `delete${input}`;

  const findOne = `findOne${input}`;
  const filter = `filter${input}`;
  const paginateParams = 'TPaginateParams';

  const tFindOne = `T${capitalize(findOne)}`;
  const tFilter = `T${capitalize(filter)}`;
  const tCreate = `T${capitalize(createOne)}`;
  const tUpdate = `T${capitalize(updateOne)}`;
  const tDelete = `T${capitalize(deleteOne)}`;

  const create = `create${capitalized}`;
  const update = `update${capitalized}`;
  const deleteOp = `delete${capitalized}`;

  const paginate = `paginate${capitalized}`;
  const findOneOp = `findOne${capitalized}`;

  fileGenerator.addImports([
    {
      import: ['useMutation', 'useQuery', 'UseQueryOptions'],
      moduleSpecifier: '@tanstack/react-query',
    },
    {
      import: [
        iModel,
        tCreate,
        tUpdate,
        tDelete,
        tFindOne,
        tFilter,
        'TPaginateParams',
      ],
      moduleSpecifier: `@${projectName}/models`,
    },
    {
      import: [
        `create${capitalized}`,
        `update${capitalized}`,
        `delete${capitalized}`,
      ],
      moduleSpecifier: './mutations',
    },
    {
      import: [`findOne${capitalized}`, `paginate${capitalized}`],
      moduleSpecifier: './queries',
    },
  ]);

  // create one
  fileGenerator.addFunctionDefinition({
    name: `useCreate${capitalized}`,
    isAsync: false,
    parameters: [
      {
        name: 'input',
        type: tCreate,
      },
    ],
    statements: [
      `// ! Change to actual param to filter\n`,
      `return useMutation<${iModel}, Error>({
          mutationKey: ['${create}', input],
          mutationFn: () => ${create}(input),
        })`,
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
      requires: `{${iModel}, ${tCreate}} - @avila-tek/models | ${create} - ./mutations`,
    }),
    isExported: true,
  });

  // update one

  fileGenerator.addFunctionDefinition({
    name: `useUpdate${capitalized}`,
    isAsync: false,
    parameters: [
      {
        name: 'input',
        type: tUpdate,
      },
    ],
    statements: [
      `// ! Change to actual param to filter\n`,
      `return useMutation<${iModel}, Error>({
          mutationKey: ['${update}', input],
          mutationFn: () => ${update}(input),
      })`,
    ],
    docs: docs({
      description: `Updates one ${name}`,
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
      requires: `{${iModel}, ${tUpdate}} - @avila-tek/models | ${update} - ./mutations`,
    }),
    isExported: true,
  });

  // delete one

  fileGenerator.addFunctionDefinition({
    name: `useDelete${capitalized}`,
    isAsync: false,
    parameters: [
      {
        name: 'input',
        type: tDelete,
      },
    ],
    statements: [
      `// ! Change to actual param to filter\n`,
      `return useMutation<${iModel}, Error>({
          mutationKey: ['${deleteOp}', input],
          mutationFn: () => ${deleteOp}(input),
      })`,
    ],
    docs: docs({
      description: `Soft Deletes one ${name}`,
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
      requires: `{${iModel}, ${tDelete}} - @avila-tek/models | ${deleteOp} - ./mutations`,
    }),
    isExported: true,
  });

  // Find one

  fileGenerator.addFunctionDefinition({
    name: `useFindOne${capitalized}`,
    isAsync: false,
    parameters: [
      {
        name: 'input',
        type: tFindOne,
      },
      {
        name: 'options',
        type: 'UseQueryOptions',
        hasQuestionToken: true,
      },
    ],
    statements: [
      `return useQuery({
          queryKey: ['${findOneOp}'],
          queryFn: () => ${findOneOp}(input),
          ...options,
      });`,
    ],
    docs: docs({
      description: `Finds one ${name} with filters`,
      params: [
        {
          name: 'input',
          type: tFindOne,
          description: `The filters to find the ${name}`,
        },
        {
          name: 'options',
          type: 'UseQueryOptions',
          description: `The options for the query`,
        },
      ],
      since: '1.0.0',
      summary: `Find one ${name}`,
      version: '1',
      async: true,
      requires: `{${iModel}, ${tFindOne}} - @avila-tek/models | ${findOneOp} - ./queries`,
    }),
    isExported: true,
  });

  // paginate

  fileGenerator.addFunctionDefinition({
    name: `usePagination${capitalized}`,
    isAsync: false,
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
        type: 'UseQueryOptions',
        hasQuestionToken: true,
      },
    ],
    statements: [
      `return useQuery({
          queryKey: ['${paginate}'],
          queryFn: () => ${paginate}(paginationParams, input),
          ...options
      });`,
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
