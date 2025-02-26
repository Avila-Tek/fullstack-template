import type { z } from "zod";
import { Schema } from "mongoose";
import type { Types, Document } from "mongoose";
import { productDefinition } from "./product.dto";

export type IProduct = z.infer<typeof productDefinition>;
export type ProductDocument = IProduct &
  Document<Types.ObjectId, object, IProduct>;

export const productSchema = new Schema<IProduct>({}, { timestamps: true });
