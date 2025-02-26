import { z } from "zod";
import { Types } from "mongoose";
import { basicModelDefinition } from "../basicDefinitions";

export const productDefinition = basicModelDefinition.extend({});
export const createProductInput = productDefinition.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
});

export type TCreateProductInput = z.infer<typeof createProductInput>;

export const updateProductInput = productDefinition
  .partial()
  .required({ _id: true });

export type TUpdateProductInput = z.infer<typeof updateProductInput>;

export const findOneProductInput = productDefinition
  .pick({ _id: true })
  .required({ _id: true });

export type TFindOneProductInput = z.infer<typeof findOneProductInput>;

export const filterProductInput = productDefinition.partial().optional();

export type TFilterProductInput = z.infer<typeof filterProductInput>;

export const deleteProductInput = productDefinition
  .pick({ _id: true })
  .required({ _id: true });

export type TDeleteProductInput = z.infer<typeof deleteProductInput>;
