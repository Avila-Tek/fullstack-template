import { Project } from 'ts-morph';
import { capitalize, FileGenerator, readAvilaConfig } from '../utils';

export async function createRoutesFile(
  fullPath: string,
  project: Project,
  component: string,
  overwrite: boolean = false
) {
  const fileGenerator = new FileGenerator(project, component);
  const file = `${fullPath}/${component}.routes.ts`;
  fileGenerator.setFile(file, overwrite);

  const capitalized = capitalize(component);
  const { project: projectName } = readAvilaConfig();
  const input = `${capitalized}Input`;

  const tCreate = `TCreate${input}`;
  const tDelete = `TDelete${input}`;
  const tFilter = `TFilter${input}`;
  const tUpdate = `TUpdate${input}`;
  const tFindOne = `TFindOne${input}`;
  const router = `${component}Router`;
  const controller = `${component}Controller`;

  const create = `create${capitalized}`;
  const update = `update${capitalized}`;
  const findOne = `findOne${capitalized}`;
  const paginate = `paginate${capitalized}`;
  const _delete = `delete${capitalized}`;

  // Imports

  fileGenerator.addImports([
    {
      moduleSpecifier: `@${projectName}/models`,
      import: [tCreate, tUpdate, tDelete, tFilter, tFindOne],
    },
    {
      moduleSpecifier: `./${component}.controller`,
      import: [controller],
    },
    {
      moduleSpecifier: 'fastify',
      import: ['FastifyInstance'],
      isTypeOnly: true,
    },
  ]);

  // Function declaration

  fileGenerator.addFunctionDefinition({
    isAsync: true,
    name: router,
    parameters: [
      {
        name: 'fastify',
        type: 'FastifyInstance',
      },
    ],
    returnType: 'Promise<void>',
    statements: `
        fastify.post<{ Body: ${tCreate} }>('/v1/', {}, ${controller}.${create});
        fastify.put<{ Body: ${tUpdate} }>('/v1/',{}, ${controller}.${update});
        fastify.get<{ Params: ${tFindOne} }>('/v1/:_id',{}, ${controller}.${findOne});
        fastify.get<{ Querystring: ${tFilter}; Params: { page: number; perPage: number } }>('/v1/paginate/:page/:perPage', {}, ${controller}.${paginate});
        fastify.delete<{ Params: ${tDelete} }>('/v1/:_id',{},${controller}.${_delete});
    `,
    isExported: true,
  });

  await fileGenerator.save();
}
