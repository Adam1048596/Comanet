import { gql } from "apollo-server-express";

const typeDefs = gql`
  type Product {
    _id: ID!
    name: String!
    description: String
    price: Float!
    brand: String
    stock: Int
    images: [String]
    discount: Float
    finalPrice: Float
    details: String
    createdAt: String
  }

  type Query {
    products: [Product]
    product(id: ID!): Product
  }

  type Mutation {
    createProduct(
      name: String!
      description: String
      price: Float!
      brand: String
      stock: Int
      images: [String]
      discount: Float
      details: String
    ): Product
  }
`;


export default typeDefs;
