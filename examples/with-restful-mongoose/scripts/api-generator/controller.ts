import { Project } from 'ts-morph';
import { capitalize, FileGenerator } from '../utils';

export async function createControllerFile(
  fullPath: string,
  project: Project,
  component: string,
  overwrite: boolean = false
): Promise<string> {
  const fileGenerator = new FileGenerator(project, component);
  const file = `${fullPath}/${component}.controller.ts`;
  fileGenerator.setFile(file, overwrite);

  const capitalized = capitalize(component);
  const input = `${capitalized}Input`;

  const tCreate = `TCreate${input}`;
  const tDelete = `TDelete${input}`;
  const tFilter = `TFilter${input}`;
  const tUpdate = `TUpdate${input}`;
  const iModel = `I${capitalized}`;

  fileGenerator.addImports([
    {
      moduleSpecifier: 'fastify',
      import: ['FastifyReply'],
      isTypeOnly: true,
      default: false,
    },
    {
      moduleSpecifier: 'fastify',
      import: ['FastifyRequest'],
      default: false,
    },
    {
      moduleSpecifier: '@avila-tek/models',
      import: [tCreate, tDelete, tFilter, tUpdate, iModel],
      default: false,
    },
    {
      moduleSpecifier: `./${component}.service`,
      import: [`${component}Service`],
      default: false,
    },
    {
      moduleSpecifier: '@/utils/pagination',
      import: ['Pagination', 'paginateModel'],
      default: false,
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
        type: `FastifyRequest<{ Params: ${tFilter} }>`,
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

  // Export controller

  fileGenerator.addConstDeclaration({
    name: `${component}Controller`,
    initializer: `Object.freeze({
            ${create},
            ${update},
            ${findOne},});`,
  });

  await fileGenerator.save();
  return file;
}
