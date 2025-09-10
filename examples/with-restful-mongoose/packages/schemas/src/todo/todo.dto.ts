import { z } from 'zod';
import { todoSchema } from './todo.schema';

export const createTodoInput = todoSchema.omit({ _id: true }).required();

export type TCreateTodoInput = z.infer<typeof createTodoInput>;

export const updateTodoInput = todoSchema.partial().required({
  _id: true,
});

export type TUpdateTodoInput = z.infer<typeof updateTodoInput>;
