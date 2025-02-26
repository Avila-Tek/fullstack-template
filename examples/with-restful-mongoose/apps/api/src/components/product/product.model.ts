import { model } from "mongoose";
import { productSchema } from "@avila-tek/models";

export const Product = model("Product", productSchema);
