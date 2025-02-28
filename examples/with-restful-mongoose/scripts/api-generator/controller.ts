import { Project } from 'ts-morph';
import { capitalize, FileGenerator } from '../utils';

export async function createControllerFile(
  fullPath: string,
  project: Project,
  component: string,
  overwrite: boolean = false
): Promise<void> {
  const fileGenerator = new FileGenerator(project, component);
  const file = `${fullPath}/${component}.controller.ts`;
  fileGenerator.setFile(file, overwrite);

  const capitalized = capitalize(component);
  const input = `${capitalized}Input`;

  const tCreate = `TCreate${input}`;
  const tDelete = `TDelete${input}`;
  const tFilter = `TFilter${input}`;
  const tFindOne = `TFindOne${input}`;
  const tUpdate = `TUpdate${input}`;
  const iModel = `I${capitalized}`;

  // Imports

  fileGenerator.addImports([
    {
      moduleSpecifier: 'fastify',
      import: ['FastifyReply'],
      isTypeOnly: true,
    },
    {
      moduleSpecifier: 'fastify',
      import: ['FastifyRequest'],
    },
    {
      moduleSpecifier: '@avila-tek/models',
      import: [tCreate, tDelete, tFilter, tUpdate, iModel, tFindOne],
    },
    {
      moduleSpecifier: `./${component}.service`,
      import: [`${component}Service`],
    },
    {
      moduleSpecifier: '@/utils/pagination',
      import: ['Pagination'],
    },
  ]);

  const create = `create${capitalized}`;
  const update = `update${capitalized}`;
  const findOne = `findOne${capitalized}`;
  const paginate = `paginate${capitalized}`;
  const _delete = `delete${capitalized}`;

  // Create

  fileGenerator.addFunctionDefinition({
    isAsync: true,
    name: create,
    parameters: [
      {
        name: 'request',
        type: `FastifyRequest<{ Body: ${tCreate} }>`,
      },
      {
        name: 'reply',
        type: `FastifyReply`,
      },
    ],
    returnType: `Promise<${iModel}>`,
    statements: [
      `try { 
            const ${component} = await ${component}Service.create${capitalized}(request.body);
            return reply.code(201).send(${component});
      }catch(e) { 
            request.log.error(e);
            return reply.send(500).send(e);
      }`,
    ],
  });

  // Update

  fileGenerator.addFunctionDefinition({
    isAsync: true,
    name: update,
    parameters: [
      {
        name: 'request',
        type: `FastifyRequest<{ Body: ${tUpdate} }>`,
      },
      {
        name: 'reply',
        type: `FastifyReply`,
      },
    ],
    returnType: `Promise<${iModel}>`,
    statements: [
      `try { 
    const ${component} = await ${component}Service.update${capitalized}(
    {_id: request.body._id},
    request.body,
    { new: true },
    );
    return reply.code(200).send(${component});
      }catch(e) { 
    request.log.error(e);
    return reply.send(500).send(e);
      }`,
    ],
  });

  // Find One

  fileGenerator.addFunctionDefinition({
    isAsync: true,
    name: findOne,
    parameters: [
      {
        name: 'request',
        type: `FastifyRequest<{ Params: ${tFindOne} }>`,
      },
      {
        name: 'reply',
        type: `FastifyReply`,
      },
    ],
    returnType: `Promise<${iModel}>`,
    statements: [
      `try { 
    const ${component} = await ${component}Service.findOne${capitalized}(request.params);
    return reply.code(200).send(${component});
      }catch(e) { 
    request.log.error(e);
    return reply.send(500).send(e);
      }`,
    ],
  });

  // Paginate
  fileGenerator.addFunctionDefinition({
    isAsync: true,
    name: paginate,
    parameters: [
      {
        name: 'request',
        type: `FastifyRequest<{ Querystring: ${tFilter} ; Params: { page: number; perPage: number } }>`,
      },
      {
        name: 'reply',
        type: `FastifyReply`,
      },
    ],
    returnType: `Promise<Pagination<${iModel}>>`,
    statements: [
      `try { 
    const resp = await ${component}Service.paginate${capitalized}(request.query, request.params.page, request.params.perPage);
    return reply.code(200).send(resp);
      }catch(e) { 
    request.log.error(e);
    return reply.send(500).send(e);
      }`,
    ],
  });

  // Delete
  fileGenerator.addFunctionDefinition({
    isAsync: true,
    name: _delete,
    parameters: [
      {
        name: 'request',
        type: `FastifyRequest<{ Params: ${tDelete} }>`,
      },
      {
        name: 'reply',
        type: `FastifyReply`,
      },
    ],
    returnType: `Promise<${iModel}>`,
    statements: [
      `try { 
    const ${component} = await ${component}Service.delete${capitalized}(request.params);
    return reply.code(200).send(${component});
      }catch(e) { 
    request.log.error(e);
    return reply.send(500).send(e);
      }`,
    ],
  });

  // Export controller

  fileGenerator.addConstDeclaration({
    name: `${component}Controller`,
    initializer: `Object.freeze({${create},${update},${findOne},${paginate}, ${_delete} });`,
  });

  await fileGenerator.save();
}
