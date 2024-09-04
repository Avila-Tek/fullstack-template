import { z } from 'zod';

export type TFetchInput<DataType> = {
  url: string;
  schema?: z.ZodType<DataType>;
  options?: RequestInit;
};

export type TFetchOutput<DataType> = {
  response: Response;
  data: DataType;
};

/**
 * A utility function for making HTTP requests and validating the response with a zod schema.
 *
 * @template DataType
 * @param {TFetchInput<DataType>} params - The input parameters for the fetch request.
 * @returns {Promise<TFetchOutput<DataType>>} - A promise that resolves with the fetch response and validated data.
 * @throws Will throw an error if the response structure does not match the provided schema.
 */
export const fetchWrapper = async <DataType>({
  url,
  schema = z.any() as z.ZodType<DataType>,
  options = {},
}: TFetchInput<DataType>): Promise<TFetchOutput<DataType>> => {
  const fullUrl = `${process.env.NEXT_PUBLIC_API_URL}${url}`;

  const response = await fetch(fullUrl, {
    ...options,
  });

  const data = await response?.json();

  try {
    const parsedData = schema.parse(data);
    return {
      response,
      data: parsedData,
    };
  } catch (error) {
    // Handle this error as needed
    throw new Error(`
        [FETCH-ERROR] Invalid response structure 
        for ${fullUrl} with schema ${schema.toString()}.
        log:${error}`);
  }
};
