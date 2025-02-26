import {
  FilterQuery,
  UpdateQuery,
  QueryOptions,
  ProjectionType,
  Document,
} from "mongoose";
import {
  TCreateProductInput,
  TDeleteProductInput,
  TFilterProductInput,
  IProduct,
} from "@avila-tek/models";
import { Product } from "./product.model";
import { Pagination, paginateModel } from "@/utils/pagination";

/**
 * @async
 * @description Creates a product doc and saves it to the db
 * @implements {TCreateProductInput}
 * @listens product.controller:createProduct
 * @param {TCreateProductInput} data - The payload to create the product doc
 * @returns {Promise<Product>} - The product doc created
 * @since 1.0.0
 * @summary Creates a new product doc
 * @version 1
 */
async function createProduct(data: TCreateProductInput): Promise<IProduct> {
  const product = Product.create(data);
  if (!product) throw new Error("400-product");
  return product;
}

/**
 * @async
 * @description Updates a product doc and saves it to the db
 * @listens product.controller:updateOneProduct
 * @param {FilterQuery<IProduct>} filter - The filter to be applied
 * @param {UpdateQuery<IProduct>} update - The statement to update the doc
 * @param {QueryOptions<IProduct> | null} options - Various options for the update
 * @returns {Promise<Product>} - The product doc updated
 * @since 1.0.0
 * @summary Updates product object
 * @version 1
 */
async function updateProduct(
  filter: FilterQuery<IProduct>,
  update: UpdateQuery<IProduct>,
  options?: QueryOptions<IProduct> | null,
): Promise<IProduct | null> {
  return Product.findOneAndUpdate(filter, update, options).exec();
}

/**
 * @async
 * @description Finds a product with filters
 * @listens product.controller:findOneproduct
 * @param {FilterQuery<IProduct>} filter - The filter to be applied
 * @param {ProjectionType<IProduct>} projection - The projection over the doc
 * @param {QueryOptions<IProduct> | null} options - Various options for the search
 * @returns {Promise<Product | null>} - The product doc if found
 * @since 1.0.0
 * @summary Finds a product doc
 * @version 1
 */
async function findOneProduct(
  filter: FilterQuery<IProduct>,
  projection?: ProjectionType<IProduct> | null,
  options?: QueryOptions<IProduct> | null,
): Promise<IProduct | null> {
  return Product.findOne(filter, projection, options).exec();
}

/**
 * @async
 * @description Finds an array of products with filters
 * @listens product.controller:find
 * @param {FilterQuery<IProduct>} filter - The filter to be applied
 * @param {ProjectionType<IProduct>} projection - The projection over the doc
 * @param {QueryOptions<IProduct> | null} options - Various options for the search
 * @returns {Promise<Product | null>} - The product docs if found
 * @since 1.0.0
 * @summary Finds a product doc
 * @version 1
 */
async function find(
  filter: FilterQuery<IProduct>,
  projection?: ProjectionType<IProduct> | null,
  options?: QueryOptions<IProduct> | null,
): Promise<IProduct[] | null> {
  return Product.find(filter, projection, options).exec();
}

/**
 * @async
 * @description Deletes a product logically but not physically
 * @implements {TDeleteProductInput}
 * @listens product.controller:deleteproduct
 * @param {TDeleteProductInput} data - The payload to delete the doc
 * @returns {Promise<Product | null>} - The deleted product docs if found
 * @since 1.0.0
 * @summary Deletes a product doc
 * @version 1
 */
async function deleteProduct(
  data: TDeleteProductInput,
): Promise<IProduct | null> {
  const product = Product.findOneAndUpdate(
    { _id: data._id },
    { active: false },
    { new: true },
  );
  if (!product) {
    throw new Error("404-product");
  }

  return product;
}

/**
 * @async
 * @description Paginates products
 * @implements {TFilterProductInput}
 * @listens product.controller:paginateProducts
 * @param {TFilterProductInput} data - The filter to be applied
 * @returns {Promise<Pagination<Document<unknown, any, any>>>} - Paginated products
 * @since 1.0.0
 * @summary Paginates products
 * @version 1
 */
async function paginateProduct(
  data: TFilterProductInput,
  page: number,
  perPage: number,
): Promise<Pagination<Document<unknown, any, any>>> {
  return paginateModel(page || 1, perPage || 10, Product, data);
}

export const productService = Object.freeze({
  createProduct,
  updateProduct,
  findOneProduct,
  find,
  deleteProduct,
  paginateProduct,
});
