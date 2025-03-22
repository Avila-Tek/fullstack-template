import { Project } from 'ts-morph';
import { capitalize, FileGenerator, readAvilaConfig } from '@/utils';
import { docs } from '@/utils/docs.template';

export async function createServiceFile(
  fullPath: string,
  project: Project,
  component: string,
  overwrite: boolean = false,
): Promise<void> {
  const fileGenerator = new FileGenerator(project, component);
  fileGenerator.setFile(`${fullPath}/${component}.service.ts`, overwrite);

  const capitalized = capitalize(component);
  const { project: projectName } = readAvilaConfig();
  const input = `${capitalized}Input`;

  const tCreate = `TCreate${input}`;
  const tDelete = `TDelete${input}`;
  const tFilter = `TFilter${input}`;
  const iModel = `I${capitalized}`;

  fileGenerator.addImports([
    {
      moduleSpecifier: 'mongoose',
      import: [
        'FilterQuery',
        'UpdateQuery',
        'QueryOptions',
        'ProjectionType',
        'Document',
      ],
    },
    {
      moduleSpecifier: `@${projectName}/models`,
      import: [tCreate, tDelete, tFilter, iModel],
    },
    {
      moduleSpecifier: `./${component}.model`,
      import: [capitalized],
    },
    {
      moduleSpecifier: '@/utils/pagination',
      import: ['Pagination', 'paginateModel'],
    },
  ]);

  const create = `create${capitalized}`;
  const update = `update${capitalized}`;
  const findOne = `findOne${capitalized}`;
  const _delete = `delete${capitalized}`;

  // Create

  fileGenerator.addFunctionDefinition({
    isAsync: true,
    name: create,
    parameters: [
      {
        name: 'data',
        type: tCreate,
      },
    ],
    returnType: `Promise<I${capitalized}>`,
    statements: [
      `const ${component} = ${capitalized}.create(data);`,
      `if (!${component}) throw new Error('400-${component}');`,
      `return ${component};`,
    ],
    docs: docs({
      description: `Creates a ${component} doc and saves it to the db`,
      returns: {
        description: `The ${component} doc created`,
        type: `Promise<${capitalized}>`,
      },
      summary: `Creates a new ${component} doc`,
      version: '1',
      params: [
        {
          name: 'data',
          type: tCreate,
          description: `The payload to create the ${component} doc`,
        },
      ],
      since: '1.0.0',
      listens: `${component}.controller:create${capitalized}`,
      _implements: `{${tCreate}}`,
    }),
  });

  // Update

  fileGenerator.addFunctionDefinition({
    isAsync: true,
    name: update,
    parameters: [
      {
        name: 'filter',
        type: `FilterQuery<${iModel}>`,
      },
      {
        name: 'update',
        type: `UpdateQuery<${iModel}>`,
      },
      {
        name: 'options',
        type: `QueryOptions<${iModel}> | null`,
        hasQuestionToken: true,
      },
    ],
    returnType: `Promise<${iModel} | null>`,
    statements: [
      `return ${capitalized}.findOneAndUpdate(filter, update, options).exec()`,
    ],
    docs: docs({
      description: `Updates a ${component} doc and saves it to the db`,
      returns: {
        description: `The ${component} doc updated`,
        type: `Promise<${capitalized}>`,
      },
      summary: `Updates ${component} object`,
      version: '1',
      params: [
        {
          name: 'filter',
          type: `FilterQuery<${iModel}>`,
          description: 'The filter to be applied',
        },
        {
          name: 'update',
          type: `UpdateQuery<${iModel}>`,
          description: 'The statement to update the doc',
        },
        {
          name: 'options',
          type: `QueryOptions<${iModel}> | null`,
          description: 'Various options for the update',
        },
      ],
      since: '1.0.0',
      listens: `${component}.controller:updateOne${capitalized}`,
    }),
  });

  // findOne

  fileGenerator.addFunctionDefinition({
    isAsync: true,
    name: findOne,
    parameters: [
      {
        name: 'filter',
        type: `FilterQuery<${iModel}>`,
        hasQuestionToken: true,
      },
      {
        name: 'projection',
        type: `ProjectionType<${iModel}> | null`,
        hasQuestionToken: true,
      },
      {
        name: 'options',
        type: `QueryOptions<${iModel}> | null`,
        hasQuestionToken: true,
      },
    ],
    returnType: `Promise<${iModel} | null>`,
    statements: [
      `return ${capitalized}.findOne(filter, projection, options).exec()`,
    ],
    docs: docs({
      description: `Finds a ${component} with filters`,
      returns: {
        description: `The ${component} doc if found`,
        type: `Promise<${capitalized} | null>`,
      },
      summary: `Finds a ${component} doc`,
      version: '1',
      params: [
        {
          name: 'filter',
          type: `FilterQuery<${iModel}>`,
          description: 'The filter to be applied',
        },
        {
          name: 'projection',
          type: `ProjectionType<${iModel}>`,
          description: 'The projection over the doc',
        },
        {
          name: 'options',
          type: `QueryOptions<${iModel}> | null`,
          description: 'Various options for the search',
        },
      ],
      since: '1.0.0',
      listens: `${component}.controller:findOne${component}`,
    }),
  });

  // find

  fileGenerator.addFunctionDefinition({
    isAsync: true,
    name: 'find',
    parameters: [
      {
        name: 'filter',
        type: `FilterQuery<${iModel}>`,
      },
      {
        name: 'projection',
        type: `ProjectionType<${iModel}> | null`,
        hasQuestionToken: true,
      },
      {
        name: 'options',
        type: `QueryOptions<${iModel}> | null`,
        hasQuestionToken: true,
      },
    ],
    returnType: `Promise<${iModel}[] | null>`,
    statements: [
      `return ${capitalized}.find(filter, projection, options).exec()`,
    ],
    docs: docs({
      description: `Finds an array of ${component}s with filters`,
      returns: {
        description: `The ${component} docs if found`,
        type: `Promise<${capitalized} | null>`,
      },
      summary: `Finds a ${component} doc`,
      version: '1',
      params: [
        {
          name: 'filter',
          type: `FilterQuery<${iModel}>`,
          description: 'The filter to be applied',
        },
        {
          name: 'projection',
          type: `ProjectionType<${iModel}>`,
          description: 'The projection over the doc',
        },
        {
          name: 'options',
          type: `QueryOptions<${iModel}> | null`,
          description: 'Various options for the search',
        },
      ],
      since: '1.0.0',
      listens: `${component}.controller:find`,
    }),
  });

  // delete

  fileGenerator.addFunctionDefinition({
    isAsync: true,
    name: _delete,
    parameters: [
      {
        name: 'data',
        type: tDelete,
      },
    ],
    returnType: `Promise<${iModel} | null>`,
    statements: [
      `const ${component} = ${capitalized}.findOneAndUpdate(`,
      ` { _id: data._id },
        { active: false },
        { new: true },
      );`,
      `if (!${component}){`,
      `  throw new Error('404-${component}');`,
      `}`,
      `return ${component}`,
    ],
    docs: docs({
      description: `Deletes a ${component} logically but not physically`,
      returns: {
        description: `The deleted ${component} docs if found`,
        type: `Promise<${capitalized} | null>`,
      },
      summary: `Deletes a ${component} doc`,
      version: '1',
      params: [
        {
          name: 'data',
          type: tDelete,
          description: 'The payload to delete the doc',
        },
      ],
      since: '1.0.0',
      listens: `${component}.controller:delete${component}`,
      _implements: `{${tDelete}}`,
    }),
  });

  // paginate

  fileGenerator.addFunctionDefinition({
    isAsync: true,
    name: `paginate${capitalized}`,
    parameters: [
      {
        name: 'data',
        type: tFilter,
      },
      {
        name: 'page',
        type: 'number',
      },
      {
        name: 'perPage',
        type: 'number',
      },
    ],
    returnType: `Promise<Pagination<Document<unknown, any, any>>>`,
    statements: [
      `return paginateModel(page || 1, perPage || 10, ${capitalized}, data);`,
    ],
    docs: docs({
      description: `Paginates ${component}s`,
      returns: {
        description: `Paginated ${component}s`,
        type: `Promise<Pagination<Document<unknown, any, any>>>`,
      },
      summary: `Paginates ${component}s`,
      version: '1',
      params: [
        {
          name: 'data',
          type: tFilter,
          description: 'The filter to be applied',
        },
      ],
      since: '1.0.0',
      listens: `${component}.controller:paginate${capitalized}s`,
      _implements: `{${tFilter}}`,
    }),
  });

  // Exporting the service

  fileGenerator.addConstDeclaration({
    name: `${component}Service`,
    initializer: `Object.freeze({ ${create}, ${update}, ${findOne}, find, ${_delete}, paginate${capitalized} })`,
  });

  await fileGenerator.save();
}
