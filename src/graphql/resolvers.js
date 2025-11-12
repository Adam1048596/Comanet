// src/graphql/resolvers.js
import Product from "../models/Product.js";

const resolvers = {
  Query: {
    products: async () => await Product.find(),
    product: async (_, { id }) => await Product.findById(id),
  },
  Mutation: {
    createProduct: async (_, args) => {
      const product = new Product(args);
      await product.save();
      return product;
    },
  },
};

export default resolvers;
