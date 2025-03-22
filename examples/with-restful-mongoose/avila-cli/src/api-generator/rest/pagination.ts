import { Project } from 'ts-morph';
import { FileGenerator } from '@/utils';
import { docs } from '@/utils/docs.template';

/**
 * @async
 * @function
 * @description Creates the pagination file
 * @listens {FileGenerator}
 * @param {string} fullPath - The full path to the file
 * @param {Project} project - The project to create the file in
 * @requires ts-morph
 * @returns {Promise<void>}
 * @see {@link https://ts-morph.com/}
 * @since 1.0.0
 * @summary Pagination File Creation
 * @version 1
 */

export async function createPaginationFile(
  fullPath: string,
  project: Project,
): Promise<void> {
  const fileGenerator = new FileGenerator(project, '');

  try {
    try {
      fileGenerator.project.addSourceFileAtPath(`${fullPath}/pagination.ts`);
    } catch (e) {
      // if this throws an error that means the pagination file does not exists so we need to continue
    }

    fileGenerator.project.getSourceFileOrThrow(`${fullPath}/pagination.ts`);
    console.log('Avoiding overwrite on pagination file');
  } catch (e) {
    // Create the file
    fileGenerator.setFile(`${fullPath}/pagination.ts`, true);

    // Imports

    fileGenerator.addImports([
      {
        import: [
          'Document',
          'Model',
          'Types',
          'FilterQuery',
          'QueryOptions',
          'ProjectionType',
          'PipelineStage',
          'AggregateOptions',
        ],
        isTypeOnly: true,
        default: false,
        moduleSpecifier: 'mongoose',
      },
    ]);

    // Pagination Type

    fileGenerator.addTypeDefinition({
      name: 'Pagination<T>',
      type: `{
    count: number;
    items: T[];
    pageInfo: {
      currentPage: number;
      perPage: number;
      itemCount: number;
      pageCount: number;
      hasPreviousPage: boolean;
      hasNextPage: boolean;
      }
    }`,
    });

    // Simple Pagination

    fileGenerator.addFunctionDefinition({
      isAsync: true,
      isExported: true,
      name: 'paginateModel<T extends Model<any>, U extends Document>',
      parameters: [
        {
          name: 'page',
          type: 'number',
        },
        {
          name: 'perPage',
          type: 'number',
        },
        {
          name: 'model',
          type: 'T',
        },
        {
          name: 'filter',
          type: 'FilterQuery<T>',
          initializer: '{}',
        },
        {
          name: 'projection',
          type: 'ProjectionType<T> | null',
          initializer: 'null',
        },
        {
          name: 'options',
          type: 'QueryOptions<T> | null',
          initializer: '{}',
        },
      ],
      statements: [
        `const count = await model.countDocuments(filter);
        const pageCount = Math.ceil(count / perPage);
        if (page > pageCount) {
          throw new Error('404-pageOutOfRange');
        }
        const skip = Math.max(0, (page -1) * perPage);  
        const items = await model.find<U>(filter, projection, {
        ...(options ?? {}),
        skip,
        limit: perPage,
        });
        return {
          count,
          items,
          pageInfo: {
          currentPage: page,
          perPage,
          pageCount,
          itemCount: count,
          hasPreviousPage: page > 1,
          hasNextPage: items.length > perPage || page * perPage < count,
          }
        }`,
      ],
      returnType: 'Promise<Pagination<U>>',
      docs: docs({
        description:
          'This function recieves a model and executes all the logic for pagination',
        params: [
          {
            name: 'page',
            type: 'number',
            description: 'actual page',
          },
          {
            name: 'perPage',
            type: 'number',
            description: 'items per page',
          },
          {
            name: 'model',
            type: 'T',
            description: 'mongoose model',
          },
          {
            name: 'filter',
            type: 'FilterQuery<T>',
            description: 'filter query',
          },
          {
            name: 'projection',
            type: 'ProjectionType<T> | null',
            description: 'projection',
          },
          {
            name: 'options',
            type: 'QueryOptions<T> | null',
            description: 'options',
          },
        ],
        returns: {
          description: 'pagination object',
          type: 'Promise<Pagination<U>>',
        },
        summary: 'Paginates a model',
        since: '1.0.0',
        version: '1',
      }),
    });

    // Complex pagination

    fileGenerator.addFunctionDefinition({
      isAsync: true,
      isExported: true,
      name: 'complexPagination<T extends Model<Document<Types.ObjectId, object>>, U extends Document>',
      parameters: [
        {
          name: 'pipeline',
          type: 'PipelineStage[]',
        },
        {
          name: 'page',
          type: 'number',
        },
        {
          name: 'perPage',
          type: 'number',
        },
        {
          name: 'model',
          type: 'T',
        },
        {
          name: 'options',
          type: 'AggregateOptions',
          initializer: '{}',
        },
      ],
      statements: [
        `const from = (Number(page ?? 1) - 1) * Number(perPage ?? 10);
      const [response] = await model.aggregate<{ count: number; items: U[] }>([
        ...pipeline,
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            items: { $push: '$$ROOT' },
          },
        },
        {
          $project: {
            count: 1,
            items: {
              $slice: ['$items', Number(from), Number(perPage)],
            },
          },
        },
        ],
        options
      );

      const count = response?.count ?? 0;
      const items = response?.items ?? [];

      const pageCount = Math.ceil(count / (perPage ?? 10));

      return {
        count,
        items,
        pageInfo: {
          currentPage: Number(page),
          perPage: Number(perPage),
          pageCount,
          itemCount: count,
          hasPreviousPage: Number(page) > 1,
          hasNextPage: pageCount > page,
        }
      };
      `,
      ],
      returnType: 'Promise<Pagination<U>>',
      docs: docs({
        description:
          'This function recieves a model and executes all the logic for pagination',
        params: [
          {
            name: 'pipeline',
            type: 'PipelineStage[]',
            description: 'The pipeline to be used in the aggregation',
          },
          {
            name: 'page',
            type: 'number',
            description: 'actual page',
          },
          {
            name: 'perPage',
            type: 'number',
            description: 'items per page',
          },
          {
            name: 'model',
            type: 'T',
            description: 'mongoose model',
          },
          {
            name: 'options',
            type: 'AggregateOptions',
            description: 'options',
          },
        ],
        returns: {
          description: 'pagination object',
          type: 'Promise<Pagination<U>>',
        },
        summary: 'Paginates a pipeline',
        since: '1.0.0',
        version: '1',
      }),
    });

    await fileGenerator.save();
  }
}
