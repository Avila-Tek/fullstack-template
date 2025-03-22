import { Project } from 'ts-morph';
import { FileGenerator } from '@/utils';

export async function createApiFile(path: string, project: Project) {
  const fileGenerator = new FileGenerator(project, '');

  fileGenerator.setFile(path, true);

  // Add the imports

  fileGenerator.addImports([
    {
      moduleSpecifier: 'axios',
      import: ['Axios'],
      default: true,
    },
    {
      moduleSpecifier: 'zod',
      import: ['z'],
    },
  ]);

  // Add the TFetchInput type

  fileGenerator.addTypeDefinition({
    name: 'TFetchInput<DataType>',
    type: '{ url: string; schema?: z.ZodType<DataType>; options?: RequestInit };',
  });

  // Add the TFetchOutput type

  fileGenerator.addTypeDefinition({
    name: 'TFetchOutput<DataType>',
    type: '{ response: Response; data: DataType; }',
  });

  // Add the FetchWrapper

  fileGenerator.addFunctionDefinition({
    name: 'fetchWrapper<DataType>',
    parameters: [
      {
        name: '{ url, schema = z.any() as z.ZodType<DataType>, options = {} }',
        type: 'TFetchInput<DataType>',
      },
    ],
    returnType: 'Promise<TFetchOutput<DataType>>',
    isAsync: true,
    statements: [
      `
        const headers: HeadersInit = {};

        // add content type if needed
        if (options.body) {
          headers['Content-Type'] = 'application/json';
        }

        // add access token if needed
        if (typeof window !== 'undefined' && localStorage.getItem('token') !== null) {
          headers['Authorization'] = localStorage.getItem('token')!;
        }

        const response = await fetch(process.env.NEXT_PUBLIC_API_URL + url, {
          ...options,
          headers,
        });

        const data = await response?.json();

        // Rerun the Query and Remove the Token in Case:
        // The Token is Invalid
        // The Token is Expired
        // The Token is Malformed
        if (
          typeof window !== 'undefined' &&
          ((data?.status === 401 && data?.type === 'token') ||
            (data?.status === 401 && data?.type === 'tokenExpired') ||
            (data?.status === 400 && data?.detail?.includes('JsonWebTokenError')))
        ) {
          localStorage.removeItem('token');
          return fetchWrapper({ url, schema, options });
        }

        // VALIDATE RESPONSE WITH ZOD
        try {
          const parsedData = schema.parse(data);
          return {
            response,
            data: parsedData,
          };
        } catch (error) {
          // puede manejar este error como desee
          throw new Error(\`Invalid response structure: $\{error\}\`);
        }
  `,
    ],
    docs: [],
    isExported: true,
  });

  // Add the api const

  fileGenerator.addConstDeclaration({
    name: 'api',
    initializer: `{ get: async <DataType>({
    url,
    schema = z.any() as z.ZodType<DataType>,
    options = {},
  }: TFetchInput<DataType>) =>
    fetchWrapper({
      url,
      schema,
      options: {
        ...options,
        method: 'GET',
      },
    }),

  post: async <DataType>({
    url,
    schema = z.any() as z.ZodType<DataType>,
    options = {},
  }: TFetchInput<DataType>) =>
    fetchWrapper({
      url,
      schema,
      options: {
        ...options,
        method: 'POST',
      },
    }),

  put: async <DataType>({
    url,
    schema = z.any() as z.ZodType<DataType>,
    options = {},
  }: TFetchInput<DataType>) =>
    fetchWrapper({
      url,
      schema,
      options: {
        ...options,
        method: 'PUT',
      },
    }),

  delete: async <DataType>({
    url,
    schema = z.any() as z.ZodType<DataType>,
    options = {},
  }: TFetchInput<DataType>) =>
    fetchWrapper({
      url,
      schema,
      options: {
        ...options,
        method: 'DELETE',
      },
    }), }`,
  });

  // add the axios const

  fileGenerator.addConstDeclaration({
    name: 'axios',
    initializer: `Axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'x-access-token':
          typeof window !== 'undefined' ? localStorage.getItem('token') : undefined,
      },
    });`,
  });

  // add the axioss3

  fileGenerator.addConstDeclaration({
    name: 'axiosS3',
    initializer: `Axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      headers: {
        'x-amz-acl': 'public-read',
      },
    });`,
  });

  await fileGenerator.save();
}
